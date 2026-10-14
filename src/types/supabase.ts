/**
 * Supabase Database type definitions for NeerOS.
 *
 * These types mirror the PostgreSQL schema defined in supabase/migrations/.
 * Regenerate with: npx supabase gen types typescript --local > src/types/supabase.ts
 * (or from remote: npx supabase gen types typescript --project-id <ref>)
 *
 * For now, hand-maintained to match the migration schema exactly.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      business_profiles: {
        Row: {
          id: string;
          name: string;
          tagline: string | null;
          address: string | null;
          phone: string | null;
          currency: string;
          locale: string;
          owner_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tagline?: string | null;
          address?: string | null;
          phone?: string | null;
          currency?: string;
          locale?: string;
          owner_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tagline?: string | null;
          address?: string | null;
          phone?: string | null;
          currency?: string;
          locale?: string;
          owner_user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_memberships: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: 'OWNER' | 'OFFICE' | 'DELIVERY';
          display_name: string;
          phone: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role: 'OWNER' | 'OFFICE' | 'DELIVERY';
          display_name: string;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          role?: 'OWNER' | 'OFFICE' | 'DELIVERY';
          display_name?: string;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          active_business_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          active_business_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          active_business_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      routes: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          phone: string | null;
          address: string | null;
          route_id: string | null;
          notes: string | null;
          opening_balance_minor: number;
          opening_jars: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          phone?: string | null;
          address?: string | null;
          route_id?: string | null;
          notes?: string | null;
          opening_balance_minor?: number;
          opening_jars?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          phone?: string | null;
          address?: string | null;
          route_id?: string | null;
          notes?: string | null;
          opening_balance_minor?: number;
          opening_jars?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          unit: string;
          current_rate_minor: number;
          stock_quantity: number;
          low_stock_threshold: number;
          is_returnable: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          unit?: string;
          current_rate_minor: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          is_returnable?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          name?: string;
          unit?: string;
          current_rate_minor?: number;
          stock_quantity?: number;
          low_stock_threshold?: number;
          is_returnable?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      deliveries: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          route_id: string | null;
          delivered_by_membership_id: string;
          delivery_date: string;
          delivery_time: string;
          status: 'COMPLETED' | 'CANCELLED';
          total_amount_minor: number;
          jars_delivered: number;
          jars_collected: number;
          notes: string | null;
          idempotency_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          route_id?: string | null;
          delivered_by_membership_id: string;
          delivery_date: string;
          delivery_time: string;
          status?: 'COMPLETED' | 'CANCELLED';
          total_amount_minor?: number;
          jars_delivered?: number;
          jars_collected?: number;
          notes?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string;
          route_id?: string | null;
          delivered_by_membership_id?: string;
          delivery_date?: string;
          delivery_time?: string;
          status?: 'COMPLETED' | 'CANCELLED';
          total_amount_minor?: number;
          jars_delivered?: number;
          jars_collected?: number;
          notes?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      delivery_items: {
        Row: {
          id: string;
          delivery_id: string;
          product_id: string;
          quantity: number;
          unit_rate_snapshot_minor: number;
          total_price_minor: number;
          product_name_snapshot: string;
        };
        Insert: {
          id?: string;
          delivery_id: string;
          product_id: string;
          quantity: number;
          unit_rate_snapshot_minor: number;
          total_price_minor: number;
          product_name_snapshot: string;
        };
        Update: {
          id?: string;
          delivery_id?: string;
          product_id?: string;
          quantity?: number;
          unit_rate_snapshot_minor?: number;
          total_price_minor?: number;
          product_name_snapshot?: string;
        };
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          business_id: string;
          product_id: string;
          delta: number;
          reason: 'DELIVERY' | 'RESTOCK' | 'DAMAGE' | 'AUDIT_CORRECTION';
          reference_id: string | null;
          membership_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          product_id: string;
          delta: number;
          reason: 'DELIVERY' | 'RESTOCK' | 'DAMAGE' | 'AUDIT_CORRECTION';
          reference_id?: string | null;
          membership_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          product_id?: string;
          delta?: number;
          reason?: 'DELIVERY' | 'RESTOCK' | 'DAMAGE' | 'AUDIT_CORRECTION';
          reference_id?: string | null;
          membership_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      jar_movements: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          movement_type: 'DELIVERY_DELIVERED' | 'DELIVERY_COLLECTED' | 'DAMAGE' | 'LOST' | 'WRITE_OFF' | 'AUDIT_ADJUSTMENT';
          quantity: number;
          reference_id: string | null;
          membership_id: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id?: string | null;
          movement_type: 'DELIVERY_DELIVERED' | 'DELIVERY_COLLECTED' | 'DAMAGE' | 'LOST' | 'WRITE_OFF' | 'AUDIT_ADJUSTMENT';
          quantity: number;
          reference_id?: string | null;
          membership_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string | null;
          movement_type?: 'DELIVERY_DELIVERED' | 'DELIVERY_COLLECTED' | 'DAMAGE' | 'LOST' | 'WRITE_OFF' | 'AUDIT_ADJUSTMENT';
          quantity?: number;
          reference_id?: string | null;
          membership_id?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          amount_minor: number;
          payment_date: string;
          payment_method: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
          reference_number: string | null;
          recorded_by_membership_id: string;
          is_reversed: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          amount_minor: number;
          payment_date: string;
          payment_method: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
          reference_number?: string | null;
          recorded_by_membership_id: string;
          is_reversed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string;
          amount_minor?: number;
          payment_date?: string;
          payment_method?: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
          reference_number?: string | null;
          recorded_by_membership_id?: string;
          is_reversed?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payment_reversals: {
        Row: {
          id: string;
          business_id: string;
          payment_id: string;
          amount_minor: number;
          reason: string;
          membership_id: string;
          reversed_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          payment_id: string;
          amount_minor: number;
          reason: string;
          membership_id: string;
          reversed_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          payment_id?: string;
          amount_minor?: number;
          reason?: string;
          membership_id?: string;
          reversed_at?: string;
        };
        Relationships: [];
      };
      bills: {
        Row: {
          id: string;
          business_id: string;
          bill_number: string;
          customer_id: string;
          period_start: string;
          period_end: string;
          previous_balance_minor: number;
          period_charges_minor: number;
          period_payments_minor: number;
          closing_balance_minor: number;
          status: 'ISSUED' | 'SETTLED' | 'CANCELLED';
          generated_at: string;
          generated_by_membership_id: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          bill_number: string;
          customer_id: string;
          period_start: string;
          period_end: string;
          previous_balance_minor: number;
          period_charges_minor: number;
          period_payments_minor: number;
          closing_balance_minor: number;
          status?: 'ISSUED' | 'SETTLED' | 'CANCELLED';
          generated_at?: string;
          generated_by_membership_id: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          bill_number?: string;
          customer_id?: string;
          period_start?: string;
          period_end?: string;
          previous_balance_minor?: number;
          period_charges_minor?: number;
          period_payments_minor?: number;
          closing_balance_minor?: number;
          status?: 'ISSUED' | 'SETTLED' | 'CANCELLED';
          generated_at?: string;
          generated_by_membership_id?: string;
        };
        Relationships: [];
      };
      bill_items: {
        Row: {
          id: string;
          bill_id: string;
          delivery_id: string | null;
          item_date: string;
          description: string;
          quantity: number;
          rate_minor: number;
          total_minor: number;
        };
        Insert: {
          id?: string;
          bill_id: string;
          delivery_id?: string | null;
          item_date: string;
          description: string;
          quantity: number;
          rate_minor: number;
          total_minor: number;
        };
        Update: {
          id?: string;
          bill_id?: string;
          delivery_id?: string | null;
          item_date?: string;
          description?: string;
          quantity?: number;
          rate_minor?: number;
          total_minor?: number;
        };
        Relationships: [];
      };
      ledger_entries: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string;
          entry_type: 'OPENING_BALANCE' | 'DELIVERY_CHARGE' | 'PAYMENT' | 'PAYMENT_REVERSAL' | 'CREDIT_ADJUSTMENT' | 'DEBIT_ADJUSTMENT';
          amount_minor: number;
          direction: 'DEBIT' | 'CREDIT';
          reference_id: string | null;
          description: string;
          membership_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id: string;
          entry_type: 'OPENING_BALANCE' | 'DELIVERY_CHARGE' | 'PAYMENT' | 'PAYMENT_REVERSAL' | 'CREDIT_ADJUSTMENT' | 'DEBIT_ADJUSTMENT';
          amount_minor: number;
          direction: 'DEBIT' | 'CREDIT';
          reference_id?: string | null;
          description: string;
          membership_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string;
          entry_type?: 'OPENING_BALANCE' | 'DELIVERY_CHARGE' | 'PAYMENT' | 'PAYMENT_REVERSAL' | 'CREDIT_ADJUSTMENT' | 'DEBIT_ADJUSTMENT';
          amount_minor?: number;
          direction?: 'DEBIT' | 'CREDIT';
          reference_id?: string | null;
          description?: string;
          membership_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          business_id: string;
          membership_id: string | null;
          action: string;
          entity: string;
          entity_id: string;
          details: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          membership_id?: string | null;
          action: string;
          entity: string;
          entity_id: string;
          details?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          membership_id?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string;
          details?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sync_queue: {
        Row: {
          id: string;
          user_id: string | null;
          table_name: string;
          record_id: string;
          operation: 'INSERT' | 'UPDATE' | 'DELETE';
          payload: Json;
          status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
          attempts: number;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          table_name: string;
          record_id: string;
          operation: 'INSERT' | 'UPDATE' | 'DELETE';
          payload?: Json;
          status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
          attempts?: number;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          table_name?: string;
          record_id?: string;
          operation?: 'INSERT' | 'UPDATE' | 'DELETE';
          payload?: Json;
          status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
          attempts?: number;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_business_id: {
        Args: Record<string, unknown>;
        Returns: string | null;
      };
      record_delivery_atomic: {
        Args: {
          p_business_id: string;
          p_delivery: Record<string, unknown> | Json;
          p_items: Record<string, unknown>[] | Json;
          p_stock_movements: Record<string, unknown>[] | Json;
          p_jar_movements: Record<string, unknown>[] | Json;
          p_ledger_entry: Record<string, unknown> | Json;
        };
        Returns: string;
      };
      record_payment_atomic: {
        Args: {
          p_business_id: string;
          p_payment: Record<string, unknown> | Json;
          p_ledger_entry: Record<string, unknown> | Json;
        };
        Returns: string;
      };
      reverse_payment_atomic: {
        Args: {
          p_business_id: string;
          p_payment_id: string;
          p_reversal: Record<string, unknown> | Json;
          p_ledger_entry: Record<string, unknown> | Json;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: 'OWNER' | 'OFFICE' | 'DELIVERY';
      delivery_status: 'COMPLETED' | 'CANCELLED';
      stock_movement_reason: 'DELIVERY' | 'RESTOCK' | 'DAMAGE' | 'AUDIT_CORRECTION';
      jar_movement_type: 'DELIVERY_DELIVERED' | 'DELIVERY_COLLECTED' | 'DAMAGE' | 'LOST' | 'WRITE_OFF' | 'AUDIT_ADJUSTMENT';
      payment_method: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
      bill_status: 'ISSUED' | 'SETTLED' | 'CANCELLED';
      ledger_entry_type: 'OPENING_BALANCE' | 'DELIVERY_CHARGE' | 'PAYMENT' | 'PAYMENT_REVERSAL' | 'CREDIT_ADJUSTMENT' | 'DEBIT_ADJUSTMENT';
      ledger_direction: 'DEBIT' | 'CREDIT';
      sync_operation: 'INSERT' | 'UPDATE' | 'DELETE';
      sync_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    };
  };
}
