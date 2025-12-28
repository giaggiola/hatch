import React, { useState, useCallback, useEffect } from 'react';
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
}

export default function SwipeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Map<string, Set<string>>>(new Map());
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([]);
  const [matchedName, setMatchedName] = useState<Name | null>(null);
  const [showHint, setShowHint] = useState(false);

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

  const { data: names, isLoading, refetch } = useQuery({
    queryKey: ['swipeNames'],
    queryFn: () => api.getNamesForSwiping(10),
  });

  const batchSwipeMutation = useMutation({
    mutationFn: (swipes: Array<{ name_id: string; action: 'like' | 'dismiss' }>) =>
      api.createBatchSwipes(swipes),
    onSuccess: (result) => {
      if (result.matches && result.matches.length > 0) {
        setMatchedName(result.matches[0]);
      }
      queryClient.invalidateQueries({ queryKey: ['swipes'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });

  const handleToggleVariant = useCallback((nameId: string, variantId: string) => {
    setSelectedVariants((prev) => {
      const newMap = new Map(prev);
      const currentSet = newMap.get(nameId) || new Set<string>();
      const newSet = new Set(currentSet);

      if (newSet.has(variantId)) {
        newSet.delete(variantId);
      } else {
        newSet.add(variantId);
      }

      newMap.set(nameId, newSet);
      return newMap;
    });
  }, []);

  const handleSwipe = useCallback(
    (action: 'like' | 'dismiss') => {
      if (!names || currentIndex >= names.length) return;

      const currentName = names[currentIndex];
      const variants = selectedVariants.get(currentName.id) || new Set<string>();

      // Save to history for undo
      setSwipeHistory((prev) => [
        ...prev.slice(-10), // Keep last 10 for undo
        { name: currentName, selectedVariants: new Set(variants) },
      ]);

      // Build batch swipes array with deduplication
      const seenIds = new Set<string>();
      const swipes: Array<{ name_id: string; action: 'like' | 'dismiss' }> = [];

      // Add main name first
      seenIds.add(currentName.id);
      swipes.push({ name_id: currentName.id, action });

      // Similar variants: like if selected AND swiped right, dismiss otherwise
      currentName.similar.forEach((variant) => {
        // Skip if we've already added this name_id (handles duplicate similar names)
        if (seenIds.has(variant.id)) return;
        seenIds.add(variant.id);

        swipes.push({
          name_id: variant.id,
          action: (action === 'like' && variants.has(variant.id))
            ? 'like'
            : 'dismiss',
        });
      });

      batchSwipeMutation.mutate(swipes);

      // Clear variants for this name
      setSelectedVariants((prev) => {
        const newMap = new Map(prev);
        newMap.delete(currentName.id);
        return newMap;
      });

      setCurrentIndex((prev) => prev + 1);

      // Refetch when running low
      if (currentIndex >= names.length - 3) {
        refetch();
        setCurrentIndex(0);
      }
    },
    [names, currentIndex, selectedVariants, batchSwipeMutation, refetch]
  );

  const handleUndo = useCallback(async () => {
    if (swipeHistory.length === 0 || currentIndex === 0) return;

    const lastSwipe = swipeHistory[swipeHistory.length - 1];

    try {
      // Delete the swipe from backend - await to ensure consistency
      await api.deleteSwipe(lastSwipe.name.id);

      // Also delete all similar variant swipes (we send all variants in batch)
      await Promise.all(
        lastSwipe.name.similar.map((variant) => api.deleteSwipe(variant.id))
      );

      // Restore state only after successful deletion
      setSwipeHistory((prev) => prev.slice(0, -1));
      setSelectedVariants((prev) => {
        const newMap = new Map(prev);
        newMap.set(lastSwipe.name.id, lastSwipe.selectedVariants);
        return newMap;
      });
      setCurrentIndex((prev) => prev - 1);

      queryClient.invalidateQueries({ queryKey: ['swipes'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    } catch (error) {
      console.error('Failed to undo swipe:', error);
    }
  }, [swipeHistory, currentIndex, queryClient]);

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

  const currentNames = names?.slice(currentIndex, currentIndex + 2) || [];
  const currentName = currentNames[0];
  const currentVariants = currentName ? (selectedVariants.get(currentName.id) || new Set<string>()) : new Set<string>();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Hatch</Text>
      </View>

      <View style={styles.cardContainer}>
        {currentNames.length === 0 ? (
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
                setCurrentIndex(0);
                refetch();
              }}
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          currentNames
            .map((name, index) => (
              <SwipeCard
                key={name.id}
                name={name}
                onSwipe={handleSwipe}
                isTop={index === 0}
                selectedVariants={index === 0 ? currentVariants : new Set<string>()}
                onToggleVariant={(variantId) => handleToggleVariant(name.id, variantId)}
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
              { opacity: swipeHistory.length > 0 && currentIndex > 0 ? 1 : 0.3 },
            ]}
            onPress={handleUndo}
            disabled={swipeHistory.length === 0 || currentIndex === 0}
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
