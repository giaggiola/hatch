import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as Speech from 'expo-speech';

import { api } from '@/lib/api';
import { originsToCountryCodes, getCountryName } from '@/lib/countries';
import { getGenderColor, getGenderLabel } from '@/lib/genderUtils';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';
import { LikeButton } from '@/components/LikeButton';
import { RegionPopularity, NameFacts, SimilarName, Preferences, CustomName, NameWithSimilar } from '@/types';

const MAX_SIMILAR_COUNT = 20;

// Helper to convert CustomName to a Name-like object for display
function customNameToDisplayName(cn: CustomName): NameWithSimilar {
  return {
    id: cn.id,
    name: cn.name,
    gender: cn.gender,
    countries: [],
    meaning: 'Custom name',
    similar: [],
  };
}

export default function NameDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Fetch name details from main database
  const { data: regularName, isLoading: nameLoading, isError: nameError } = useQuery({
    queryKey: ['nameDetail', id],
    queryFn: () => api.getNameDetailWithSimilar(id!, MAX_SIMILAR_COUNT, 0.80),
    enabled: !!id,
    retry: false, // Don't retry 404s
  });

  // Fetch custom names as fallback
  const { data: customNames } = useQuery({
    queryKey: ['customNames'],
    queryFn: () => api.getCustomNames(),
    enabled: !!id && (nameError || !regularName),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Find the custom name if regular name not found
  const customName = useMemo(() => {
    if (regularName || !customNames) return null;
    return customNames.find((cn) => cn.id === id) || null;
  }, [regularName, customNames, id]);

  // Use regular name or convert custom name for display
  const name = useMemo(() => {
    if (regularName) return regularName;
    if (customName) return customNameToDisplayName(customName);
    return null;
  }, [regularName, customName]);

  const isCustomName = !regularName && !!customName;

  // Fetch facts and popularity in parallel (only for regular names)
  // These don't depend on each other, so we enable them at the same time
  const { data: facts } = useQuery<NameFacts>({
    queryKey: ['nameFacts', id],
    queryFn: () => api.getNameFacts(id!),
    enabled: !!id && !isCustomName && !!regularName,
    staleTime: 1000 * 60 * 30, // 30 minutes - facts don't change often
  });

  const { data: regionPopularity } = useQuery<RegionPopularity[]>({
    queryKey: ['regionPopularity', id],
    queryFn: () => api.getPopularityByRegion(id!),
    enabled: !!id && !isCustomName && !!regularName,
    staleTime: 1000 * 60 * 30, // 30 minutes - popularity data is stable
  });

  // Fetch user preferences for country prioritization
  const { data: preferences } = useQuery<Preferences>({
    queryKey: ['preferences'],
    queryFn: () => api.getPreferences(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Compute user's country codes from preferences
  const userCountryCodes = useMemo(() => {
    if (!preferences?.origins) return new Set<string>();
    return new Set(originsToCountryCodes(preferences.origins));
  }, [preferences]);

  // Split similar names by user's countries
  const { similarFromSelected, similarFromOther } = useMemo(() => {
    if (!name?.similar) return { similarFromSelected: [], similarFromOther: [] };

    const sorted = [...name.similar].sort((a, b) => a.name.localeCompare(b.name));
    const fromSelected: SimilarName[] = [];
    const fromOther: SimilarName[] = [];

    for (const similar of sorted) {
      const hasSelectedCountry = similar.countries?.some(c => userCountryCodes.has(c));
      if (hasSelectedCountry) {
        fromSelected.push(similar);
      } else {
        fromOther.push(similar);
      }
    }

    return { similarFromSelected: fromSelected, similarFromOther: fromOther };
  }, [name?.similar, userCountryCodes]);

  // Popularity by region with dot ratings
  const displayRegions = useMemo(() => {
    if (!regionPopularity) return [];

    const getDots = (percentile: number | null): number => {
      if (percentile === null) return 0;
      if (percentile <= 1) return 5;
      if (percentile <= 5) return 4;
      if (percentile <= 10) return 3;
      if (percentile <= 25) return 2;
      if (percentile <= 50) return 1;
      return 0;
    };

    const sorted = [...regionPopularity].sort((a, b) => {
      const aP = a.percentile ?? 100;
      const bP = b.percentile ?? 100;
      return aP - bP;
    });

    const selected = sorted.filter(r => userCountryCodes.has(r.country_code));
    const others = sorted.filter(r => !userCountryCodes.has(r.country_code));
    const combined = [...selected, ...others.slice(0, 3)];

    combined.sort((a, b) => (a.percentile ?? 100) - (b.percentile ?? 100));

    return combined.map(r => ({ ...r, dots: getDots(r.percentile) }));
  }, [regionPopularity, userCountryCodes]);

  const speakName = () => {
    if (name) {
      Speech.speak(name.name, { rate: 0.8 });
    }
  };

  // Show loading while fetching name (or while fetching custom names as fallback)
  const isLoading = nameLoading || (nameError && !customNames);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Show error if name not found anywhere
  if (!name) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <FontAwesome name="question-circle" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Name not found
        </Text>
        <TouchableOpacity
          style={[styles.backButtonError, { backgroundColor: colors.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonErrorText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const genderColor = getGenderColor(name.gender, colors);
  const genderLabel = getGenderLabel(name.gender);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Hero Header */}
      <View style={[styles.header, { backgroundColor: genderColor }]}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={18} color="#ffffff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        {/* Action Icons */}
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={speakName}>
            <FontAwesome name="volume-up" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.nameTextWhite}>{name.name}</Text>
        <Text style={styles.genderTextWhite}>{genderLabel}</Text>

        {/* Custom Name Badge */}
        {isCustomName && (
          <View style={styles.customBadge}>
            <FontAwesome name="star" size={12} color="#ffffff" />
            <Text style={styles.customBadgeText}>Custom Name</Text>
          </View>
        )}

        {/* Header Action Buttons */}
        <View style={styles.headerButtonRow}>
          <LikeButton nameId={name.id} gender={name.gender} />
          <TouchableOpacity style={styles.headerActionBtn} onPress={speakName}>
            <FontAwesome name="volume-up" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Origin & Meaning */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={styles.cardHeader}>
          <FontAwesome name="globe" size={20} color={genderColor} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Origin & Meaning</Text>
        </View>
        {facts?.origin_language && (
          <View style={[styles.originBadge, { backgroundColor: genderColor + '20' }]}>
            <Text style={[styles.originBadgeText, { color: genderColor }]}>
              {facts.origin_language}
            </Text>
          </View>
        )}
        <Text style={[styles.meaningText, { color: colors.textSecondary }]}>
          {facts?.meaning || name.meaning || `${name.name} is a name with rich cultural heritage.`}
        </Text>
      </View>

      {/* Nicknames */}
      {facts?.nicknames && facts.nicknames.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <FontAwesome name="star" size={20} color={genderColor} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Nicknames</Text>
          </View>
          <View style={styles.chipContainer}>
            {facts.nicknames.map((nickname, index) => (
              <View key={index} style={[styles.chip, { backgroundColor: colors.background }]}>
                <Text style={[styles.chipText, { color: colors.text }]}>{nickname}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Famous People */}
      {((facts?.historical_figures && facts.historical_figures.length > 0) ||
        (facts?.fictional_characters && facts.fictional_characters.length > 0)) && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <FontAwesome name="users" size={20} color={genderColor} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Famous People</Text>
          </View>
          {facts?.historical_figures?.map((figure, index) => (
            <View key={`hist-${index}`} style={[styles.figureItem, { borderLeftColor: colors.border }]}>
              <Text style={[styles.figureName, { color: colors.text }]}>{figure.name}</Text>
              <Text style={[styles.figureDesc, { color: colors.textSecondary }]}>{figure.description}</Text>
            </View>
          ))}
          {facts?.fictional_characters?.map((character, index) => (
            <View key={`fict-${index}`} style={[styles.figureItem, { borderLeftColor: '#8b5cf6' }]}>
              <Text style={[styles.figureName, { color: colors.text }]}>{character.name}</Text>
              <Text style={[styles.figureSource, { color: '#8b5cf6' }]}>{character.source}</Text>
              <Text style={[styles.figureDesc, { color: colors.textSecondary }]}>{character.description}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Cultural Significance */}
      {facts?.cultural_references && (facts.cultural_references.religious ||
        facts.cultural_references.mythological || facts.cultural_references.literary) && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.cardHeader}>
            <FontAwesome name="book" size={20} color={genderColor} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Cultural Significance</Text>
          </View>
          {facts.cultural_references.religious && (
            <View style={styles.culturalItem}>
              <Text style={[styles.culturalLabel, { color: colors.text }]}>Religious</Text>
              <Text style={[styles.culturalText, { color: colors.textSecondary }]}>
                {facts.cultural_references.religious}
              </Text>
            </View>
          )}
          {facts.cultural_references.mythological && (
            <View style={styles.culturalItem}>
              <Text style={[styles.culturalLabel, { color: colors.text }]}>Mythological</Text>
              <Text style={[styles.culturalText, { color: colors.textSecondary }]}>
                {facts.cultural_references.mythological}
              </Text>
            </View>
          )}
          {facts.cultural_references.literary && (
            <View style={styles.culturalItem}>
              <Text style={[styles.culturalLabel, { color: colors.text }]}>Literary</Text>
              <Text style={[styles.culturalText, { color: colors.textSecondary }]}>
                {facts.cultural_references.literary}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Popularity by Region */}
      {displayRegions.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: Spacing.md }]}>
            Popularity by Region
          </Text>
          {displayRegions.map((region) => (
            <View key={region.country_code} style={styles.regionRow}>
              <Text style={[styles.regionName, { color: colors.text }]}>
                {region.country_name}
              </Text>
              <View style={styles.dotsContainer}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      { backgroundColor: i <= region.dots ? genderColor : colors.border },
                    ]}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Similar Names from Selected Countries */}
      {similarFromSelected.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: Spacing.md }]}>
            Similar Names
          </Text>
          <View style={styles.similarGrid}>
            {similarFromSelected.map((similar) => (
              <TouchableOpacity
                key={similar.id}
                style={[styles.similarItem, { backgroundColor: colors.background }]}
                onPress={() => router.push(`/name/${similar.id}`)}
              >
                <Text style={[styles.similarName, { color: colors.text }]}>{similar.name}</Text>
                <LikeButton nameId={similar.id} gender={similar.gender} variant="mini" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Similar Names from Other Countries */}
      {similarFromOther.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text, marginBottom: Spacing.md }]}>
            From Other Countries
          </Text>
          <View style={styles.similarGrid}>
            {similarFromOther.map((similar) => (
              <TouchableOpacity
                key={similar.id}
                style={[styles.similarItem, { backgroundColor: colors.background }]}
                onPress={() => router.push(`/name/${similar.id}`)}
              >
                <Text style={[styles.similarName, { color: colors.text }]}>{similar.name}</Text>
                <LikeButton nameId={similar.id} gender={similar.gender} variant="mini" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Bottom spacing */}
      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.lg,
    marginTop: Spacing.sm,
  },
  backButtonError: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  backButtonErrorText: {
    color: '#ffffff',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  header: {
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  backText: {
    color: '#ffffff',
    fontSize: FontSizes.md,
  },
  headerActions: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  nameTextWhite: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  genderTextWhite: {
    fontSize: FontSizes.xl,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  customBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  customBadgeText: {
    color: '#ffffff',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  headerButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  headerActionText: {
    color: '#ffffff',
    fontSize: FontSizes.md,
  },
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  originBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.sm,
  },
  originBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  meaningText: {
    fontSize: FontSizes.md,
    lineHeight: 24,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  chipText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  figureItem: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.md,
    marginBottom: Spacing.md,
  },
  figureName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  figureSource: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  figureDesc: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  culturalItem: {
    marginBottom: Spacing.md,
  },
  culturalLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  culturalText: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  regionName: {
    fontSize: FontSizes.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  similarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  similarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    width: '48%',
  },
  similarName: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    flex: 1,
  },
});
