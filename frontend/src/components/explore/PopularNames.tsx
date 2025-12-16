'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Name } from '@/lib/api';

interface PopularNamesProps {
  title?: string;
  limit?: number;
}

export default function PopularNames({ title = 'Most Popular Names', limit = 8 }: PopularNamesProps) {
  const router = useRouter();
  const [names, setNames] = useState<Name[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGender, setActiveGender] = useState<'all' | 'M' | 'F'>('all');

  useEffect(() => {
    const loadNames = async () => {
      setIsLoading(true);
      try {
        const gender = activeGender === 'all' ? undefined : activeGender;
        const data = await api.getPopularNames(gender, limit);
        setNames(data);
      } catch (error) {
        console.error('Error loading popular names:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNames();
  }, [activeGender, limit]);

  // Calculate max weighted_count for bar scaling
  const maxCount = names.length > 0
    ? Math.max(...names.map(n => n.weighted_count || 0))
    : 1;

  const getBarColor = (gender?: string) => {
    switch (gender) {
      case 'M': return 'bg-blue-400';
      case 'F': return 'bg-pink-400';
      default: return 'bg-purple-400';
    }
  };

  const getGenderIcon = (gender?: string) => {
    switch (gender) {
      case 'M': return '♂';
      case 'F': return '♀';
      default: return '◎';
    }
  };

  const getGenderIconColor = (gender?: string) => {
    switch (gender) {
      case 'M': return 'text-blue-500';
      case 'F': return 'text-pink-500';
      default: return 'text-purple-500';
    }
  };

  return (
    <div className="py-3">
      {/* Header with title and gender filter */}
      <div className="flex items-center justify-between px-4 mb-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
        <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-full p-0.5">
          <button
            onClick={() => setActiveGender('all')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
              activeGender === 'all'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveGender('M')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
              activeGender === 'M'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Boys
          </button>
          <button
            onClick={() => setActiveGender('F')}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
              activeGender === 'F'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Girls
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="px-4 space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-5 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      ) : names.length === 0 ? (
        <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
          No names found
        </div>
      ) : (
        <>
          {/* Names list */}
          <div className="px-4 space-y-1">
            {names.map((name, index) => {
              const barWidth = ((name.weighted_count || 0) / maxCount) * 100;

              return (
                <button
                  key={name.id}
                  onClick={() => router.push(`/name/${name.id}`)}
                  className="w-full flex items-center gap-2 group"
                >
                  {/* Rank */}
                  <span className="w-5 text-xs font-medium text-gray-400 text-right">
                    {index + 1}
                  </span>

                  {/* Name card with bar */}
                  <div className="flex-1 relative bg-white dark:bg-gray-800 rounded-lg py-1.5 px-2.5 shadow-sm overflow-hidden hover:shadow transition-shadow">
                    {/* Popularity bar */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 ${getBarColor(name.gender)} opacity-15 dark:opacity-25 transition-all`}
                      style={{ width: `${barWidth}%` }}
                    />

                    {/* Content */}
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm ${getGenderIconColor(name.gender)}`}>
                          {getGenderIcon(name.gender)}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{name.name}</span>
                      </div>
                      <svg
                        className="w-3.5 h-3.5 text-gray-300 dark:text-gray-500 group-hover:text-gray-400 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Explore More CTA */}
          <div className="px-4 mt-2">
            <button
              onClick={() => router.push(`/popular${activeGender !== 'all' ? `?gender=${activeGender}` : ''}`)}
              className="w-full py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors flex items-center justify-center gap-1.5"
            >
              Explore More
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
