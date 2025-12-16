'use client';

import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api, Name } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import BottomNav from '@/components/BottomNav';

const PAGE_SIZE = 50;

// Memoized name card component to prevent unnecessary re-renders
const NameCard = memo(function NameCard({
  name,
  swipeStatus,
  onSwipe,
  onNavigate,
}: {
  name: Name;
  swipeStatus?: 'like' | 'dismiss';
  onSwipe: (name: Name, action: 'like' | 'dismiss') => void;
  onNavigate: (id: string) => void;
}) {
  const isLiked = swipeStatus === 'like';

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 transition-all ${
        isLiked ? 'ring-2 ring-pink-500' : ''
      } ${swipeStatus === 'dismiss' ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div
          onClick={() => onNavigate(name.id)}
          className="cursor-pointer hover:opacity-70 transition-opacity"
        >
          <div className="text-xl text-gray-900 dark:text-white font-medium">{name.name}</div>
          <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${
            name.gender === 'M'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : name.gender === 'F'
              ? 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}>
            {name.gender === 'M' ? 'Boy' : name.gender === 'F' ? 'Girl' : 'Unisex'}
          </div>
        </div>
        {!swipeStatus ? (
          <div className="flex gap-2">
            <button
              onClick={() => onSwipe(name, 'like')}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-pink-50 dark:hover:bg-pink-900/30 hover:text-pink-500 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
            <button
              onClick={() => onSwipe(name, 'dismiss')}
              className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-600 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className={`p-2 rounded-full ${
            isLiked ? 'bg-pink-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
          }`}>
            {isLiked ? (
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>
        )}
      </div>
      {name.meaning && (
        <p className="text-sm text-gray-500 dark:text-gray-400">{name.meaning}</p>
      )}
    </div>
  );
});

export default function OriginDetailPage() {
  const router = useRouter();
  const params = useParams();
  const origin = params.origin as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [names, setNames] = useState<Name[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [swipedNames, setSwipedNames] = useState<Map<string, 'like' | 'dismiss'>>(new Map());
  const [filter, setFilter] = useState<'all' | 'M' | 'F' | 'U'>('all');
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load initial data
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      try {
        const namesData = await api.getNamesByOrigin(origin, PAGE_SIZE, 0);
        setNames(namesData);
        setHasMore(namesData.length === PAGE_SIZE);
      } catch (error) {
        console.error('Error loading names:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router, origin]);

  // Load more data with infinite scroll
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const namesData = await api.getNamesByOrigin(origin, PAGE_SIZE, names.length);
      setNames(prev => [...prev, ...namesData]);
      setHasMore(namesData.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more names:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [origin, names.length, isLoadingMore, hasMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, isLoadingMore]);

  const handleSwipe = useCallback(async (name: Name, action: 'like' | 'dismiss') => {
    // Optimistic update
    setSwipedNames(prev => new Map(prev).set(name.id, action));
    try {
      await api.createSwipe(name.id, action);
    } catch (error) {
      console.error('Error swiping:', error);
      // Revert on error
      setSwipedNames(prev => {
        const newMap = new Map(prev);
        newMap.delete(name.id);
        return newMap;
      });
    }
  }, []);

  const handleNavigate = useCallback((id: string) => {
    router.push(`/name/${id}`);
  }, [router]);

  const filteredNames = names.filter(name => filter === 'all' || name.gender === filter);

  const genderCounts = {
    all: names.length,
    M: names.filter(n => n.gender === 'M').length,
    F: names.filter(n => n.gender === 'F').length,
    U: names.filter(n => n.gender === 'U').length,
  };

  const likedCount = Array.from(swipedNames.values()).filter(v => v === 'like').length;

  // Only show filters that have names
  const availableFilters = (['all', 'M', 'F', 'U'] as const).filter(
    g => g === 'all' || genderCounts[g] > 0
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white px-6 pt-6 pb-6 sticky top-0 z-10 shadow-lg">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
        <h1 className="text-3xl font-medium capitalize mb-1">{decodeURIComponent(origin)}</h1>
        <p className="text-white/80">{names.length}{hasMore ? '+' : ''} names to explore</p>
        {likedCount > 0 && (
          <div className="mt-3 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full inline-block text-sm">
            {likedCount} name{likedCount !== 1 ? 's' : ''} liked
          </div>
        )}
      </div>

      {/* Filters */}
      {availableFilters.length > 2 && (
        <div className="px-4 py-4 flex gap-2">
          {availableFilters.map((g) => (
            <button
              key={g}
              onClick={() => setFilter(g)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === g
                  ? 'bg-pink-500 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 shadow hover:shadow-md'
              }`}
            >
              {g === 'all' ? 'All' : g === 'M' ? 'Boys' : g === 'F' ? 'Girls' : 'Unisex'}
              <span className={`ml-1.5 ${filter === g ? 'text-white/70' : 'text-gray-400'}`}>
                {genderCounts[g]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Names Grid */}
      <div className="px-4 pt-2">
        {filteredNames.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No names found
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredNames.map((name) => (
              <NameCard
                key={name.id}
                name={name}
                swipeStatus={swipedNames.get(name.id)}
                onSwipe={handleSwipe}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}

        {/* Load more trigger */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {isLoadingMore && (
              <div className="w-6 h-6 border-2 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
