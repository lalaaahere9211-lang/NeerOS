import { getDatabase } from '../db';
import { Payment, PaymentMethod } from '../../types/domain';

export class PaymentRepository {
  static async recordPayment(data: {
    customerId: string;
    amountMinor: number;
    paymentDate: string; // YYYY-MM-DD
    paymentMethod: PaymentMethod;
    referenceNumber?: string;
    recordedByUserId: string;
    notes?: string;
  }): Promise<Payment> {
    if (data.amountMinor <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const db = await getDatabase();
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      // 1. Insert Payment
      await db.runAsync(
        `INSERT INTO payments (
          id, customer_id, amount_minor, payment_date, payment_method, reference_number,
          recorded_by_user_id, is_reversed, created_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?);`,
        [
          paymentId,
          data.customerId,
          data.amountMinor,
          data.paymentDate,
          data.paymentMethod,
          data.referenceNumber || null,
          data.recordedByUserId,
          now,
          data.notes || null,
        ]
      );

      // 2. Post Credit to Customer Financial Ledger
      await db.runAsync(
        `INSERT INTO ledger_entries (
          id, customer_id, entry_type, amount_minor, direction, reference_id, timestamp, description, user_id
        ) VALUES (?, ?, 'PAYMENT', ?, 'CREDIT', ?, ?, ?, ?);`,
        [
          `led_${Date.now()}`,
          data.customerId,
          data.amountMinor,
          paymentId,
          now,
          `Payment Received via ${data.paymentMethod}${data.referenceNumber ? ` (Ref: ${data.referenceNumber})` : ''}`,
          data.recordedByUserId,
        ]
      );

      // 3. Audit log
      await db.runAsync(
        `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, timestamp)
         VALUES (?, ?, 'RECORD_PAYMENT', 'PAYMENT', ?, ?, ?);`,
        [
          `aud_${Date.now()}`,
          data.recordedByUserId,
          paymentId,
          `Recorded payment of ₹${(data.amountMinor / 100).toFixed(2)} via ${data.paymentMethod}`,
          now,
        ]
      );
    });

    const created = await this.getPaymentById(paymentId);
    if (!created) throw new Error('Failed to retrieve recorded payment');
    return created;
  }

  static async reversePayment(
    paymentId: string,
    reason: string,
    userId: string
  ): Promise<void> {
    if (!reason || reason.trim().length === 0) {
      throw new Error('Reversal reason is mandatory');
    }

    const db = await getDatabase();
    const payment = await this.getPaymentById(paymentId);
    if (!payment) throw new Error('Payment not found');
    if (payment.is_reversed) throw new Error('Payment is already reversed');

    const now = new Date().toISOString();
    const reversalId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    await db.withTransactionAsync(async () => {
      // 1. Mark payment as reversed
      await db.runAsync('UPDATE payments SET is_reversed = 1 WHERE id = ?;', [paymentId]);

      // 2. Record payment reversal
      await db.runAsync(
        `INSERT INTO payment_reversals (id, payment_id, amount_minor, reason, user_id, reversed_at)
         VALUES (?, ?, ?, ?, ?, ?);`,
        [reversalId, paymentId, payment.amount_minor, reason, userId, now]
      );

      // 3. Post Compensating Debit to Customer Ledger
      await db.runAsync(
        `INSERT INTO ledger_entries (
          id, customer_id, entry_type, amount_minor, direction, reference_id, timestamp, description, user_id
        ) VALUES (?, ?, 'PAYMENT_REVERSAL', ?, 'DEBIT', ?, ?, ?, ?);`,
        [
          `led_${Date.now()}`,
          payment.customer_id,
          payment.amount_minor,
          paymentId,
          now,
          `Payment Reversal (Reason: ${reason})`,
          userId,
        ]
      );

      // 4. Audit Log
      await db.runAsync(
        `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, timestamp)
         VALUES (?, ?, 'REVERSE_PAYMENT', 'PAYMENT', ?, ?, ?);`,
        [
          `aud_${Date.now()}`,
          userId,
          paymentId,
          `Reversed payment of ₹${(payment.amount_minor / 100).toFixed(2)}. Reason: ${reason}`,
          now,
        ]
      );
    });
  }

  static async getPayments(customerId?: string): Promise<Payment[]> {
    const db = await getDatabase();
    let query = `
      SELECT 
        p.*,
        c.name as customer_name,
        u.name as recorded_by_user_name
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      LEFT JOIN users u ON p.recorded_by_user_id = u.id
    `;
    const params: string[] = [];
    if (customerId) {
      query += ' WHERE p.customer_id = ?';
      params.push(customerId);
    }
    query += ' ORDER BY p.payment_date DESC, p.created_at DESC;';
    return await db.getAllAsync<Payment>(query, params);
  }

  static async getPaymentById(id: string): Promise<Payment | null> {
    const db = await getDatabase();
    const query = `
      SELECT 
        p.*,
        c.name as customer_name,
        u.name as recorded_by_user_name
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      LEFT JOIN users u ON p.recorded_by_user_id = u.id
      WHERE p.id = ?;
    `;
    return await db.getFirstAsync<Payment>(query, [id]);
  }
}
