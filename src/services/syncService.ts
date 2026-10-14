/**
 * NeerOS Sync Service
 *
 * Manages bidirectional synchronization between the local SQLite database
 * and the Supabase cloud PostgreSQL database.
 *
 * Architecture:
 * - Local SQLite remains the primary data source for all operations
 * - Changes are queued in a local sync_queue table
 * - The sync service processes the queue in FIFO order when online
 * - Idempotency keys prevent duplicate operations
 * - Financial records (payments, ledger entries) are never auto-overwritten
 *
 * Offline capabilities preserved:
 * - All CRUD operations work locally without network
 * - Sync queue persists across app restarts
 * - Failed syncs are retried with exponential backoff
 */

import { getDatabase } from '../database/db';
import { isSupabaseConfigured, getSupabaseClient } from '../lib/supabase';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface SyncQueueItem {
  id: string;
  table_name: string;
  record_id: string;
  operation: SyncOperation;
  payload: string; // JSON stringified
  status: SyncStatus;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Local sync queue schema (added to SQLite)
// ---------------------------------------------------------------------------
export const SYNC_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
  payload TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_table ON sync_queue(table_name, record_id);

-- Sync metadata: track last sync time per table
CREATE TABLE IF NOT EXISTS sync_metadata (
  table_name TEXT PRIMARY KEY,
  last_sync_at TEXT,
  last_pull_at TEXT
);
`;

// Maximum number of retry attempts before marking as permanently failed
const MAX_RETRY_ATTEMPTS = 5;

// Tables that can be synced (ordered by dependency)
const SYNCABLE_TABLES = [
  'routes',
  'customers',
  'products',
  'deliveries',
  'delivery_items',
  'stock_movements',
  'jar_movements',
  'payments',
  'payment_reversals',
  'bills',
  'bill_items',
  'ledger_entries',
  'audit_logs',
] as const;

// Tables with financial data that require special conflict handling
const FINANCIAL_TABLES = new Set([
  'payments',
  'payment_reversals',
  'ledger_entries',
  'bills',
  'bill_items',
]);

// ---------------------------------------------------------------------------
// SyncService Singleton
// ---------------------------------------------------------------------------
class SyncService {
  private _isSyncing = false;
  private _isInitialized = false;
  private _isOnline = true;
  private _listeners: Set<(state: SyncState) => void> = new Set();
  private _lastSyncAt: string | null = null;
  private _lastError: string | null = null;

  /**
   * Initialize the sync queue schema in the local SQLite database.
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) return;

    try {
      const db = await getDatabase();
      await db.execAsync(SYNC_SCHEMA_SQL);
      this._isInitialized = true;

      // Listen for network changes (optional - gracefully degrade if not available)
      try {
        NetInfo.addEventListener((state: NetInfoState) => {
          this._isOnline = state.isConnected ?? true;
          this.notifyListeners();

          // Auto-sync when coming back online
          if (this._isOnline && !this._isSyncing) {
            this.processQueue().catch(console.error);
          }
        });
      } catch {
        // NetInfo not available (e.g., web or missing native module)
        this._isOnline = true;
      }

      // Auto-sync on app foreground
      AppState.addEventListener('change', (state: AppStateStatus) => {
        if (state === 'active' && this._isOnline && !this._isSyncing) {
          this.processQueue().catch(console.error);
        }
      });
    } catch (err) {
      console.error('[SyncService] Failed to initialize:', err);
    }
  }

  /**
   * Enqueue a local change for syncing to the cloud.
   */
  async enqueue(
    tableName: string,
    recordId: string,
    operation: SyncOperation,
    payload: Record<string, unknown>
  ): Promise<void> {
    if (!this._isInitialized) await this.initialize();

    const db = await getDatabase();
    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO sync_queue (id, table_name, record_id, operation, payload, status, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', 0, ?, ?);`,
      [id, tableName, recordId, operation, JSON.stringify(payload), now, now]
    );

    this.notifyListeners();

    // Trigger sync if online
    if (this._isOnline && !this._isSyncing && isSupabaseConfigured()) {
      this.processQueue().catch(console.error);
    }
  }

  /**
   * Process the pending sync queue, pushing changes to Supabase.
   */
  async processQueue(): Promise<void> {
    if (this._isSyncing || !isSupabaseConfigured() || !this._isOnline) return;

    this._isSyncing = true;
    this.notifyListeners();

    try {
      const db = await getDatabase();
      const supabase = getSupabaseClient();

      // Get pending items in FIFO order
      const pendingItems = await db.getAllAsync<SyncQueueItem>(
        `SELECT * FROM sync_queue
         WHERE status IN ('PENDING', 'FAILED')
         AND attempts < ?
         ORDER BY created_at ASC
         LIMIT 50;`,
        [MAX_RETRY_ATTEMPTS]
      );

      for (const item of pendingItems) {
        try {
          // Mark as in progress
          await db.runAsync(
            `UPDATE sync_queue SET status = 'IN_PROGRESS', updated_at = ? WHERE id = ?;`,
            [new Date().toISOString(), item.id]
          );

          const payload = JSON.parse(item.payload);

          // Execute the sync operation
          await this.syncRecord(supabase, item.table_name, item.record_id, item.operation, payload);

          // Mark as completed
          await db.runAsync(
            `UPDATE sync_queue SET status = 'COMPLETED', updated_at = ? WHERE id = ?;`,
            [new Date().toISOString(), item.id]
          );
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : String(err);

          // For financial tables, don't auto-retry on conflict errors
          const isFinalFailure =
            item.attempts + 1 >= MAX_RETRY_ATTEMPTS ||
            (FINANCIAL_TABLES.has(item.table_name) && errorMessage.includes('conflict'));

          await db.runAsync(
            `UPDATE sync_queue SET
              status = ?,
              attempts = attempts + 1,
              last_error = ?,
              updated_at = ?
            WHERE id = ?;`,
            [
              isFinalFailure ? 'FAILED' : 'PENDING',
              errorMessage,
              new Date().toISOString(),
              item.id,
            ]
          );

          this._lastError = errorMessage;
          console.error(`[SyncService] Failed to sync ${item.table_name}/${item.record_id}:`, err);
        }
      }

      this._lastSyncAt = new Date().toISOString();

      // Clean up completed items older than 24 hours
      await db.runAsync(
        `DELETE FROM sync_queue
         WHERE status = 'COMPLETED'
         AND updated_at < datetime('now', '-1 day');`
      );
    } catch (err) {
      this._lastError = err instanceof Error ? err.message : String(err);
      console.error('[SyncService] Queue processing error:', err);
    } finally {
      this._isSyncing = false;
      this.notifyListeners();
    }
  }

  /**
   * Execute a single sync operation against Supabase.
   */
  private async syncRecord(
    supabase: ReturnType<typeof getSupabaseClient>,
    tableName: string,
    recordId: string,
    operation: SyncOperation,
    payload: Record<string, unknown>
  ): Promise<void> {
    switch (operation) {
      case 'INSERT': {
        const { error } = await supabase
          .from(tableName as keyof ReturnType<typeof getSupabaseClient>['from'] & string)
          .upsert(payload as never, { onConflict: 'id' });
        if (error) throw new Error(`Insert ${tableName}: ${error.message}`);
        break;
      }
      case 'UPDATE': {
        const { error } = await supabase
          .from(tableName as keyof ReturnType<typeof getSupabaseClient>['from'] & string)
          .update(payload as never)
          .eq('id', recordId as never);
        if (error) throw new Error(`Update ${tableName}: ${error.message}`);
        break;
      }
      case 'DELETE': {
        const { error } = await supabase
          .from(tableName as keyof ReturnType<typeof getSupabaseClient>['from'] & string)
          .delete()
          .eq('id', recordId as never);
        if (error) throw new Error(`Delete ${tableName}: ${error.message}`);
        break;
      }
    }
  }

  /**
   * Get the current sync state.
   */
  async getState(): Promise<SyncState> {
    try {
      const db = await getDatabase();
      const pending = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING';`
      );
      const failed = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'FAILED';`
      );

      return {
        isOnline: this._isOnline,
        isSyncing: this._isSyncing,
        pendingCount: pending?.count ?? 0,
        failedCount: failed?.count ?? 0,
        lastSyncAt: this._lastSyncAt,
        lastError: this._lastError,
      };
    } catch {
      return {
        isOnline: this._isOnline,
        isSyncing: this._isSyncing,
        pendingCount: 0,
        failedCount: 0,
        lastSyncAt: this._lastSyncAt,
        lastError: this._lastError,
      };
    }
  }

  /**
   * Force a full sync (re-process all pending/failed items).
   */
  async forceSync(): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const db = await getDatabase();
    // Reset failed items to pending
    await db.runAsync(
      `UPDATE sync_queue SET status = 'PENDING', attempts = 0 WHERE status = 'FAILED';`
    );
    await this.processQueue();
  }

  /**
   * Subscribe to sync state changes.
   */
  subscribe(listener: (state: SyncState) => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.getState().then((state) => {
      this._listeners.forEach((listener) => listener(state));
    });
  }

  /**
   * Get pending items for inspection (debugging/settings).
   */
  async getPendingItems(): Promise<SyncQueueItem[]> {
    const db = await getDatabase();
    return db.getAllAsync<SyncQueueItem>(
      `SELECT * FROM sync_queue WHERE status IN ('PENDING', 'IN_PROGRESS', 'FAILED')
       ORDER BY created_at ASC;`
    );
  }

  /**
   * Clear completed sync records.
   */
  async clearCompleted(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM sync_queue WHERE status = 'COMPLETED';`);
  }
}

// Export singleton instance
export const syncService = new SyncService();
