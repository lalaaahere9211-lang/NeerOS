import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useTranslation } from '../../localization';
import { HeaderBar, Card, Button, StatusChip, TextField, EmptyState } from '../../components/ui';
import { PaymentRepository } from '../../database/repositories/PaymentRepository';
import { BillingRepository } from '../../database/repositories/BillingRepository';
import { CustomerRepository } from '../../database/repositories/CustomerRepository';
import { Payment, Bill } from '../../types/domain';
import { formatINR } from '../../domain/accounting';
import { PdfService } from '../../services/pdfService';
import { WhatsAppService } from '../../services/whatsappService';
import { useUserStore } from '../../store/userStore';

export default function AccountsScreen() {
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const { currentUser, can } = useUserStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'BILLS'>('PAYMENTS');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Reversal Modal
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [showReversalModal, setShowReversalModal] = useState(false);

  const loadData = async () => {
    try {
      const [pList, bList] = await Promise.all([
        PaymentRepository.getPayments(),
        BillingRepository.getBills(),
      ]);
      setPayments(pList);
      setBills(bList);
    } catch (e) {
      console.error('Error fetching accounts data', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSharePaymentReceipt = async (payment: Payment) => {
    try {
      const customer = await CustomerRepository.getCustomerById(payment.customer_id);
      if (!customer) return;

      const message = WhatsAppService.buildReceiptText(payment, customer);
      const res = await WhatsAppService.sendWhatsApp(customer.phone, message);
      if (res.fallbackCopied) {
        Alert.alert('WhatsApp', t('messageCopied'));
      }
    } catch {
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const handlePdfPaymentReceipt = async (payment: Payment) => {
    try {
      const customer = await CustomerRepository.getCustomerById(payment.customer_id);
      if (!customer) return;
      await PdfService.generateReceiptPdf(payment, customer);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to generate PDF: ' + err.message);
    }
  };

  const handleShareBill = async (bill: Bill) => {
    try {
      const customer = await CustomerRepository.getCustomerById(bill.customer_id);
      if (!customer) return;

      const message = WhatsAppService.buildBillSummaryText(bill, customer);
      const res = await WhatsAppService.sendWhatsApp(customer.phone, message);
      if (res.fallbackCopied) {
        Alert.alert('WhatsApp', t('messageCopied'));
      }
    } catch {
      Alert.alert('Error', 'Failed to share bill');
    }
  };

  const handlePdfBill = async (bill: Bill) => {
    try {
      const customer = await CustomerRepository.getCustomerById(bill.customer_id);
      if (!customer) return;
      await PdfService.generateBillPdf(bill, customer);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to generate PDF: ' + err.message);
    }
  };

  const handleConfirmReversal = async () => {
    if (!selectedPayment) return;
    if (!reversalReason.trim()) {
      Alert.alert('Validation', t('reversalReason'));
      return;
    }

    try {
      await PaymentRepository.reversePayment(
        selectedPayment.id,
        reversalReason.trim(),
        currentUser.id
      );
      setShowReversalModal(false);
      setSelectedPayment(null);
      setReversalReason('');
      await loadData();
      Alert.alert('Success', 'Payment reversal recorded as an auditable debit entry.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reverse payment');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar
        title={t('navAccounts')}
        subtitle="Payments & Bills"
        rightAction={
          activeTab === 'PAYMENTS' ? (
            <TouchableOpacity
              onPress={() => router.push('/payment-new')}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              accessibilityLabel="Record Payment"
            >
              <Ionicons name="cash" size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/bill-new')}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              accessibilityLabel="Generate Bill"
            >
              <Ionicons name="document-text" size={18} color={colors.onPrimary} />
            </TouchableOpacity>
          )
        }
      />

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity
          onPress={() => setActiveTab('PAYMENTS')}
          style={[
            styles.tabItem,
            activeTab === 'PAYMENTS' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
          ]}
        >
          <Text
            style={[
              typography.labelMedium,
              { color: activeTab === 'PAYMENTS' ? colors.primary : colors.onSurfaceVariant, fontWeight: 'bold' },
            ]}
          >
            {t('tabPayments')} ({payments.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('BILLS')}
          style={[
            styles.tabItem,
            activeTab === 'BILLS' && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
          ]}
        >
          <Text
            style={[
              typography.labelMedium,
              { color: activeTab === 'BILLS' ? colors.primary : colors.onSurfaceVariant, fontWeight: 'bold' },
            ]}
          >
            {t('monthlyBilling')} ({bills.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* PAYMENTS LIST */}
      {activeTab === 'PAYMENTS' && (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { padding: spacing.space4 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              title="No payments recorded"
              icon={<Ionicons name="cash-outline" size={40} color={colors.outline} />}
              actionTitle={t('recordPayment')}
              onAction={() => router.push('/payment-new')}
            />
          }
          renderItem={({ item }) => (
            <Card style={{ marginVertical: 6, opacity: item.is_reversed ? 0.6 : 1 }}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
                    {item.customer_name}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                    {item.payment_date} • {item.payment_method}
                    {item.reference_number ? ` • Ref: ${item.reference_number}` : ''}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      typography.titleMedium,
                      { color: item.is_reversed ? colors.outline : colors.success, fontWeight: 'bold' },
                    ]}
                  >
                    {formatINR(item.amount_minor)}
                  </Text>
                  {item.is_reversed ? (
                    <StatusChip status="cancelled" label="Reversed" style={{ marginTop: 2 }} />
                  ) : null}
                </View>
              </View>

              {/* Actions row */}
              {!item.is_reversed && (
                <View style={[styles.cardFooter, { borderTopColor: colors.outlineVariant, marginTop: spacing.space2, paddingTop: spacing.space2 }]}>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                      onPress={() => handleSharePaymentReceipt(item)}
                      style={[styles.smallActionBtn, { backgroundColor: colors.successContainer, marginRight: 8 }]}
                    >
                      <Ionicons name="logo-whatsapp" size={14} color={colors.onSuccessContainer} />
                      <Text style={[typography.labelSmall, { color: colors.onSuccessContainer, marginLeft: 4, fontWeight: 'bold' }]}>
                        WhatsApp
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handlePdfPaymentReceipt(item)}
                      style={[styles.smallActionBtn, { backgroundColor: colors.primaryContainer }]}
                    >
                      <Ionicons name="document-text" size={14} color={colors.onPrimaryContainer} />
                      <Text style={[typography.labelSmall, { color: colors.onPrimaryContainer, marginLeft: 4, fontWeight: 'bold' }]}>
                        PDF
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {can('PAYMENT_REVERSAL') && (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedPayment(item);
                        setShowReversalModal(true);
                      }}
                      style={[styles.smallActionBtn, { backgroundColor: colors.errorContainer }]}
                    >
                      <Ionicons name="arrow-undo" size={14} color={colors.onErrorContainer} />
                      <Text style={[typography.labelSmall, { color: colors.onErrorContainer, marginLeft: 4, fontWeight: 'bold' }]}>
                        {t('reversePayment')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          )}
        />
      )}

      {/* BILLS LIST */}
      {activeTab === 'BILLS' && (
        <FlatList
          data={bills}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { padding: spacing.space4 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <EmptyState
              title={t('noBillsFound')}
              icon={<Ionicons name="document-text-outline" size={40} color={colors.outline} />}
              actionTitle={t('generateBill')}
              onAction={() => router.push('/bill-new')}
            />
          }
          renderItem={({ item }) => (
            <Card style={{ marginVertical: 6 }}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
                    {item.customer_name}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                    {item.bill_number} • {item.period_start} to {item.period_end}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[typography.titleMedium, { color: colors.primary, fontWeight: 'bold' }]}>
                    {formatINR(item.closing_balance_minor)}
                  </Text>
                  <StatusChip status="paid" label={item.status} style={{ marginTop: 2 }} />
                </View>
              </View>

              <View style={[styles.cardFooter, { borderTopColor: colors.outlineVariant, marginTop: spacing.space2, paddingTop: spacing.space2 }]}>
                <Text style={[typography.bodySmall, { color: colors.outline }]}>
                  Charges: {formatINR(item.period_charges_minor)} | Paid: {formatINR(item.period_payments_minor)}
                </Text>

                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => handleShareBill(item)}
                    style={[styles.smallActionBtn, { backgroundColor: colors.successContainer, marginRight: 8 }]}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color={colors.onSuccessContainer} />
                    <Text style={[typography.labelSmall, { color: colors.onSuccessContainer, marginLeft: 4, fontWeight: 'bold' }]}>
                      WhatsApp
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePdfBill(item)}
                    style={[styles.smallActionBtn, { backgroundColor: colors.primaryContainer }]}
                  >
                    <Ionicons name="print" size={14} color={colors.onPrimaryContainer} />
                    <Text style={[typography.labelSmall, { color: colors.onPrimaryContainer, marginLeft: 4, fontWeight: 'bold' }]}>
                      PDF
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      {/* Payment Reversal Modal */}
      <Modal visible={showReversalModal} transparent animationType="fade" onRequestClose={() => setShowReversalModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, padding: spacing.space5, borderRadius: 16 }]}>
            <Text style={[typography.titleLarge, { color: colors.error, fontWeight: 'bold', marginBottom: 8 }]}>
              {t('reversePayment')}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: 16 }]}>
              {t('reverseConfirmMessage')}
            </Text>

            <TextField
              label={t('reversalReason')}
              placeholder="e.g. Wrong customer credited / cheque bounced"
              value={reversalReason}
              onChangeText={setReversalReason}
            />

            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <Button title={t('cancel')} variant="outlined" onPress={() => setShowReversalModal(false)} style={{ flex: 1, marginRight: 6 }} />
              <Button title={t('reversePayment')} variant="destructive" onPress={handleConfirmReversal} style={{ flex: 1, marginLeft: 6 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    elevation: 8,
  },
});
