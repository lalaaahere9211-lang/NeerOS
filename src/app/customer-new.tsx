import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useTranslation } from '../localization';
import { HeaderBar, TextField, Button } from '../components/ui';
import { CustomerRepository } from '../database/repositories/CustomerRepository';
import { getDatabase } from '../database/db';
import { RouteItem } from '../types/domain';

export default function CustomerNewScreen() {
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [openingJars, setOpeningJars] = useState('0');
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDatabase().then((db) => {
      db.getAllAsync<RouteItem>('SELECT * FROM routes WHERE is_active = 1;').then((list) => {
        setRoutes(list);
        if (list.length > 0) setSelectedRouteId(list[0].id);
      });
    });
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Customer name is required');
      return;
    }

    setLoading(true);
    try {
      const balanceMinor = Math.round(parseFloat(openingBalance || '0') * 100);
      const jars = parseInt(openingJars || '0', 10);

      const customer = await CustomerRepository.createCustomer({
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        route_id: selectedRouteId || undefined,
        notes: notes.trim() || undefined,
        opening_balance_minor: balanceMinor,
        opening_jars: isNaN(jars) ? 0 : jars,
      });

      Alert.alert('Success', 'Customer account created successfully!', [
        {
          text: 'OK',
          onPress: () => router.replace(`/customer/${customer.id}`),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar title={t('addCustomer')} showBack />

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.space4 }]}>
        <TextField
          label={t('customerName') + ' *'}
          placeholder="e.g. Ramesh Patel / Sharma General Store"
          value={name}
          onChangeText={setName}
        />

        <TextField
          label={t('phoneNumber')}
          placeholder="e.g. 9822012345"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <TextField
          label={t('deliveryAddress')}
          placeholder="Shop / Apartment number, Street, Area"
          value={address}
          onChangeText={setAddress}
          multiline
        />

        {/* Route Selector */}
        <Text style={[typography.labelMedium, { color: colors.onSurfaceVariant, marginBottom: spacing.space1 }]}>
          {t('assignedRoute')}
        </Text>
        <View style={styles.routeRow}>
          {routes.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => setSelectedRouteId(r.id)}
              style={[
                styles.routeChip,
                {
                  backgroundColor: selectedRouteId === r.id ? colors.primary : colors.surfaceContainer,
                  borderColor: colors.outlineVariant,
                },
              ]}
            >
              <Text
                style={[
                  typography.labelSmall,
                  { color: selectedRouteId === r.id ? colors.onPrimary : colors.onSurface },
                ]}
              >
                {r.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextField
          label={t('openingBalance')}
          placeholder="0.00"
          keyboardType="numeric"
          value={openingBalance}
          onChangeText={setOpeningBalance}
          hint="Initial unpaid balance receivable (if existing customer)"
        />

        <TextField
          label={t('openingJars')}
          placeholder="0"
          keyboardType="number-pad"
          value={openingJars}
          onChangeText={setOpeningJars}
          hint="Returnable jars currently in customer possession"
        />

        <TextField
          label={t('notes')}
          placeholder="e.g. Leave jars near gate / early morning supply"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <View style={{ marginTop: spacing.space5 }}>
          <Button
            title={t('save')}
            onPress={handleSave}
            loading={loading}
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
  routeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  routeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 6,
  },
});
