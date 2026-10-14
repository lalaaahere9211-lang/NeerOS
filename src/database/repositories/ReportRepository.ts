import { getDatabase } from '../db';
import { Customer, MonthlyDeliveryCard, MonthlyDeliveryCardDay } from '../../types/domain';
import { CustomerRepository } from './CustomerRepository';

export interface SalesReportData {
  totalSalesMinor: number;
  totalCollectionsMinor: number;
  cashCollectionsMinor: number;
  upiCollectionsMinor: number;
  bankCollectionsMinor: number;
  chequeCollectionsMinor: number;
  deliveriesCount: number;
  paymentsCount: number;
}

export class ReportRepository {
  static async getSalesReport(startDate: string, endDate: string): Promise<SalesReportData> {
    const db = await getDatabase();

    // Sales in date range
    const salesRow = await db.getFirstAsync<{ total_sales: number; count: number }>(
      `SELECT 
        COALESCE(SUM(total_amount_minor), 0) as total_sales,
        COUNT(*) as count
       FROM deliveries 
       WHERE delivery_date >= ? AND delivery_date <= ? AND status = 'COMPLETED';`,
      [startDate, endDate]
    );

    // Collections by payment method
    const payRows = await db.getAllAsync<{ payment_method: string; total: number; count: number }>(
      `SELECT 
        payment_method,
        COALESCE(SUM(amount_minor), 0) as total,
        COUNT(*) as count
       FROM payments 
       WHERE payment_date >= ? AND payment_date <= ? AND is_reversed = 0
       GROUP BY payment_method;`,
      [startDate, endDate]
    );

    let cash = 0;
    let upi = 0;
    let bank = 0;
    let cheque = 0;
    let totalPaymentsCount = 0;

    for (const r of payRows) {
      totalPaymentsCount += r.count;
      if (r.payment_method === 'CASH') cash = r.total;
      else if (r.payment_method === 'UPI') upi = r.total;
      else if (r.payment_method === 'BANK_TRANSFER') bank = r.total;
      else if (r.payment_method === 'CHEQUE') cheque = r.total;
    }

    return {
      totalSalesMinor: salesRow?.total_sales || 0,
      totalCollectionsMinor: cash + upi + bank + cheque,
      cashCollectionsMinor: cash,
      upiCollectionsMinor: upi,
      bankCollectionsMinor: bank,
      chequeCollectionsMinor: cheque,
      deliveriesCount: salesRow?.count || 0,
      paymentsCount: totalPaymentsCount,
    };
  }

  static async getMonthlyDeliveryCard(
    customerId: string,
    month: number, // 1 - 12
    year: number
  ): Promise<MonthlyDeliveryCard | null> {
    const customer = await CustomerRepository.getCustomerById(customerId);
    if (!customer) return null;

    const db = await getDatabase();
    const daysInMonth = new Date(year, month, 0).getDate();
    const monthStr = month.toString().padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${daysInMonth.toString().padStart(2, '0')}`;

    const deliveries = await db.getAllAsync<{
      id: string;
      delivery_date: string;
      total_amount_minor: number;
      jars_delivered: number;
      jars_collected: number;
    }>(
      `SELECT id, delivery_date, total_amount_minor, jars_delivered, jars_collected 
       FROM deliveries 
       WHERE customer_id = ? AND delivery_date >= ? AND delivery_date <= ? AND status = 'COMPLETED'
       ORDER BY delivery_date ASC;`,
      [customerId, startDate, endDate]
    );

    const deliveryMap = new Map<string, typeof deliveries[0]>();
    for (const d of deliveries) {
      deliveryMap.set(d.delivery_date, d);
    }

    const days: MonthlyDeliveryCardDay[] = [];
    let totalQty = 0;
    let totalDelivered = 0;
    let totalCollected = 0;
    let totalAmount = 0;

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dayDate = `${year}-${monthStr}-${dayNum.toString().padStart(2, '0')}`;
      const del = deliveryMap.get(dayDate);

      if (del) {
        totalDelivered += del.jars_delivered;
        totalCollected += del.jars_collected;
        totalAmount += del.total_amount_minor;
        totalQty += del.jars_delivered;

        days.push({
          date: dayDate,
          day_number: dayNum,
          product_summary: `${del.jars_delivered} Jar`,
          quantity_delivered: del.jars_delivered,
          jars_delivered: del.jars_delivered,
          jars_collected: del.jars_collected,
          daily_total_minor: del.total_amount_minor,
        });
      } else {
        days.push({
          date: dayDate,
          day_number: dayNum,
          product_summary: '-',
          quantity_delivered: 0,
          jars_delivered: 0,
          jars_collected: 0,
          daily_total_minor: 0,
        });
      }
    }

    return {
      customer,
      month,
      year,
      days,
      total_quantity: totalQty,
      total_jars_delivered: totalDelivered,
      total_jars_collected: totalCollected,
      total_amount_minor: totalAmount,
    };
  }
}
