'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Name } from '@/lib/api';

interface MatchModalProps {
  name: Name | null;
  familyName?: string;
  onClose: () => void;
}

export default function MatchModal({ name, familyName, onClose }: MatchModalProps) {
  if (!name) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl p-8 max-w-sm w-full text-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            className="text-6xl mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.2 }}
          >
            🎉
          </motion.div>

          <h2 className="text-3xl font-bold text-primary-600 mb-2">
            It&apos;s a Match!
          </h2>

          <p className="text-gray-600 mb-6">
            You and your partner both liked this name
          </p>

          <div className="bg-primary-50 rounded-2xl p-6 mb-6">
            <p className="text-4xl font-bold text-gray-900 mb-2">{name.name}</p>
            {familyName && (
              <p className="text-xl text-gray-600">
                {name.name} {familyName}
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full bg-primary-500 text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary-600 transition-colors"
          >
            Keep Swiping
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
