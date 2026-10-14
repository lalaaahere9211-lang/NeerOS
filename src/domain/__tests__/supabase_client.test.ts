/**
 * Unit tests for Supabase Client and Cloud Repositories fallback behavior.
 */

import { isSupabaseConfigured, getSupabaseClient } from '../../lib/supabase';
import { CloudAuthRepository } from '../../database/repositories/cloud/CloudAuthRepository';
import { CloudCustomerRepository } from '../../database/repositories/cloud/CloudCustomerRepository';
import { CloudInventoryRepository } from '../../database/repositories/cloud/CloudInventoryRepository';
import { CloudDeliveryRepository } from '../../database/repositories/cloud/CloudDeliveryRepository';
import { CloudBillingRepository } from '../../database/repositories/cloud/CloudBillingRepository';

describe('Supabase Client & Offline Fallbacks', () => {
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  });

  describe('Configuration Detection', () => {
    it('returns false when EXPO_PUBLIC_SUPABASE_URL is missing', () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      expect(isSupabaseConfigured()).toBe(false);
    });

    it('returns false when EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing', () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      expect(isSupabaseConfigured()).toBe(false);
    });

    it('throws when getSupabaseClient is called without credentials', () => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      expect(() => getSupabaseClient()).toThrow(/Missing Supabase configuration|Cannot initialize Supabase/i);
    });
  });

  describe('Cloud Repositories Graceful Degradation', () => {
    beforeEach(() => {
      delete process.env.EXPO_PUBLIC_SUPABASE_URL;
      delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    });

    it('CloudAuthRepository returns null/empty when unconfigured', async () => {
      const profile = await CloudAuthRepository.getProfile('user_123');
      expect(profile).toBeNull();

      const businesses = await CloudAuthRepository.getUserBusinesses('user_123');
      expect(businesses).toEqual([]);

      const updateRes = await CloudAuthRepository.updateProfile('user_123', { full_name: 'Test' });
      expect(updateRes.error).toBe('Cloud not configured');
    });

    it('CloudCustomerRepository returns empty array when unconfigured', async () => {
      const customers = await CloudCustomerRepository.getCustomers('biz_123');
      expect(customers).toEqual([]);
    });

    it('CloudInventoryRepository returns empty array when unconfigured', async () => {
      const products = await CloudInventoryRepository.getProducts('biz_123');
      expect(products).toEqual([]);
    });

    it('CloudDeliveryRepository returns error when unconfigured', async () => {
      const result = await CloudDeliveryRepository.recordDelivery(
        'biz_123',
        { id: 'del_1' },
        [],
        [],
        [],
        { id: 'led_1' }
      );
      expect(result.deliveryId).toBeNull();
      expect(result.error).toBe('Cloud not configured');
    });

    it('CloudBillingRepository returns error when unconfigured', async () => {
      const paymentRes = await CloudBillingRepository.recordPayment(
        'biz_123',
        { id: 'pay_1' },
        { id: 'led_1' }
      );
      expect(paymentRes.paymentId).toBeNull();
      expect(paymentRes.error).toBe('Cloud not configured');

      const reversalRes = await CloudBillingRepository.reversePayment(
        'biz_123',
        'pay_1',
        { id: 'rev_1' },
        { id: 'led_1' }
      );
      expect(reversalRes.reversalId).toBeNull();
      expect(reversalRes.error).toBe('Cloud not configured');
    });
  });
});
