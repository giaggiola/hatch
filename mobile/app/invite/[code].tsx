import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

interface InviteDetail {
  code: string;
  status: string;
  invited_by_name?: string;
  expires_at?: string;
}

export default function InvitePage() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading, signIn } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [invite, setInvite] = useState<InviteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    const loadInvite = async () => {
      if (!code) {
        setError('Invalid invite link');
        setIsLoading(false);
        return;
      }

      try {
        const data = await api.getInvite(code);
        setInvite(data);

        // If already authenticated, try to accept
        if (user) {
          await handleAccept();
        }
      } catch (err) {
        setError('Invite not found or expired');
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      loadInvite();
    }
  }, [code, user, authLoading]);

  const handleAccept = async () => {
    if (!code) return;

    setIsAccepting(true);
    try {
      await api.acceptInvite(code);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Failed to accept invite');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleSignIn = async () => {
    try {
      await signIn();
      // After sign in, the useEffect will re-run and auto-accept
    } catch (err) {
      setError('Sign in failed. Please try again.');
    }
  };

  if (authLoading || isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>😕</Text>
        <Text style={[styles.title, { color: colors.text }]}>Oops!</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.buttonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (invite?.status !== 'pending') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={styles.emoji}>⏰</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          Invite Already Used
        </Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          This invite has already been accepted or has expired.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.buttonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.emoji}>💕</Text>
      <Text style={[styles.title, { color: colors.text }]}>You're Invited!</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {invite?.invited_by_name || 'Someone'} wants to find baby names with you
        on Hatch.
      </Text>

      {user ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleAccept}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Join & Start Swiping</Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.signInContainer}>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Sign in to accept the invite
          </Text>
          <TouchableOpacity
            style={[styles.googleButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleSignIn}
          >
            <Text style={[styles.googleButtonText, { color: colors.text }]}>
              Sign in with Google
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  signInContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  hint: {
    fontSize: FontSizes.sm,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  googleButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
});
