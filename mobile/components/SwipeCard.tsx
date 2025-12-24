import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { NameWithSimilar } from '@/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const VELOCITY_THRESHOLD = 500; // px/s for fast flick gestures

interface SwipeCardProps {
  name: NameWithSimilar;
  onSwipe: (action: 'like' | 'dismiss') => void;
  isTop: boolean;
  selectedVariants: Set<string>;
  onToggleVariant: (variantId: string) => void;
}

export function SwipeCard({ name, onSwipe, isTop, selectedVariants, onToggleVariant }: SwipeCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handleSwipe = (action: 'like' | 'dismiss') => {
    onSwipe(action);
  };

  const speakName = () => {
    Speech.speak(name.name, { rate: 0.8 });
  };

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(isTop)
        .onUpdate((event) => {
          translateX.value = event.translationX;
          translateY.value = event.translationY;
        })
        .onEnd((event) => {
          const offset = event.translationX;
          const velocity = event.velocityX;

          // Trigger swipe if exceeds position threshold OR velocity threshold (fast flick)
          if (offset > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
            // Right swipe (like) - trigger immediately, animation is just visual
            translateX.value = withSpring(SCREEN_WIDTH, { damping: 15 });
            runOnJS(handleSwipe)('like');
          } else if (offset < -SWIPE_THRESHOLD || velocity < -VELOCITY_THRESHOLD) {
            // Left swipe (dismiss) - trigger immediately, animation is just visual
            translateX.value = withSpring(-SCREEN_WIDTH, { damping: 15 });
            runOnJS(handleSwipe)('dismiss');
          } else {
            // Snap back to center
            translateX.value = withSpring(0);
            translateY.value = withSpring(0);
          }
        }),
    [isTop, handleSwipe]
  );

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-15, 0, 15],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const isMale = name.gender === 'M';
  const gradientColors = isMale ? ['#3b82f6', '#2563eb'] : ['#ec4899', '#db2777'];

  // Dedupe and take first 5 similar names for display
  const seenIds = new Set<string>();
  const displayedVariants = name.similar
    .filter((v) => {
      if (seenIds.has(v.id)) return false;
      seenIds.add(v.id);
      return true;
    })
    .slice(0, 5);

  // Dynamic font size based on name length
  const getNameFontSize = () => {
    if (name.name.length > 12) return FontSizes.xxxl;
    if (name.name.length > 9) return FontSizes.display - 8;
    return FontSizes.display;
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: colors.surface, shadowColor: colors.text },
          cardStyle,
        ]}
      >
        {/* Like indicator */}
        <Animated.View style={[styles.indicator, styles.likeIndicator, likeOpacity]}>
          <Text style={styles.indicatorText}>LIKE</Text>
        </Animated.View>

        {/* Nope indicator */}
        <Animated.View style={[styles.indicator, styles.nopeIndicator, nopeOpacity]}>
          <Text style={styles.indicatorText}>NOPE</Text>
        </Animated.View>

        {/* Gradient Header with Name */}
        <TouchableOpacity
          style={[styles.headerGradient, { backgroundColor: gradientColors[0] }]}
          onPress={() => router.push(`/name/${name.id}`)}
          activeOpacity={0.9}
        >
          {/* Pronunciation Button */}
          <TouchableOpacity
            style={styles.speakButton}
            onPress={(e) => {
              e.stopPropagation?.();
              speakName();
            }}
          >
            <FontAwesome name="volume-up" size={18} color="#ffffff" />
          </TouchableOpacity>

          <Text style={[styles.nameText, { fontSize: getNameFontSize() }]}>
            {name.name}
          </Text>
        </TouchableOpacity>

        {/* Similar Names Grid */}
        <View style={styles.variantsSection}>
          {displayedVariants.length > 0 ? (
            <View style={styles.variantsGrid}>
              {displayedVariants.map((variant) => {
                const isSelected = selectedVariants.has(variant.id);
                return (
                  <TouchableOpacity
                    key={variant.id}
                    style={[
                      styles.variantButton,
                      {
                        backgroundColor: isSelected
                          ? (isMale ? '#eff6ff' : '#fdf2f8')
                          : (colorScheme === 'dark' ? colors.border : '#f9fafb'),
                        borderColor: isSelected
                          ? (isMale ? '#3b82f6' : '#ec4899')
                          : 'transparent',
                        borderWidth: isSelected ? 2 : 2,
                      },
                      !isSelected && { borderColor: 'transparent' }
                    ]}
                    onPress={() => onToggleVariant(variant.id)}
                  >
                    {isSelected ? (
                      <View style={[styles.checkBadge, { backgroundColor: isMale ? '#3b82f6' : '#ec4899' }]}>
                        <Text style={styles.checkText}>✓</Text>
                      </View>
                    ) : (
                      <View style={[styles.plusBadge, { borderColor: colors.textSecondary }]}>
                        <Text style={[styles.plusText, { color: colors.textSecondary }]}>+</Text>
                      </View>
                    )}
                    <Text style={[styles.variantName, { color: isSelected ? (isMale ? '#1e40af' : '#9d174d') : colors.text }]} numberOfLines={2}>
                      {variant.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.noVariants}>
              <Text style={[styles.noVariantsText, { color: colors.textSecondary }]}>
                No similar names found
              </Text>
            </View>
          )}
        </View>

        {/* Explore More Link */}
        <TouchableOpacity
          style={styles.exploreMore}
          onPress={() => router.push(`/name/${name.id}`)}
        >
          <Text style={[styles.exploreMoreText, { color: colors.textSecondary }]}>
            Explore more
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - Spacing.lg * 2,
    height: '80%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  indicator: {
    position: 'absolute',
    top: 80,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    zIndex: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  likeIndicator: {
    left: Spacing.lg,
    backgroundColor: '#10b981',
    transform: [{ rotate: '12deg' }],
  },
  nopeIndicator: {
    right: Spacing.lg,
    backgroundColor: '#ef4444',
    transform: [{ rotate: '-12deg' }],
  },
  indicatorText: {
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerGradient: {
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  speakButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  nameText: {
    fontSize: FontSizes.display,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff',
  },
  variantsSection: {
    flex: 1,
    padding: Spacing.lg,
    minHeight: 160,
  },
  variantsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  variantButton: {
    width: '30%',
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  plusBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  variantName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: Spacing.xs,
  },
  noVariants: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noVariantsText: {
    fontSize: FontSizes.sm,
  },
  exploreMore: {
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  exploreMoreText: {
    fontSize: FontSizes.sm,
    textDecorationLine: 'underline',
  },
});
