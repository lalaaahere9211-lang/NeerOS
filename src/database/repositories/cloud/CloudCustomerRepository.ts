/**
 * Cloud Customer Repository
 *
 * Supabase CRUD operations for customers, scoped to the user's active business.
 */

import { isSupabaseConfigured, getSupabaseClient } from '../../../lib/supabase';
import type { Database } from '../../../types/supabase';

type CustomerRow = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

export class CloudCustomerRepository {
  static async getCustomers(
    businessId: string,
    options?: { search?: string; routeId?: string; activeOnly?: boolean }
  ): Promise<CustomerRow[]> {
    if (!isSupabaseConfigured()) return [];

    const supabase = getSupabaseClient();
    let query = supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId)
      .order('name', { ascending: true });

    if (options?.activeOnly) {
      query = query.eq('is_active', true);
    }

    if (options?.routeId && options.routeId !== 'ALL') {
      query = query.eq('route_id', options.routeId);
    }

    if (options?.search?.trim()) {
      const s = `%${options.search.trim()}%`;
      query = query.or(`name.ilike.${s},phone.ilike.${s},address.ilike.${s}`);
    }

    const { data, error } = await query;
    if (error) throw new Error(`CloudCustomer.getCustomers: ${error.message}`);
    return data ?? [];
  }

  static async getCustomerById(id: string): Promise<CustomerRow | null> {
    if (!isSupabaseConfigured()) return null;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  static async upsertCustomer(customer: CustomerInsert): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) return { error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('customers')
      .upsert(customer, { onConflict: 'id' });

    return { error: error?.message ?? null };
  }

  static async updateCustomer(id: string, updates: CustomerUpdate): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) return { error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id);

    return { error: error?.message ?? null };
  }
}
