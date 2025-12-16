'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { api } from '@/lib/api';

interface LikeButtonProps {
  nameId: string;
  gender?: 'M' | 'F' | 'U';
  variant?: 'icon' | 'button' | 'pill' | 'mini';
  showLabel?: boolean;
  className?: string;
  onLikeChange?: (isLiked: boolean) => void;
}

export function LikeButton({
  nameId,
  gender = 'F',
  variant = 'button',
  showLabel = true,
  className = '',
  onLikeChange,
}: LikeButtonProps) {
  const queryClient = useQueryClient();
  const [optimisticState, setOptimisticState] = useState<'like' | 'dismiss' | null>(null);

  const isMale = gender === 'M';

  // Use React Query to fetch swipe status efficiently
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
      // Optimistic update
      setOptimisticState(action);
      onLikeChange?.(action === 'like');
    },
    onSuccess: (_, { action }) => {
      // Update cache on success
      queryClient.setQueryData(['swipeStatus', nameId], { action });
      setOptimisticState(null);
      // Invalidate related queries (history, etc.)
      queryClient.invalidateQueries({ queryKey: ['swipes'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: () => {
      // Revert optimistic update on error
      setOptimisticState(null);
      onLikeChange?.(currentAction === 'like');
    },
  });

  const handleToggle = useCallback(() => {
    const newAction = isLiked ? 'dismiss' : 'like';
    mutation.mutate({ action: newAction, isUpdate: hasExistingSwipe });
  }, [isLiked, hasExistingSwipe, mutation]);

  if (isLoading) {
    if (variant === 'mini') {
      return <Heart className="w-4 h-4 text-gray-200" />;
    }
    return (
      <div className={`animate-pulse bg-gray-200 rounded-full ${variant === 'icon' ? 'w-10 h-10' : 'w-24 h-10'}`} />
    );
  }

  if (variant === 'mini') {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className={`p-1 rounded-full transition-all hover:scale-110 ${className}`}
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            isLiked
              ? (isMale ? 'text-blue-500 fill-blue-500' : 'text-pink-500 fill-pink-500')
              : 'text-gray-300 hover:text-gray-400'
          }`}
        />
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        className={`p-2 rounded-full transition-all ${
          isLiked
            ? (isMale ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white')
            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
        } ${className}`}
      >
        <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        onClick={handleToggle}
        className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 ${
          isLiked
            ? (isMale ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white')
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } ${className}`}
      >
        <Heart className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`} />
        {showLabel && <span>{isLiked ? 'Liked' : 'Like'}</span>}
      </button>
    );
  }

  // Default: button variant (for header actions)
  return (
    <button
      onClick={handleToggle}
      className={`px-8 py-3 rounded-full transition-all flex items-center gap-2 ${
        isLiked
          ? (isMale ? 'bg-white text-blue-500' : 'bg-white text-pink-500')
          : 'bg-white/20 backdrop-blur-sm text-white hover:bg-white/30'
      } ${className}`}
    >
      <Heart className={`w-5 h-5 ${isLiked ? (isMale ? 'fill-blue-500' : 'fill-pink-500') : ''}`} />
      {showLabel && <span>{isLiked ? 'Liked' : 'Like'}</span>}
    </button>
  );
}
