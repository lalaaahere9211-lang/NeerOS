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
import { HeaderBar, TextField, Button, LoadingView } from '../components/ui';
import { CustomerRepository } from '../database/repositories/CustomerRepository';
import { getDatabase } from '../database/db';
import { RouteItem } from '../types/domain';

export default function CustomerEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, typography, spacing } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      CustomerRepository.getCustomerById(id),
      getDatabase().then((db) => db.getAllAsync<RouteItem>('SELECT * FROM routes WHERE is_active = 1;')),
    ]).then(([cust, rList]) => {
      if (cust) {
        setName(cust.name);
        setPhone(cust.phone || '');
        setAddress(cust.address || '');
        setNotes(cust.notes || '');
        setSelectedRouteId(cust.route_id || '');
      }
      setRoutes(rList);
      setLoading(false);
    });
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    if (!name.trim()) {
      Alert.alert('Validation', 'Customer name is required');
      return;
    }

    setSaving(true);
    try {
      await CustomerRepository.updateCustomer(id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        route_id: selectedRouteId || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Customer updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading customer details..." />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar title={t('editCustomer')} showBack />

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.space4 }]}>
        <TextField
          label={t('customerName') + ' *'}
          value={name}
          onChangeText={setName}
        />

        <TextField
          label={t('phoneNumber')}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <TextField
          label={t('deliveryAddress')}
          value={address}
          onChangeText={setAddress}
          multiline
        />

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
          label={t('notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <View style={{ marginTop: spacing.space5 }}>
          <Button
            title={t('save')}
            onPress={handleSave}
            loading={saving}
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
