import React, { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../theme';
import { LocalizationProvider } from '../localization';
import { getDatabase } from '../database/db';
import { LoadingView } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/AuthProvider';
import { isSupabaseConfigured } from '../lib/supabase';
import { syncService } from '../services/syncService';

function RootNavigator() {
  const { isDark, colors } = useTheme();
  const { isLoading: authLoading, session, isCloudEnabled } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (!isCloudEnabled || authLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, authLoading, isCloudEnabled, segments]);

  if (authLoading) {
    return <LoadingView message="Restoring session..." />;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="customer/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="customer-new" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="customer-edit" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="delivery-new" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="payment-new" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="bill-new" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="reports" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await getDatabase();
        // Initialize sync service (creates local sync queue tables)
        await syncService.initialize();
      } catch (err) {
        console.error('Failed to initialize NeerOS database', err);
      } finally {
        setDbReady(true);
      }
    }
    init();
  }, []);

  if (!dbReady) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <LoadingView message="Initializing NeerOS Database..." />
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LocalizationProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
