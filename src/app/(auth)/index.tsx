import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme';
import { useTranslation } from '../../localization';
import { useAuth } from '../../lib/AuthProvider';
import { TextField, Button } from '../../components/ui';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

export default function AuthScreen() {
  const { colors, typography, spacing, shapes } = useTheme();
  const { t } = useTranslation();
  const { signIn, signUp, resetPassword, isLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validate = (): boolean => {
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (mode === 'forgot-password') return true;

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (mode === 'sign-up') {
      if (!fullName.trim()) {
        setError('Please enter your full name');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'sign-in') {
        const { error: authError } = await signIn(email.trim(), password);
        if (authError) {
          setError(authError.message);
        }
      } else if (mode === 'sign-up') {
        const { error: authError, needsVerification } = await signUp(
          email.trim(),
          password,
          fullName.trim()
        );
        if (authError) {
          setError(authError.message);
        } else if (needsVerification) {
          setSuccess('Account created! Please check your email to verify your account, then sign in.');
          setMode('sign-in');
          setPassword('');
          setConfirmPassword('');
        }
      } else if (mode === 'forgot-password') {
        const { error: authError } = await resetPassword(email.trim());
        if (authError) {
          setError(authError.message);
        } else {
          setSuccess('Password reset email sent. Check your inbox.');
          setMode('sign-in');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { marginBottom: spacing.space8 }]}>
          <Text
            style={[
              typography.displayMedium,
              { color: colors.primary, textAlign: 'center', marginBottom: spacing.space2 },
            ]}
          >
            NeerOS
          </Text>
          <Text
            style={[
              typography.bodyLarge,
              { color: colors.onSurfaceVariant, textAlign: 'center' },
            ]}
          >
            Every Drop. Every Delivery. Every Detail.
          </Text>
        </View>

        {/* Form Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderRadius: shapes.shapeLarge,
              padding: spacing.space6,
              borderColor: colors.outlineVariant,
            },
          ]}
        >
          <Text
            style={[
              typography.headlineSmall,
              { color: colors.onSurface, marginBottom: spacing.space6 },
            ]}
          >
            {mode === 'sign-in' && 'Sign In'}
            {mode === 'sign-up' && 'Create Account'}
            {mode === 'forgot-password' && 'Reset Password'}
          </Text>

          {/* Error / Success */}
          {error && (
            <View
              style={[
                styles.alert,
                {
                  backgroundColor: colors.errorContainer,
                  borderRadius: shapes.shapeSmall,
                  padding: spacing.space3,
                  marginBottom: spacing.space4,
                },
              ]}
            >
              <Text style={[typography.bodyMedium, { color: colors.onErrorContainer }]}>
                {error}
              </Text>
            </View>
          )}

          {success && (
            <View
              style={[
                styles.alert,
                {
                  backgroundColor: colors.successContainer,
                  borderRadius: shapes.shapeSmall,
                  padding: spacing.space3,
                  marginBottom: spacing.space4,
                },
              ]}
            >
              <Text style={[typography.bodyMedium, { color: colors.onSuccessContainer }]}>
                {success}
              </Text>
            </View>
          )}

          {/* Name (sign-up only) */}
          {mode === 'sign-up' && (
            <TextField
              label="Full Name"
              placeholder="Ganesh Patil"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoComplete="name"
              accessibilityLabel="Full name input"
            />
          )}

          {/* Email */}
          <TextField
            label="Email"
            placeholder="owner@patilbrothers.in"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel="Email input"
          />

          {/* Password (not for forgot-password) */}
          {mode !== 'forgot-password' && (
            <TextField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
              accessibilityLabel="Password input"
            />
          )}

          {/* Confirm Password (sign-up only) */}
          {mode === 'sign-up' && (
            <TextField
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              accessibilityLabel="Confirm password input"
            />
          )}

          {/* Forgot password link */}
          {mode === 'sign-in' && (
            <TouchableOpacity
              onPress={() => switchMode('forgot-password')}
              style={{ alignSelf: 'flex-end', marginBottom: spacing.space4 }}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
            >
              <Text style={[typography.labelMedium, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          )}

          {/* Submit */}
          <Button
            title={
              mode === 'sign-in'
                ? 'Sign In'
                : mode === 'sign-up'
                  ? 'Create Account'
                  : 'Send Reset Link'
            }
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={{ marginTop: spacing.space2 }}
          />

          {/* Switch modes */}
          <View style={[styles.switchRow, { marginTop: spacing.space6 }]}>
            {mode === 'sign-in' && (
              <>
                <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => switchMode('sign-up')} accessibilityRole="button">
                  <Text style={[typography.labelLarge, { color: colors.primary }]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {mode === 'sign-up' && (
              <>
                <Text style={[typography.bodyMedium, { color: colors.onSurfaceVariant }]}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => switchMode('sign-in')} accessibilityRole="button">
                  <Text style={[typography.labelLarge, { color: colors.primary }]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {mode === 'forgot-password' && (
              <TouchableOpacity onPress={() => switchMode('sign-in')} accessibilityRole="button">
                <Text style={[typography.labelLarge, { color: colors.primary }]}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Offline note */}
        <Text
          style={[
            typography.bodySmall,
            {
              color: colors.outline,
              textAlign: 'center',
              marginTop: spacing.space6,
              paddingHorizontal: spacing.space4,
            },
          ]}
        >
          NeerOS works fully offline. Sign in to enable cloud backup and multi-device sync.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
  },
  card: {
    borderWidth: 1,
  },
  alert: {},
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
