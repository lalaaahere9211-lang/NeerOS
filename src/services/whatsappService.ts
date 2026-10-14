import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Customer, Delivery, Bill, Payment } from '../types/domain';
import { formatINR } from '../domain/accounting';

export class WhatsAppService {
  /**
   * Cleans phone number to format with 91 country code for Indian numbers
   */
  static formatPhoneNumber(phone?: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    return cleaned;
  }

  /**
   * Prepares Delivery Summary WhatsApp message
   */
  static buildDeliverySummaryText(
    customer: Customer,
    delivery: Delivery,
    currentBalanceMinor: number,
    heldJars: number
  ): string {
    const itemsText = (delivery.items || [])
      .map((item) => `• ${item.product_name_snapshot}: ${item.quantity} x ${formatINR(item.unit_rate_snapshot_minor)} = ${formatINR(item.total_price_minor)}`)
      .join('\n');

    return (
      `*पाटिल ब्रदर्स (Patil Brothers)*\n` +
      `*दैनिक डिलीवरी विवरण (Daily Delivery)*\n` +
      `--------------------------------\n` +
      `ग्राहक (Customer): *${customer.name}*\n` +
      `तारीख (Date): ${delivery.delivery_date}\n` +
      `\n` +
      `*आइटम विवरण:*\n` +
      `${itemsText}\n` +
      `\n` +
      `भरे जार दिए (Jars Delivered): *${delivery.jars_delivered}*\n` +
      `खाली जार लिए (Jars Collected): *${delivery.jars_collected}*\n` +
      `डिलीवरी राशि (Delivery Total): *${formatINR(delivery.total_amount_minor)}*\n` +
      `--------------------------------\n` +
      `कुल बकाया (Current Balance): *${formatINR(currentBalanceMinor)}*\n` +
      `आपके पास कुल जार (Held Jars): *${heldJars}*\n` +
      `\n` +
      `धन्यवाद! (Thank you for choosing Patil Brothers)\n` +
      `संपर्क: +91 98765 43210`
    );
  }

  /**
   * Prepares Monthly Bill WhatsApp message
   */
  static buildBillSummaryText(bill: Bill, customer: Customer): string {
    return (
      `*पाटिल ब्रदर्स (Patil Brothers)*\n` +
      `*मासिक बिल / Tax Invoice*\n` +
      `--------------------------------\n` +
      `बिल क्रमांक (Bill No): *${bill.bill_number}*\n` +
      `ग्राहक (Customer): *${customer.name}*\n` +
      `बिल अवधि (Period): ${bill.period_start} to ${bill.period_end}\n` +
      `\n` +
      `पिछला बकाया (Previous Balance): ${formatINR(bill.previous_balance_minor)}\n` +
      `इस अवधि का प्रभार (New Charges): ${formatINR(bill.period_charges_minor)}\n` +
      `प्राप्त भुगतान (Payments): - ${formatINR(bill.period_payments_minor)}\n` +
      `--------------------------------\n` +
      `*कुल देय राशि (Net Amount Due): ${formatINR(bill.closing_balance_minor)}*\n` +
      `--------------------------------\n` +
      `कृपया समय पर भुगतान करें।\n` +
      `GPay / PhonePe / Paytm: 9876543210\n` +
      `धन्यवाद!`
    );
  }

  /**
   * Prepares Payment Receipt WhatsApp message
   */
  static buildReceiptText(payment: Payment, customer: Customer): string {
    return (
      `*पाटिल ब्रदर्स (Patil Brothers)*\n` +
      `*भुगतान रसीद (Payment Receipt)*\n` +
      `--------------------------------\n` +
      `रसीद सं. (Receipt ID): ${payment.id}\n` +
      `तारीख (Date): ${payment.payment_date}\n` +
      `प्राप्तकर्ता (Received From): *${customer.name}*\n` +
      `भुगतान माध्यम (Mode): ${payment.payment_method}\n` +
      (payment.reference_number ? `रेफरेंस / यूटीआर: ${payment.reference_number}\n` : '') +
      `--------------------------------\n` +
      `*प्राप्त राशि (Amount Received): ${formatINR(payment.amount_minor)}*\n` +
      `--------------------------------\n` +
      `भुगतान प्राप्त हुआ, धन्यवाद!\n` +
      `पाटिल ब्रदर्स`
    );
  }

  /**
   * Opens WhatsApp or copies to clipboard with fallback feedback
   */
  static async sendWhatsApp(
    phone: string | undefined,
    message: string
  ): Promise<{ success: boolean; fallbackCopied: boolean }> {
    const formattedPhone = this.formatPhoneNumber(phone);
    const encodedText = encodeURIComponent(message);
    const url = formattedPhone
      ? `whatsapp://send?phone=${formattedPhone}&text=${encodedText}`
      : `whatsapp://send?text=${encodedText}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return { success: true, fallbackCopied: false };
      } else {
        // Fallback: copy to clipboard
        await Clipboard.setStringAsync(message);
        return { success: false, fallbackCopied: true };
      }
    } catch {
      await Clipboard.setStringAsync(message);
      return { success: false, fallbackCopied: true };
    }
  }
}
