import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useTranslation } from '../localization';
import { HeaderBar, Card, MetricCard } from '../components/ui';
import { ReportRepository, SalesReportData } from '../database/repositories/ReportRepository';
import { DashboardRepository } from '../database/repositories/DashboardRepository';
import { ProductRepository } from '../database/repositories/ProductRepository';
import { Product } from '../types/domain';
import { formatINR } from '../domain/accounting';

export default function ReportsScreen() {
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();

  const [dateFilter, setDateFilter] = useState<'TODAY' | 'MONTH' | 'ALL'>('MONTH');
  const [salesData, setSalesData] = useState<SalesReportData>({
    totalSalesMinor: 0,
    totalCollectionsMinor: 0,
    cashCollectionsMinor: 0,
    upiCollectionsMinor: 0,
    bankCollectionsMinor: 0,
    chequeCollectionsMinor: 0,
    deliveriesCount: 0,
    paymentsCount: 0,
  });
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = async () => {
    try {
      const now = new Date();
      let start = '';
      let end = now.toISOString().split('T')[0];

      if (dateFilter === 'TODAY') {
        start = end;
      } else if (dateFilter === 'MONTH') {
        const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');
        start = `${now.getFullYear()}-${monthStr}-01`;
      } else {
        start = '2020-01-01';
      }

      const [report, dash, prods] = await Promise.all([
        ReportRepository.getSalesReport(start, end),
        DashboardRepository.getDashboardMetrics(),
        ProductRepository.getProducts(),
      ]);

      setSalesData(report);
      setOutstandingTotal(dash.total_outstanding_minor);
      setProducts(prods);
    } catch (e) {
      console.error('Error fetching report data', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [dateFilter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar title={t('businessReports')} subtitle="Financials & Stock" showBack />

      {/* Date Filter Strip */}
      <View style={[styles.filterStrip, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity
          onPress={() => setDateFilter('TODAY')}
          style={[
            styles.filterChip,
            {
              backgroundColor: dateFilter === 'TODAY' ? colors.primary : colors.surfaceContainer,
            },
          ]}
        >
          <Text
            style={[
              typography.labelMedium,
              { color: dateFilter === 'TODAY' ? colors.onPrimary : colors.onSurface, fontWeight: 'bold' },
            ]}
          >
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setDateFilter('MONTH')}
          style={[
            styles.filterChip,
            {
              backgroundColor: dateFilter === 'MONTH' ? colors.primary : colors.surfaceContainer,
            },
          ]}
        >
          <Text
            style={[
              typography.labelMedium,
              { color: dateFilter === 'MONTH' ? colors.onPrimary : colors.onSurface, fontWeight: 'bold' },
            ]}
          >
            This Month
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setDateFilter('ALL')}
          style={[
            styles.filterChip,
            {
              backgroundColor: dateFilter === 'ALL' ? colors.primary : colors.surfaceContainer,
            },
          ]}
        >
          <Text
            style={[
              typography.labelMedium,
              { color: dateFilter === 'ALL' ? colors.onPrimary : colors.onSurface, fontWeight: 'bold' },
            ]}
          >
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { padding: spacing.space4 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Sales vs Collections */}
        <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 8 }]}>
          {t('reportSales')}
        </Text>

        <View style={styles.metricsGrid}>
          <MetricCard
            title={t('totalSales')}
            value={formatINR(salesData.totalSalesMinor)}
            subtitle={`${salesData.deliveriesCount} deliveries`}
            icon={<Ionicons name="trending-up" size={20} color={colors.primary} />}
            statusColor={colors.primary}
            style={{ flex: 1, marginRight: 6 }}
          />
          <MetricCard
            title={t('totalCollections')}
            value={formatINR(salesData.totalCollectionsMinor)}
            subtitle={`${salesData.paymentsCount} payments`}
            icon={<Ionicons name="cash" size={20} color={colors.success} />}
            statusColor={colors.success}
            style={{ flex: 1, marginLeft: 6 }}
          />
        </View>

        {/* Collections Breakdown by Payment Method */}
        <Card style={{ marginVertical: spacing.space3 }}>
          <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 12 }]}>
            Collections by Payment Method
          </Text>

          <View style={styles.breakdownRow}>
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
              {t('cashCollections')}:
            </Text>
            <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
              {formatINR(salesData.cashCollectionsMinor)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
              {t('upiCollections')}:
            </Text>
            <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
              {formatINR(salesData.upiCollectionsMinor)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
              {t('bankCollections')}:
            </Text>
            <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
              {formatINR(salesData.bankCollectionsMinor)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
              Cheque Collections:
            </Text>
            <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
              {formatINR(salesData.chequeCollectionsMinor)}
            </Text>
          </View>
        </Card>

        {/* Outstanding Receivables Card */}
        <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginTop: spacing.space2, marginBottom: 8 }]}>
          {t('reportOutstanding')}
        </Text>
        <Card style={{ backgroundColor: colors.warningContainer }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={[typography.labelMedium, { color: colors.onWarningContainer }]}>
                Total Outstanding Customer Dues
              </Text>
              <Text style={[typography.headlineSmall, { color: colors.onWarningContainer, fontWeight: 'bold', marginTop: 4 }]}>
                {formatINR(outstandingTotal)}
              </Text>
            </View>
            <Ionicons name="alert-circle" size={32} color={colors.onWarningContainer} />
          </View>
        </Card>

        {/* Inventory Stock Status Summary */}
        <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginTop: spacing.space4, marginBottom: 8 }]}>
          {t('reportInventory')}
        </Text>
        <Card>
          {products.map((p, idx) => {
            const isLow = p.stock_quantity <= p.low_stock_threshold;
            return (
              <View
                key={p.id}
                style={[
                  styles.prodStatusRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 8 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
                    {p.name}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.outline }]}>
                    Threshold: {p.low_stock_threshold} {p.unit}s
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      typography.titleSmall,
                      { color: isLow ? colors.error : colors.success, fontWeight: 'bold' },
                    ]}
                  >
                    {p.stock_quantity} {p.unit}s
                  </Text>
                  <Text
                    style={[
                      typography.labelSmall,
                      { color: isLow ? colors.error : colors.outline },
                    ]}
                  >
                    {isLow ? 'LOW STOCK' : 'OK'}
                  </Text>
                </View>
              </View>
            );
          })}
        </Card>
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
  filterStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  prodStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
});
