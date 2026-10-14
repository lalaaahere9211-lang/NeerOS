import { getDatabase } from '../db';
import { LedgerEntry } from '../../types/domain';
import { computeRunningBalances } from '../../domain/accounting';

export class LedgerRepository {
  static async getCustomerLedger(customerId: string): Promise<LedgerEntry[]> {
    const db = await getDatabase();
    const customer = await db.getFirstAsync<{ opening_balance_minor: number }>(
      'SELECT opening_balance_minor FROM customers WHERE id = ?;',
      [customerId]
    );
    if (!customer) return [];

    const query = `
      SELECT 
        l.*,
        u.name as user_name
      FROM ledger_entries l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.customer_id = ?
      ORDER BY l.timestamp ASC;
    `;
    const entries = await db.getAllAsync<LedgerEntry>(query, [customerId]);
    return computeRunningBalances(0, entries);
  }

  static async getCustomerCurrentBalance(customerId: string): Promise<number> {
    const db = await getDatabase();
    const customer = await db.getFirstAsync<{ opening_balance_minor: number }>(
      'SELECT opening_balance_minor FROM customers WHERE id = ?;',
      [customerId]
    );
    if (!customer) return 0;

    const row = await db.getFirstAsync<{ net_ledger: number }>(
      `SELECT SUM(CASE WHEN direction = 'DEBIT' THEN amount_minor ELSE -amount_minor END) as net_ledger
       FROM ledger_entries WHERE customer_id = ?;`,
      [customerId]
    );

    return customer.opening_balance_minor + (row?.net_ledger || 0);
  }
}
