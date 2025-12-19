'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

// Cache durations aligned with backend Cache-Control headers
export const CACHE_TIMES = {
  // Static data that rarely changes (countries, origins, popular names)
  STATIC: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
  },
  // Semi-static data (search results, name details)
  SEMI_STATIC: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  // User-specific data (preferences, swipes, matches)
  USER_DATA: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
  // Frequently changing data (current user, partner)
  DYNAMIC: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
} as const;

// Query key factory for consistent cache keys
export const queryKeys = {
  // Static data
  countries: ['countries'] as const,
  origins: ['origins'] as const,
  popular: (gender?: string) => ['popular', gender] as const,

  // Semi-static data
  search: (query: string) => ['search', query] as const,
  name: (id: string) => ['name', id] as const,
  nameFacts: (id: string) => ['name', id, 'facts'] as const,
  nameSimilar: (id: string) => ['name', id, 'similar'] as const,
  namePopularity: (id: string) => ['name', id, 'popularity'] as const,
  namesByOrigin: (origin: string) => ['names', 'origin', origin] as const,

  // User-specific data
  user: ['user'] as const,
  partner: ['partner'] as const,
  preferences: ['preferences'] as const,
  swipes: (action?: string) => ['swipes', action] as const,
  matches: ['matches'] as const,
  closeCalls: ['closeCalls'] as const,
  swipeQueue: ['swipeQueue'] as const,
};

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Default to semi-static caching
            staleTime: CACHE_TIMES.SEMI_STATIC.staleTime,
            gcTime: CACHE_TIMES.SEMI_STATIC.gcTime,
            // Retry failed requests once
            retry: 1,
            // Don't refetch on window focus (reduces unnecessary requests)
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect for most queries
            refetchOnReconnect: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
