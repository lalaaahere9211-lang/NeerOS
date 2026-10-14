import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme';
import { useTranslation } from '../../localization';
import { useUserStore } from '../../store/userStore';

interface HeaderBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  subtitle,
  showBack = false,
  rightAction,
}) => {
  const { colors, typography, spacing } = useTheme();
  const { language, setLanguage } = useTranslation();
  const { currentUser } = useUserStore();
  const router = useRouter();

  const toggleLanguage = () => {
    setLanguage(language === 'hi' ? 'en' : 'hi');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.outlineVariant,
          paddingHorizontal: spacing.space4,
          paddingVertical: spacing.space3,
        },
      ]}
    >
      <View style={styles.leftRow}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.iconButton, { marginRight: spacing.space2 }]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.titleColumn}>
          <Text
            style={[
              typography.titleLarge,
              { color: colors.onSurface, fontWeight: 'bold' },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rightRow}>
        {rightAction}

        {/* Language Toggle Pill */}
        <TouchableOpacity
          onPress={toggleLanguage}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Toggle language"
          style={[
            styles.langPill,
            {
              backgroundColor: colors.primaryContainer,
              marginRight: spacing.space2,
            },
          ]}
        >
          <Text
            style={[
              typography.labelSmall,
              { color: colors.onPrimaryContainer, fontWeight: 'bold' },
            ]}
          >
            {language === 'hi' ? 'ENG' : 'हिंदी'}
          </Text>
        </TouchableOpacity>

        {/* Staff Role Badge */}
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={[
            styles.roleBadge,
            {
              backgroundColor:
                currentUser.role === 'OWNER'
                  ? colors.tertiaryContainer
                  : colors.secondaryContainer,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Active role: ${currentUser.role}`}
        >
          <Ionicons
            name={
              currentUser.role === 'OWNER'
                ? 'shield-checkmark'
                : currentUser.role === 'OFFICE'
                ? 'briefcase'
                : 'bicycle'
            }
            size={14}
            color={
              currentUser.role === 'OWNER'
                ? colors.onTertiaryContainer
                : colors.onSecondaryContainer
            }
          />
          <Text
            style={[
              typography.labelSmall,
              {
                color:
                  currentUser.role === 'OWNER'
                    ? colors.onTertiaryContainer
                    : colors.onSecondaryContainer,
                marginLeft: 4,
                fontWeight: 'bold',
              },
            ]}
          >
            {currentUser.role}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    minHeight: 56,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  titleColumn: {
    flex: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
  },
  langPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
