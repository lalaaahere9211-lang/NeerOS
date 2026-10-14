import {
  minorToRupees,
  rupeesToMinor,
  formatINR,
  calculateCustomerBalance,
  computeRunningBalances,
  calculateBillSummary,
} from '../accounting';
import { calculateCustomerJarBalance, calculateWarehouseEmptyJars } from '../jars';
import { calculateCurrentStock, isLowStock } from '../inventory';
import { hasCapability } from '../roles';

describe('Domain Accounting & Financial Integrity', () => {
  test('minorToRupees and rupeesToMinor conversions are exact', () => {
    expect(minorToRupees(4000)).toBe(40);
    expect(minorToRupees(4250)).toBe(42.5);
    expect(rupeesToMinor(40)).toBe(4000);
    expect(rupeesToMinor(42.5)).toBe(4250);
  });

  test('formatINR formats currency according to Indian conventions', () => {
    expect(formatINR(4000)).toBe('₹40.00');
    expect(formatINR(125050)).toBe('₹1,250.50');
    expect(formatINR(10000000)).toBe('₹1,00,000.00');
    expect(formatINR(-5000)).toBe('- ₹50.00');
  });

  test('calculateCustomerBalance adheres to receivable ledger convention', () => {
    // Opening balance: 500.00 (50000 paise)
    // Delivery 1 (debit): 120.00 (12000 paise)
    // Payment 1 (credit): 400.00 (40000 paise)
    // Payment Reversal (debit): 400.00 (40000 paise)
    // Expected: 50000 + 12000 - 40000 + 40000 = 62000
    const entries: Array<{ amount_minor: number; direction: 'DEBIT' | 'CREDIT' }> = [
      { amount_minor: 12000, direction: 'DEBIT' },
      { amount_minor: 40000, direction: 'CREDIT' },
      { amount_minor: 40000, direction: 'DEBIT' },
    ];
    const balance = calculateCustomerBalance(50000, entries);
    expect(balance).toBe(62000);
  });

  test('computeRunningBalances calculates sequential balances accurately', () => {
    const entries = [
      { id: '1', customer_id: 'c1', entry_type: 'DELIVERY_CHARGE' as const, amount_minor: 2000, direction: 'DEBIT' as const, timestamp: '2026-10-01', description: 'Del 1' },
      { id: '2', customer_id: 'c1', entry_type: 'PAYMENT' as const, amount_minor: 1500, direction: 'CREDIT' as const, timestamp: '2026-10-02', description: 'Pay 1' },
    ];
    const running = computeRunningBalances(1000, entries);
    expect(running[0].running_balance_minor).toBe(3000);
    expect(running[1].running_balance_minor).toBe(1500);
  });

  test('calculateBillSummary aggregates without double charging', () => {
    const summary = calculateBillSummary(10000, 5000, 3000);
    expect(summary.previous_balance_minor).toBe(10000);
    expect(summary.period_charges_minor).toBe(5000);
    expect(summary.period_payments_minor).toBe(3000);
    expect(summary.closing_balance_minor).toBe(12000);
  });
});

describe('Returnable Jar Invariants', () => {
  test('calculateCustomerJarBalance tracks physical container custody', () => {
    // Opening: 2 jars
    // Delivered: 3 jars
    // Collected: 1 jar
    // Lost: 1 jar
    // Expected: 2 + 3 - 1 - 1 = 3 jars
    const movements = [
      { movement_type: 'DELIVERY_DELIVERED', quantity: 3 },
      { movement_type: 'DELIVERY_COLLECTED', quantity: 1 },
      { movement_type: 'LOST', quantity: 1 },
    ];
    expect(calculateCustomerJarBalance(2, movements)).toBe(3);
  });

  test('calculateWarehouseEmptyJars reconciles empty jar stock', () => {
    // Initial warehouse empties: 10
    // Empties collected from customer: 5
    // Damaged jars: 2
    // Expected: 10 + 5 - 2 = 13
    const movements = [
      { movement_type: 'DELIVERY_COLLECTED', quantity: 5 },
      { movement_type: 'DAMAGE', quantity: 2 },
    ];
    expect(calculateWarehouseEmptyJars(10, movements)).toBe(13);
  });
});

describe('Inventory & Stock Invariants', () => {
  test('calculateCurrentStock accurately reconciles stock', () => {
    const openingStock = 100;
    const movements = [
      { delta: -20 }, // delivery
      { delta: +50 }, // restock
      { delta: -2 },  // damaged
    ];
    expect(calculateCurrentStock(openingStock, movements)).toBe(128);
  });

  test('isLowStock identifies stock under threshold', () => {
    expect(isLowStock(10, 10)).toBe(true);
    expect(isLowStock(9, 10)).toBe(true);
    expect(isLowStock(11, 10)).toBe(false);
  });
});

describe('Role Capability Authorization', () => {
  test('enforces role boundaries', () => {
    expect(hasCapability('OWNER', 'PAYMENT_REVERSAL')).toBe(true);
    expect(hasCapability('OFFICE', 'PAYMENT_REVERSAL')).toBe(false);
    expect(hasCapability('DELIVERY', 'PAYMENT_REVERSAL')).toBe(false);

    expect(hasCapability('OWNER', 'DELIVERY_ENTRY')).toBe(true);
    expect(hasCapability('OFFICE', 'DELIVERY_ENTRY')).toBe(true);
    expect(hasCapability('DELIVERY', 'DELIVERY_ENTRY')).toBe(true);

    expect(hasCapability('DELIVERY', 'PRODUCT_MANAGE')).toBe(false);
    expect(hasCapability('OFFICE', 'PRODUCT_MANAGE')).toBe(false);
    expect(hasCapability('OWNER', 'PRODUCT_MANAGE')).toBe(true);
  });
});
