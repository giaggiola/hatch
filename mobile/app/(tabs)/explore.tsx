import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { api } from '@/lib/api';
import { getOriginFlag, getCountryName } from '@/lib/countries';
import { REGIONS, Region } from '@/lib/regions';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { CreateNameModal } from '@/components/CreateNameModal';
import { Name, Origin, CustomName } from '@/types';

type GenderFilter = 'all' | 'M' | 'F';

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [expandedRegion, setExpandedRegion] = useState<string | null>('europe');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: origins } = useQuery({
    queryKey: ['origins'],
    queryFn: () => api.getOrigins(),
  });

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['searchNames', searchQuery],
    queryFn: () => api.searchNames(searchQuery, 20),
    enabled: searchQuery.length >= 2,
  });

  const { data: popularNames, isLoading: popularLoading } = useQuery({
    queryKey: ['popularNames', genderFilter],
    queryFn: () => api.getPopularNames(genderFilter === 'all' ? undefined : genderFilter, 10),
  });

  // Fetch custom names to include in search results
  const { data: customNames } = useQuery({
    queryKey: ['customNames'],
    queryFn: () => api.getCustomNames(),
  });

  // Combine search results with filtered custom names
  const combinedSearchResults = useMemo(() => {
    const results: Name[] = searchResults ? [...searchResults] : [];

    if (customNames && searchQuery.length >= 2) {
      // Filter custom names that match the search query
      const matchingCustomNames = customNames.filter((cn) =>
        cn.name.toLowerCase().startsWith(searchQuery.toLowerCase())
      );

      // Convert custom names to Name format and add to results
      // (avoid duplicates by checking if name already exists)
      const existingNames = new Set(results.map((r) => r.name.toLowerCase()));

      for (const cn of matchingCustomNames) {
        if (!existingNames.has(cn.name.toLowerCase())) {
          results.push({
            id: cn.id,
            name: cn.name,
            gender: cn.gender,
            countries: [],
            meaning: 'Custom name',
          });
        }
      }
    }

    return results;
  }, [searchResults, customNames, searchQuery]);

  // Mutation for creating custom names
  const createNameMutation = useMutation({
    mutationFn: (data: { name: string; gender: 'M' | 'F' | 'U' }) =>
      api.createCustomName(data),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['customNames'] });
      queryClient.invalidateQueries({ queryKey: ['searchNames'] });
    },
  });

  // Check if search query matches any result exactly (including custom names)
  const hasExactMatch = useMemo(() => {
    if (combinedSearchResults.length === 0) return false;
    return combinedSearchResults.some(
      (name) => name.name.toLowerCase() === searchQuery.toLowerCase()
    );
  }, [combinedSearchResults, searchQuery]);

  // Create origin map for region lookups
  const originMap = useMemo(() => {
    if (!origins) return new Map<string, Origin>();
    return new Map(origins.map(o => [o.name.toLowerCase(), o]));
  }, [origins]);

  // Get origins for a region
  const getRegionOrigins = (region: Region): Origin[] => {
    return region.origins
      .map(o => originMap.get(o))
      .filter((o): o is Origin => o !== undefined)
      .sort((a, b) => b.count - a.count);
  };

  // Calculate total names per region
  const getRegionCount = (region: Region): number => {
    return getRegionOrigins(region).reduce((sum, o) => sum + o.count, 0);
  };

  const handleNamePress = (name: Name) => {
    router.push(`/name/${name.id}`);
  };

  const handleOriginPress = (originName: string) => {
    router.push(`/explore/${originName}` as any);
  };

  const handleCreateName = async (name: string, gender: 'M' | 'F' | 'U') => {
    await createNameMutation.mutateAsync({ name, gender });
  };

  // Gender icon and colors
  const getGenderIcon = (gender?: string) => {
    switch (gender) {
      case 'M': return '♂';
      case 'F': return '♀';
      default: return '◎';
    }
  };

  const getGenderColor = (gender?: string) => {
    switch (gender) {
      case 'M': return '#3b82f6';
      case 'F': return colors.primary;
      default: return '#8b5cf6';
    }
  };

  // Calculate max count for bar scaling
  const maxCount = popularNames && popularNames.length > 0
    ? Math.max(...popularNames.map(n => n.weighted_count || 0))
    : 1;

  const renderPopularNameItem = (item: Name, index: number) => {
    const barWidth = ((item.weighted_count || 0) / maxCount) * 100;
    const genderColor = getGenderColor(item.gender);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.popularNameItem, { backgroundColor: colors.surface }]}
        onPress={() => handleNamePress(item)}
      >
        <Text style={[styles.rankNumber, { color: colors.textSecondary }]}>{index + 1}</Text>
        <View style={styles.popularNameCard}>
          <View
            style={[
              styles.popularityBar,
              { backgroundColor: genderColor, width: `${barWidth}%` },
            ]}
          />
          <View style={styles.popularNameContent}>
            <View style={styles.popularNameRow}>
              <Text style={[styles.genderIcon, { color: genderColor }]}>
                {getGenderIcon(item.gender)}
              </Text>
              <Text style={[styles.popularNameText, { color: colors.text }]}>{item.name}</Text>
            </View>
            <FontAwesome name="chevron-right" size={12} color={colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchResult = (item: Name) => {
    const genderColor = getGenderColor(item.gender);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.searchResultItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleNamePress(item)}
      >
        <View style={styles.nameContent}>
          <Text style={[styles.nameName, { color: colors.text }]}>{item.name}</Text>
          <View style={[styles.genderDot, { backgroundColor: genderColor }]} />
        </View>
        {item.meaning && (
          <Text style={[styles.nameMeaning, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.meaning}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderRegionAccordion = () => (
    <View style={styles.regionsSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore by Region</Text>
      {REGIONS.map((region) => {
        const regionOrigins = getRegionOrigins(region);
        const isExpanded = expandedRegion === region.id;
        const totalNames = getRegionCount(region);

        if (regionOrigins.length === 0) return null;

        return (
          <View key={region.id} style={[styles.regionCard, { backgroundColor: colors.surface }]}>
            {/* Region Header */}
            <TouchableOpacity
              style={styles.regionHeader}
              onPress={() => setExpandedRegion(isExpanded ? null : region.id)}
            >
              <View style={styles.regionHeaderLeft}>
                <Text style={styles.regionEmoji}>{region.emoji}</Text>
                <View>
                  <Text style={[styles.regionName, { color: colors.text }]}>{region.name}</Text>
                  <Text style={[styles.regionStats, { color: colors.textSecondary }]}>
                    {regionOrigins.length} countries · {totalNames.toLocaleString()} names
                  </Text>
                </View>
              </View>
              <FontAwesome
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Expanded Countries */}
            {isExpanded && (
              <View style={styles.regionCountries}>
                {regionOrigins.map((origin) => (
                  <TouchableOpacity
                    key={origin.name}
                    style={[styles.countryButton, { backgroundColor: colors.border }]}
                    onPress={() => handleOriginPress(origin.name)}
                  >
                    <Text style={styles.countryFlag}>{getOriginFlag(origin.name)}</Text>
                    <View style={styles.countryInfo}>
                      <Text style={[styles.countryName, { color: colors.text }]} numberOfLines={1}>
                        {getCountryName(origin.name)}
                      </Text>
                      <Text style={[styles.countryCount, { color: colors.textSecondary }]}>
                        {origin.count.toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );

  const isSearching = searchQuery.length >= 2;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar - always rendered at top level to maintain focus */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <FontAwesome name="search" size={16} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search names..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <FontAwesome name="times-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      {isSearching ? (
        <View style={styles.searchResultsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Results for "{searchQuery}"
          </Text>
          {searchLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            <FlatList
              data={combinedSearchResults}
              renderItem={({ item }) => renderSearchResult(item)}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.searchResultsList}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No names found
                </Text>
              }
              ListFooterComponent={
                searchQuery.length >= 2 && !hasExactMatch ? (
                  <TouchableOpacity
                    style={[
                      styles.createNameItem,
                      { backgroundColor: colors.surface, borderColor: colors.primary },
                    ]}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <View style={styles.createNameContent}>
                      <FontAwesome name="plus-circle" size={20} color={colors.primary} />
                      <View style={styles.createNameTextContainer}>
                        <Text style={[styles.createNameTitle, { color: colors.primary }]}>
                          Create "{searchQuery}"
                        </Text>
                        <Text style={[styles.createNameSubtitle, { color: colors.textSecondary }]}>
                          Add this name to your list
                        </Text>
                      </View>
                    </View>
                    <FontAwesome name="chevron-right" size={12} color={colors.primary} />
                  </TouchableOpacity>
                ) : null
              }
            />
          )}
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>

      {/* Popular Names Section */}
      <View style={styles.popularSection}>
        {/* Header with gender filter */}
        <View style={styles.popularHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Most Popular Names</Text>
          <View style={[styles.genderFilter, { backgroundColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.genderButton,
                genderFilter === 'all' && { backgroundColor: colors.surface },
              ]}
              onPress={() => setGenderFilter('all')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  { color: genderFilter === 'all' ? colors.text : colors.textSecondary },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderButton,
                genderFilter === 'M' && { backgroundColor: '#3b82f6' },
              ]}
              onPress={() => setGenderFilter('M')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  { color: genderFilter === 'M' ? '#ffffff' : colors.textSecondary },
                ]}
              >
                Boys
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.genderButton,
                genderFilter === 'F' && { backgroundColor: colors.primary },
              ]}
              onPress={() => setGenderFilter('F')}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  { color: genderFilter === 'F' ? '#ffffff' : colors.textSecondary },
                ]}
              >
                Girls
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Popular Names List */}
        {popularLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.popularNamesList}>
            {popularNames?.map((name, index) => renderPopularNameItem(name, index))}
          </View>
        )}

        {/* Explore More Button */}
        <TouchableOpacity
          style={[styles.exploreMoreButton, { backgroundColor: colors.border }]}
          onPress={() => router.push('/popular' as any)}
        >
          <Text style={[styles.exploreMoreText, { color: colors.textSecondary }]}>
            Explore More
          </Text>
          <FontAwesome name="arrow-right" size={12} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Regions Accordion */}
      {renderRegionAccordion()}

      {/* Bottom padding */}
      <View style={{ height: Spacing.xxl }} />
        </ScrollView>
      )}

      {/* Create Name Modal */}
      <CreateNameModal
        visible={showCreateModal}
        initialName={searchQuery}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSizes.md,
    paddingVertical: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
  },
  popularSection: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  popularHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  genderFilter: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 2,
  },
  genderButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  genderButtonText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
  popularNamesList: {
    gap: Spacing.xs,
  },
  popularNameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  rankNumber: {
    width: 20,
    fontSize: FontSizes.xs,
    fontWeight: '500',
    textAlign: 'right',
  },
  popularNameCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
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
  popularNameContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  popularNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  genderIcon: {
    fontSize: FontSizes.md,
  },
  popularNameText: {
    fontSize: FontSizes.md,
    fontWeight: '500',
  },
  exploreMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  exploreMoreText: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.lg,
  },
  regionsSection: {
    paddingHorizontal: Spacing.md,
  },
  regionCard: {
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  regionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  regionEmoji: {
    fontSize: 28,
  },
  regionName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  regionStats: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  regionCountries: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
    width: '48%',
  },
  countryFlag: {
    fontSize: FontSizes.lg,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  countryCount: {
    fontSize: FontSizes.xs,
  },
  searchResultsSection: {
    flex: 1,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  searchResultsList: {
    paddingBottom: Spacing.xl,
  },
  searchResultItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  nameContent: {
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
  loader: {
    marginTop: Spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    fontSize: FontSizes.md,
  },
  createNameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: Spacing.md,
  },
  createNameContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  createNameTextContainer: {
    gap: 2,
  },
  createNameTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  createNameSubtitle: {
    fontSize: FontSizes.xs,
  },
});
