import { getDatabase } from '../db';
import { JarMovement, JarMovementType } from '../../types/domain';

export class JarRepository {
  static async getCustomerJarBalance(customerId: string): Promise<number> {
    const db = await getDatabase();
    const customer = await db.getFirstAsync<{ opening_jars: number }>(
      'SELECT opening_jars FROM customers WHERE id = ?;',
      [customerId]
    );
    if (!customer) return 0;

    const row = await db.getFirstAsync<{ jar_delta: number }>(
      `SELECT SUM(CASE 
        WHEN movement_type = 'DELIVERY_DELIVERED' THEN quantity 
        WHEN movement_type IN ('DELIVERY_COLLECTED', 'DAMAGE', 'LOST', 'WRITE_OFF') THEN -quantity 
        ELSE quantity END) as jar_delta
       FROM jar_movements WHERE customer_id = ?;`,
      [customerId]
    );

    const delta = row?.jar_delta || 0;
    return Math.max(0, customer.opening_jars + delta);
  }

  static async getCustomerHeldJarsTotal(): Promise<number> {
    const db = await getDatabase();
    const openingRow = await db.getFirstAsync<{ total_opening: number }>(
      'SELECT SUM(opening_jars) as total_opening FROM customers WHERE is_active = 1;'
    );
    const deltaRow = await db.getFirstAsync<{ total_delta: number }>(
      `SELECT SUM(CASE 
        WHEN movement_type = 'DELIVERY_DELIVERED' THEN quantity 
        WHEN movement_type IN ('DELIVERY_COLLECTED', 'DAMAGE', 'LOST', 'WRITE_OFF') THEN -quantity 
        ELSE quantity END) as total_delta
       FROM jar_movements WHERE customer_id IS NOT NULL;`
    );

    const total = (openingRow?.total_opening || 0) + (deltaRow?.total_delta || 0);
    return Math.max(0, total);
  }

  static async getWarehouseEmptyJars(): Promise<number> {
    const db = await getDatabase();
    // Warehouse empties = all collected jars - damaged jars in warehouse
    const row = await db.getFirstAsync<{ empty_count: number }>(
      `SELECT (
        COALESCE(SUM(CASE WHEN movement_type = 'DELIVERY_COLLECTED' THEN quantity ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN movement_type IN ('DAMAGE', 'WRITE_OFF') AND customer_id IS NULL THEN quantity ELSE 0 END), 0)
       ) as empty_count
       FROM jar_movements;`
    );
    // Baseline warehouse buffer if no movements yet: 50
    const count = (row?.empty_count || 0) + 50;
    return Math.max(0, count);
  }

  static async recordJarAdjustment(data: {
    customerId?: string;
    movementType: JarMovementType;
    quantity: number;
    notes: string;
    userId?: string;
  }): Promise<void> {
    const db = await getDatabase();
    const id = `jm_adj_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO jar_movements (id, customer_id, movement_type, quantity, reference_id, user_id, timestamp, notes)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?);`,
        [
          id,
          data.customerId || null,
          data.movementType,
          data.quantity,
          data.userId || null,
          now,
          data.notes,
        ]
      );

      await db.runAsync(
        `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, timestamp)
         VALUES (?, ?, 'JAR_ADJUSTMENT', 'JAR', ?, ?, ?);`,
        [
          `aud_${Date.now()}`,
          data.userId || null,
          id,
          `Adjusted jars (${data.movementType}): ${data.quantity} jars. Notes: ${data.notes}`,
          now,
        ]
      );
    });
  }

  static async getJarMovements(customerId?: string): Promise<JarMovement[]> {
    const db = await getDatabase();
    let query = `
      SELECT 
        jm.*,
        c.name as customer_name,
        u.name as user_name
      FROM jar_movements jm
      LEFT JOIN customers c ON jm.customer_id = c.id
      LEFT JOIN users u ON jm.user_id = u.id
    `;
    const params: string[] = [];
    if (customerId) {
      query += ' WHERE jm.customer_id = ?';
      params.push(customerId);
    }
    query += ' ORDER BY jm.timestamp DESC LIMIT 100;';
    return await db.getAllAsync<JarMovement>(query, params);
  }
}
