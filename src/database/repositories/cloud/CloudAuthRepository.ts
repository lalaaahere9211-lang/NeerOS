/**
 * Cloud Auth Repository
 *
 * Handles Supabase authentication operations and user profile management.
 * This is the cloud counterpart to the local UserRepository.
 */

import { isSupabaseConfigured, getSupabaseClient } from '../../../lib/supabase';
import type { Database } from '../../../types/supabase';

type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type BusinessMembership = Database['public']['Tables']['business_memberships']['Row'];
type BusinessProfile = Database['public']['Tables']['business_profiles']['Row'];

export class CloudAuthRepository {
  /**
   * Get the current user's profile from Supabase.
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured()) return null;

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[CloudAuth] Failed to get profile:', error.message);
      return null;
    }
    return data;
  }

  /**
   * Update the current user's profile.
   */
  static async updateProfile(
    userId: string,
    updates: { full_name?: string; avatar_url?: string }
  ): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) return { error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    return { error: error?.message ?? null };
  }

  /**
   * Get all businesses the user is a member of.
   */
  static async getUserBusinesses(userId: string): Promise<
    Array<BusinessProfile & { membership: BusinessMembership }>
  > {
    if (!isSupabaseConfigured()) return [];

    const supabase = getSupabaseClient();
    const { data: memberships, error } = await supabase
      .from('business_memberships')
      .select('*, business_profiles(*)')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !memberships) {
      console.error('[CloudAuth] Failed to get businesses:', error?.message);
      return [];
    }

    return memberships.map((m: Record<string, unknown>) => ({
      ...(m.business_profiles as BusinessProfile),
      membership: {
        id: m.id,
        business_id: m.business_id,
        user_id: m.user_id,
        role: m.role,
        display_name: m.display_name,
        phone: m.phone,
        is_active: m.is_active,
        created_at: m.created_at,
      } as BusinessMembership,
    }));
  }

  /**
   * Get all members of a business.
   */
  static async getBusinessMembers(businessId: string): Promise<BusinessMembership[]> {
    if (!isSupabaseConfigured()) return [];

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('business_memberships')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[CloudAuth] Failed to get members:', error.message);
      return [];
    }
    return data ?? [];
  }

  /**
   * Set the user's active business.
   */
  static async setActiveBusiness(userId: string, businessId: string): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) return { error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('user_profiles')
      .update({ active_business_id: businessId })
      .eq('id', userId);

    return { error: error?.message ?? null };
  }

  /**
   * Invite a new member to a business.
   */
  static async inviteMember(
    businessId: string,
    userId: string,
    role: 'OWNER' | 'OFFICE' | 'DELIVERY',
    displayName: string,
    phone?: string
  ): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured()) return { error: 'Cloud not configured' };

    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('business_memberships')
      .insert({
        business_id: businessId,
        user_id: userId,
        role,
        display_name: displayName,
        phone: phone || null,
      });

    return { error: error?.message ?? null };
  }
}
