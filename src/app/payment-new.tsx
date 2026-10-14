import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useTranslation } from '../localization';
import { HeaderBar, Card, Button, TextField, LoadingView } from '../components/ui';
import { CustomerRepository } from '../database/repositories/CustomerRepository';
import { PaymentRepository } from '../database/repositories/PaymentRepository';
import { Customer, PaymentMethod } from '../types/domain';
import { formatINR } from '../domain/accounting';
import { WhatsAppService } from '../services/whatsappService';
import { useUserStore } from '../store/userStore';

export default function PaymentNewScreen() {
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const { currentUser } = useUserStore();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    CustomerRepository.getCustomers(undefined, undefined, true).then((cList) => {
      setCustomers(cList);
      if (customerId) {
        const found = cList.find((c) => c.id === customerId);
        if (found) setSelectedCustomer(found);
      } else if (cList.length > 0) {
        setSelectedCustomer(cList[0]);
      }
      setLoading(false);
    });
  }, [customerId]);

  const handleSavePayment = async () => {
    if (!selectedCustomer) {
      Alert.alert('Validation', 'Please select a customer');
      return;
    }

    const rupees = parseFloat(amountRupees);
    if (isNaN(rupees) || rupees <= 0) {
      Alert.alert('Validation', 'Please enter a valid positive payment amount');
      return;
    }

    setSubmitting(true);
    const amountMinor = Math.round(rupees * 100);

    try {
      const payment = await PaymentRepository.recordPayment({
        customerId: selectedCustomer.id,
        amountMinor,
        paymentDate,
        paymentMethod: method,
        referenceNumber: reference.trim() || undefined,
        recordedByUserId: currentUser.id,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        t('paymentSuccess'),
        `Amount: ${formatINR(amountMinor)}\nMethod: ${method}`,
        [
          {
            text: 'Share WhatsApp',
            onPress: async () => {
              const msg = WhatsAppService.buildReceiptText(payment, selectedCustomer);
              await WhatsAppService.sendWhatsApp(selectedCustomer.phone, msg);
              router.back();
            },
          },
          {
            text: t('done'),
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading payment form..." />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar title={t('recordPayment')} showBack />

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.space4 }]}>
        {/* Customer Selector */}
        <Text style={[typography.labelMedium, { color: colors.onSurfaceVariant, marginBottom: spacing.space1 }]}>
          {t('selectCustomer')} *
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customerScroll}>
          {customers.map((c) => {
            const isSelected = selectedCustomer?.id === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setSelectedCustomer(c)}
                style={[
                  styles.customerChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    { color: isSelected ? colors.onPrimary : colors.onSurface, fontWeight: 'bold' },
                  ]}
                >
                  {c.name}
                </Text>
                <Text
                  style={[
                    typography.labelSmall,
                    { color: isSelected ? colors.onPrimaryContainer : colors.outline },
                  ]}
                >
                  Due: {formatINR(c.current_balance_minor || 0)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedCustomer && (
          <Card style={{ marginVertical: spacing.space3, backgroundColor: colors.surfaceContainerLow }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                  {selectedCustomer.name}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                  Current Outstanding Due:
                </Text>
              </View>
              <Text
                style={[
                  typography.titleLarge,
                  {
                    color: (selectedCustomer.current_balance_minor || 0) > 0 ? colors.error : colors.success,
                    fontWeight: 'bold',
                  },
                ]}
              >
                {formatINR(selectedCustomer.current_balance_minor || 0)}
              </Text>
            </View>
          </Card>
        )}

        <TextField
          label={t('paymentAmount') + ' *'}
          placeholder="e.g. 500"
          keyboardType="numeric"
          value={amountRupees}
          onChangeText={setAmountRupees}
        />

        <TextField
          label={t('date')}
          value={paymentDate}
          onChangeText={setPaymentDate}
        />

        {/* Payment Method Selector */}
        <Text style={[typography.labelMedium, { color: colors.onSurfaceVariant, marginBottom: spacing.space2 }]}>
          {t('paymentMethod')}
        </Text>
        <View style={styles.methodGrid}>
          {(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'] as PaymentMethod[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMethod(m)}
              style={[
                styles.methodChip,
                {
                  backgroundColor: method === m ? colors.primary : colors.surfaceContainer,
                  borderColor: method === m ? colors.primary : colors.outlineVariant,
                },
              ]}
            >
              <Text
                style={[
                  typography.labelMedium,
                  { color: method === m ? colors.onPrimary : colors.onSurface, fontWeight: 'bold' },
                ]}
              >
                {m === 'CASH'
                  ? t('methodCash')
                  : m === 'UPI'
                  ? t('methodUPI')
                  : m === 'BANK_TRANSFER'
                  ? t('methodBank')
                  : t('methodCheque')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {method !== 'CASH' && (
          <TextField
            label={t('referenceNumber')}
            placeholder="e.g. UPI Ref / UTR / Cheque 123456"
            value={reference}
            onChangeText={setReference}
          />
        )}

        <TextField
          label={t('notes')}
          placeholder="Optional payment notes"
          value={notes}
          onChangeText={setNotes}
        />

        <View style={{ marginTop: spacing.space4 }}>
          <Button
            title={t('savePayment')}
            onPress={handleSavePayment}
            loading={submitting}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  customerScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  customerChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 140,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
});
