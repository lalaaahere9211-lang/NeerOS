import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useTranslation } from '../../localization';
import { HeaderBar, Card, Button, EmptyState } from '../../components/ui';
import { DeliveryRepository } from '../../database/repositories/DeliveryRepository';
import { CustomerRepository } from '../../database/repositories/CustomerRepository';
import { Delivery } from '../../types/domain';
import { formatINR } from '../../domain/accounting';
import { WhatsAppService } from '../../services/whatsappService';

export default function DeliveriesScreen() {
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  // Selected date defaults to today
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadDeliveries = async () => {
    try {
      const list = await DeliveryRepository.getDeliveries(selectedDate);
      setDeliveries(list);
    } catch (e) {
      console.error('Error fetching deliveries', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDeliveries();
    }, [selectedDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDeliveries();
    setRefreshing(false);
  };

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const totalAmount = deliveries.reduce((acc, d) => acc + d.total_amount_minor, 0);
  const totalDeliveredJars = deliveries.reduce((acc, d) => acc + d.jars_delivered, 0);
  const totalCollectedJars = deliveries.reduce((acc, d) => acc + d.jars_collected, 0);

  const handleShare = async (delivery: Delivery) => {
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
    } catch {
      Alert.alert('Error', 'Failed to share message');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar
        title={t('navDeliveries')}
        subtitle={`${deliveries.length} Records`}
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/delivery-new')}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Record Delivery"
          >
            <Ionicons name="add" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        }
      />

      {/* Date Navigation Strip */}
      <View style={[styles.dateStrip, { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant }]}>
        <TouchableOpacity
          onPress={() => changeDate(-1)}
          style={styles.dateNavBtn}
          accessibilityLabel="Previous day"
        >
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
          style={styles.dateCenter}
        >
          <Ionicons name="calendar-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
            {selectedDate}
          </Text>
          {selectedDate === new Date().toISOString().split('T')[0] ? (
            <Text style={[typography.labelSmall, { color: colors.primary, marginLeft: 6 }]}>
              (Today)
            </Text>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => changeDate(1)}
          style={styles.dateNavBtn}
          accessibilityLabel="Next day"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Day Summary Totals Banner */}
      <View style={[styles.summaryBanner, { backgroundColor: colors.surfaceContainerLow, padding: spacing.space3 }]}>
        <View style={styles.summaryItem}>
          <Text style={[typography.labelSmall, { color: colors.outline }]}>Deliveries</Text>
          <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
            {deliveries.length}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[typography.labelSmall, { color: colors.outline }]}>Jars (+/-)</Text>
          <Text style={[typography.titleSmall, { color: colors.primary, fontWeight: 'bold' }]}>
            +{totalDeliveredJars} / -{totalCollectedJars}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[typography.labelSmall, { color: colors.outline }]}>Total Sales</Text>
          <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
            {formatINR(totalAmount)}
          </Text>
        </View>
      </View>

      {/* Deliveries List */}
      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { padding: spacing.space4 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            title="No deliveries on this date"
            icon={<Ionicons name="bicycle-outline" size={40} color={colors.outline} />}
            actionTitle={t('recordDelivery')}
            onAction={() => router.push('/delivery-new')}
          />
        }
        renderItem={({ item }) => (
          <Card style={{ marginVertical: 6 }}>
            <View style={styles.deliveryCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                  {item.customer_name}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                  {item.delivery_time} {item.route_name ? `• ${item.route_name}` : ''}
                </Text>
              </View>

              <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
                {formatINR(item.total_amount_minor)}
              </Text>
            </View>

            {/* Items Summary */}
            <View style={{ marginVertical: spacing.space2 }}>
              {item.items?.map((it) => (
                <Text key={it.id} style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                  • {it.product_name_snapshot} ({it.quantity} {it.quantity > 1 ? 'units' : 'unit'} @ {formatINR(it.unit_rate_snapshot_minor)}) = {formatINR(it.total_price_minor)}
                </Text>
              ))}
            </View>

            {/* Bottom Row with Jar Details and WhatsApp Share */}
            <View style={[styles.deliveryCardFooter, { borderTopColor: colors.outlineVariant, paddingTop: spacing.space2 }]}>
              <View>
                <Text style={[typography.labelSmall, { color: colors.primary, fontWeight: 'bold' }]}>
                  Jars: Delivered +{item.jars_delivered} | Empties -{item.jars_collected}
                </Text>
                {item.notes ? (
                  <Text style={[typography.bodySmall, { color: colors.outline, fontStyle: 'italic' }]}>
                    Note: {item.notes}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => handleShare(item)}
                style={[styles.shareActionBtn, { backgroundColor: colors.successContainer }]}
                accessibilityLabel="Share delivery slip on WhatsApp"
              >
                <Ionicons name="logo-whatsapp" size={16} color={colors.onSuccessContainer} />
                <Text style={[typography.labelSmall, { color: colors.onSuccessContainer, marginLeft: 4, fontWeight: 'bold' }]}>
                  Share
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />
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
  addBtn: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dateNavBtn: {
    padding: 8,
  },
  dateCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deliveryCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  shareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
