'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { initAuth, isAuthenticated as checkIsAuthenticated, clearAuth } from '@/lib/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Initialize from localStorage for instant UI (avoids flash)
    if (typeof window !== 'undefined') {
      return checkIsAuthenticated();
    }
    return false;
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuth = async (): Promise<boolean> => {
    const authed = await initAuth();
    setIsAuthenticated(authed);
    return authed;
  };

  useEffect(() => {
    // On mount, verify auth with backend and sync localStorage
    async function verifyAuth() {
      try {
        const authed = await initAuth();
        setIsAuthenticated(authed);
      } catch {
        // If verification fails, clear auth state
        clearAuth();
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    verifyAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, refreshAuth }}>
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
