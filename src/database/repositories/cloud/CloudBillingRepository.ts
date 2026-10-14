/**
 * Cloud Billing Repository
 *
 * Uses server-side atomic functions for payment and reversal operations.
 */

import { isSupabaseConfigured, getSupabaseClient } from '../../../lib/supabase';
import type { Database } from '../../../types/supabase';

type PaymentRow = Database['public']['Tables']['payments']['Row'];
type BillRow = Database['public']['Tables']['bills']['Row'];
type LedgerEntryRow = Database['public']['Tables']['ledger_entries']['Row'];

export class CloudBillingRepository {
  /**
   * Record a payment atomically using the server-side function.
   */
  static async recordPayment(
    businessId: string,
    payment: Record<string, unknown>,
    ledgerEntry: Record<string, unknown>
  ): Promise<{ paymentId: string | null; error: string | null }> {
    if (!isSupabaseConfigured()) return { paymentId: null, error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('record_payment_atomic', {
      p_business_id: businessId,
      p_payment: payment,
      p_ledger_entry: ledgerEntry,
    });

    if (error) return { paymentId: null, error: error.message };
    return { paymentId: data as string, error: null };
  }

  /**
   * Reverse a payment atomically using the server-side function.
   */
  static async reversePayment(
    businessId: string,
    paymentId: string,
    reversal: Record<string, unknown>,
    ledgerEntry: Record<string, unknown>
  ): Promise<{ reversalId: string | null; error: string | null }> {
    if (!isSupabaseConfigured()) return { reversalId: null, error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('reverse_payment_atomic', {
      p_business_id: businessId,
      p_payment_id: paymentId,
      p_reversal: reversal,
      p_ledger_entry: ledgerEntry,
    });

    if (error) return { reversalId: null, error: error.message };
    return { reversalId: data as string, error: null };
  }

  /**
   * Get payments for a business.
   */
  static async getPayments(
    businessId: string,
    customerId?: string
  ): Promise<PaymentRow[]> {
    if (!isSupabaseConfigured()) return [];

    const supabase = getSupabaseClient();
    let query = supabase
      .from('payments')
      .select('*')
      .eq('business_id', businessId)
      .order('payment_date', { ascending: false });

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    const { data, error } = await query;
    if (error) throw new Error(`CloudBilling.getPayments: ${error.message}`);
    return data ?? [];
  }

  /**
   * Get ledger entries for a customer.
   */
  static async getLedgerEntries(
    businessId: string,
    customerId: string
  ): Promise<LedgerEntryRow[]> {
    if (!isSupabaseConfigured()) return [];

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`CloudBilling.getLedgerEntries: ${error.message}`);
    return data ?? [];
  }

  /**
   * Upsert a bill (for sync purposes).
   */
  static async upsertBill(
    bill: Database['public']['Tables']['bills']['Insert']
  ): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) return { error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('bills')
      .upsert(bill, { onConflict: 'id' });

    return { error: error?.message ?? null };
  }
}
