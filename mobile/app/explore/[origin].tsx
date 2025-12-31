import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { api } from '@/lib/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { getCountryName, getOriginFlag } from '@/lib/countries';
import { Name } from '@/types';

const PAGE_SIZE = 50;
type GenderFilter = 'all' | 'M' | 'F';

export default function OriginDetailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const { origin } = useLocalSearchParams<{ origin: string }>();

  const [filter, setFilter] = useState<GenderFilter>('all');
  const [swipedNames, setSwipedNames] = useState<Map<string, 'like' | 'dismiss'>>(new Map());
  const [names, setNames] = useState<Name[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['namesByOrigin', origin],
    queryFn: async () => {
      const data = await api.getNamesByOrigin(origin || '', PAGE_SIZE, 0);
      setNames(data);
      setHasMore(data.length === PAGE_SIZE);
      return data;
    },
    enabled: !!origin,
  });

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !origin) return;
    setIsLoadingMore(true);
    try {
      const data = await api.getNamesByOrigin(origin, PAGE_SIZE, names.length);
      setNames(prev => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more names:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [origin, names.length, isLoadingMore, hasMore]);

  const swipeMutation = useMutation({
    mutationFn: ({ nameId, action }: { nameId: string; action: 'like' | 'dismiss' }) =>
      api.createSwipe(nameId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['swipes'] });
      queryClient.invalidateQueries({ queryKey: ['swipeNames'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['closeCalls'] });
    },
  });

  const handleSwipe = useCallback((name: Name, action: 'like' | 'dismiss') => {
    setSwipedNames(prev => new Map(prev).set(name.id, action));
    swipeMutation.mutate({ nameId: name.id, action });
  }, [swipeMutation]);

  const handleNamePress = (name: Name) => {
    router.push(`/name/${name.id}`);
  };

  const filteredNames = useMemo(() => {
    if (filter === 'all') return names;
    return names.filter(n => n.gender === filter);
  }, [names, filter]);

  const genderCounts = useMemo(() => ({
    M: names.filter(n => n.gender === 'M').length,
    F: names.filter(n => n.gender === 'F').length,
  }), [names]);

  const likedCount = useMemo(() =>
    Array.from(swipedNames.values()).filter(v => v === 'like').length,
  [swipedNames]);

  // Show filters only if we have both boys and girls
  const hasBothGenders = genderCounts.M > 0 && genderCounts.F > 0;

  const getGenderColor = (gender?: string) => {
    switch (gender) {
      case 'M': return '#3b82f6';
      case 'F': return colors.primary;
      default: return '#8b5cf6';
    }
  };

  const getGenderBadge = (gender?: string) => {
    switch (gender) {
      case 'M': return { bg: '#dbeafe', text: '#2563eb', label: 'Boy' };
      case 'F': return { bg: '#fce7f3', text: '#db2777', label: 'Girl' };
      default: return { bg: '#f3e8ff', text: '#9333ea', label: 'Unisex' };
    }
  };

  const renderNameCard = ({ item }: { item: Name }) => {
    const swipeStatus = swipedNames.get(item.id);
    const isLiked = swipeStatus === 'like';
    const badge = getGenderBadge(item.gender);

    return (
      <View
        style={[
          styles.nameCard,
          { backgroundColor: colors.surface },
          isLiked && { borderColor: colors.primary, borderWidth: 2 },
          swipeStatus === 'dismiss' && { opacity: 0.5 },
        ]}
      >
        <TouchableOpacity
          style={styles.nameInfo}
          onPress={() => handleNamePress(item)}
        >
          <Text style={[styles.nameText, { color: colors.text }]}>{item.name}</Text>
          <View style={[styles.genderBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.genderBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </TouchableOpacity>

        {item.meaning && (
          <Text style={[styles.meaningText, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.meaning}
          </Text>
        )}

        {!swipeStatus ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.border }]}
              onPress={() => handleSwipe(item, 'like')}
            >
              <FontAwesome name="heart" size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.border }]}
              onPress={() => handleSwipe(item, 'dismiss')}
            >
              <FontAwesome name="times" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusIcon,
                { backgroundColor: isLiked ? colors.primary : colors.border },
              ]}
            >
              <FontAwesome
                name={isLiked ? 'heart' : 'times'}
                size={16}
                color={isLiked ? '#ffffff' : colors.textSecondary}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const displayName = origin ? getCountryName(origin) : '';
  const flag = origin ? getOriginFlag(origin) : '';

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="chevron-left" size={16} color="#ffffff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerFlag}>{flag}</Text>
          <Text style={styles.headerTitle}>{displayName}</Text>
        </View>
        {likedCount > 0 && (
          <View style={styles.likedBadge}>
            <Text style={styles.likedBadgeText}>
              {likedCount} name{likedCount !== 1 ? 's' : ''} liked
            </Text>
          </View>
        )}
      </View>

      {/* Filters */}
      {hasBothGenders && (
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: filter === 'M' ? '#3b82f6' : colors.surface },
            ]}
            onPress={() => setFilter(filter === 'M' ? 'all' : 'M')}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: filter === 'M' ? '#ffffff' : colors.textSecondary },
              ]}
            >
              Boys
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: filter === 'F' ? colors.primary : colors.surface },
            ]}
            onPress={() => setFilter(filter === 'F' ? 'all' : 'F')}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: filter === 'F' ? '#ffffff' : colors.textSecondary },
              ]}
            >
              Girls
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Names Grid */}
      <FlatList
        data={filteredNames}
        renderItem={renderNameCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.loadingMore} />
          ) : null
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No names found
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  backText: {
    fontSize: FontSizes.md,
    color: '#ffffff',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  headerFlag: {
    fontSize: 28,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
  },
  likedBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
  },
  likedBadgeText: {
    fontSize: FontSizes.sm,
    color: '#ffffff',
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  filterButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  row: {
    gap: Spacing.sm,
  },
  nameCard: {
    flex: 1,
    maxWidth: '48%',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  nameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  nameText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  genderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
  genderBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  meaningText: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  statusIndicator: {
    alignItems: 'flex-start',
    marginTop: Spacing.xs,
  },
  statusIcon: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: FontSizes.md,
  },
  loadingMore: {
    paddingVertical: Spacing.lg,
  },
});
