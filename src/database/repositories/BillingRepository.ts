import { getDatabase } from '../db';
import { Bill, BillItem } from '../../types/domain';

export class BillingRepository {
  static async generateBill(data: {
    customerId: string;
    periodStart: string; // YYYY-MM-DD
    periodEnd: string; // YYYY-MM-DD
    generatedByUserId: string;
  }): Promise<Bill> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const billId = `bill_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    // Generate unique bill number: PB-YYYYMM-XXXX
    const datePrefix = data.periodEnd.replace(/-/g, '').substring(0, 6);
    const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM bills;');
    const sequence = ((countRow?.count || 0) + 1).toString().padStart(4, '0');
    const billNumber = `PB-${datePrefix}-${sequence}`;

    // 1. Calculate previous balance (all ledger entries before periodStart)
    const prevBalanceRow = await db.getFirstAsync<{ prev_net: number }>(
      `SELECT SUM(CASE WHEN direction = 'DEBIT' THEN amount_minor ELSE -amount_minor END) as prev_net
       FROM ledger_entries 
       WHERE customer_id = ? AND date(timestamp) < date(?);`,
      [data.customerId, data.periodStart]
    );
    const previousBalanceMinor = prevBalanceRow?.prev_net || 0;

    // 2. Query deliveries in period to snapshot as bill items
    const deliveriesInPeriod = await db.getAllAsync<{
      id: string;
      delivery_date: string;
      total_amount_minor: number;
    }>(
      `SELECT id, delivery_date, total_amount_minor 
       FROM deliveries 
       WHERE customer_id = ? AND delivery_date >= ? AND delivery_date <= ? AND status = 'COMPLETED'
       ORDER BY delivery_date ASC;`,
      [data.customerId, data.periodStart, data.periodEnd]
    );

    const periodChargesMinor = deliveriesInPeriod.reduce((acc, d) => acc + d.total_amount_minor, 0);

    // 3. Query payments in period
    const paymentsRow = await db.getFirstAsync<{ payments_sum: number }>(
      `SELECT SUM(amount_minor) as payments_sum
       FROM payments 
       WHERE customer_id = ? AND payment_date >= ? AND payment_date <= ? AND is_reversed = 0;`,
      [data.customerId, data.periodStart, data.periodEnd]
    );
    const periodPaymentsMinor = paymentsRow?.payments_sum || 0;

    // Closing balance
    const closingBalanceMinor = previousBalanceMinor + periodChargesMinor - periodPaymentsMinor;

    let createdBill: Bill | null = null;

    await db.withTransactionAsync(async () => {
      // Insert Bill
      await db.runAsync(
        `INSERT INTO bills (
          id, bill_number, customer_id, period_start, period_end, previous_balance_minor,
          period_charges_minor, period_payments_minor, closing_balance_minor, status, generated_at, generated_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?, ?);`,
        [
          billId,
          billNumber,
          data.customerId,
          data.periodStart,
          data.periodEnd,
          previousBalanceMinor,
          periodChargesMinor,
          periodPaymentsMinor,
          closingBalanceMinor,
          now,
          data.generatedByUserId,
        ]
      );

      // Insert Bill Items from deliveries
      for (const del of deliveriesInPeriod) {
        const items = await db.getAllAsync<{
          product_name_snapshot: string;
          quantity: number;
          unit_rate_snapshot_minor: number;
          total_price_minor: number;
        }>('SELECT * FROM delivery_items WHERE delivery_id = ?;', [del.id]);

        for (const item of items) {
          const itemId = `bitem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          await db.runAsync(
            `INSERT INTO bill_items (
              id, bill_id, delivery_id, item_date, description, quantity, rate_minor, total_minor
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              itemId,
              billId,
              del.id,
              del.delivery_date,
              item.product_name_snapshot,
              item.quantity,
              item.unit_rate_snapshot_minor,
              item.total_price_minor,
            ]
          );
        }
      }

      // Log Audit
      await db.runAsync(
        `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, timestamp)
         VALUES (?, ?, 'GENERATE_BILL', 'BILL', ?, ?, ?);`,
        [
          `aud_${Date.now()}`,
          data.generatedByUserId,
          billId,
          `Generated Bill ${billNumber} for ₹${(closingBalanceMinor / 100).toFixed(2)}`,
          now,
        ]
      );

      const created = await BillingRepository.getBillById(billId);
      if (!created) throw new Error('Failed to retrieve generated bill');
      createdBill = created;
    });

    if (!createdBill) throw new Error('Failed to generate bill');
    return createdBill;
  }

  static async getBills(customerId?: string): Promise<Bill[]> {
    const db = await getDatabase();
    let query = `
      SELECT 
        b.*,
        c.name as customer_name,
        u.name as generated_by_user_name
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      LEFT JOIN users u ON b.generated_by_user_id = u.id
    `;
    const params: string[] = [];
    if (customerId) {
      query += ' WHERE b.customer_id = ?';
      params.push(customerId);
    }
    query += ' ORDER BY b.generated_at DESC;';
    return await db.getAllAsync<Bill>(query, params);
  }

  static async getBillById(id: string): Promise<Bill | null> {
    const db = await getDatabase();
    const query = `
      SELECT 
        b.*,
        c.name as customer_name,
        u.name as generated_by_user_name
      FROM bills b
      JOIN customers c ON b.customer_id = c.id
      LEFT JOIN users u ON b.generated_by_user_id = u.id
      WHERE b.id = ?;
    `;
    const bill = await db.getFirstAsync<Bill>(query, [id]);
    if (bill) {
      bill.items = await db.getAllAsync<BillItem>(
        'SELECT * FROM bill_items WHERE bill_id = ? ORDER BY item_date ASC;',
        [bill.id]
      );
    }
    return bill;
  }
}
