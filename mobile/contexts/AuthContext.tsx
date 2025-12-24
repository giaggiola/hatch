import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { api } from '../lib/api';
import { User } from '../types';

WebBrowser.maybeCompleteAuthSession();

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

// Generate and log the redirect URI so we know what to add to Google Console
const redirectUri = makeRedirectUri({
  scheme: 'hatch',
});
console.log('===========================================');
console.log('REDIRECT URI FOR GOOGLE CONSOLE:', redirectUri);
console.log('===========================================');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri,
  });

  // Check if user is already logged in
  useEffect(() => {
    checkAuth();
  }, []);

  // Handle OAuth response
  useEffect(() => {
    console.log('OAuth response:', response?.type);
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleToken(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      console.error('OAuth error:', response.error);
    }
  }, [response]);

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
      console.log('Sending token to backend:', apiUrl);

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
    console.log('Starting sign in, request ready:', !!request);
    await promptAsync();
  }, [promptAsync, request]);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    try {
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
      console.log('Dev login to:', apiUrl);

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
