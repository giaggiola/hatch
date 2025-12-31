import React, { useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Pressable } from 'react-native';
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
  onLikeVariant?: (variantId: string) => void;
  likedVariantIds?: Set<string>;
}

function SwipeCardComponent({ name, onSwipe, isTop, onLikeVariant, likedVariantIds }: SwipeCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Memoize callbacks to prevent gesture recreation
  const handleSwipe = useCallback((action: 'like' | 'dismiss') => {
    onSwipe(action);
  }, [onSwipe]);

  const speakName = useCallback(async () => {
    try {
      // Stop any current speech first
      await Speech.stop();
      Speech.speak(name.name, {
        rate: 0.8,
        onError: (error) => console.warn('Speech error:', error),
      });
    } catch (error) {
      console.warn('Failed to speak:', error);
    }
  }, [name.name]);

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
    [isTop, handleSwipe, translateX, translateY]
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

  // Memoize: Dedupe, filter out liked, and take first 5 similar names for display
  const displayedVariants = useMemo(() => {
    const seenIds = new Set<string>();
    return name.similar
      .filter((v) => {
        if (seenIds.has(v.id)) return false;
        if (likedVariantIds?.has(v.id)) return false; // Hide liked variants
        seenIds.add(v.id);
        return true;
      })
      .slice(0, 5);
  }, [name.similar, likedVariantIds]);

  // Memoize: Dynamic font size based on name length
  const nameFontSize = useMemo(() => {
    if (name.name.length > 12) return FontSizes.xxxl;
    if (name.name.length > 9) return FontSizes.display - 8;
    return FontSizes.display;
  }, [name.name.length]);

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
        <View style={[styles.headerGradient, { backgroundColor: gradientColors[0] }]}>
          {/* Pronunciation Button */}
          <Pressable
            style={styles.speakButton}
            onPress={speakName}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome name="volume-up" size={18} color="#ffffff" />
          </Pressable>

          <Pressable onPress={() => router.push(`/name/${name.id}`)}>
            <Text style={[styles.nameText, { fontSize: nameFontSize }]}>
              {name.name}
            </Text>
          </Pressable>
        </View>

        {/* Similar Names Grid */}
        <View style={styles.variantsSection}>
          {displayedVariants.length > 0 ? (
            <View style={styles.variantsGrid}>
              {displayedVariants.map((variant) => {
                return (
                  <View
                    key={variant.id}
                    style={[
                      styles.variantButton,
                      {
                        backgroundColor: colorScheme === 'dark' ? colors.border : '#f9fafb',
                        borderColor: 'transparent',
                        borderWidth: 2,
                      },
                    ]}
                  >
                    {/* Heart button to like variant */}
                    <TouchableOpacity
                      style={styles.variantHeartButton}
                      onPress={() => onLikeVariant?.(variant.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <FontAwesome
                        name="heart-o"
                        size={14}
                        color={isMale ? '#3b82f6' : '#ec4899'}
                      />
                    </TouchableOpacity>
                    <Text
                      style={[styles.variantName, { color: colors.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {variant.name}
                    </Text>
                  </View>
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
    flexDirection: 'column',
    paddingTop: Spacing.xs,
  },
  variantHeartButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 2,
  },
  variantName: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
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

// Memoize to prevent unnecessary re-renders when parent state changes
export const SwipeCard = memo(SwipeCardComponent, (prev, next) => {
  // Custom comparison - only re-render if these specific props change
  return (
    prev.name.id === next.name.id &&
    prev.isTop === next.isTop &&
    prev.likedVariantIds === next.likedVariantIds &&
    prev.onSwipe === next.onSwipe &&
    prev.onLikeVariant === next.onLikeVariant
  );
});
