import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useAuth } from '@/contexts/AuthContext';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

export default function LoginScreen() {
  const { signIn, isLoading, devSignIn } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={[styles.logo, { color: colors.primary }]}>🐣</Text>
          <Text style={[styles.title, { color: colors.text }]}>Hatch</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Swipe on baby names with your partner
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.googleButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={signIn}
          disabled={isLoading}
        >
          <FontAwesome name="google" size={20} color="#4285F4" />
          <Text style={[styles.googleButtonText, { color: colors.text }]}>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Text>
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            style={[
              styles.devButton,
              { backgroundColor: colors.primary, borderColor: colors.primaryDark },
            ]}
            onPress={devSignIn}
            disabled={isLoading}
          >
            <FontAwesome name="code" size={20} color="#fff" />
            <Text style={[styles.devButtonText]}>
              {isLoading ? 'Signing in...' : 'Dev Login (Simulator)'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logo: {
    fontSize: 80,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  googleButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  devButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
});
