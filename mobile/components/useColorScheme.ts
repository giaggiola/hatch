import { useContext } from 'react';
import { useColorScheme as useSystemColorScheme, ColorSchemeName } from 'react-native';

// Import the context directly to avoid circular dependencies
import { ThemeContext } from '@/contexts/ThemeContext';

/**
 * Custom hook that returns the effective color scheme.
 * Uses ThemeContext when available, falls back to system color scheme otherwise.
 */
export function useColorScheme(): ColorSchemeName {
  const systemColorScheme = useSystemColorScheme();

  // Try to use the ThemeContext if available
  try {
    const themeContext = useContext(ThemeContext);
    if (themeContext) {
      return themeContext.effectiveColorScheme;
    }
  } catch {
    // ThemeContext not available, use system color scheme
  }

  return systemColorScheme;
}
