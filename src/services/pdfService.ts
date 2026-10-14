import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Bill, Payment, MonthlyDeliveryCard, LedgerEntry, Customer } from '../types/domain';
import { formatINR } from '../domain/accounting';

export class PdfService {
  /**
   * Generates and opens share sheet for a Monthly Bill Invoice
   */
  static async generateBillPdf(bill: Bill, customer: Customer): Promise<string> {
    const itemsHtml = (bill.items || [])
      .map(
        (item, idx) => `
        <tr style="border-bottom: 1px solid #E5EAEC;">
          <td style="padding: 10px 8px; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px 8px;">${item.item_date}</td>
          <td style="padding: 10px 8px;">${item.description}</td>
          <td style="padding: 10px 8px; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px 8px; text-align: right;">${formatINR(item.rate_minor)}</td>
          <td style="padding: 10px 8px; text-align: right; font-weight: bold;">${formatINR(item.total_minor)}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${bill.bill_number}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #191C1D;
            margin: 0;
            padding: 32px;
            background: #FFFFFF;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #176B87;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .brand-title {
            font-size: 24px;
            font-weight: bold;
            color: #176B87;
            margin: 0;
          }
          .brand-subtitle {
            font-size: 13px;
            color: #45636D;
            margin: 4px 0 0 0;
          }
          .invoice-tag {
            text-align: right;
          }
          .invoice-tag h2 {
            margin: 0;
            font-size: 20px;
            color: #176B87;
          }
          .meta-box {
            display: flex;
            justify-content: space-between;
            background: #F7F9FA;
            border: 1px solid #DDE4E7;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 24px;
          }
          .meta-col {
            width: 48%;
          }
          .meta-label {
            font-size: 11px;
            color: #70797D;
            text-transform: uppercase;
            font-weight: bold;
          }
          .meta-val {
            font-size: 14px;
            color: #191C1D;
            margin-top: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background: #176B87;
            color: #FFFFFF;
            font-size: 12px;
            padding: 10px 8px;
            text-align: left;
          }
          .summary-card {
            width: 320px;
            margin-left: auto;
            border: 1px solid #DDE4E7;
            border-radius: 8px;
            background: #F7F9FA;
            padding: 16px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
          }
          .summary-total {
            border-top: 2px solid #176B87;
            padding-top: 8px;
            margin-top: 8px;
            font-size: 16px;
            font-weight: bold;
            color: #176B87;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #70797D;
            border-top: 1px solid #ECEFF1;
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="brand-title">Patil Brothers (पाटिल ब्रदर्स)</h1>
            <p class="brand-subtitle">Every Drop. Every Delivery. Every Detail.</p>
            <p style="font-size: 12px; color: #41484B; margin: 4px 0 0 0;">
              Shop No. 4, Market Yard, Pune, Maharashtra 411037<br>
              Phone: +91 98765 43210
            </p>
          </div>
          <div class="invoice-tag">
            <h2>TAX INVOICE / बिल</h2>
            <p style="font-size: 13px; font-weight: bold; margin: 4px 0;">${bill.bill_number}</p>
            <p style="font-size: 12px; color: #70797D; margin: 0;">Date: ${bill.generated_at.split('T')[0]}</p>
          </div>
        </div>

        <div class="meta-box">
          <div class="meta-col">
            <div class="meta-label">Billed To / ग्राहक</div>
            <div class="meta-val" style="font-weight: bold; font-size: 16px;">${customer.name}</div>
            <div class="meta-val">${customer.address || 'Pune'}</div>
            <div class="meta-val">Phone: ${customer.phone || 'N/A'}</div>
          </div>
          <div class="meta-col">
            <div class="meta-label">Billing Period / बिल अवधि</div>
            <div class="meta-val">${bill.period_start} to ${bill.period_end}</div>
            <div class="meta-label" style="margin-top: 8px;">Status</div>
            <div class="meta-val" style="color: #216B43; font-weight: bold;">${bill.status}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th style="width: 90px;">Date</th>
              <th>Description / विवरण</th>
              <th style="width: 60px; text-align: center;">Qty</th>
              <th style="width: 80px; text-align: right;">Rate</th>
              <th style="width: 90px; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml || '<tr><td colspan="6" style="padding: 16px; text-align: center; color: #70797D;">No delivery lines recorded</td></tr>'}
          </tbody>
        </table>

        <div class="summary-card">
          <div class="summary-row">
            <span>Previous Balance (पिछला बकाया):</span>
            <span>${formatINR(bill.previous_balance_minor)}</span>
          </div>
          <div class="summary-row">
            <span>Period Charges (इस अवधि का प्रभार):</span>
            <span>${formatINR(bill.period_charges_minor)}</span>
          </div>
          <div class="summary-row" style="color: #216B43;">
            <span>Payments Received (प्राप्त भुगतान):</span>
            <span>- ${formatINR(bill.period_payments_minor)}</span>
          </div>
          <div class="summary-row summary-total">
            <span>Net Amount Due (कुल देय):</span>
            <span>${formatINR(bill.closing_balance_minor)}</span>
          </div>
        </div>

        <div class="footer">
          Thank you for your business! | धन्यवाद!<br>
          For billing inquiries, please contact: +91 98765 43210
        </div>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
    return uri;
  }

  /**
   * Generates and shares a Payment Receipt
   */
  static async generateReceiptPdf(payment: Payment, customer: Customer): Promise<string> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Receipt - ${payment.id}</title>
        <style>
          body { font-family: sans-serif; padding: 32px; color: #191C1D; }
          .header { border-bottom: 2px solid #216B43; padding-bottom: 16px; margin-bottom: 24px; }
          .title { color: #216B43; font-size: 22px; font-weight: bold; margin: 0; }
          .box { background: #F7F9FA; border: 1px solid #DDE4E7; border-radius: 8px; padding: 20px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
          .total { font-size: 20px; font-weight: bold; color: #216B43; border-top: 1px solid #DDE4E7; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Patil Brothers (पाटिल ब्रदर्स)</h1>
          <p style="margin: 4px 0; color: #45636D;">Payment Receipt / भुगतान रसीद</p>
        </div>
        <div class="box">
          <div class="row">
            <span>Receipt No:</span>
            <span style="font-weight: bold;">${payment.id}</span>
          </div>
          <div class="row">
            <span>Date:</span>
            <span>${payment.payment_date}</span>
          </div>
          <div class="row">
            <span>Received From:</span>
            <span style="font-weight: bold;">${customer.name}</span>
          </div>
          <div class="row">
            <span>Payment Mode:</span>
            <span>${payment.payment_method}</span>
          </div>
          ${payment.reference_number ? `<div class="row"><span>Reference / UTR:</span><span>${payment.reference_number}</span></div>` : ''}
          <div class="row total">
            <span>Amount Received (प्राप्त राशि):</span>
            <span>${formatINR(payment.amount_minor)}</span>
          </div>
        </div>
        <p style="margin-top: 32px; text-align: center; font-size: 12px; color: #70797D;">
          Authorized Signatory | पाटिल ब्रदर्स
        </p>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
    return uri;
  }

  /**
   * Generates and shares a Monthly Delivery Card
   */
  static async generateMonthlyCardPdf(card: MonthlyDeliveryCard): Promise<string> {
    const daysHtml = card.days
      .map(
        (day) => `
        <tr style="border-bottom: 1px solid #ECEFF1; ${day.quantity_delivered > 0 ? 'background: #FAFDFE;' : ''}">
          <td style="padding: 6px; text-align: center; font-weight: bold;">${day.day_number}</td>
          <td style="padding: 6px; text-align: center;">${day.product_summary}</td>
          <td style="padding: 6px; text-align: center; color: #176B87; font-weight: bold;">${day.jars_delivered > 0 ? day.jars_delivered : '-'}</td>
          <td style="padding: 6px; text-align: center; color: #216B43;">${day.jars_collected > 0 ? day.jars_collected : '-'}</td>
          <td style="padding: 6px; text-align: right;">${day.daily_total_minor > 0 ? formatINR(day.daily_total_minor) : '-'}</td>
        </tr>
      `
      )
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Monthly Delivery Card - ${card.month}/${card.year}</title>
        <style>
          body { font-family: sans-serif; padding: 24px; color: #191C1D; }
          .header { border-bottom: 2px solid #176B87; padding-bottom: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #176B87; color: #FFFFFF; padding: 6px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0; color: #176B87;">Patil Brothers (पाटिल ब्रदर्स)</h2>
          <p style="margin: 4px 0; font-size: 13px;">Customer Daily Delivery Card / मासिक डिलीवरी कार्ड (${card.month}/${card.year})</p>
          <p style="margin: 4px 0; font-weight: bold; font-size: 14px;">Customer: ${card.customer.name}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">Day</th>
              <th>Product Details</th>
              <th style="width: 60px;">Jars Given</th>
              <th style="width: 60px;">Empties In</th>
              <th style="width: 70px; text-align: right;">Daily (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${daysHtml}
          </tbody>
          <tfoot>
            <tr style="background: #E5EAEC; font-weight: bold; font-size: 12px;">
              <td colspan="2" style="padding: 8px;">Total (${card.days.length} Days)</td>
              <td style="padding: 8px; text-align: center; color: #176B87;">${card.total_jars_delivered}</td>
              <td style="padding: 8px; text-align: center; color: #216B43;">${card.total_jars_collected}</td>
              <td style="padding: 8px; text-align: right;">${formatINR(card.total_amount_minor)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
    return uri;
  }
}
