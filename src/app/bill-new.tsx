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
import { BillingRepository } from '../database/repositories/BillingRepository';
import { Customer } from '../types/domain';
import { formatINR } from '../domain/accounting';
import { PdfService } from '../services/pdfService';
import { WhatsAppService } from '../services/whatsappService';
import { useUserStore } from '../store/userStore';

export default function BillNewScreen() {
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const { currentUser } = useUserStore();
  const router = useRouter();

  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const defaultStart = `${year}-${month}-01`;
  const defaultEnd = now.toISOString().split('T')[0];

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(defaultEnd);
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

  const handleGenerateBill = async () => {
    if (!selectedCustomer) {
      Alert.alert('Validation', 'Please select a customer');
      return;
    }

    setSubmitting(true);
    try {
      const bill = await BillingRepository.generateBill({
        customerId: selectedCustomer.id,
        periodStart,
        periodEnd,
        generatedByUserId: currentUser.id,
      });

      Alert.alert(
        'Bill Generated',
        `Invoice ${bill.bill_number} generated for ${formatINR(bill.closing_balance_minor)}.`,
        [
          {
            text: 'Share PDF Invoice',
            onPress: async () => {
              await PdfService.generateBillPdf(bill, selectedCustomer);
              router.back();
            },
          },
          {
            text: 'Share WhatsApp',
            onPress: async () => {
              const msg = WhatsAppService.buildBillSummaryText(bill, selectedCustomer);
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
      Alert.alert('Error', err.message || 'Failed to generate bill');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading billing form..." />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar title={t('generateBill')} showBack />

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.space4 }]}>
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
                  Balance: {formatINR(c.current_balance_minor || 0)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', marginTop: spacing.space3 }}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <TextField
              label={t('periodStart')}
              value={periodStart}
              onChangeText={setPeriodStart}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <TextField
              label={t('periodEnd')}
              value={periodEnd}
              onChangeText={setPeriodEnd}
            />
          </View>
        </View>

        {selectedCustomer && (
          <Card style={{ marginVertical: spacing.space3 }}>
            <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 8 }]}>
              Customer Balance Preview
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>Customer:</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
                {selectedCustomer.name}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>Current Receivable:</Text>
              <Text style={[typography.titleSmall, { color: colors.primary, fontWeight: 'bold' }]}>
                {formatINR(selectedCustomer.current_balance_minor || 0)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>Containers Held:</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
                {selectedCustomer.current_jars || 0} Jars
              </Text>
            </View>
          </Card>
        )}

        <View style={{ marginTop: spacing.space4 }}>
          <Button
            title={t('generateBill')}
            onPress={handleGenerateBill}
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
});
