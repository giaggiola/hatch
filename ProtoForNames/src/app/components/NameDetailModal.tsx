import { X, ExternalLink } from "lucide-react";
import { motion } from "motion/react";

interface NameDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  origin: string;
  onViewFullPage: () => void;
  meaning?: string;
  popularity?: string;
}

export function NameDetailModal({
  isOpen,
  onClose,
  name,
  origin,
  onViewFullPage,
  meaning = "A beautiful and timeless name with deep cultural roots.",
  popularity = "Top 100 in multiple countries",
}: NameDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25 }}
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="text-4xl mb-2">{name}</div>
          <div className="text-lg opacity-90">{origin}</div>
        </div>

        {/* Content - Quick Facts Only */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-pink-50 rounded-xl p-4">
              <div className="text-gray-600 text-sm mb-1">Meaning</div>
              <div className="text-gray-900">{meaning}</div>
            </div>

            <div className="bg-pink-50 rounded-xl p-4">
              <div className="text-gray-600 text-sm mb-1">Popularity</div>
              <div className="text-gray-900">{popularity}</div>
            </div>
          </div>

          {/* View Full Page Button */}
          <button
            onClick={onViewFullPage}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl p-4 hover:from-pink-600 hover:to-rose-600 transition-all flex items-center justify-center gap-2"
          >
            <span>View Full Details</span>
            <ExternalLink className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}