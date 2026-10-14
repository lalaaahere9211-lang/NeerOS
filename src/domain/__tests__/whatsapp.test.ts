jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn().mockResolvedValue(true),
    openURL: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));

import { WhatsAppService } from '../../services/whatsappService';
import { Customer, Delivery, Bill, Payment } from '../../types/domain';

describe('WhatsApp Message Construction & Integrity', () => {
  const mockCustomer: Customer = {
    id: 'cust_test',
    name: 'Sharma General Store',
    phone: '9822012345',
    address: 'Pune',
    opening_balance_minor: 0,
    opening_jars: 2,
    is_active: 1,
    created_at: '2026-10-01',
    updated_at: '2026-10-01',
  };

  test('formatPhoneNumber cleans and adds 91 country code for Indian numbers', () => {
    expect(WhatsAppService.formatPhoneNumber('9822012345')).toBe('919822012345');
    expect(WhatsAppService.formatPhoneNumber('+91 98220 12345')).toBe('919822012345');
    expect(WhatsAppService.formatPhoneNumber('')).toBe('');
  });

  test('buildDeliverySummaryText contains customer name, items, jar counts, and net balance', () => {
    const mockDelivery: Delivery = {
      id: 'del_1',
      customer_id: 'cust_test',
      delivered_by_user_id: 'usr_1',
      delivery_date: '2026-10-14',
      delivery_time: '08:30:00',
      status: 'COMPLETED',
      total_amount_minor: 8000, // ₹80.00
      jars_delivered: 2,
      jars_collected: 1,
      created_at: '2026-10-14',
      updated_at: '2026-10-14',
      items: [
        {
          id: 'item_1',
          delivery_id: 'del_1',
          product_id: 'prod_1',
          quantity: 2,
          unit_rate_snapshot_minor: 4000,
          total_price_minor: 8000,
          product_name_snapshot: '20L Water Jar',
        },
      ],
    };

    const text = WhatsAppService.buildDeliverySummaryText(mockCustomer, mockDelivery, 8000, 3);
    expect(text).toContain('Sharma General Store');
    expect(text).toContain('20L Water Jar');
    expect(text).toContain('₹80.00');
    expect(text).toContain('भरे जार दिए (Jars Delivered): *2*');
    expect(text).toContain('खाली जार लिए (Jars Collected): *1*');
    expect(text).toContain('कुल बकाया (Current Balance): *₹80.00*');
    expect(text).toContain('आपके पास कुल जार (Held Jars): *3*');
  });

  test('buildBillSummaryText constructs monthly bill breakdown', () => {
    const mockBill: Bill = {
      id: 'bill_1',
      bill_number: 'PB-202610-0001',
      customer_id: 'cust_test',
      period_start: '2026-10-01',
      period_end: '2026-10-31',
      previous_balance_minor: 50000, // ₹500.00
      period_charges_minor: 40000,   // ₹400.00
      period_payments_minor: 30000,  // ₹300.00
      closing_balance_minor: 60000,  // ₹600.00
      status: 'ISSUED',
      generated_at: '2026-10-31',
      generated_by_user_id: 'usr_1',
    };

    const text = WhatsAppService.buildBillSummaryText(mockBill, mockCustomer);
    expect(text).toContain('PB-202610-0001');
    expect(text).toContain('₹500.00');
    expect(text).toContain('₹400.00');
    expect(text).toContain('- ₹300.00');
    expect(text).toContain('कुल देय राशि (Net Amount Due): ₹600.00');
  });

  test('buildReceiptText constructs payment receipt summary', () => {
    const mockPayment: Payment = {
      id: 'pay_99',
      customer_id: 'cust_test',
      amount_minor: 50000, // ₹500.00
      payment_date: '2026-10-14',
      payment_method: 'UPI',
      reference_number: 'UPI987654321',
      recorded_by_user_id: 'usr_1',
      is_reversed: 0,
      created_at: '2026-10-14',
    };

    const text = WhatsAppService.buildReceiptText(mockPayment, mockCustomer);
    expect(text).toContain('pay_99');
    expect(text).toContain('UPI');
    expect(text).toContain('UPI987654321');
    expect(text).toContain('₹500.00');
  });
});
