import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { api } from '@/lib/api';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { Name } from '@/types';

type GenderFilter = 'all' | 'M' | 'F';

export default function PopularScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const params = useLocalSearchParams<{ gender?: string }>();

  const [genderFilter, setGenderFilter] = useState<GenderFilter>(
    (params.gender as GenderFilter) || 'all'
  );

  const { data: names, isLoading } = useQuery({
    queryKey: ['popularNames', genderFilter, 50],
    queryFn: () => api.getPopularNames(genderFilter === 'all' ? undefined : genderFilter, 50),
  });

  const maxCount = names && names.length > 0
    ? Math.max(...names.map(n => n.weighted_count || 0))
    : 1;

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

  const getTitle = () => {
    switch (genderFilter) {
      case 'M': return 'Popular Boy Names';
      case 'F': return 'Popular Girl Names';
      default: return 'Most Popular Names';
    }
  };

  const handleNamePress = (name: Name) => {
    router.push(`/name/${name.id}`);
  };

  const renderNameItem = ({ item, index }: { item: Name; index: number }) => {
    const barWidth = ((item.weighted_count || 0) / maxCount) * 100;
    const badge = getGenderBadge(item.gender);
    const barColor = getGenderColor(item.gender);

    return (
      <TouchableOpacity
        style={styles.nameItem}
        onPress={() => handleNamePress(item)}
      >
        <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>
          {index + 1}
        </Text>
        <View style={[styles.nameCard, { backgroundColor: colors.surface }]}>
          <View
            style={[
              styles.popularityBar,
              { backgroundColor: barColor, width: `${barWidth}%` },
            ]}
          />
          <View style={styles.nameContent}>
            <View style={styles.nameRow}>
              <Text style={[styles.nameText, { color: colors.text }]}>{item.name}</Text>
              <View style={[styles.genderBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.genderBadgeText, { color: badge.text }]}>
                  {badge.label}
                </Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={14} color={colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome name="chevron-left" size={16} color={colors.primary} />
          <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{getTitle()}</Text>
      </View>

      {/* Gender Filter */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            genderFilter === 'all' && { backgroundColor: colors.text },
          ]}
          onPress={() => setGenderFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              { color: genderFilter === 'all' ? colors.surface : colors.textSecondary },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            genderFilter === 'M' && { backgroundColor: '#3b82f6' },
          ]}
          onPress={() => setGenderFilter('M')}
        >
          <Text
            style={[
              styles.filterButtonText,
              { color: genderFilter === 'M' ? '#ffffff' : colors.textSecondary },
            ]}
          >
            Boys
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            genderFilter === 'F' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setGenderFilter('F')}
        >
          <Text
            style={[
              styles.filterButtonText,
              { color: genderFilter === 'F' ? '#ffffff' : colors.textSecondary },
            ]}
          >
            Girls
          </Text>
        </TouchableOpacity>
      </View>

      {/* Names List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={names}
          renderItem={renderNameItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No names found
            </Text>
          }
        />
      )}
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
    paddingBottom: Spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  backText: {
    fontSize: FontSizes.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    padding: 4,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
  },
  filterButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  nameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  rankNumber: {
    width: 28,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textAlign: 'right',
  },
  nameCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  popularityBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    opacity: 0.15,
  },
  nameContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nameText: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  genderBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  genderBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
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
});
