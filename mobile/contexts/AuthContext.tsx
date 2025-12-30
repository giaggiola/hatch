import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { api } from '../lib/api';
import { User } from '../types';

// Configure Google Sign-In
GoogleSignin.configure({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
});

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  devSignIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await api.getToken();
      if (token) {
        const userData = await api.getMe();
        setUser(userData);
      }
    } catch (error) {
      await api.clearToken();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleToken = async (googleAccessToken: string) => {
    try {
      setIsLoading(true);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      if (__DEV__) console.log('Sending token to backend:', apiUrl);

      const response = await fetch(
        `${apiUrl}/api/auth/google/mobile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: googleAccessToken }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error('Failed to authenticate');
      }

      const { access_token } = await response.json();
      await api.setToken(access_token);

      const userData = await api.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Auth error:', error);
      await api.clearToken();
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      if (__DEV__) console.log('Starting native Google Sign-In');

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();

      if (__DEV__) console.log('Google Sign-In success, getting tokens');
      const tokens = await GoogleSignin.getTokens();

      if (tokens.accessToken) {
        await handleGoogleToken(tokens.accessToken);
      }
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        if (__DEV__) console.log('User cancelled sign in');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        if (__DEV__) console.log('Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Play services not available');
      } else {
        console.error('Google Sign-In error:', error);
        Alert.alert('Sign In Error', error.message || 'Failed to sign in');
      }
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
      // Sign out of Google
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore Google sign out errors
      }
      await api.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (error) {
      setUser(null);
    }
  }, []);

  const devSignIn = useCallback(async () => {
    try {
      setIsLoading(true);
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      if (__DEV__) console.log('Dev login to:', apiUrl);

      const response = await fetch(`${apiUrl}/api/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Dev login error:', errorText);
        Alert.alert('Login Failed', `Backend error: ${errorText}`);
        throw new Error('Dev login failed');
      }

      const { access_token } = await response.json();
      await api.setToken(access_token);

      const userData = await api.getMe();
      setUser(userData);
    } catch (error: any) {
      console.error('Dev login error:', error);
      if (error.message !== 'Dev login failed') {
        Alert.alert(
          'Connection Error',
          `Could not reach backend at ${process.env.EXPO_PUBLIC_API_URL}. Make sure your phone and computer are on the same WiFi network.`
        );
      }
      await api.clearToken();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signOut,
        refreshUser,
        devSignIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
