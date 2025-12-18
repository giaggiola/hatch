'use client';

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { NameWithSimilar } from '@/lib/api';

interface SwipeCardWithSimilarProps {
  name: NameWithSimilar;
  selectedVariants: Set<string>;
  onToggleVariant: (variantId: string) => void;
  onSwipe: (direction: 'left' | 'right') => void;
  onExploreMore: () => void;
}

export default function SwipeCardWithSimilar({
  name,
  selectedVariants,
  onToggleVariant,
  onSwipe,
  onExploreMore,
}: SwipeCardWithSimilarProps) {
  const router = useRouter();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onSwipe('right');
    } else if (info.offset.x < -threshold) {
      onSwipe('left');
    }
  };

  const isMale = name.gender === 'M';
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
  const getNameFontSize = (nameStr: string) => {
    if (nameStr.length > 12) return 'text-3xl';
    if (nameStr.length > 9) return 'text-4xl';
    return 'text-5xl';
  };


  // Color scheme based on gender
  const gradientClass = isMale
    ? 'from-blue-500 to-blue-600'
    : 'from-pink-500 to-rose-600';

  return (
    <motion.div
      className="w-full cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden mx-4 no-select relative">
        {/* Like/Nope indicators */}
        <motion.div
          className="absolute top-20 left-8 z-10 pointer-events-none"
          style={{ opacity: likeOpacity }}
        >
          <div className="bg-green-500 text-white font-bold text-2xl px-6 py-3 rounded-xl rotate-12 shadow-xl">
            LIKE
          </div>
        </motion.div>
        <motion.div
          className="absolute top-20 right-8 z-10 pointer-events-none"
          style={{ opacity: nopeOpacity }}
        >
          <div className="bg-red-500 text-white font-bold text-2xl px-6 py-3 rounded-xl -rotate-12 shadow-xl">
            NOPE
          </div>
        </motion.div>

        {/* Main Name Section */}
        <div
          className={`bg-gradient-to-br ${gradientClass} p-10 text-white relative min-h-[200px] flex flex-col justify-center cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/name/${name.id}`);
          }}
        >
          {/* Pronunciation Icon */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(name.name);
                utterance.rate = 0.8;
                window.speechSynthesis.speak(utterance);
              }
            }}
            className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
          >
            <Volume2 className="w-5 h-5" />
          </button>

          <div className="text-center">
            <div className={`${getNameFontSize(name.name)} font-bold`}>{name.name}</div>
          </div>
        </div>

        {/* Similar Names Grid */}
        <div className="p-6 min-h-[180px]">
          {displayedVariants.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {displayedVariants.map((variant) => {
                const isSelected = selectedVariants.has(variant.id);
                return (
                  <button
                    key={variant.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVariant(variant.id);
                    }}
                    className={`rounded-xl px-2 py-2 transition-all relative h-14 flex items-center justify-center ${
                      isSelected
                        ? isMale
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500'
                          : 'bg-pink-50 dark:bg-pink-900/30 border-2 border-pink-500'
                        : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {isSelected ? (
                      <div className={`absolute -top-1 -right-1 ${isMale ? 'bg-blue-500' : 'bg-pink-500'} text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]`}>
                        ✓
                      </div>
                    ) : (
                      <div className="absolute -top-1 -right-1 border-2 border-gray-400 bg-white dark:bg-gray-600 text-gray-400 font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                        +
                      </div>
                    )}
                    <div className="font-medium text-gray-900 dark:text-white text-sm text-center leading-tight line-clamp-2">{variant.name}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No similar names found
            </div>
          )}
        </div>

        {/* Explore More Link */}
        <div className="pb-4 text-center">
          <span
            onClick={(e) => {
              e.stopPropagation();
              onExploreMore();
            }}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer underline"
          >
            Explore more
          </span>
        </div>
      </div>
    </motion.div>
  );
}
