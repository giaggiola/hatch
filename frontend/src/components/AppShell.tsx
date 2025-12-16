'use client';

import BottomNav from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  /** Whether to show the bottom navigation */
  showNav?: boolean;
  /** Custom className for the main content area */
  className?: string;
  /** Whether the content should fill available height (useful for swipe cards) */
  fillHeight?: boolean;
}

/**
 * AppShell provides consistent layout structure across the app.
 * It handles:
 * - Bottom navigation with proper safe area spacing
 * - Content area with appropriate padding to avoid nav overlap
 * - Flexible height management for different page types
 */
export default function AppShell({
  children,
  showNav = true,
  className = '',
  fillHeight = false,
}: AppShellProps) {
  return (
    <div className={`min-h-screen ${fillHeight ? 'flex flex-col' : ''}`}>
      {/* Main content area - pb-20 accounts for bottom nav height (h-16 + safe area) */}
      <div
        className={`${showNav ? 'pb-20' : ''} ${fillHeight ? 'flex-1 flex flex-col' : ''} ${className}`}
      >
        {children}
      </div>

      {/* Bottom Navigation */}
      {showNav && <BottomNav />}
    </div>
  );
}
