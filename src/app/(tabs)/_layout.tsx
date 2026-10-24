import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useTranslation } from '../../localization';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.outlineVariant,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('navHome'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: t('navCustomers'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: t('navDeliveries'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bicycle" size={size} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t('navInventory'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: t('navAccounts'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={typeof color === 'string' ? color : undefined} />
          ),
        }}
      />
    </Tabs>
  );
}
