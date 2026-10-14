import { LedgerEntry } from '../types/domain';

/**
 * Monetary representation utilities
 * All database and domain amounts are represented in integer minor units (paise),
 * where 100 paise = 1 Indian Rupee (₹).
 */

export function minorToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToMinor(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Formats integer paise into standard Indian Rupee notation (e.g. ₹1,250.00 or ₹40)
 */
export function formatINR(paise: number, showDecimals: boolean = true): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  const parts = rupees.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian numbering system formatting: last 3 digits, then groups of 2
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  const sign = isNegative ? '- ' : '';
  if (!showDecimals && decimalPart === '00') {
    return `${sign}₹${integerPart}`;
  }
  return `${sign}₹${integerPart}.${decimalPart}`;
}

/**
 * Calculates customer net outstanding balance:
 * Closing Balance = Opening Balance + Debits (charges/reversals) - Credits (payments/adjustments)
 * Positive (> 0): Customer owes money (Receivable)
 * Zero (= 0): Settled
 * Negative (< 0): Customer has excess credit/advance
 */
export function calculateCustomerBalance(
  openingBalanceMinor: number,
  ledgerEntries: Array<{ amount_minor: number; direction: 'DEBIT' | 'CREDIT' }>
): number {
  let balance = openingBalanceMinor;

  for (const entry of ledgerEntries) {
    if (entry.direction === 'DEBIT') {
      balance += entry.amount_minor;
    } else if (entry.direction === 'CREDIT') {
      balance -= entry.amount_minor;
    }
  }

  return balance;
}

/**
 * Computes running balance for a sorted array of chronological ledger entries.
 */
export function computeRunningBalances(
  openingBalanceMinor: number,
  entries: LedgerEntry[]
): LedgerEntry[] {
  let currentBalance = openingBalanceMinor;

  return entries.map((entry) => {
    if (entry.direction === 'DEBIT') {
      currentBalance += entry.amount_minor;
    } else {
      currentBalance -= entry.amount_minor;
    }
    return {
      ...entry,
      running_balance_minor: currentBalance,
    };
  });
}

/**
 * Computes bill summary for a given customer and period
 */
export interface BillCalculationResult {
  previous_balance_minor: number;
  period_charges_minor: number;
  period_payments_minor: number;
  closing_balance_minor: number;
}

export function calculateBillSummary(
  previousBalanceMinor: number,
  periodChargesMinor: number,
  periodPaymentsMinor: number
): BillCalculationResult {
  return {
    previous_balance_minor: previousBalanceMinor,
    period_charges_minor: periodChargesMinor,
    period_payments_minor: periodPaymentsMinor,
    closing_balance_minor: previousBalanceMinor + periodChargesMinor - periodPaymentsMinor,
  };
}
