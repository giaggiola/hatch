import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { api } from '@/lib/api';
import { getGenderColor } from '@/lib/genderUtils';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { Swipe, Match, CloseCall } from '@/types';

type TabType = 'matches' | 'likes' | 'dismisses';
const PAGE_SIZE = 30;

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('matches');

  // Get total counts for display
  const { data: counts } = useQuery({
    queryKey: ['swipeCounts'],
    queryFn: () => api.getSwipeCounts(),
  });

  // Infinite query for likes - only fetch when likes tab is active
  const {
    data: likesData,
    fetchNextPage: fetchNextLikes,
    hasNextPage: hasMoreLikes,
    isFetchingNextPage: isFetchingMoreLikes,
    isLoading: likesLoading,
  } = useInfiniteQuery({
    queryKey: ['swipes', 'like', 'infinite'],
    queryFn: ({ pageParam = 0 }) => api.getSwipes('like', PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    enabled: activeTab === 'likes',
  });

  // Infinite query for dismisses - only fetch when dismisses tab is active
  const {
    data: dismissesData,
    fetchNextPage: fetchNextDismisses,
    hasNextPage: hasMoreDismisses,
    isFetchingNextPage: isFetchingMoreDismisses,
    isLoading: dismissesLoading,
  } = useInfiniteQuery({
    queryKey: ['swipes', 'dismiss', 'infinite'],
    queryFn: ({ pageParam = 0 }) => api.getSwipes('dismiss', PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    enabled: activeTab === 'dismisses',
  });

  // Infinite query for matches - only fetch when matches tab is active
  const {
    data: matchesData,
    fetchNextPage: fetchNextMatches,
    hasNextPage: hasMoreMatches,
    isFetchingNextPage: isFetchingMoreMatches,
    isLoading: matchesLoading,
  } = useInfiniteQuery({
    queryKey: ['matches', 'infinite'],
    queryFn: ({ pageParam = 0 }) => api.getMatches(PAGE_SIZE, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    enabled: activeTab === 'matches',
  });

  const { data: closeCalls } = useQuery({
    queryKey: ['closeCalls'],
    queryFn: () => api.getCloseCalls(20, 0.75),
    enabled: activeTab === 'matches' || activeTab === 'likes', // Only fetch when needed
  });

  const updateSwipeMutation = useMutation({
    mutationFn: ({ nameId, action }: { nameId: string; action: 'like' | 'dismiss' }) =>
      api.updateSwipe(nameId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swipes'] });
      queryClient.invalidateQueries({ queryKey: ['swipeCounts'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['closeCalls'] });
    },
  });

  // Flatten and sort data alphabetically
  const sortedLikes = useMemo(() => {
    const allLikes = likesData?.pages.flat() || [];
    return allLikes
      .filter((s) => s.name)
      .sort((a, b) => (a.name?.name || '').localeCompare(b.name?.name || ''));
  }, [likesData]);

  const sortedDismisses = useMemo(() => {
    const allDismisses = dismissesData?.pages.flat() || [];
    return allDismisses
      .filter((s) => s.name)
      .sort((a, b) => (a.name?.name || '').localeCompare(b.name?.name || ''));
  }, [dismissesData]);

  const sortedMatches = useMemo(() => {
    const allMatches = matchesData?.pages.flat() || [];
    return [...allMatches].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [matchesData]);

  const handleNamePress = (nameId: string) => {
    router.push(`/name/${nameId}`);
  };

  const handleChangeSwipe = (nameId: string, newAction: 'like' | 'dismiss') => {
    updateSwipeMutation.mutate({ nameId, action: newAction });
  };

  const handleLoadMore = useCallback(() => {
    if (activeTab === 'likes' && hasMoreLikes && !isFetchingMoreLikes) {
      fetchNextLikes();
    } else if (activeTab === 'dismisses' && hasMoreDismisses && !isFetchingMoreDismisses) {
      fetchNextDismisses();
    } else if (activeTab === 'matches' && hasMoreMatches && !isFetchingMoreMatches) {
      fetchNextMatches();
    }
  }, [
    activeTab,
    hasMoreLikes,
    hasMoreDismisses,
    hasMoreMatches,
    isFetchingMoreLikes,
    isFetchingMoreDismisses,
    isFetchingMoreMatches,
    fetchNextLikes,
    fetchNextDismisses,
    fetchNextMatches,
  ]);

  const isLoading =
    activeTab === 'matches'
      ? matchesLoading
      : activeTab === 'likes'
      ? likesLoading
      : dismissesLoading;

  const isFetchingMore =
    activeTab === 'matches'
      ? isFetchingMoreMatches
      : activeTab === 'likes'
      ? isFetchingMoreLikes
      : isFetchingMoreDismisses;

  const renderCloseCallItem = (cc: CloseCall, index: number) => {
    const isUpdating = updateSwipeMutation.isPending;

    return (
      <View
        key={`${cc.your_name.id}-${cc.partner_name.id}-${index}`}
        style={[styles.closeCallItem, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}
      >
        <View style={styles.closeCallContent}>
          <View style={styles.closeCallNames}>
            <TouchableOpacity onPress={() => handleNamePress(cc.partner_name.id)}>
              <Text style={[styles.closeCallName, { color: colors.text }]}>
                {cc.partner_name.name}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.closeCallArrow, { color: colors.textSecondary }]}>←</Text>
            <TouchableOpacity onPress={() => handleNamePress(cc.your_name.id)}>
              <Text style={[styles.closeCallYourName, { color: '#d97706' }]}>
                {cc.your_name.name}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.closeCallSubtext, { color: colors.textSecondary }]}>
            Partner liked • {Math.round(cc.similarity * 100)}% similar to yours
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeCallAction}
          onPress={() => handleChangeSwipe(cc.partner_name.id, 'like')}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <FontAwesome name="heart" size={18} color="#d97706" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderSwipeItem = ({ item }: { item: Swipe }) => {
    const name = item.name;
    if (!name) return null;

    const isLiked = item.action === 'like';
    const genderColor = getGenderColor(name.gender, colors);
    const isUpdating = updateSwipeMutation.isPending;

    return (
      <View style={[styles.nameItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.nameContent}
          onPress={() => handleNamePress(name.id)}
        >
          <View style={styles.nameRow}>
            <Text style={[styles.nameName, { color: colors.text }]}>{name.name}</Text>
            <View style={[styles.genderDot, { backgroundColor: genderColor }]} />
          </View>
          {name.meaning && (
            <Text style={[styles.nameMeaning, { color: colors.textSecondary }]} numberOfLines={1}>
              {name.meaning}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionIconButton}
          onPress={() => handleChangeSwipe(name.id, isLiked ? 'dismiss' : 'like')}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : isLiked ? (
            <FontAwesome name="heart" size={16} color="#f87171" />
          ) : (
            <FontAwesome name="heart-o" size={16} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderMatchItem = ({ item }: { item: Match }) => {
    const genderColor = getGenderColor(item.gender, colors);

    return (
      <TouchableOpacity
        style={[styles.matchItem, { backgroundColor: colors.surface, borderColor: colors.primary }]}
        onPress={() => handleNamePress(item.id)}
      >
        <View style={styles.matchBadge}>
          <FontAwesome name="heart" size={10} color="#ffffff" />
          <FontAwesome name="heart" size={10} color="#ffffff" />
        </View>
        <View style={styles.nameRow}>
          <Text style={[styles.matchName, { color: colors.text }]}>{item.name}</Text>
          <View style={[styles.genderDot, { backgroundColor: genderColor }]} />
        </View>
        {item.meaning && (
          <Text style={[styles.nameMeaning, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.meaning}
          </Text>
        )}
        <Text style={[styles.matchDate, { color: colors.textSecondary }]}>
          Matched {new Date(item.matched_at).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type: TabType) => {
    const configs = {
      matches: {
        icon: 'heart' as const,
        title: 'No matches yet',
        subtitle: 'Keep swiping to find names you both love!',
        color: colors.primary,
      },
      likes: {
        icon: 'heart-o' as const,
        title: 'No likes yet',
        subtitle: 'Start swiping to save names you love!',
        color: '#f87171',
      },
      dismisses: {
        icon: 'times' as const,
        title: 'No passed names yet',
        subtitle: 'Names you pass on will appear here',
        color: colors.textSecondary,
      },
    };

    const config = configs[type];

    return (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIcon, { backgroundColor: config.color + '20' }]}>
          <FontAwesome name={config.icon} size={32} color={config.color} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{config.title}</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {config.subtitle}
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isFetchingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {/* Close Calls Section */}
      {(activeTab === 'matches' || activeTab === 'likes') &&
        closeCalls &&
        closeCalls.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>🎯</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Close Calls</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              You and your partner liked similar names - consider these!
            </Text>
            {closeCalls.map((cc, index) => renderCloseCallItem(cc, index))}
          </View>
        )}

      {/* Section Title */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {activeTab === 'matches'
            ? 'Your Matches'
            : activeTab === 'likes'
            ? 'Names You Liked'
            : 'Names You Passed'}
        </Text>
      </View>
    </>
  );

  return (
    <LinearGradient
      colors={colorScheme === 'dark'
        ? ['#111827', '#1f2937', '#111827']
        : ['#fce7f3', '#f3e8ff', '#dbeafe']}
      style={styles.container}
    >
      {/* Header */}
      <LinearGradient
        colors={['#ec4899', '#e11d48']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.headerSubtitle}>Your swipe activity and matches</Text>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={[
                styles.statButton,
                activeTab === 'matches' && { backgroundColor: colors.primary + '15' },
              ]}
              onPress={() => setActiveTab('matches')}
            >
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {sortedMatches.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Matches</Text>
            </TouchableOpacity>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[
                styles.statButton,
                activeTab === 'likes' && { backgroundColor: '#fdf2f8' },
              ]}
              onPress={() => setActiveTab('likes')}
            >
              <Text style={[styles.statNumber, { color: '#f87171' }]}>
                {counts?.likes ?? sortedLikes.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Liked</Text>
            </TouchableOpacity>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[
                styles.statButton,
                activeTab === 'dismisses' && { backgroundColor: colors.border + '50' },
              ]}
              onPress={() => setActiveTab('dismisses')}
            >
              <Text style={[styles.statNumber, { color: colors.textSecondary }]}>
                {counts?.dismisses ?? sortedDismisses.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Passed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : activeTab === 'matches' ? (
        sortedMatches.length === 0 ? (
          <View style={styles.emptyContainer}>
            {renderHeader()}
            {renderEmptyState('matches')}
          </View>
        ) : (
          <FlatList
            data={sortedMatches}
            renderItem={renderMatchItem}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : activeTab === 'likes' ? (
        sortedLikes.length === 0 ? (
          <View style={styles.emptyContainer}>
            {renderHeader()}
            {renderEmptyState('likes')}
          </View>
        ) : (
          <FlatList
            data={sortedLikes}
            renderItem={renderSwipeItem}
            keyExtractor={(item) => item.name_id}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : (
        sortedDismisses.length === 0 ? (
          <View style={styles.emptyContainer}>
            {renderHeader()}
            {renderEmptyState('dismisses')}
          </View>
        ) : (
          <FlatList
            data={sortedDismisses}
            renderItem={renderSwipeItem}
            keyExtractor={(item) => item.name_id}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statsContainer: {
    paddingHorizontal: Spacing.md,
    marginTop: -Spacing.md,
  },
  statsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  statNumber: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
  listContent: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  section: {
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionEmoji: {
    fontSize: FontSizes.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: FontSizes.xs,
    marginBottom: Spacing.sm,
  },
  closeCallItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  closeCallContent: {
    flex: 1,
  },
  closeCallNames: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  closeCallName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  closeCallArrow: {
    fontSize: FontSizes.xs,
  },
  closeCallYourName: {
    fontSize: FontSizes.sm,
  },
  closeCallSubtext: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
  closeCallAction: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  nameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  nameContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nameName: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  genderDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  nameMeaning: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  actionIconButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  matchItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.sm,
    position: 'relative',
  },
  matchBadge: {
    position: 'absolute',
    top: -8,
    right: Spacing.md,
    flexDirection: 'row',
    backgroundColor: '#ec4899',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 2,
  },
  matchName: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
  },
  matchDate: {
    fontSize: FontSizes.xs,
    marginTop: Spacing.sm,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
});
