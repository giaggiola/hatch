'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, Name } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import BottomNav from '@/components/BottomNav';

function PopularPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGender = searchParams.get('gender') as 'M' | 'F' | null;

  const [names, setNames] = useState<Name[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGender, setActiveGender] = useState<'all' | 'M' | 'F'>(initialGender || 'all');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    const loadNames = async () => {
      setIsLoading(true);
      try {
        const gender = activeGender === 'all' ? undefined : activeGender;
        const data = await api.getPopularNames(gender, 50);
        setNames(data);
      } catch (error) {
        console.error('Error loading popular names:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadNames();
  }, [activeGender, router]);

  // Calculate max weighted_count for bar scaling
  const maxCount = names.length > 0
    ? Math.max(...names.map(n => n.weighted_count || 0))
    : 1;

  const getGenderBadge = (gender?: string) => {
    switch (gender) {
      case 'M': return { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Boy' };
      case 'F': return { bg: 'bg-pink-100', text: 'text-pink-600', label: 'Girl' };
      default: return { bg: 'bg-purple-100', text: 'text-purple-600', label: 'Unisex' };
    }
  };

  const getBarColor = (gender?: string) => {
    switch (gender) {
      case 'M': return 'bg-blue-400';
      case 'F': return 'bg-pink-400';
      default: return 'bg-purple-400';
    }
  };

  const getTitle = () => {
    switch (activeGender) {
      case 'M': return 'Popular Boy Names';
      case 'F': return 'Popular Girl Names';
      default: return 'Most Popular Names';
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white px-4 pt-8 pb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-2xl font-medium">{getTitle()}</h1>
      </div>

      {/* Gender Filter */}
      <div className="px-4 -mt-3 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-1">
          <button
            onClick={() => setActiveGender('all')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeGender === 'all'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveGender('M')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeGender === 'M'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Boys
          </button>
          <button
            onClick={() => setActiveGender('F')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeGender === 'F'
                ? 'bg-pink-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Girls
          </button>
        </div>
      </div>

      {/* Names List */}
      <div className="px-4 pt-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-5 bg-gray-200 rounded animate-pulse" />
                <div className="flex-1 h-14 bg-gray-200 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : names.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No names found
          </div>
        ) : (
          <div className="space-y-2">
            {names.map((name, index) => {
              const badge = getGenderBadge(name.gender);
              const barWidth = ((name.weighted_count || 0) / maxCount) * 100;

              return (
                <button
                  key={name.id}
                  onClick={() => router.push(`/name/${name.id}`)}
                  className="w-full flex items-center gap-3 group"
                >
                  {/* Rank */}
                  <span className="w-8 text-sm font-semibold text-gray-400 text-right">
                    {index + 1}
                  </span>

                  {/* Name card with bar */}
                  <div className="flex-1 relative bg-white rounded-xl p-4 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    {/* Popularity bar */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 ${getBarColor(name.gender)} opacity-15 transition-all`}
                      style={{ width: `${barWidth}%` }}
                    />

                    {/* Content */}
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-gray-900">{name.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors"
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
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default function PopularPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    }>
      <PopularPageContent />
    </Suspense>
  );
}
