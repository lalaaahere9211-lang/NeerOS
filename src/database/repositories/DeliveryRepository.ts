import { getDatabase } from '../db';
import { Delivery, DeliveryItem } from '../../types/domain';

export interface RecordDeliveryInput {
  customerId: string;
  routeId?: string;
  deliveredByUserId: string;
  deliveryDate: string; // YYYY-MM-DD
  deliveryTime: string; // HH:MM:SS
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitRateMinor: number;
    isReturnable: number;
  }>;
  jarsDelivered: number;
  jarsCollected: number;
  notes?: string;
  idempotencyKey?: string;
}

export class DeliveryRepository {
  static async recordDelivery(input: RecordDeliveryInput): Promise<Delivery> {
    const db = await getDatabase();
    const deliveryId = `del_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();

    // Calculate total amount in minor units
    let totalAmountMinor = 0;
    for (const item of input.items) {
      totalAmountMinor += item.quantity * item.unitRateMinor;
    }

    let createdDelivery: Delivery | null = null;

    await db.withTransactionAsync(async () => {
      // 1. Idempotency check if key provided
      if (input.idempotencyKey) {
        const existing = await db.getFirstAsync<Delivery>(
          'SELECT * FROM deliveries WHERE idempotency_key = ?;',
          [input.idempotencyKey]
        );
        if (existing) {
          createdDelivery = existing;
          return;
        }
      }

      // 2. Insert delivery record
      await db.runAsync(
        `INSERT INTO deliveries (
          id, customer_id, route_id, delivered_by_user_id, delivery_date, delivery_time,
          status, total_amount_minor, jars_delivered, jars_collected, notes, idempotency_key, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, ?, ?, ?, ?);`,
        [
          deliveryId,
          input.customerId,
          input.routeId || null,
          input.deliveredByUserId,
          input.deliveryDate,
          input.deliveryTime,
          totalAmountMinor,
          input.jarsDelivered,
          input.jarsCollected,
          input.notes || null,
          input.idempotencyKey || null,
          now,
          now,
        ]
      );

      // 3. Insert delivery items and deduct stock
      for (const item of input.items) {
        const itemId = `ditem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const lineTotal = item.quantity * item.unitRateMinor;

        await db.runAsync(
          `INSERT INTO delivery_items (
            id, delivery_id, product_id, quantity, unit_rate_snapshot_minor, total_price_minor, product_name_snapshot
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            itemId,
            deliveryId,
            item.productId,
            item.quantity,
            item.unitRateMinor,
            lineTotal,
            item.productName,
          ]
        );

        // Deduct product stock inventory
        await db.runAsync(
          `UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?;`,
          [item.quantity, now, item.productId]
        );

        // Record stock movement
        await db.runAsync(
          `INSERT INTO stock_movements (id, product_id, delta, reason, reference_id, user_id, timestamp, notes)
           VALUES (?, ?, ?, 'DELIVERY', ?, ?, ?, 'Daily Delivery to customer');`,
          [
            `sm_${Date.now()}_${Math.random().toString(36).substr(2, 3)}`,
            item.productId,
            -item.quantity,
            deliveryId,
            input.deliveredByUserId,
            now,
          ]
        );
      }

      // 4. Record jar movements
      if (input.jarsDelivered > 0) {
        await db.runAsync(
          `INSERT INTO jar_movements (id, customer_id, movement_type, quantity, reference_id, user_id, timestamp, notes)
           VALUES (?, ?, 'DELIVERY_DELIVERED', ?, ?, ?, ?, 'Filled jars delivered');`,
          [
            `jm_del_${Date.now()}`,
            input.customerId,
            input.jarsDelivered,
            deliveryId,
            input.deliveredByUserId,
            now,
          ]
        );
      }

      if (input.jarsCollected > 0) {
        await db.runAsync(
          `INSERT INTO jar_movements (id, customer_id, movement_type, quantity, reference_id, user_id, timestamp, notes)
           VALUES (?, ?, 'DELIVERY_COLLECTED', ?, ?, ?, ?, 'Empty jars collected');`,
          [
            `jm_col_${Date.now()}`,
            input.customerId,
            input.jarsCollected,
            deliveryId,
            input.deliveredByUserId,
            now,
          ]
        );
      }

      // 5. Post financial charge to customer ledger (Single Charging Path)
      if (totalAmountMinor > 0) {
        await db.runAsync(
          `INSERT INTO ledger_entries (
            id, customer_id, entry_type, amount_minor, direction, reference_id, timestamp, description, user_id
          ) VALUES (?, ?, 'DELIVERY_CHARGE', ?, 'DEBIT', ?, ?, ?, ?);`,
          [
            `led_${Date.now()}`,
            input.customerId,
            totalAmountMinor,
            deliveryId,
            now,
            `Delivery charge (${input.items.map((i) => `${i.productName} x${i.quantity}`).join(', ')})`,
            input.deliveredByUserId,
          ]
        );
      }

      // 6. Audit log
      await db.runAsync(
        `INSERT INTO audit_logs (id, user_id, action, entity, entity_id, details, timestamp)
         VALUES (?, ?, 'RECORD_DELIVERY', 'DELIVERY', ?, ?, ?);`,
        [
          `aud_${Date.now()}`,
          input.deliveredByUserId,
          deliveryId,
          `Recorded delivery of ₹${(totalAmountMinor / 100).toFixed(2)}, Jars Delivered: ${input.jarsDelivered}, Jars Collected: ${input.jarsCollected}`,
          now,
        ]
      );

      const created = await DeliveryRepository.getDeliveryById(deliveryId);
      if (!created) throw new Error('Failed to retrieve recorded delivery');
      createdDelivery = created;
    });

    if (!createdDelivery) throw new Error('Failed to create delivery');
    return createdDelivery;
  }

  static async getDeliveries(date?: string, customerId?: string): Promise<Delivery[]> {
    const db = await getDatabase();
    let query = `
      SELECT 
        d.*,
        c.name as customer_name,
        r.name as route_name,
        u.name as delivered_by_user_name
      FROM deliveries d
      JOIN customers c ON d.customer_id = c.id
      LEFT JOIN routes r ON d.route_id = r.id
      LEFT JOIN users u ON d.delivered_by_user_id = u.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (date) {
      query += ' AND d.delivery_date = ?';
      params.push(date);
    }

    if (customerId) {
      query += ' AND d.customer_id = ?';
      params.push(customerId);
    }

    query += ' ORDER BY d.delivery_date DESC, d.delivery_time DESC;';
    const deliveries = await db.getAllAsync<Delivery>(query, params);

    // Fetch items for each delivery
    for (const d of deliveries) {
      d.items = await db.getAllAsync<DeliveryItem>(
        'SELECT * FROM delivery_items WHERE delivery_id = ?;',
        [d.id]
      );
    }

    return deliveries;
  }

  static async getDeliveryById(id: string): Promise<Delivery | null> {
    const db = await getDatabase();
    const query = `
      SELECT 
        d.*,
        c.name as customer_name,
        r.name as route_name,
        u.name as delivered_by_user_name
      FROM deliveries d
      JOIN customers c ON d.customer_id = c.id
      LEFT JOIN routes r ON d.route_id = r.id
      LEFT JOIN users u ON d.delivered_by_user_id = u.id
      WHERE d.id = ?;
    `;
    const delivery = await db.getFirstAsync<Delivery>(query, [id]);
    if (delivery) {
      delivery.items = await db.getAllAsync<DeliveryItem>(
        'SELECT * FROM delivery_items WHERE delivery_id = ?;',
        [delivery.id]
      );
    }
    return delivery;
  }
}
