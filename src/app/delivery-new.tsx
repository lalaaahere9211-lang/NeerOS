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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useTranslation } from '../localization';
import { HeaderBar, Card, Button, TextField, LoadingView } from '../components/ui';
import { CustomerRepository } from '../database/repositories/CustomerRepository';
import { ProductRepository } from '../database/repositories/ProductRepository';
import { DeliveryRepository } from '../database/repositories/DeliveryRepository';
import { Customer, Product } from '../types/domain';
import { formatINR } from '../domain/accounting';
import { WhatsAppService } from '../services/whatsappService';
import { useUserStore } from '../store/userStore';

export default function DeliveryNewScreen() {
  const { customerId } = useLocalSearchParams<{ customerId?: string }>();
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const { currentUser } = useUserStore();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [jarsDelivered, setJarsDelivered] = useState<number>(0);
  const [jarsCollected, setJarsCollected] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      CustomerRepository.getCustomers(undefined, undefined, true),
      ProductRepository.getProducts(true),
    ]).then(([cList, pList]) => {
      setCustomers(cList);
      setProducts(pList);

      if (customerId) {
        const found = cList.find((c) => c.id === customerId);
        if (found) {
          setSelectedCustomer(found);
        }
      } else if (cList.length > 0) {
        setSelectedCustomer(cList[0]);
      }

      // Default 1 jar for the primary 20L product
      const defaultQtys: Record<string, number> = {};
      const jarProd = pList.find((p) => p.is_returnable === 1);
      if (jarProd) {
        defaultQtys[jarProd.id] = 1;
        setJarsDelivered(1);
        setJarsCollected(1);
      }
      setItemQuantities(defaultQtys);
      setLoading(false);
    });
  }, [customerId]);

  const updateItemQty = (productId: string, delta: number) => {
    setItemQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });

    // Auto update jars delivered if returnable jar
    const prod = products.find((p) => p.id === productId);
    if (prod && prod.is_returnable) {
      setJarsDelivered((prev) => Math.max(0, prev + delta));
    }
  };

  // Calculate live total
  let totalAmountMinor = 0;
  products.forEach((p) => {
    const qty = itemQuantities[p.id] || 0;
    totalAmountMinor += qty * p.current_rate_minor;
  });

  const handleSaveDelivery = async () => {
    if (!selectedCustomer) {
      Alert.alert('Validation', 'Please select a customer');
      return;
    }

    const itemsToRecord = products
      .filter((p) => (itemQuantities[p.id] || 0) > 0)
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        quantity: itemQuantities[p.id] || 0,
        unitRateMinor: p.current_rate_minor,
        isReturnable: p.is_returnable,
      }));

    if (itemsToRecord.length === 0) {
      Alert.alert('Validation', t('noItemsInDelivery'));
      return;
    }

    setSubmitting(true);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    const idempotencyKey = `idemp_del_${selectedCustomer.id}_${Date.now()}`;

    try {
      const delivery = await DeliveryRepository.recordDelivery({
        customerId: selectedCustomer.id,
        routeId: selectedCustomer.route_id,
        deliveredByUserId: currentUser.id,
        deliveryDate: dateStr,
        deliveryTime: timeStr,
        items: itemsToRecord,
        jarsDelivered,
        jarsCollected,
        notes: notes.trim() || undefined,
        idempotencyKey,
      });

      // Show completion alert with direct WhatsApp share
      Alert.alert(
        t('deliverySuccess'),
        `Total: ${formatINR(totalAmountMinor)}\nJars Given: ${jarsDelivered} | Collected: ${jarsCollected}`,
        [
          {
            text: 'Share WhatsApp',
            onPress: async () => {
              const updatedCust = await CustomerRepository.getCustomerById(selectedCustomer.id);
              if (updatedCust) {
                const msg = WhatsAppService.buildDeliverySummaryText(
                  updatedCust,
                  delivery,
                  updatedCust.current_balance_minor || 0,
                  updatedCust.current_jars || 0
                );
                await WhatsAppService.sendWhatsApp(updatedCust.phone, msg);
              }
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
      Alert.alert('Error', err.message || 'Failed to record delivery');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading delivery form..." />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar title={t('recordDelivery')} showBack />

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
                  {c.current_jars || 0} Jars held • {formatINR(c.current_balance_minor || 0)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected Customer Live Balance Preview */}
        {selectedCustomer && (
          <Card style={{ marginVertical: spacing.space3, backgroundColor: colors.surfaceContainerLow }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                  {selectedCustomer.name}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                  {selectedCustomer.address || 'Pune'} {selectedCustomer.route_name ? `• ${selectedCustomer.route_name}` : ''}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.labelSmall, { color: colors.outline }]}>Balance</Text>
                <Text
                  style={[
                    typography.titleSmall,
                    {
                      color: (selectedCustomer.current_balance_minor || 0) > 0 ? colors.error : colors.success,
                      fontWeight: 'bold',
                    },
                  ]}
                >
                  {formatINR(selectedCustomer.current_balance_minor || 0)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Products & Line Items */}
        <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginTop: spacing.space2, marginBottom: spacing.space2 }]}>
          Products Delivered
        </Text>

        {products.map((p) => {
          const qty = itemQuantities[p.id] || 0;
          return (
            <Card key={p.id} style={{ marginVertical: 4 }}>
              <View style={styles.productRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                    {p.name}
                  </Text>
                  <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: 'bold' }]}>
                    {formatINR(p.current_rate_minor)} / {p.unit}
                  </Text>
                </View>

                {/* Counter controls */}
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    onPress={() => updateItemQty(p.id, -1)}
                    style={[styles.counterBtn, { backgroundColor: colors.surfaceVariant }]}
                    accessibilityLabel="Decrease quantity"
                  >
                    <Ionicons name="remove" size={18} color={colors.onSurface} />
                  </TouchableOpacity>

                  <Text style={[typography.titleMedium, { color: colors.onSurface, marginHorizontal: 12, fontWeight: 'bold', minWidth: 24, textAlign: 'center' }]}>
                    {qty}
                  </Text>

                  <TouchableOpacity
                    onPress={() => updateItemQty(p.id, 1)}
                    style={[styles.counterBtn, { backgroundColor: colors.primary }]}
                    accessibilityLabel="Increase quantity"
                  >
                    <Ionicons name="add" size={18} color={colors.onPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        })}

        {/* Returnable Jars Reconciliation Section */}
        <Card style={{ marginVertical: spacing.space3 }}>
          <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 12 }]}>
            Returnable Water Jars (20L)
          </Text>

          <View style={styles.jarCounterRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMedium, { color: colors.onSurface }]}>
                {t('filledDelivered')}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.outline }]}>Customer custody (+)</Text>
            </View>
            <View style={styles.counterRow}>
              <TouchableOpacity
                onPress={() => setJarsDelivered((prev) => Math.max(0, prev - 1))}
                style={[styles.counterBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <Ionicons name="remove" size={16} color={colors.onSurface} />
              </TouchableOpacity>
              <Text style={[typography.titleMedium, { color: colors.primary, marginHorizontal: 12, fontWeight: 'bold' }]}>
                {jarsDelivered}
              </Text>
              <TouchableOpacity
                onPress={() => setJarsDelivered((prev) => prev + 1)}
                style={[styles.counterBtn, { backgroundColor: colors.primaryContainer }]}
              >
                <Ionicons name="add" size={16} color={colors.onPrimaryContainer} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.jarCounterRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.bodyMedium, { color: colors.onSurface }]}>
                {t('emptyCollected')}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.outline }]}>Returns to warehouse (-)</Text>
            </View>
            <View style={styles.counterRow}>
              <TouchableOpacity
                onPress={() => setJarsCollected((prev) => Math.max(0, prev - 1))}
                style={[styles.counterBtn, { backgroundColor: colors.surfaceVariant }]}
              >
                <Ionicons name="remove" size={16} color={colors.onSurface} />
              </TouchableOpacity>
              <Text style={[typography.titleMedium, { color: colors.secondary, marginHorizontal: 12, fontWeight: 'bold' }]}>
                {jarsCollected}
              </Text>
              <TouchableOpacity
                onPress={() => setJarsCollected((prev) => prev + 1)}
                style={[styles.counterBtn, { backgroundColor: colors.secondaryContainer }]}
              >
                <Ionicons name="add" size={16} color={colors.onSecondaryContainer} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        <TextField
          label={t('notes')}
          placeholder="Special notes for this delivery"
          value={notes}
          onChangeText={setNotes}
        />

        {/* Live Total & Save Button */}
        <Card style={{ marginVertical: spacing.space3, backgroundColor: colors.primaryContainer }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[typography.titleMedium, { color: colors.onPrimaryContainer, fontWeight: 'bold' }]}>
              {t('deliveryTotal')}
            </Text>
            <Text style={[typography.headlineSmall, { color: colors.onPrimaryContainer, fontWeight: 'bold' }]}>
              {formatINR(totalAmountMinor)}
            </Text>
          </View>
        </Card>

        <Button
          title={submitting ? t('duplicateSubmitWarning') : t('saveDelivery')}
          onPress={handleSaveDelivery}
          loading={submitting}
        />
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
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jarCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
