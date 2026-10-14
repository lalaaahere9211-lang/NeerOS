import { getDatabase } from '../db';
import { Product, StockMovement, StockMovementReason } from '../../types/domain';

export class ProductRepository {
  static async getProducts(activeOnly: boolean = false): Promise<Product[]> {
    const db = await getDatabase();
    let query = 'SELECT * FROM products';
    if (activeOnly) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY name ASC;';
    return await db.getAllAsync<Product>(query);
  }

  static async getProductById(id: string): Promise<Product | null> {
    const db = await getDatabase();
    return await db.getFirstAsync<Product>('SELECT * FROM products WHERE id = ?;', [id]);
  }

  static async createProduct(data: {
    name: string;
    unit: string;
    current_rate_minor: number;
    stock_quantity: number;
    low_stock_threshold: number;
    is_returnable: number;
  }): Promise<Product> {
    const db = await getDatabase();
    const id = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO products (id, name, unit, current_rate_minor, stock_quantity, low_stock_threshold, is_returnable, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [
          id,
          data.name,
          data.unit,
          data.current_rate_minor,
          data.stock_quantity,
          data.low_stock_threshold,
          data.is_returnable,
          now,
          now,
        ]
      );

      if (data.stock_quantity > 0) {
        await db.runAsync(
          `INSERT INTO stock_movements (id, product_id, delta, reason, reference_id, user_id, timestamp, notes)
           VALUES (?, ?, ?, 'RESTOCK', ?, NULL, ?, 'Initial opening stock quantity');`,
          [`sm_${Date.now()}`, id, data.stock_quantity, id, now]
        );
      }
    });

    const created = await this.getProductById(id);
    if (!created) throw new Error('Failed to create product');
    return created;
  }

  static async updateProduct(
    id: string,
    data: {
      name: string;
      unit: string;
      current_rate_minor: number;
      low_stock_threshold: number;
      is_returnable: number;
    }
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE products 
       SET name = ?, unit = ?, current_rate_minor = ?, low_stock_threshold = ?, is_returnable = ?, updated_at = ?
       WHERE id = ?;`,
      [
        data.name,
        data.unit,
        data.current_rate_minor,
        data.low_stock_threshold,
        data.is_returnable,
        now,
        id,
      ]
    );
  }

  static async adjustStock(data: {
    productId: string;
    delta: number;
    reason: StockMovementReason;
    notes?: string;
    userId?: string;
  }): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const smId = `sm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    await db.withTransactionAsync(async () => {
      // 1. Insert stock movement record
      await db.runAsync(
        `INSERT INTO stock_movements (id, product_id, delta, reason, reference_id, user_id, timestamp, notes)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?);`,
        [smId, data.productId, data.delta, data.reason, data.userId || null, now, data.notes || null]
      );

      // 2. Update current product stock quantity
      await db.runAsync(
        `UPDATE products 
         SET stock_quantity = stock_quantity + ?, updated_at = ?
         WHERE id = ?;`,
        [data.delta, now, data.productId]
      );

      // 3. Log audit event
      await db.runAsync(
        `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, timestamp)
         VALUES (?, ?, 'STOCK_ADJUSTMENT', ?, ?, ?);`,
        [
          `aud_${Date.now()}`,
          data.userId || null,
          data.productId,
          `Adjusted stock by ${data.delta > 0 ? '+' : ''}${data.delta} (${data.reason}). Notes: ${data.notes || 'None'}`,
          now,
        ]
      );
    });
  }

  static async getStockMovements(productId?: string): Promise<StockMovement[]> {
    const db = await getDatabase();
    let query = `
      SELECT sm.*, p.name as product_name, u.name as user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.user_id = u.id
    `;
    const params: string[] = [];
    if (productId) {
      query += ' WHERE sm.product_id = ?';
      params.push(productId);
    }
    query += ' ORDER BY sm.timestamp DESC LIMIT 100;';
    return await db.getAllAsync<StockMovement>(query, params);
  }
}
