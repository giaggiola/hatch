'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/swipe', icon: '👶', label: 'Swipe' },
  { href: '/explore', icon: '🔍', label: 'Explore' },
  { href: '/history', icon: '💕', label: 'History' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
];

interface BottomNavProps {
  inline?: boolean;
}

export default function BottomNav({ inline = false }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className={`${inline ? '' : 'fixed bottom-0 left-0 right-0'} bg-white dark:bg-gray-800 ${inline ? '' : 'border-t border-gray-200 dark:border-gray-700'} pb-safe`}>
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors rounded-xl mx-1 ${
                isActive
                  ? 'text-pink-600 bg-pink-50 dark:bg-pink-900/30 dark:text-pink-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
