import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

interface AnimatedSplashProps {
  isReady: boolean;
  onAnimationComplete: () => void;
}

export function AnimatedSplash({ isReady, onAnimationComplete }: AnimatedSplashProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [animationDone, setAnimationDone] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Animation values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(20);

  // Start animation sequence
  useEffect(() => {
    // Phase 1: Icon appears with scale up and slide in
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    translateY.value = withSpring(0, { damping: 14, stiffness: 100 });

    // Phase 2: Start wobbling after a short delay
    const wobbleTimer = setTimeout(() => {
      rotation.value = withRepeat(
        withSequence(
          withTiming(8, { duration: 100, easing: Easing.inOut(Easing.ease) }),
          withTiming(-8, { duration: 100, easing: Easing.inOut(Easing.ease) }),
          withTiming(5, { duration: 80, easing: Easing.inOut(Easing.ease) }),
          withTiming(-5, { duration: 80, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 60, easing: Easing.inOut(Easing.ease) }),
        ),
        2,
        false
      );
    }, 400);

    // Phase 3: Bounce celebration
    const bounceTimer = setTimeout(() => {
      scale.value = withSequence(
        withTiming(1.15, { duration: 150 }),
        withSpring(1, { damping: 8, stiffness: 150 })
      );
      translateY.value = withSequence(
        withTiming(-15, { duration: 150 }),
        withSpring(0, { damping: 10, stiffness: 100 })
      );
      setAnimationDone(true);
    }, 1400);

    return () => {
      clearTimeout(wobbleTimer);
      clearTimeout(bounceTimer);
    };
  }, []);

  // When ready and animation done, fade out
  useEffect(() => {
    if (isReady && animationDone) {
      const fadeTimer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(setIsVisible)(false);
            runOnJS(onAnimationComplete)();
          }
        });
      }, 400);

      return () => clearTimeout(fadeTimer);
    }
  }, [isReady, animationDone]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  if (!isVisible) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.iconContainer, animatedStyle]}>
        <Image
          source={require('@/assets/images/hatch-icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  iconContainer: {},
  icon: {
    width: 180,
    height: 180,
  },
});
