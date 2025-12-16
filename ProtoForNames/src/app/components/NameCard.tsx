import { motion, useMotionValue, useTransform } from "motion/react";
import { Heart, X, Info, ArrowRight } from "lucide-react";
import { useState } from "react";

interface NameVariant {
  name: string;
  origin: string;
}

interface NameCardProps {
  name: string;
  origin: string;
  variants: NameVariant[];
  onLike: () => void;
  onDislike: () => void;
  onInfo: () => void;
  onExploreGroup: () => void;
  selectedVariants: string[];
  onToggleVariant: (name: string) => void;
}

export function NameCard({ 
  name, 
  origin, 
  variants, 
  onLike, 
  onDislike, 
  onInfo, 
  onExploreGroup,
  selectedVariants,
  onToggleVariant
}: NameCardProps) {
  const [exitX, setExitX] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (_: any, info: any) => {
    if (Math.abs(info.offset.x) > 100) {
      setExitX(info.offset.x > 0 ? 200 : -200);
      if (info.offset.x > 0) {
        setTimeout(onLike, 100);
      } else {
        setTimeout(onDislike, 100);
      }
    }
  };

  return (
    <motion.div
      className="absolute w-full max-w-sm"
      style={{
        x,
        rotate,
        opacity,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={exitX !== 0 ? { x: exitX } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing">
        {/* Main Name Section */}
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-8 text-white relative">
          {/* Info Button */}
          <button
            onClick={onInfo}
            className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
          >
            <Info className="w-5 h-5" />
          </button>

          <div className="mt-4 text-center">
            <div className="text-5xl mb-3">{name}</div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg opacity-90">{origin}</span>
            </div>
          </div>
        </div>

        {/* Variants Grid */}
        <div className="mt-6">
          <div className="text-sm text-gray-600 mb-3 text-center">
            Tap variants you like, then swipe right to save them ↓
          </div>
          <div className="grid grid-cols-3 gap-2">
            {variants.map((variant, index) => {
              const isSelected = selectedVariants.includes(variant.name);
              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVariant(variant.name);
                  }}
                  className={`rounded-xl p-3 transition-all relative ${
                    isSelected
                      ? "bg-pink-50 border-2 border-pink-500"
                      : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-pink-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}
                  <div className="text-gray-900 mb-1">{variant.name}</div>
                  <div className="text-gray-500 text-sm">{variant.origin}</div>
                </button>
              );
            })}
          </div>

          {/* Explore More Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExploreGroup();
            }}
            className="w-full mt-4 bg-white border border-gray-200 text-gray-700 rounded-lg p-2.5 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5 text-sm"
          >
            <span>Explore {name} Group</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Swipe Hint */}
        <div className="px-6 pb-6 text-center text-gray-400 text-sm">
          Swipe right to like, left to pass
        </div>
      </div>

      {/* Like/Dislike Indicators */}
      <motion.div
        className="absolute top-20 left-8 text-6xl pointer-events-none"
        style={{ opacity: useTransform(x, [0, 100], [0, 1]) }}
      >
        <div className="bg-green-500 text-white p-4 rounded-2xl rotate-12 shadow-xl">
          LIKE
        </div>
      </motion.div>
      <motion.div
        className="absolute top-20 right-8 text-6xl pointer-events-none"
        style={{ opacity: useTransform(x, [-100, 0], [1, 0]) }}
      >
        <div className="bg-red-500 text-white p-4 rounded-2xl -rotate-12 shadow-xl">
          NOPE
        </div>
      </motion.div>
    </motion.div>
  );
}