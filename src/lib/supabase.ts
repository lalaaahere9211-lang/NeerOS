import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import type { Database } from '../types/supabase';

// ---------------------------------------------------------------------------
// Environment Validation
// ---------------------------------------------------------------------------
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  console.error(
    `[NeerOS] Missing Supabase configuration: ${missing.join(', ')}.\n` +
      `Copy .env.example to .env and fill in your Supabase project credentials.\n` +
      `Get them from: https://supabase.com/dashboard → Project Settings → API`
  );
}

// ---------------------------------------------------------------------------
// Singleton Client
// ---------------------------------------------------------------------------
let _client: SupabaseClient<Database> | null = null;

/**
 * Returns the singleton Supabase client.
 * Throws if environment variables are missing.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  if (_client) return _client;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '[NeerOS] Cannot initialize Supabase: missing EXPO_PUBLIC_SUPABASE_URL or ' +
        'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. See .env.example.'
    );
  }

  _client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  });

  return _client;
}

/**
 * Returns true if the Supabase environment is configured.
 * Use this to conditionally enable cloud features.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// ---------------------------------------------------------------------------
// Token Refresh on App Foreground
// ---------------------------------------------------------------------------
// When the app comes back to the foreground, tell Supabase Auth to refresh
// the session. This handles token expiry during long background periods.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active' && _client) {
      _client.auth.startAutoRefresh();
    } else if (nextState !== 'active' && _client) {
      _client.auth.stopAutoRefresh();
    }
  });
}

// Re-export convenience alias
export const supabase = isSupabaseConfigured() ? getSupabaseClient() : null;
