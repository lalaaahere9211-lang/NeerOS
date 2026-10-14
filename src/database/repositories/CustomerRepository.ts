import { getDatabase } from '../db';
import { Customer } from '../../types/domain';

export class CustomerRepository {
  static async getCustomers(
    search?: string,
    routeId?: string,
    activeOnly: boolean = false
  ): Promise<Customer[]> {
    const db = await getDatabase();
    let query = `
      SELECT 
        c.*, 
        r.name as route_name,
        (
          c.opening_balance_minor + 
          COALESCE((SELECT SUM(CASE WHEN direction = 'DEBIT' THEN amount_minor ELSE -amount_minor END) FROM ledger_entries WHERE customer_id = c.id), 0)
        ) as current_balance_minor,
        (
          c.opening_jars + 
          COALESCE((SELECT SUM(CASE 
            WHEN movement_type = 'DELIVERY_DELIVERED' THEN quantity 
            WHEN movement_type IN ('DELIVERY_COLLECTED', 'DAMAGE', 'LOST', 'WRITE_OFF') THEN -quantity 
            ELSE quantity END) FROM jar_movements WHERE customer_id = c.id), 0)
        ) as current_jars
      FROM customers c
      LEFT JOIN routes r ON c.route_id = r.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (activeOnly) {
      query += ' AND c.is_active = 1';
    }

    if (routeId && routeId !== 'ALL') {
      query += ' AND c.route_id = ?';
      params.push(routeId);
    }

    if (search && search.trim().length > 0) {
      query += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.address LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY c.name ASC;';
    return await db.getAllAsync<Customer>(query, params);
  }

  static async getCustomerById(id: string): Promise<Customer | null> {
    const db = await getDatabase();
    const query = `
      SELECT 
        c.*, 
        r.name as route_name,
        (
          c.opening_balance_minor + 
          COALESCE((SELECT SUM(CASE WHEN direction = 'DEBIT' THEN amount_minor ELSE -amount_minor END) FROM ledger_entries WHERE customer_id = c.id), 0)
        ) as current_balance_minor,
        (
          c.opening_jars + 
          COALESCE((SELECT SUM(CASE 
            WHEN movement_type = 'DELIVERY_DELIVERED' THEN quantity 
            WHEN movement_type IN ('DELIVERY_COLLECTED', 'DAMAGE', 'LOST', 'WRITE_OFF') THEN -quantity 
            ELSE quantity END) FROM jar_movements WHERE customer_id = c.id), 0)
        ) as current_jars
      FROM customers c
      LEFT JOIN routes r ON c.route_id = r.id
      WHERE c.id = ?;
    `;
    return await db.getFirstAsync<Customer>(query, [id]);
  }

  static async createCustomer(data: {
    name: string;
    phone?: string;
    address?: string;
    route_id?: string;
    notes?: string;
    opening_balance_minor?: number;
    opening_jars?: number;
  }): Promise<Customer> {
    const db = await getDatabase();
    const id = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();
    const openingBalance = data.opening_balance_minor || 0;
    const openingJars = data.opening_jars || 0;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO customers (id, name, phone, address, route_id, notes, opening_balance_minor, opening_jars, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [
          id,
          data.name,
          data.phone || null,
          data.address || null,
          data.route_id || null,
          data.notes || null,
          openingBalance,
          openingJars,
          now,
          now,
        ]
      );

      // If opening balance > 0, post initial ledger debit
      if (openingBalance > 0) {
        await db.runAsync(
          `INSERT INTO ledger_entries (id, customer_id, entry_type, amount_minor, direction, reference_id, timestamp, description)
           VALUES (?, ?, 'OPENING_BALANCE', ?, 'DEBIT', ?, ?, 'Initial opening balance receivable');`,
          [`led_${Date.now()}`, id, openingBalance, id, now]
        );
      }

      // If opening jars > 0, log audit record
      await db.runAsync(
        `INSERT INTO audit_logs (id, action, entity, entity_id, details, timestamp)
         VALUES (?, 'CREATE', 'CUSTOMER', ?, ?, ?);`,
        [`aud_${Date.now()}`, id, `Created customer ${data.name} with ${openingJars} opening jars`, now]
      );
    });

    const created = await this.getCustomerById(id);
    if (!created) throw new Error('Failed to create customer');
    return created;
  }

  static async updateCustomer(
    id: string,
    data: {
      name: string;
      phone?: string;
      address?: string;
      route_id?: string;
      notes?: string;
    }
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE customers SET name = ?, phone = ?, address = ?, route_id = ?, notes = ?, updated_at = ? WHERE id = ?;`,
      [
        data.name,
        data.phone || null,
        data.address || null,
        data.route_id || null,
        data.notes || null,
        now,
        id,
      ]
    );
  }

  static async deactivateCustomer(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(`UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?;`, [
      now,
      id,
    ]);
  }

  static async activateCustomer(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(`UPDATE customers SET is_active = 1, updated_at = ? WHERE id = ?;`, [
      now,
      id,
    ]);
  }
}
