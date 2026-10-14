/**
 * Cloud Inventory Repository
 *
 * Supabase CRUD for products, stock movements, and jar movements.
 */

import { isSupabaseConfigured, getSupabaseClient } from '../../../lib/supabase';
import type { Database } from '../../../types/supabase';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type StockMovementInsert = Database['public']['Tables']['stock_movements']['Insert'];
type JarMovementInsert = Database['public']['Tables']['jar_movements']['Insert'];

export class CloudInventoryRepository {
  static async getProducts(businessId: string): Promise<ProductRow[]> {
    if (!isSupabaseConfigured()) return [];

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (error) throw new Error(`CloudInventory.getProducts: ${error.message}`);
    return data ?? [];
  }

  static async upsertProduct(product: ProductInsert): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) return { error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('products')
      .upsert(product, { onConflict: 'id' });

    return { error: error?.message ?? null };
  }

  static async insertStockMovement(movement: StockMovementInsert): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) return { error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('stock_movements')
      .insert(movement);

    return { error: error?.message ?? null };
  }

  static async insertJarMovement(movement: JarMovementInsert): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) return { error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('jar_movements')
      .insert(movement);

    return { error: error?.message ?? null };
  }
}
