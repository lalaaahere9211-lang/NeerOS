import { getDatabase } from '../db';
import { DashboardMetrics } from '../../types/domain';
import { JarRepository } from './JarRepository';

export class DashboardRepository {
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    const db = await getDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Today's completed deliveries count and sales
    const todayDelRow = await db.getFirstAsync<{ count: number; sales: number }>(
      `SELECT 
        COUNT(*) as count,
        COALESCE(SUM(total_amount_minor), 0) as sales
       FROM deliveries 
       WHERE delivery_date = ? AND status = 'COMPLETED';`,
      [today]
    );

    // Today's collections
    const todayPayRow = await db.getFirstAsync<{ collections: number }>(
      `SELECT COALESCE(SUM(amount_minor), 0) as collections
       FROM payments 
       WHERE payment_date = ? AND is_reversed = 0;`,
      [today]
    );

    // Total outstanding balances from active customers
    const outstandingRow = await db.getFirstAsync<{ total_outstanding: number }>(
      `SELECT (
        COALESCE(SUM(c.opening_balance_minor), 0) +
        COALESCE((SELECT SUM(CASE WHEN direction = 'DEBIT' THEN amount_minor ELSE -amount_minor END) 
                  FROM ledger_entries l JOIN customers c2 ON l.customer_id = c2.id WHERE c2.is_active = 1), 0)
       ) as total_outstanding
       FROM customers c WHERE c.is_active = 1;`
    );

    // Low stock products count
    const lowStockRow = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM products 
       WHERE stock_quantity <= low_stock_threshold AND is_active = 1;`
    );

    // Jars
    const warehouseEmptyJars = await JarRepository.getWarehouseEmptyJars();
    const customerHeldJars = await JarRepository.getCustomerHeldJarsTotal();

    return {
      today_deliveries_count: todayDelRow?.count || 0,
      today_sales_minor: todayDelRow?.sales || 0,
      today_collections_minor: todayPayRow?.collections || 0,
      pending_deliveries_count: 0, // In offline standalone mode, 0 pending
      total_outstanding_minor: Math.max(0, outstandingRow?.total_outstanding || 0),
      low_stock_products_count: lowStockRow?.count || 0,
      warehouse_empty_jars: warehouseEmptyJars,
      customer_held_jars: customerHeldJars,
    };
  }
}
