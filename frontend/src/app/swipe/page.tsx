'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Heart, X, RotateCcw } from 'lucide-react';
import { api, NameWithSimilar, Name, User } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import { STORAGE_KEYS } from '@/lib/constants';
import {
  saveSwipeState,
  loadSwipeState,
  clearSwipeState,
  restoreSelectedVariants,
  initializeSelections,
} from '@/hooks/useSwipeState';
import AppShell from '@/components/AppShell';
import MatchModal from '@/components/MatchModal';
import { LoadingPage } from '@/components/LoadingSpinner';

// Dynamic import for SwipeCardWithSimilar to code-split Framer Motion (~60KB)
const SwipeCardWithSimilar = dynamic(
  () => import('@/components/SwipeCardWithSimilar'),
  {
    loading: () => (
      <div className="w-full mx-4 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-pulse">
        <div className="h-[200px] bg-gradient-to-br from-pink-400 to-rose-500" />
        <div className="p-6 min-h-[180px]">
          <div className="grid grid-cols-3 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    ),
    ssr: false, // Framer Motion doesn't work well with SSR
  }
);

export default function SwipePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [names, setNames] = useState<NameWithSimilar[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Map<string, Set<string>>>(new Map());
  const [matchedName, setMatchedName] = useState<Name | null>(null);
  const [showHint, setShowHint] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEYS.SWIPE_HINT_DISMISSED) !== 'true';
    }
    return true;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [swipeHistory, setSwipeHistory] = useState<{ index: number; selections: Set<string> }[]>([]);
  const [swipeError, setSwipeError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    // Prevent double-execution in React Strict Mode
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;

    const loadData = async () => {
      try {
        // Check for saved state first (e.g., returning from name detail page)
        const savedState = loadSwipeState();

        if (savedState && savedState.names.length > 0) {
          // Restore from session storage
          setNames(savedState.names);
          setCurrentIndex(savedState.currentIndex);
          setSelectedVariants(restoreSelectedVariants(savedState.selectedVariants));
          clearSwipeState();

          // Still fetch user data
          const userData = await api.getMe();
          setUser(userData);
        } else {
          // Fresh load - use new similarity-based endpoint
          const [userData, namesData] = await Promise.all([
            api.getMe(),
            api.getNamesForSwiping(10),
          ]);
          setUser(userData);
          setNames(namesData);
          setSelectedVariants(initializeSelections(namesData));
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  const loadMoreNames = useCallback(async () => {
    try {
      const moreNames = await api.getNamesForSwiping(10);

      setNames((prev) => {
        // Dedupe: only add names not already in the list
        const existingIds = new Set(prev.map(n => n.id));
        const newUniqueNames = moreNames.filter(n => !existingIds.has(n.id));
        return [...prev, ...newUniqueNames];
      });

      // Initialize selections for new names
      setSelectedVariants((prevSelections) => {
        const newSelections = new Map(prevSelections);
        moreNames.forEach((name) => {
          if (!newSelections.has(name.id)) {
            newSelections.set(name.id, new Set());
          }
        });
        return newSelections;
      });
    } catch (error) {
      console.error('Error loading more names:', error);
    }
  }, []);

  const currentName = names[currentIndex];

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (!currentName) return;

    const currentSelections = selectedVariants.get(currentName.id) || new Set();

    // Save to history for undo
    setSwipeHistory((prev) => [
      ...prev,
      { index: currentIndex, selections: new Set(currentSelections) },
    ]);

    try {
      // Build swipes: main name + selected similar variants
      const swipes: Array<{ name_id: string; action: 'like' | 'dismiss' }> = [];

      // Main name is always included based on swipe direction
      swipes.push({
        name_id: currentName.id,
        action: direction === 'right' ? 'like' : 'dismiss',
      });

      // Similar variants: like if selected AND swiped right, dismiss otherwise
      currentName.similar.forEach((variant) => {
        swipes.push({
          name_id: variant.id,
          action: (direction === 'right' && currentSelections.has(variant.id))
            ? 'like'
            : 'dismiss',
        });
      });

      const result = await api.createBatchSwipes(swipes);

      if (result.matches.length > 0) {
        setMatchedName(result.matches[0]);
      }
      setSwipeError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save swipe';
      if (message.includes('couple')) {
        setSwipeError('Connect with a partner in Settings to save your likes!');
      } else {
        console.error('Error recording swipe:', error);
      }
    }

    setCurrentIndex((prev) => prev + 1);

    // Load more names when running low
    if (currentIndex >= names.length - 3) {
      loadMoreNames();
    }

    // Hide hint after first swipe
    if (showHint) {
      setShowHint(false);
      localStorage.setItem(STORAGE_KEYS.SWIPE_HINT_DISMISSED, 'true');
    }
  };

  const handleUndo = () => {
    if (swipeHistory.length === 0 || currentIndex === 0) return;

    const lastAction = swipeHistory[swipeHistory.length - 1];
    setSwipeHistory((prev) => prev.slice(0, -1));
    setCurrentIndex(lastAction.index);

    // Restore selections
    const prevName = names[lastAction.index];
    if (prevName) {
      setSelectedVariants((prev) => {
        const restoredSelections = new Map(prev);
        restoredSelections.set(prevName.id, lastAction.selections);
        return restoredSelections;
      });
    }
  };

  const handleToggleVariant = (variantId: string) => {
    if (!currentName) return;

    setSelectedVariants((prev) => {
      const newSelections = new Map(prev);
      const currentSet = new Set(newSelections.get(currentName.id) || []);

      if (currentSet.has(variantId)) {
        currentSet.delete(variantId);
      } else {
        currentSet.add(variantId);
      }

      newSelections.set(currentName.id, currentSet);
      return newSelections;
    });
  };

  const handleInfo = () => {
    if (!currentName) return;
    // Save state before navigating so user can return
    saveSwipeState(names, currentIndex, selectedVariants);
    router.push(`/name/${currentName.id}`);
  };

  const handleExploreMore = () => {
    if (!currentName) return;
    // Save state before navigating so user can return
    saveSwipeState(names, currentIndex, selectedVariants);
    router.push(`/name/${currentName.id}`);
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <AppShell fillHeight className="bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* First-time Hint - centered on screen */}
      {showHint && currentIndex === 0 && names.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none">
          <div className="bg-pink-500 text-white px-6 py-4 rounded-2xl shadow-xl max-w-md pointer-events-auto">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1">
                <div className="mb-2">Tap similar names you like, then swipe right to save them!</div>
                <button
                  onClick={() => {
                    setShowHint(false);
                    localStorage.setItem(STORAGE_KEYS.SWIPE_HINT_DISMISSED, 'true');
                  }}
                  className="text-sm bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-800 dark:text-white">NameMatch</div>
      </div>

      {/* Swipe Error Banner */}
      {swipeError && (
        <div className="mx-4 mb-2 bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-4 py-2 rounded-lg text-sm text-center">
          {swipeError}
        </div>
      )}

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 relative">
        {currentIndex < names.length && currentName ? (
          <div className="relative w-full max-w-sm">
            <SwipeCardWithSimilar
              key={currentName.id}
              name={currentName}
              selectedVariants={selectedVariants.get(currentName.id) || new Set()}
              onToggleVariant={handleToggleVariant}
              onSwipe={handleSwipe}
              onExploreMore={handleExploreMore}
            />
          </div>
        ) : (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-2xl font-bold mb-4 dark:text-white">All done!</div>
            <div className="text-gray-600 dark:text-gray-400 mb-6">
              You&apos;ve reviewed all names. Check your likes in the history!
            </div>
            <button
              onClick={() => {
                setCurrentIndex(0);
                setSelectedVariants(new Map());
                setSwipeHistory([]);
              }}
              className="bg-pink-500 text-white px-6 py-3 rounded-full hover:bg-pink-600 transition-colors"
            >
              Start Over
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {currentIndex < names.length && (
        <div className="py-4 flex justify-center items-center gap-6">
          <button
            onClick={() => handleSwipe('left')}
            className="bg-white dark:bg-gray-700 p-5 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
          >
            <X className="w-8 h-8 text-red-500" />
          </button>

          <button
            onClick={handleUndo}
            disabled={swipeHistory.length === 0}
            className="bg-white dark:bg-gray-700 p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>

          <button
            onClick={() => handleSwipe('right')}
            className="bg-white dark:bg-gray-700 p-5 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95"
          >
            <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />
          </button>
        </div>
      )}

      {/* Match Modal */}
      <MatchModal
        name={matchedName}
        familyName={user?.family_name}
        onClose={() => setMatchedName(null)}
      />
    </AppShell>
  );
}
