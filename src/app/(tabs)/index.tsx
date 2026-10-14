import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useTranslation } from '../../localization';
import { HeaderBar, MetricCard, Card, Button, StatusChip, EmptyState } from '../../components/ui';
import { DashboardRepository } from '../../database/repositories/DashboardRepository';
import { DeliveryRepository } from '../../database/repositories/DeliveryRepository';
import { CustomerRepository } from '../../database/repositories/CustomerRepository';
import { DashboardMetrics, Delivery } from '../../types/domain';
import { formatINR } from '../../domain/accounting';
import { WhatsAppService } from '../../services/whatsappService';

export default function HomeScreen() {
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    today_deliveries_count: 0,
    today_sales_minor: 0,
    today_collections_minor: 0,
    pending_deliveries_count: 0,
    total_outstanding_minor: 0,
    low_stock_products_count: 0,
    warehouse_empty_jars: 0,
    customer_held_jars: 0,
  });

  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [m, del] = await Promise.all([
        DashboardRepository.getDashboardMetrics(),
        DeliveryRepository.getDeliveries(today),
      ]);
      setMetrics(m);
      setRecentDeliveries(del.slice(0, 5));
    } catch (e) {
      console.error('Error loading dashboard data', e);
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

  const handleShareDelivery = async (delivery: Delivery) => {
    try {
      const customer = await CustomerRepository.getCustomerById(delivery.customer_id);
      if (!customer) return;

      const message = WhatsAppService.buildDeliverySummaryText(
        customer,
        delivery,
        customer.current_balance_minor || 0,
        customer.current_jars || 0
      );

      const res = await WhatsAppService.sendWhatsApp(customer.phone, message);
      if (res.fallbackCopied) {
        Alert.alert('WhatsApp', t('messageCopied'));
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to share message');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar
        title={t('appName')}
        subtitle={t('initialBusiness')}
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/reports')}
            style={{ padding: 6, marginRight: spacing.space2 }}
            accessibilityLabel="Reports"
          >
            <Ionicons name="stats-chart" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { padding: spacing.space4 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Actions Row */}
        <View style={styles.actionRow}>
          <Button
            title={t('quickRecordDelivery')}
            icon={<Ionicons name="bicycle" size={18} color={colors.onPrimary} />}
            onPress={() => router.push('/delivery-new')}
            style={{ flex: 1, marginRight: spacing.space2 }}
          />
          <Button
            title={t('quickAddCustomer')}
            icon={<Ionicons name="person-add" size={18} color={colors.onSecondaryContainer} />}
            variant="tonal"
            onPress={() => router.push('/customer-new')}
            style={{ flex: 1, marginLeft: spacing.space2 }}
          />
        </View>

        {/* Low Stock Warning Card if any */}
        {metrics.low_stock_products_count > 0 ? (
          <Card
            onPress={() => router.push('/(tabs)/inventory')}
            style={{
              backgroundColor: colors.warningContainer,
              borderColor: colors.warning,
              borderWidth: 1.5,
              marginBottom: spacing.space3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="warning" size={24} color={colors.onWarningContainer} />
              <View style={{ marginLeft: spacing.space3, flex: 1 }}>
                <Text style={[typography.titleSmall, { color: colors.onWarningContainer, fontWeight: 'bold' }]}>
                  {t('lowStockAlert')}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.onWarningContainer }]}>
                  {metrics.low_stock_products_count} {t('lowStockCount')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.onWarningContainer} />
            </View>
          </Card>
        ) : null}

        {/* 2x2 Primary KPI Metric Cards */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricsCol}>
            <MetricCard
              title={t('todayDeliveries')}
              value={metrics.today_deliveries_count}
              subtitle="Completed"
              icon={<Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              statusColor={colors.primary}
            />
            <MetricCard
              title={t('todayCollections')}
              value={formatINR(metrics.today_collections_minor, false)}
              subtitle="Received"
              icon={<Ionicons name="cash" size={20} color={colors.success} />}
              statusColor={colors.success}
            />
          </View>

          <View style={styles.metricsCol}>
            <MetricCard
              title={t('todaySales')}
              value={formatINR(metrics.today_sales_minor, false)}
              subtitle="Billed Value"
              icon={<Ionicons name="trending-up" size={20} color={colors.info} />}
              statusColor={colors.info}
            />
            <MetricCard
              title={t('totalOutstanding')}
              value={formatINR(metrics.total_outstanding_minor, false)}
              subtitle="Receivables"
              icon={<Ionicons name="alert-circle" size={20} color={colors.warning} />}
              statusColor={colors.warning}
            />
          </View>
        </View>

        {/* Returnable Jars Status Card */}
        <Card style={{ marginVertical: spacing.space3 }}>
          <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginBottom: spacing.space3 }]}>
            {t('jarCirculation')}
          </Text>
          <View style={styles.jarSummaryRow}>
            <View style={styles.jarItem}>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                {t('customerHeldJars')}
              </Text>
              <Text style={[typography.headlineSmall, { color: colors.primary, fontWeight: 'bold' }]}>
                {metrics.customer_held_jars}
              </Text>
              <Text style={[typography.labelSmall, { color: colors.outline }]}>with customers</Text>
            </View>
            <View style={[styles.jarDivider, { backgroundColor: colors.outlineVariant }]} />
            <View style={styles.jarItem}>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                {t('warehouseJars')}
              </Text>
              <Text style={[typography.headlineSmall, { color: colors.secondary, fontWeight: 'bold' }]}>
                {metrics.warehouse_empty_jars}
              </Text>
              <Text style={[typography.labelSmall, { color: colors.outline }]}>in godown</Text>
            </View>
          </View>
        </Card>

        {/* Recent Deliveries List */}
        <View style={{ marginTop: spacing.space3 }}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
              {t('recentDeliveries')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/deliveries')}>
              <Text style={[typography.labelMedium, { color: colors.primary, fontWeight: 'bold' }]}>
                {t('all')}
              </Text>
            </TouchableOpacity>
          </View>

          {recentDeliveries.length === 0 ? (
            <EmptyState
              title={t('noDeliveriesToday')}
              icon={<Ionicons name="cube-outline" size={36} color={colors.outline} />}
              actionTitle={t('quickRecordDelivery')}
              onAction={() => router.push('/delivery-new')}
            />
          ) : (
            recentDeliveries.map((del) => (
              <Card key={del.id} style={{ marginVertical: 4 }}>
                <View style={styles.deliveryRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                      {del.customer_name}
                    </Text>
                    <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                      {del.delivery_time} • {del.items?.map((i) => `${i.product_name_snapshot} x${i.quantity}`).join(', ') || 'Water'}
                    </Text>
                    <Text style={[typography.labelSmall, { color: colors.primary, marginTop: 2 }]}>
                      Jars: +{del.jars_delivered} / -{del.jars_collected}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                      {formatINR(del.total_amount_minor)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleShareDelivery(del)}
                      style={[styles.shareBtn, { backgroundColor: colors.successContainer }]}
                      accessibilityLabel="Share on WhatsApp"
                    >
                      <Ionicons name="logo-whatsapp" size={16} color={colors.onSuccessContainer} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
  },
  metricsCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  jarSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  jarItem: {
    alignItems: 'center',
    flex: 1,
  },
  jarDivider: {
    width: 1,
    height: 48,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shareBtn: {
    padding: 6,
    borderRadius: 8,
    marginTop: 6,
  },
});
