import {
  calculateCustomerBalance,
  computeRunningBalances,
  calculateBillSummary,
  rupeesToMinor,
} from '../accounting';
import { calculateCustomerJarBalance, calculateWarehouseEmptyJars } from '../jars';
import { calculateCurrentStock } from '../inventory';

describe('Database & Accounting Invariant Verification', () => {
  describe('Customer Monetary Receivable Invariant', () => {
    test('Closing balance equals Opening balance + Debits - Credits', () => {
      const opening = rupeesToMinor(500); // ₹500.00
      const ledger = [
        { amount_minor: rupeesToMinor(120), direction: 'DEBIT' as const }, // delivery
        { amount_minor: rupeesToMinor(200), direction: 'CREDIT' as const }, // payment
        { amount_minor: rupeesToMinor(80), direction: 'DEBIT' as const },  // delivery
        { amount_minor: rupeesToMinor(200), direction: 'DEBIT' as const }, // reversal of payment
      ];

      const closing = calculateCustomerBalance(opening, ledger);
      // 500 + 120 - 200 + 80 + 200 = 700
      expect(closing).toBe(rupeesToMinor(700));
    });

    test('Overpayment results in negative receivable balance (customer credit)', () => {
      const opening = rupeesToMinor(100);
      const ledger = [
        { amount_minor: rupeesToMinor(300), direction: 'CREDIT' as const },
      ];
      const balance = calculateCustomerBalance(opening, ledger);
      expect(balance).toBe(rupeesToMinor(-200));
    });
  });

  describe('Returnable Physical Jar Separation Invariant', () => {
    test('Customer jar custody is mathematically isolated from monetary balance', () => {
      const openingJars = 5;
      const jarLedger = [
        { movement_type: 'DELIVERY_DELIVERED', quantity: 10 },
        { movement_type: 'DELIVERY_COLLECTED', quantity: 8 },
        { movement_type: 'DAMAGE', quantity: 1 },
      ];

      const customerHeld = calculateCustomerJarBalance(openingJars, jarLedger);
      // 5 + 10 - 8 - 1 = 6 jars
      expect(customerHeld).toBe(6);
    });

    test('Warehouse empties accumulate collections and reduce with damaged jar write-offs', () => {
      const warehouseInitial = 20;
      const jarLedger = [
        { movement_type: 'DELIVERY_COLLECTED', quantity: 15 },
        { movement_type: 'DAMAGE', quantity: 3 },
      ];

      const warehouseJars = calculateWarehouseEmptyJars(warehouseInitial, jarLedger);
      // 20 + 15 - 3 = 32
      expect(warehouseJars).toBe(32);
    });
  });

  describe('Auditable Stock Movements Reconciliation Invariant', () => {
    test('Current stock reconciles strictly with movement deltas', () => {
      const openingStock = 200;
      const movements = [
        { delta: -25 }, // delivery
        { delta: -30 }, // delivery
        { delta: +100 }, // plant restock
        { delta: -5 },   // leaked jar write-off
      ];

      const current = calculateCurrentStock(openingStock, movements);
      // 200 - 25 - 30 + 100 - 5 = 240
      expect(current).toBe(240);
    });
  });

  describe('Bill Calculation Invariant', () => {
    test('Bill summary aggregates period lines without double-charging existing ledger', () => {
      const prevBal = 15000; // ₹150.00
      const charges = 8000;  // ₹80.00
      const payments = 10000; // ₹100.00

      const summary = calculateBillSummary(prevBal, charges, payments);
      expect(summary.previous_balance_minor).toBe(15000);
      expect(summary.period_charges_minor).toBe(8000);
      expect(summary.period_payments_minor).toBe(10000);
      expect(summary.closing_balance_minor).toBe(13000); // 150 + 80 - 100 = 130
    });
  });
});
