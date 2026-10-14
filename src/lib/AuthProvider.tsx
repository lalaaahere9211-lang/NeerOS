import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { isSupabaseConfigured, getSupabaseClient } from './supabase';
import type { Database } from '../types/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type BusinessMembership = Database['public']['Tables']['business_memberships']['Row'];

export interface AuthState {
  /** Whether the auth state is still loading (session restore, profile fetch) */
  isLoading: boolean;
  /** The Supabase auth session (null if signed out or Supabase not configured) */
  session: Session | null;
  /** The auth.users record */
  user: User | null;
  /** The user's NeerOS profile */
  profile: UserProfile | null;
  /** The user's active business membership */
  membership: BusinessMembership | null;
  /** Whether Supabase is configured at all */
  isCloudEnabled: boolean;
  /** Whether user needs email verification */
  needsEmailVerification: boolean;
}

export interface AuthActions {
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null; needsVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  refreshProfile: () => Promise<void>;
  createBusiness: (name: string, tagline?: string, address?: string, phone?: string) => Promise<{ businessId: string | null; error: string | null }>;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membership, setMembership] = useState<BusinessMembership | null>(null);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const isCloudEnabled = isSupabaseConfigured();

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  const fetchProfile = useCallback(async (userId: string) => {
    if (!isCloudEnabled) return;
    try {
      const supabase = getSupabaseClient();

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Fetch active business membership
        if (profileData.active_business_id) {
          const { data: membershipData } = await supabase
            .from('business_memberships')
            .select('*')
            .eq('business_id', profileData.active_business_id)
            .eq('user_id', userId)
            .eq('is_active', true)
            .single();

          setMembership(membershipData ?? null);
        }
      }
    } catch (err) {
      console.error('[NeerOS Auth] Failed to fetch profile:', err);
    }
  }, [isCloudEnabled]);

  // -----------------------------------------------------------------------
  // Session Initialization
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isCloudEnabled) {
      setIsLoading(false);
      return;
    }

    const supabase = getSupabaseClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        // Check email verification
        if (!initialSession.user.email_confirmed_at) {
          setNeedsEmailVerification(true);
          setIsLoading(false);
          return;
        }
        fetchProfile(initialSession.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, changedSession) => {
        setSession(changedSession);
        setUser(changedSession?.user ?? null);

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setMembership(null);
          setNeedsEmailVerification(false);
        } else if (changedSession?.user) {
          if (!changedSession.user.email_confirmed_at) {
            setNeedsEmailVerification(true);
          } else {
            setNeedsEmailVerification(false);
            await fetchProfile(changedSession.user.id);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [isCloudEnabled, fetchProfile]);

  // -----------------------------------------------------------------------
  // Foreground refresh
  // -----------------------------------------------------------------------
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        if (isCloudEnabled && session?.user) {
          fetchProfile(session.user.id);
        }
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [isCloudEnabled, session, fetchProfile]);

  // -----------------------------------------------------------------------
  // Auth Actions
  // -----------------------------------------------------------------------
  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!isCloudEnabled) return { error: null as AuthError | null, needsVerification: false };

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) return { error, needsVerification: false };

    // Supabase returns a user with identities=[] if email already registered
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return {
        error: { message: 'An account with this email already exists.', name: 'AuthApiError', status: 400 } as AuthError,
        needsVerification: false,
      };
    }

    // If email confirmation is required, session will be null
    const needsVerification = !data.session;
    if (needsVerification) {
      setNeedsEmailVerification(true);
    }

    return { error: null, needsVerification };
  }, [isCloudEnabled]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isCloudEnabled) return { error: null as AuthError | null };

    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, [isCloudEnabled]);

  const signOut = useCallback(async () => {
    if (!isCloudEnabled) return;
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setProfile(null);
    setMembership(null);
    setNeedsEmailVerification(false);
  }, [isCloudEnabled]);

  const resetPassword = useCallback(async (email: string) => {
    if (!isCloudEnabled) return { error: null as AuthError | null };
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  }, [isCloudEnabled]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const createBusiness = useCallback(async (
    name: string,
    tagline?: string,
    address?: string,
    phone?: string
  ): Promise<{ businessId: string | null; error: string | null }> => {
    if (!isCloudEnabled || !user) {
      return { businessId: null, error: 'Not authenticated' };
    }

    try {
      const supabase = getSupabaseClient();

      // Create business profile
      const { data: business, error: bizError } = await supabase
        .from('business_profiles')
        .insert({
          name,
          tagline: tagline || null,
          address: address || null,
          phone: phone || null,
          owner_user_id: user.id,
        })
        .select()
        .single();

      if (bizError || !business) {
        return { businessId: null, error: bizError?.message ?? 'Failed to create business' };
      }

      // Create owner membership
      const { error: memError } = await supabase
        .from('business_memberships')
        .insert({
          business_id: business.id,
          user_id: user.id,
          role: 'OWNER',
          display_name: profile?.full_name ?? user.email ?? 'Owner',
        });

      if (memError) {
        return { businessId: null, error: memError.message };
      }

      // Set as active business
      await supabase
        .from('user_profiles')
        .update({ active_business_id: business.id })
        .eq('id', user.id);

      await refreshProfile();
      return { businessId: business.id, error: null };
    } catch (err) {
      return { businessId: null, error: String(err) };
    }
  }, [isCloudEnabled, user, profile, refreshProfile]);

  // -----------------------------------------------------------------------
  // Context Value
  // -----------------------------------------------------------------------
  const value: AuthContextType = {
    isLoading,
    session,
    user,
    profile,
    membership,
    isCloudEnabled,
    needsEmailVerification,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
    createBusiness,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
