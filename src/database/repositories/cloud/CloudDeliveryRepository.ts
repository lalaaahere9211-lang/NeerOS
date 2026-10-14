/**
 * Cloud Delivery Repository
 *
 * Uses the server-side record_delivery_atomic function for consistency.
 */

import { isSupabaseConfigured, getSupabaseClient } from '../../../lib/supabase';
import type { Database } from '../../../types/supabase';

type DeliveryRow = Database['public']['Tables']['deliveries']['Row'];
type DeliveryItemRow = Database['public']['Tables']['delivery_items']['Row'];

export class CloudDeliveryRepository {
  /**
   * Record a delivery atomically using the server-side function.
   * Returns the delivery ID.
   */
  static async recordDelivery(
    businessId: string,
    delivery: Record<string, unknown>,
    items: Record<string, unknown>[],
    stockMovements: Record<string, unknown>[],
    jarMovements: Record<string, unknown>[],
    ledgerEntry: Record<string, unknown>
  ): Promise<{ deliveryId: string | null; error: string | null }> {
    if (!isSupabaseConfigured()) return { deliveryId: null, error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('record_delivery_atomic', {
      p_business_id: businessId,
      p_delivery: delivery,
      p_items: items,
      p_stock_movements: stockMovements,
      p_jar_movements: jarMovements,
      p_ledger_entry: ledgerEntry,
    });

    if (error) return { deliveryId: null, error: error.message };
    return { deliveryId: data as string, error: null };
  }

  /**
   * Get deliveries for a business, optionally filtered by date and customer.
   */
  static async getDeliveries(
    businessId: string,
    options?: { date?: string; customerId?: string }
  ): Promise<DeliveryRow[]> {
    if (!isSupabaseConfigured()) return [];

    const supabase = getSupabaseClient();
    let query = supabase
      .from('deliveries')
      .select('*')
      .eq('business_id', businessId)
      .order('delivery_date', { ascending: false })
      .order('delivery_time', { ascending: false });

    if (options?.date) {
      query = query.eq('delivery_date', options.date);
    }
    if (options?.customerId) {
      query = query.eq('customer_id', options.customerId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`CloudDelivery.getDeliveries: ${error.message}`);
    return data ?? [];
  }

  /**
   * Get delivery items for a given delivery.
   */
  static async getDeliveryItems(deliveryId: string): Promise<DeliveryItemRow[]> {
    if (!isSupabaseConfigured()) return [];

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('delivery_items')
      .select('*')
      .eq('delivery_id', deliveryId);

    if (error) throw new Error(`CloudDelivery.getDeliveryItems: ${error.message}`);
    return data ?? [];
  }
}
