import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useTranslation } from '../../localization';
import { HeaderBar, Card, Button, StatusChip, EmptyState } from '../../components/ui';
import { CustomerRepository } from '../../database/repositories/CustomerRepository';
import { DeliveryRepository } from '../../database/repositories/DeliveryRepository';
import { PaymentRepository } from '../../database/repositories/PaymentRepository';
import { LedgerRepository } from '../../database/repositories/LedgerRepository';
import { ReportRepository } from '../../database/repositories/ReportRepository';
import { Customer, Delivery, Payment, LedgerEntry, MonthlyDeliveryCard } from '../../types/domain';
import { formatINR } from '../../domain/accounting';
import { PdfService } from '../../services/pdfService';
import { WhatsAppService } from '../../services/whatsappService';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DELIVERIES' | 'PAYMENTS' | 'LEDGER' | 'CARD'>('OVERVIEW');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [monthlyCard, setMonthlyCard] = useState<MonthlyDeliveryCard | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      const c = await CustomerRepository.getCustomerById(id);
      setCustomer(c);

      const [delList, payList, ledList] = await Promise.all([
        DeliveryRepository.getDeliveries(undefined, id),
        PaymentRepository.getPayments(id),
        LedgerRepository.getCustomerLedger(id),
      ]);
      setDeliveries(delList);
      setPayments(payList);
      setLedgerEntries(ledList);

      const now = new Date();
      const card = await ReportRepository.getMonthlyDeliveryCard(
        id,
        now.getMonth() + 1,
        now.getFullYear()
      );
      setMonthlyCard(card);
    } catch (e) {
      console.error('Error fetching customer details', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleActive = async () => {
    if (!customer) return;
    try {
      if (customer.is_active) {
        await CustomerRepository.deactivateCustomer(customer.id);
        Alert.alert('Customer Deactivated', 'Customer marked inactive. Historical transactions are preserved.');
      } else {
        await CustomerRepository.activateCustomer(customer.id);
        Alert.alert('Customer Activated', 'Customer account is now active.');
      }
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to update customer status');
    }
  };

  const handleShareMonthlyCard = async () => {
    if (!monthlyCard || !customer) return;
    try {
      await PdfService.generateMonthlyCardPdf(monthlyCard);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to export delivery card: ' + err.message);
    }
  };

  if (!customer) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <HeaderBar title={t('customerDetails')} showBack />
        <EmptyState title="Customer not found" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar
        title={customer.name}
        subtitle={customer.phone || 'No phone'}
        showBack
        rightAction={
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/customer-edit', params: { id: customer.id } })}
            style={{ padding: 6, marginRight: 8 }}
            accessibilityLabel="Edit Customer"
          >
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Top Profile Summary Card */}
      <View style={[styles.profileHeader, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant, padding: spacing.space4 }]}>
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={[typography.bodySmall, { color: colors.outline }]}>
              {t('balanceDue')}
            </Text>
            <Text
              style={[
                typography.titleLarge,
                {
                  color: (customer.current_balance_minor || 0) > 0 ? colors.error : colors.success,
                  fontWeight: 'bold',
                },
              ]}
            >
              {formatINR(customer.current_balance_minor || 0)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

          <View style={styles.metricItem}>
            <Text style={[typography.bodySmall, { color: colors.outline }]}>
              {t('heldJars')}
            </Text>
            <Text style={[typography.titleLarge, { color: colors.primary, fontWeight: 'bold' }]}>
              {customer.current_jars || 0} Jars
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <StatusChip status={customer.is_active ? 'active' : 'inactive'} />
          </View>
        </View>

        {/* Quick Operations Button Strip */}
        <View style={[styles.quickActions, { marginTop: spacing.space3 }]}>
          <Button
            title="Delivery"
            icon={<Ionicons name="bicycle" size={16} color={colors.onPrimary} />}
            onPress={() => router.push({ pathname: '/delivery-new', params: { customerId: customer.id } })}
            style={{ flex: 1, marginRight: 4, minHeight: 40 }}
          />
          <Button
            title="Payment"
            variant="tonal"
            icon={<Ionicons name="cash" size={16} color={colors.onSecondaryContainer} />}
            onPress={() => router.push({ pathname: '/payment-new', params: { customerId: customer.id } })}
            style={{ flex: 1, marginHorizontal: 4, minHeight: 40 }}
          />
          <Button
            title="Bill"
            variant="outlined"
            icon={<Ionicons name="document-text" size={16} color={colors.primary} />}
            onPress={() => router.push({ pathname: '/bill-new', params: { customerId: customer.id } })}
            style={{ flex: 1, marginLeft: 4, minHeight: 40 }}
          />
        </View>
      </View>

      {/* Tabs Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.subTabs, { backgroundColor: colors.surface }]}>
        {[
          { key: 'OVERVIEW', label: t('tabOverview') },
          { key: 'DELIVERIES', label: `${t('tabDeliveries')} (${deliveries.length})` },
          { key: 'PAYMENTS', label: `${t('tabPayments')} (${payments.length})` },
          { key: 'LEDGER', label: t('tabLedger') },
          { key: 'CARD', label: t('tabMonthlyCard') },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as any)}
            style={[
              styles.subTabItem,
              activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
            ]}
          >
            <Text
              style={[
                typography.labelMedium,
                { color: activeTab === tab.key ? colors.primary : colors.onSurfaceVariant, fontWeight: 'bold' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <ScrollView contentContainerStyle={{ padding: spacing.space4 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <Card>
            <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 8 }]}>
              Customer Profile
            </Text>
            <View style={styles.detailRow}>
              <Text style={[typography.bodyMedium, { color: colors.outline }]}>Address:</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurface, flex: 1, textAlign: 'right' }]}>
                {customer.address || 'Not specified'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[typography.bodyMedium, { color: colors.outline }]}>Route:</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurface }]}>
                {customer.route_name || 'Unassigned'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[typography.bodyMedium, { color: colors.outline }]}>Opening Balance:</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurface }]}>
                {formatINR(customer.opening_balance_minor)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[typography.bodyMedium, { color: colors.outline }]}>Opening Jars:</Text>
              <Text style={[typography.bodyMedium, { color: colors.onSurface }]}>
                {customer.opening_jars} Jars
              </Text>
            </View>
            {customer.notes ? (
              <View style={{ marginTop: 8 }}>
                <Text style={[typography.bodyMedium, { color: colors.outline }]}>Delivery Instructions:</Text>
                <Text style={[typography.bodyMedium, { color: colors.onSurface, marginTop: 4 }]}>
                  {customer.notes}
                </Text>
              </View>
            ) : null}
          </Card>

          <View style={{ marginTop: 24 }}>
            <Button
              title={customer.is_active ? t('deactivateCustomer') : t('activateCustomer')}
              variant={customer.is_active ? 'destructive' : 'filled'}
              onPress={handleToggleActive}
            />
          </View>
        </ScrollView>
      )}

      {/* 2. DELIVERIES */}
      {activeTab === 'DELIVERIES' && (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.space4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState title="No deliveries for this customer" />}
          renderItem={({ item }) => (
            <Card style={{ marginVertical: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                    {item.delivery_date} ({item.delivery_time})
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                    Jars Delivered: +{item.jars_delivered} | Collected: -{item.jars_collected}
                  </Text>
                </View>
                <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
                  {formatINR(item.total_amount_minor)}
                </Text>
              </View>
            </Card>
          )}
        />
      )}

      {/* 3. PAYMENTS */}
      {activeTab === 'PAYMENTS' && (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.space4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState title="No payments recorded" />}
          renderItem={({ item }) => (
            <Card style={{ marginVertical: 4, opacity: item.is_reversed ? 0.6 : 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View>
                  <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                    {item.payment_date} • {item.payment_method}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                    ID: {item.id} {item.reference_number ? `• Ref: ${item.reference_number}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[typography.titleMedium, { color: item.is_reversed ? colors.outline : colors.success, fontWeight: 'bold' }]}>
                    {formatINR(item.amount_minor)}
                  </Text>
                  {item.is_reversed ? <StatusChip status="cancelled" label="Reversed" /> : null}
                </View>
              </View>
            </Card>
          )}
        />
      )}

      {/* 4. LEDGER */}
      {activeTab === 'LEDGER' && (
        <FlatList
          data={ledgerEntries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.space4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState title={t('noLedgerEntries')} />}
          renderItem={({ item }) => (
            <Card style={{ marginVertical: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                    {item.description}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                    {item.timestamp.split('T')[0]} • {item.entry_type}
                  </Text>
                  <Text style={[typography.labelSmall, { color: colors.outline, marginTop: 2 }]}>
                    Balance: {formatINR(item.running_balance_minor || 0)}
                  </Text>
                </View>

                <Text
                  style={[
                    typography.titleMedium,
                    {
                      color: item.direction === 'DEBIT' ? colors.error : colors.success,
                      fontWeight: 'bold',
                    },
                  ]}
                >
                  {item.direction === 'DEBIT' ? `+ ${formatINR(item.amount_minor)}` : `- ${formatINR(item.amount_minor)}`}
                </Text>
              </View>
            </Card>
          )}
        />
      )}

      {/* 5. MONTHLY DELIVERY CARD */}
      {activeTab === 'CARD' && monthlyCard && (
        <ScrollView contentContainerStyle={{ padding: spacing.space4 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
              {monthlyCard.month}/{monthlyCard.year} Delivery Card
            </Text>
            <Button
              title="Share PDF Card"
              icon={<Ionicons name="print" size={16} color={colors.onPrimary} />}
              onPress={handleShareMonthlyCard}
              style={{ minHeight: 36, paddingVertical: 6 }}
            />
          </View>

          <Card style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={[typography.labelSmall, { color: colors.outline }]}>Jars Given</Text>
                <Text style={[typography.titleMedium, { color: colors.primary, fontWeight: 'bold' }]}>
                  {monthlyCard.total_jars_delivered}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[typography.labelSmall, { color: colors.outline }]}>Empties In</Text>
                <Text style={[typography.titleMedium, { color: colors.success, fontWeight: 'bold' }]}>
                  {monthlyCard.total_jars_collected}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={[typography.labelSmall, { color: colors.outline }]}>Monthly Total</Text>
                <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
                  {formatINR(monthlyCard.total_amount_minor)}
                </Text>
              </View>
            </View>
          </Card>

          {monthlyCard.days
            .filter((d) => d.quantity_delivered > 0)
            .map((day) => (
              <Card key={day.date} style={{ marginVertical: 3 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                    Day {day.day_number} ({day.date})
                  </Text>
                  <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                    {formatINR(day.daily_total_minor)}
                  </Text>
                </View>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                  Delivered: +{day.jars_delivered} Jars | Empties Collected: -{day.jars_collected}
                </Text>
              </Card>
            ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  profileHeader: {
    borderBottomWidth: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    height: 36,
  },
  quickActions: {
    flexDirection: 'row',
  },
  subTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
    maxHeight: 48,
  },
  subTabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
});
