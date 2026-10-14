/**
 * useSyncState hook
 *
 * Provides reactive sync state for UI components.
 */

import { useState, useEffect, useCallback } from 'react';
import { syncService, SyncState } from '../services/syncService';

const DEFAULT_STATE: SyncState = {
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  lastSyncAt: null,
  lastError: null,
};

export function useSyncState(): SyncState & { forceSync: () => Promise<void> } {
  const [state, setState] = useState<SyncState>(DEFAULT_STATE);

  useEffect(() => {
    // Get initial state
    syncService.getState().then(setState);

    // Subscribe to changes
    const unsubscribe = syncService.subscribe(setState);
    return unsubscribe;
  }, []);

  const forceSync = useCallback(async () => {
    await syncService.forceSync();
  }, []);

  return { ...state, forceSync };
}
