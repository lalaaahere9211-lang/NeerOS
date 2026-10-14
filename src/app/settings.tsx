import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { useTranslation, Language } from '../localization';
import { HeaderBar, Card, Button, TextField, ConfirmModal } from '../components/ui';
import { UserRepository } from '../database/repositories/UserRepository';
import { BackupRepository } from '../database/repositories/BackupRepository';
import { User, UserRole } from '../types/domain';
import { useUserStore } from '../store/userStore';

export default function SettingsScreen() {
  const { colors, typography, spacing, themeMode, setThemeMode } = useTheme();
  const { t, language, setLanguage } = useTranslation();
  const { currentUser, setCurrentUser } = useUserStore();

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserToSwitch, setSelectedUserToSwitch] = useState<User | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    UserRepository.getUsers().then(setUsers);
  }, []);

  const handleRoleSelect = (user: User) => {
    if (user.id === currentUser.id) return;
    setSelectedUserToSwitch(user);
    setEnteredPin('');
    setShowPinModal(true);
  };

  const handleVerifyPin = async () => {
    if (!selectedUserToSwitch) return;

    const valid = await UserRepository.verifyPin(selectedUserToSwitch.id, enteredPin);
    if (valid) {
      setCurrentUser(selectedUserToSwitch);
      setShowPinModal(false);
      Alert.alert('Role Switched', `Logged in as ${selectedUserToSwitch.name} (${selectedUserToSwitch.role})`);
    } else {
      Alert.alert('Security Check', t('invalidPin'));
    }
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const json = await BackupRepository.exportDatabaseJSON();
      const backupFile = new File(Paths.document, `neeros_backup_${Date.now()}.json`);
      backupFile.write(json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupFile.uri, { mimeType: 'application/json', dialogTitle: 'Save NeerOS Backup' });
      } else {
        Alert.alert('Backup Created', `Saved to ${backupFile.uri}`);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to backup database: ' + err.message);
    } finally {
      setBackingUp(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <HeaderBar title={t('settingsTitle')} subtitle="Preferences & System" showBack />

      <ScrollView contentContainerStyle={[styles.content, { padding: spacing.space4 }]}>
        {/* Business Profile */}
        <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 8 }]}>
          {t('businessProfile')}
        </Text>
        <Card style={{ marginBottom: spacing.space4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="water" size={32} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold' }]}>
                Patil Brothers (पाटिल ब्रदर्स)
              </Text>
              <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                Shop No. 4, Market Yard, Pune, Maharashtra 411037
              </Text>
              <Text style={[typography.bodySmall, { color: colors.primary, marginTop: 2 }]}>
                Phone: +91 98765 43210 • Currency: INR (₹)
              </Text>
            </View>
          </View>
        </Card>

        {/* Staff Role Switcher */}
        <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 8 }]}>
          {t('currentRole')}
        </Text>
        <Card style={{ marginBottom: spacing.space4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View>
              <Text style={[typography.titleSmall, { color: colors.onSurface, fontWeight: 'bold' }]}>
                {currentUser.name}
              </Text>
              <Text style={[typography.bodySmall, { color: colors.primary, fontWeight: 'bold' }]}>
                Role: {currentUser.role}
              </Text>
            </View>
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          </View>

          <Text style={[typography.labelSmall, { color: colors.outline, marginBottom: 8 }]}>
            Switch Staff Profile (Requires 4-Digit PIN):
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {users.map((u) => {
              const isCurrent = u.id === currentUser.id;
              return (
                <TouchableOpacity
                  key={u.id}
                  onPress={() => handleRoleSelect(u)}
                  style={[
                    styles.roleChip,
                    {
                      backgroundColor: isCurrent ? colors.primary : colors.surfaceContainer,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.labelMedium,
                      { color: isCurrent ? colors.onPrimary : colors.onSurface, fontWeight: 'bold' },
                    ]}
                  >
                    {u.name.split(' ')[0]} ({u.role})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Language Selection */}
        <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 8 }]}>
          {t('languageSelection')}
        </Text>
        <Card style={{ marginBottom: spacing.space4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <TouchableOpacity
              onPress={() => setLanguage('en')}
              style={[
                styles.langOption,
                language === 'en' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  typography.titleMedium,
                  { color: language === 'en' ? colors.onPrimaryContainer : colors.onSurface, fontWeight: 'bold' },
                ]}
              >
                English
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setLanguage('hi')}
              style={[
                styles.langOption,
                language === 'hi' && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  typography.titleMedium,
                  { color: language === 'hi' ? colors.onPrimaryContainer : colors.onSurface, fontWeight: 'bold' },
                ]}
              >
                हिंदी (Hindi)
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Theme Mode */}
        <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 8 }]}>
          {t('themeMode')}
        </Text>
        <Card style={{ marginBottom: spacing.space4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            {(['light', 'dark', 'system'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setThemeMode(m)}
                style={[
                  styles.themeOption,
                  themeMode === m && { backgroundColor: colors.primaryContainer, borderColor: colors.primary },
                ]}
              >
                <Text
                  style={[
                    typography.labelMedium,
                    { color: themeMode === m ? colors.onPrimaryContainer : colors.onSurface, fontWeight: 'bold' },
                  ]}
                >
                  {m === 'light' ? t('themeLight') : m === 'dark' ? t('themeDark') : t('themeSystem')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Backup & Recovery */}
        <Text style={[typography.titleMedium, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 8 }]}>
          Data Safety & Backup
        </Text>
        <Card>
          <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant, marginBottom: 12 }]}>
            Export complete SQLite operational database into an encrypted JSON backup file.
          </Text>
          <Button
            title={t('backupData')}
            icon={<Ionicons name="cloud-download-outline" size={18} color={colors.onPrimary} />}
            onPress={handleBackup}
            loading={backingUp}
          />
        </Card>
      </ScrollView>

      {/* Staff PIN Verification Modal */}
      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, padding: spacing.space5, borderRadius: 16 }]}>
            <Text style={[typography.titleLarge, { color: colors.onSurface, fontWeight: 'bold', marginBottom: 8 }]}>
              {t('enterPin')}
            </Text>
            <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant, marginBottom: 16 }]}>
              Switching to {selectedUserToSwitch?.name} ({selectedUserToSwitch?.role})
            </Text>

            <TextField
              label="4-Digit PIN"
              placeholder="••••"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              value={enteredPin}
              onChangeText={setEnteredPin}
            />

            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <Button title={t('cancel')} variant="outlined" onPress={() => setShowPinModal(false)} style={{ flex: 1, marginRight: 6 }} />
              <Button title={t('confirm')} onPress={handleVerifyPin} style={{ flex: 1, marginLeft: 6 }} />
            </View>
          </View>
        </View>
      </Modal>
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
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  langOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE4E7',
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE4E7',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    elevation: 8,
  },
});
