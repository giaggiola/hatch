'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">Theme</span>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setTheme('light')}
            className={`p-2 rounded-md transition-all ${
              theme === 'light'
                ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Light mode"
          >
            <Sun className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme('dark')}
            className={`p-2 rounded-md transition-all ${
              theme === 'dark'
                ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="Dark mode"
          >
            <Moon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTheme('system')}
            className={`p-2 rounded-md transition-all ${
              theme === 'system'
                ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            title="System preference"
          >
            <Monitor className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
