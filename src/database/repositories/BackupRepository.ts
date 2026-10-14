import { getDatabase } from '../db';

export interface DatabaseBackupPayload {
  version: number;
  exportedAt: string;
  business: any[];
  users: any[];
  routes: any[];
  customers: any[];
  products: any[];
  deliveries: any[];
  delivery_items: any[];
  stock_movements: any[];
  jar_movements: any[];
  payments: any[];
  payment_reversals: any[];
  bills: any[];
  bill_items: any[];
  ledger_entries: any[];
  audit_logs: any[];
}

export class BackupRepository {
  static async exportDatabaseJSON(): Promise<string> {
    const db = await getDatabase();
    const backup: DatabaseBackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      business: await db.getAllAsync('SELECT * FROM business_profiles;'),
      users: await db.getAllAsync('SELECT * FROM users;'),
      routes: await db.getAllAsync('SELECT * FROM routes;'),
      customers: await db.getAllAsync('SELECT * FROM customers;'),
      products: await db.getAllAsync('SELECT * FROM products;'),
      deliveries: await db.getAllAsync('SELECT * FROM deliveries;'),
      delivery_items: await db.getAllAsync('SELECT * FROM delivery_items;'),
      stock_movements: await db.getAllAsync('SELECT * FROM stock_movements;'),
      jar_movements: await db.getAllAsync('SELECT * FROM jar_movements;'),
      payments: await db.getAllAsync('SELECT * FROM payments;'),
      payment_reversals: await db.getAllAsync('SELECT * FROM payment_reversals;'),
      bills: await db.getAllAsync('SELECT * FROM bills;'),
      bill_items: await db.getAllAsync('SELECT * FROM bill_items;'),
      ledger_entries: await db.getAllAsync('SELECT * FROM ledger_entries;'),
      audit_logs: await db.getAllAsync('SELECT * FROM audit_logs;'),
    };
    return JSON.stringify(backup, null, 2);
  }

  static async importDatabaseJSON(jsonString: string): Promise<void> {
    const backup = JSON.parse(jsonString) as DatabaseBackupPayload;
    if (!backup.version || !backup.customers || !backup.products) {
      throw new Error('Invalid backup file format');
    }

    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      // Clear current operational data
      await db.runAsync('DELETE FROM audit_logs;');
      await db.runAsync('DELETE FROM ledger_entries;');
      await db.runAsync('DELETE FROM bill_items;');
      await db.runAsync('DELETE FROM bills;');
      await db.runAsync('DELETE FROM payment_reversals;');
      await db.runAsync('DELETE FROM payments;');
      await db.runAsync('DELETE FROM jar_movements;');
      await db.runAsync('DELETE FROM stock_movements;');
      await db.runAsync('DELETE FROM delivery_items;');
      await db.runAsync('DELETE FROM deliveries;');
      await db.runAsync('DELETE FROM products;');
      await db.runAsync('DELETE FROM customers;');
      await db.runAsync('DELETE FROM routes;');

      // Restore routes
      for (const r of backup.routes || []) {
        await db.runAsync(
          'INSERT INTO routes (id, name, description, is_active, created_at) VALUES (?, ?, ?, ?, ?);',
          [r.id, r.name, r.description, r.is_active, r.created_at]
        );
      }

      // Restore customers
      for (const c of backup.customers || []) {
        await db.runAsync(
          `INSERT INTO customers (id, name, phone, address, route_id, notes, opening_balance_minor, opening_jars, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            c.id,
            c.name,
            c.phone,
            c.address,
            c.route_id,
            c.notes,
            c.opening_balance_minor,
            c.opening_jars,
            c.is_active,
            c.created_at,
            c.updated_at,
          ]
        );
      }

      // Restore products
      for (const p of backup.products || []) {
        await db.runAsync(
          `INSERT INTO products (id, name, unit, current_rate_minor, stock_quantity, low_stock_threshold, is_returnable, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            p.id,
            p.name,
            p.unit,
            p.current_rate_minor,
            p.stock_quantity,
            p.low_stock_threshold,
            p.is_returnable,
            p.is_active,
            p.created_at,
            p.updated_at,
          ]
        );
      }

      // Restore deliveries
      for (const d of backup.deliveries || []) {
        await db.runAsync(
          `INSERT INTO deliveries (id, customer_id, route_id, delivered_by_user_id, delivery_date, delivery_time, status, total_amount_minor, jars_delivered, jars_collected, notes, idempotency_key, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            d.id,
            d.customer_id,
            d.route_id,
            d.delivered_by_user_id,
            d.delivery_date,
            d.delivery_time,
            d.status,
            d.total_amount_minor,
            d.jars_delivered,
            d.jars_collected,
            d.notes,
            d.idempotency_key,
            d.created_at,
            d.updated_at,
          ]
        );
      }

      // Restore delivery items
      for (const di of backup.delivery_items || []) {
        await db.runAsync(
          `INSERT INTO delivery_items (id, delivery_id, product_id, quantity, unit_rate_snapshot_minor, total_price_minor, product_name_snapshot)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            di.id,
            di.delivery_id,
            di.product_id,
            di.quantity,
            di.unit_rate_snapshot_minor,
            di.total_price_minor,
            di.product_name_snapshot,
          ]
        );
      }

      // Restore stock movements
      for (const sm of backup.stock_movements || []) {
        await db.runAsync(
          `INSERT INTO stock_movements (id, product_id, delta, reason, reference_id, user_id, timestamp, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [sm.id, sm.product_id, sm.delta, sm.reason, sm.reference_id, sm.user_id, sm.timestamp, sm.notes]
        );
      }

      // Restore jar movements
      for (const jm of backup.jar_movements || []) {
        await db.runAsync(
          `INSERT INTO jar_movements (id, customer_id, movement_type, quantity, reference_id, user_id, timestamp, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [jm.id, jm.customer_id, jm.movement_type, jm.quantity, jm.reference_id, jm.user_id, jm.timestamp, jm.notes]
        );
      }

      // Restore payments
      for (const py of backup.payments || []) {
        await db.runAsync(
          `INSERT INTO payments (id, customer_id, amount_minor, payment_date, payment_method, reference_number, recorded_by_user_id, is_reversed, created_at, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            py.id,
            py.customer_id,
            py.amount_minor,
            py.payment_date,
            py.payment_method,
            py.reference_number,
            py.recorded_by_user_id,
            py.is_reversed,
            py.created_at,
            py.notes,
          ]
        );
      }

      // Restore payment reversals
      for (const pr of backup.payment_reversals || []) {
        await db.runAsync(
          `INSERT INTO payment_reversals (id, payment_id, amount_minor, reason, user_id, reversed_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [pr.id, pr.payment_id, pr.amount_minor, pr.reason, pr.user_id, pr.reversed_at]
        );
      }

      // Restore bills
      for (const bl of backup.bills || []) {
        await db.runAsync(
          `INSERT INTO bills (id, bill_number, customer_id, period_start, period_end, previous_balance_minor, period_charges_minor, period_payments_minor, closing_balance_minor, status, generated_at, generated_by_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            bl.id,
            bl.bill_number,
            bl.customer_id,
            bl.period_start,
            bl.period_end,
            bl.previous_balance_minor,
            bl.period_charges_minor,
            bl.period_payments_minor,
            bl.closing_balance_minor,
            bl.status,
            bl.generated_at,
            bl.generated_by_user_id,
          ]
        );
      }

      // Restore bill items
      for (const bi of backup.bill_items || []) {
        await db.runAsync(
          `INSERT INTO bill_items (id, bill_id, delivery_id, item_date, description, quantity, rate_minor, total_minor)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          [bi.id, bi.bill_id, bi.delivery_id, bi.item_date, bi.description, bi.quantity, bi.rate_minor, bi.total_minor]
        );
      }

      // Restore ledger entries
      for (const le of backup.ledger_entries || []) {
        await db.runAsync(
          `INSERT INTO ledger_entries (id, customer_id, entry_type, amount_minor, direction, reference_id, timestamp, description, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            le.id,
            le.customer_id,
            le.entry_type,
            le.amount_minor,
            le.direction,
            le.reference_id,
            le.timestamp,
            le.description,
            le.user_id,
          ]
        );
      }
    });
  }
}
