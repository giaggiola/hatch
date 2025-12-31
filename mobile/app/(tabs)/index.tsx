import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '@/lib/api';
import { SwipeCard } from '@/components/SwipeCard';
import { MatchModal } from '@/components/MatchModal';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { NameWithSimilar, Name } from '@/types';

const HINT_SHOWN_KEY = 'swipe_hint_shown';

interface SwipeHistoryItem {
  name: NameWithSimilar;
  selectedVariants: Set<string>;
  swipedIds: Set<string>; // All IDs swiped in this action (main + variants)
}

export default function SwipeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const queryClient = useQueryClient();
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([]);
  const [matchedName, setMatchedName] = useState<Name | null>(null);
  const [showHint, setShowHint] = useState(false);
  // Track locally swiped IDs to filter out before backend confirms
  const [locallySwipedIds, setLocallySwipedIds] = useState<Set<string>>(new Set());
  // Track pending mutations to know when it's safe to refetch
  const pendingMutationsRef = useRef(0);
  const refetchScheduledRef = useRef(false);

  // Check if hint should be shown
  useEffect(() => {
    const checkHint = async () => {
      try {
        const hintShown = await AsyncStorage.getItem(HINT_SHOWN_KEY);
        if (!hintShown) {
          setShowHint(true);
        }
      } catch (error) {
        console.error('Error checking hint:', error);
      }
    };
    checkHint();
  }, []);

  const dismissHint = async () => {
    setShowHint(false);
    try {
      await AsyncStorage.setItem(HINT_SHOWN_KEY, 'true');
    } catch (error) {
      console.error('Error saving hint state:', error);
    }
  };

  const { data: names, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['swipeNames'],
    queryFn: () => api.getNamesForSwiping(20), // Fetch more to have buffer
  });

  // Filter out locally swiped names to prevent showing already-swiped cards
  const availableNames = useMemo(() => {
    if (!names) return [];
    return names.filter(name => !locallySwipedIds.has(name.id));
  }, [names, locallySwipedIds]);

  // Perform refetch only when all mutations are done
  const safeRefetch = useCallback(() => {
    if (pendingMutationsRef.current > 0) {
      // Schedule refetch for when mutations complete
      refetchScheduledRef.current = true;
    } else {
      // Safe to refetch now - but DON'T clear locallySwipedIds until refetch completes
      // This prevents the flash where old names briefly reappear
      refetch().then(() => {
        // Only clear after new data has arrived
        setLocallySwipedIds(new Set());
      });
    }
  }, [refetch]);

  const batchSwipeMutation = useMutation({
    mutationFn: (swipes: Array<{ name_id: string; action: 'like' | 'dismiss' }>) =>
      api.createBatchSwipes(swipes),
    onMutate: () => {
      pendingMutationsRef.current += 1;
    },
    onSuccess: (result) => {
      if (result.matches && result.matches.length > 0) {
        setMatchedName(result.matches[0]);
      }
    },
    onError: (error, variables) => {
      // Restore cards on error - remove failed IDs from locally swiped
      console.error('Swipe failed:', error);
      const failedIds = new Set(variables.map(s => s.name_id));
      setLocallySwipedIds((prev) => {
        const newSet = new Set(prev);
        failedIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      // Also remove from history since the swipe didn't succeed
      setSwipeHistory((prev) => {
        const lastSwipe = prev[prev.length - 1];
        if (lastSwipe && failedIds.has(lastSwipe.name.id)) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    },
    onSettled: () => {
      pendingMutationsRef.current -= 1;
      // If all mutations done and refetch was scheduled, do it now
      if (pendingMutationsRef.current === 0 && refetchScheduledRef.current) {
        refetchScheduledRef.current = false;
        // DON'T clear locallySwipedIds until refetch completes to prevent flash
        refetch().then(() => {
          // Only clear after new data has arrived
          setLocallySwipedIds(new Set());
          // Invalidate caches after refetch completes
          queryClient.invalidateQueries({ queryKey: ['swipes'] });
          queryClient.invalidateQueries({ queryKey: ['matches'] });
          queryClient.invalidateQueries({ queryKey: ['closeCalls'] });
        });
      } else if (pendingMutationsRef.current === 0) {
        // No scheduled refetch, just invalidate caches
        queryClient.invalidateQueries({ queryKey: ['swipes'] });
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        queryClient.invalidateQueries({ queryKey: ['closeCalls'] });
      }
    },
  });

  const handleSwipe = useCallback(
    (action: 'like' | 'dismiss') => {
      if (availableNames.length === 0) return;

      const currentName = availableNames[0];

      // Build batch swipes array - only main name (variants are liked separately via heart button)
      const swipedIds = new Set<string>();
      const swipes: Array<{ name_id: string; action: 'like' | 'dismiss' }> = [];

      // Add main name
      swipedIds.add(currentName.id);
      swipes.push({ name_id: currentName.id, action });

      // Save to history for undo
      setSwipeHistory((prev) => [
        ...prev.slice(-10),
        { name: currentName, selectedVariants: new Set(), swipedIds },
      ]);

      // Immediately mark as locally swiped (optimistic update)
      setLocallySwipedIds((prev) => {
        const newSet = new Set(prev);
        swipedIds.forEach(id => newSet.add(id));
        return newSet;
      });

      // Fire mutation (non-blocking)
      batchSwipeMutation.mutate(swipes);

      // Check if we need more names (using filtered list length)
      // availableNames will shrink as we swipe, trigger refetch when low
      if (availableNames.length <= 4) {
        safeRefetch();
      }
    },
    [availableNames, batchSwipeMutation, safeRefetch]
  );

  const handleUndo = useCallback(() => {
    if (swipeHistory.length === 0) return;

    const lastSwipe = swipeHistory[swipeHistory.length - 1];

    // Optimistic update - restore UI immediately
    setSwipeHistory((prev) => prev.slice(0, -1));

    // Remove from locally swiped IDs so the name reappears
    setLocallySwipedIds((prev) => {
      const newSet = new Set(prev);
      lastSwipe.swipedIds.forEach(id => newSet.delete(id));
      return newSet;
    });

    // Fire delete calls in background (non-blocking)
    const deletePromises = Array.from(lastSwipe.swipedIds).map((id) =>
      api.deleteSwipe(id).catch((err) => console.error('Failed to delete swipe:', id, err))
    );

    // Invalidate caches after all deletes complete
    Promise.all(deletePromises).then(() => {
      queryClient.invalidateQueries({ queryKey: ['swipes'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['closeCalls'] });
    });
  }, [swipeHistory, queryClient]);

  const handleButtonSwipe = (action: 'like' | 'dismiss') => {
    handleSwipe(action);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Finding names for you...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show top 2 available names for the card stack
  const currentNames = availableNames.slice(0, 2);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Hatch</Text>
      </View>

      <View style={styles.cardContainer}>
        {currentNames.length === 0 ? (
          isFetching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Loading more names...
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎉</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                You've seen all names!
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Check back later for more or adjust your preferences
              </Text>
              <TouchableOpacity
                style={[styles.refreshButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  // Clear AFTER refetch completes to prevent flash
                  refetch().then(() => {
                    setLocallySwipedIds(new Set());
                  });
                }}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          currentNames
            .map((name, index) => (
              <SwipeCard
                key={name.id}
                name={name}
                onSwipe={handleSwipe}
                isTop={index === 0}
              />
            ))
            .reverse()
        )}
      </View>

      {/* First-time Hint Overlay */}
      {showHint && currentNames.length > 0 && (
        <TouchableOpacity style={styles.hintOverlay} onPress={dismissHint} activeOpacity={1}>
          <View style={styles.hintContent}>
            <View style={styles.hintArrows}>
              <View style={styles.hintArrowLeft}>
                <FontAwesome name="arrow-left" size={32} color="#ef4444" />
                <Text style={styles.hintArrowText}>Pass</Text>
              </View>
              <View style={styles.hintArrowRight}>
                <FontAwesome name="arrow-right" size={32} color="#10b981" />
                <Text style={styles.hintArrowText}>Like</Text>
              </View>
            </View>
            <Text style={styles.hintText}>Swipe or tap the buttons below</Text>
            <Text style={styles.hintSubtext}>Tap anywhere to dismiss</Text>
          </View>
        </TouchableOpacity>
      )}

      {currentNames.length > 0 && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.dismissButton]}
            onPress={() => handleButtonSwipe('dismiss')}
          >
            <FontAwesome name="times" size={28} color="#ef4444" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.undoButton,
              { opacity: swipeHistory.length > 0 ? 1 : 0.3 },
            ]}
            onPress={handleUndo}
            disabled={swipeHistory.length === 0}
          >
            <FontAwesome name="undo" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => handleButtonSwipe('like')}
          >
            <FontAwesome name="heart" size={28} color="#10b981" />
          </TouchableOpacity>
        </View>
      )}

      {/* Match Modal */}
      <MatchModal
        visible={matchedName !== null}
        name={matchedName}
        onClose={() => setMatchedName(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  cardContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  refreshButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  undoButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dismissButton: {
    backgroundColor: '#fee2e2',
  },
  likeButton: {
    backgroundColor: '#d1fae5',
  },
  hintOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  hintContent: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  hintArrows: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 250,
    marginBottom: Spacing.xl,
  },
  hintArrowLeft: {
    alignItems: 'center',
  },
  hintArrowRight: {
    alignItems: 'center',
  },
  hintArrowText: {
    color: '#ffffff',
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginTop: Spacing.sm,
  },
  hintText: {
    color: '#ffffff',
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  hintSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
});
