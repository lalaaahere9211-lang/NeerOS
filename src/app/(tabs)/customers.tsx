import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useTranslation } from '../../localization';
import { HeaderBar, TextField, Card, StatusChip, Button, EmptyState } from '../../components/ui';
import { CustomerRepository } from '../../database/repositories/CustomerRepository';
import { Customer } from '../../types/domain';
import { formatINR } from '../../domain/accounting';

export default function CustomersScreen() {
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const loadCustomers = async () => {
    try {
      const activeOnly = activeFilter === 'ACTIVE';
      const list = await CustomerRepository.getCustomers(
        search,
        selectedRoute,
        activeOnly
      );

      let filtered = list;
      if (activeFilter === 'INACTIVE') {
        filtered = list.filter((c) => c.is_active === 0);
      }
      setCustomers(filtered);
    } catch (e) {
      console.error('Error fetching customers', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCustomers();
    }, [search, selectedRoute, activeFilter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCustomers();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar
        title={t('navCustomers')}
        subtitle={`${customers.length} Accounts`}
        rightAction={
          <TouchableOpacity
            onPress={() => router.push('/customer-new')}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Add Customer"
          >
            <Ionicons name="person-add" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        }
      />

      {/* Search & Filters */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surface, padding: spacing.space3 }]}>
        <TextField
          label=""
          placeholder={t('search')}
          value={search}
          onChangeText={setSearch}
          containerStyle={{ marginBottom: spacing.space2 }}
        />

        {/* Status Filters */}
        <View style={styles.chipRow}>
          <TouchableOpacity
            onPress={() => setActiveFilter('ALL')}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === 'ALL' ? colors.primary : colors.surfaceContainer,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <Text
              style={[
                typography.labelSmall,
                { color: activeFilter === 'ALL' ? colors.onPrimary : colors.onSurface },
              ]}
            >
              {t('all')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('ACTIVE')}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === 'ACTIVE' ? colors.primary : colors.surfaceContainer,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <Text
              style={[
                typography.labelSmall,
                { color: activeFilter === 'ACTIVE' ? colors.onPrimary : colors.onSurface },
              ]}
            >
              {t('active')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveFilter('INACTIVE')}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === 'INACTIVE' ? colors.primary : colors.surfaceContainer,
                borderColor: colors.outlineVariant,
              },
            ]}
          >
            <Text
              style={[
                typography.labelSmall,
                { color: activeFilter === 'INACTIVE' ? colors.onPrimary : colors.onSurface },
              ]}
            >
              {t('inactive')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Customer List */}
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { padding: spacing.space4 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            title={t('noCustomersFound')}
            icon={<Ionicons name="people-outline" size={40} color={colors.outline} />}
            actionTitle={t('addCustomer')}
            onAction={() => router.push('/customer-new')}
          />
        }
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push(`/customer/${item.id}`)}
            style={{ marginVertical: 6 }}
          >
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    typography.titleMedium,
                    { color: colors.onSurface, fontWeight: 'bold' },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                  {item.phone || 'No phone'} {item.route_name ? `• ${item.route_name}` : ''}
                </Text>
              </View>
              <StatusChip status={item.is_active ? 'active' : 'inactive'} />
            </View>

            <View style={[styles.balanceRow, { borderTopColor: colors.outlineVariant, marginTop: spacing.space2, paddingTop: spacing.space2 }]}>
              <View>
                <Text style={[typography.bodySmall, { color: colors.outline }]}>
                  {t('balanceDue')}
                </Text>
                <Text
                  style={[
                    typography.titleSmall,
                    {
                      color: (item.current_balance_minor || 0) > 0 ? colors.error : colors.success,
                      fontWeight: 'bold',
                    },
                  ]}
                >
                  {formatINR(item.current_balance_minor || 0)}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[typography.bodySmall, { color: colors.outline }]}>
                  {t('heldJars')}
                </Text>
                <Text
                  style={[
                    typography.titleSmall,
                    { color: colors.primary, fontWeight: 'bold' },
                  ]}
                >
                  {item.current_jars || 0} Jars
                </Text>
              </View>
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
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
  },
  chipRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
});
