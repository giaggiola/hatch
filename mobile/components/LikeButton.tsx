import React, { useState, useCallback } from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { api } from '@/lib/api';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/components/useColorScheme';

interface LikeButtonProps {
  nameId: string;
  gender?: 'M' | 'F' | 'U';
  variant?: 'icon' | 'mini';
  style?: ViewStyle;
  onLikeChange?: (isLiked: boolean) => void;
}

export function LikeButton({
  nameId,
  gender = 'F',
  variant = 'icon',
  style,
  onLikeChange,
}: LikeButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const queryClient = useQueryClient();
  const [optimisticState, setOptimisticState] = useState<'like' | 'dismiss' | null>(null);

  const isMale = gender === 'M';
  const accentColor = isMale ? '#3b82f6' : colors.primary;

  // Fetch swipe status
  const { data: swipeData, isLoading } = useQuery({
    queryKey: ['swipeStatus', nameId],
    queryFn: () => api.checkSwipeStatus(nameId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use optimistic state if set, otherwise use server state
  const currentAction = optimisticState ?? swipeData?.action;
  const isLiked = currentAction === 'like';
  const hasExistingSwipe = currentAction !== null && currentAction !== undefined;

  // Mutation for updating swipe
  const mutation = useMutation({
    mutationFn: async ({ action, isUpdate }: { action: 'like' | 'dismiss'; isUpdate: boolean }) => {
      if (isUpdate) {
        return api.updateSwipe(nameId, action);
      } else {
        return api.createSwipe(nameId, action);
      }
    },
    onMutate: async ({ action }) => {
      setOptimisticState(action);
      onLikeChange?.(action === 'like');
    },
    onSuccess: (_, { action }) => {
      queryClient.setQueryData(['swipeStatus', nameId], { action });
      setOptimisticState(null);
      queryClient.invalidateQueries({ queryKey: ['swipes'] });
      queryClient.invalidateQueries({ queryKey: ['swipeNames'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['closeCalls'] });
    },
    onError: () => {
      setOptimisticState(null);
      onLikeChange?.(currentAction === 'like');
    },
  });

  const handleToggle = useCallback(() => {
    const newAction = isLiked ? 'dismiss' : 'like';
    mutation.mutate({ action: newAction, isUpdate: hasExistingSwipe });
  }, [isLiked, hasExistingSwipe, mutation]);

  if (isLoading) {
    return (
      <ActivityIndicator
        size="small"
        color={colors.textSecondary}
        style={variant === 'mini' ? styles.miniLoader : styles.iconLoader}
      />
    );
  }

  if (variant === 'mini') {
    return (
      <TouchableOpacity
        onPress={handleToggle}
        style={[styles.miniButton, style]}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <FontAwesome
          name={isLiked ? 'heart' : 'heart-o'}
          size={14}
          color={isLiked ? accentColor : colors.textSecondary}
        />
      </TouchableOpacity>
    );
  }

  // Default: icon variant
  return (
    <TouchableOpacity
      onPress={handleToggle}
      style={[
        styles.iconButton,
        {
          backgroundColor: isLiked ? accentColor : colors.surface,
          borderColor: isLiked ? accentColor : colors.border,
        },
        style,
      ]}
    >
      {mutation.isPending ? (
        <ActivityIndicator size="small" color={isLiked ? '#fff' : accentColor} />
      ) : (
        <FontAwesome
          name={isLiked ? 'heart' : 'heart-o'}
          size={20}
          color={isLiked ? '#fff' : accentColor}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  miniButton: {
    padding: Spacing.xs,
  },
  miniLoader: {
    width: 14,
    height: 14,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLoader: {
    width: 44,
    height: 44,
  },
});
