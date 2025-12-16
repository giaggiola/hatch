import { NameWithSimilar } from '@/lib/api';
import { STORAGE_KEYS } from '@/lib/constants';

interface SavedSwipeState {
  names: NameWithSimilar[];
  currentIndex: number;
  selectedVariants: [string, string[]][];  // Serialized Map<nameId, Set<similarId>>
}

export function saveSwipeState(
  names: NameWithSimilar[],
  currentIndex: number,
  selectedVariants: Map<string, Set<string>>
): void {
  if (typeof window === 'undefined') return;

  const state: SavedSwipeState = {
    names,
    currentIndex,
    selectedVariants: Array.from(selectedVariants.entries()).map(([k, v]) => [k, Array.from(v)]),
  };
  sessionStorage.setItem(STORAGE_KEYS.SWIPE_STATE, JSON.stringify(state));
}

export function loadSwipeState(): SavedSwipeState | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = sessionStorage.getItem(STORAGE_KEYS.SWIPE_STATE);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading swipe state:', e);
  }
  return null;
}

export function clearSwipeState(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(STORAGE_KEYS.SWIPE_STATE);
}

export function restoreSelectedVariants(
  savedVariants: [string, string[]][]
): Map<string, Set<string>> {
  const restoredSelections = new Map<string, Set<string>>();
  savedVariants.forEach(([k, v]) => {
    restoredSelections.set(k, new Set(v));
  });
  return restoredSelections;
}

export function initializeSelections(
  names: NameWithSimilar[]
): Map<string, Set<string>> {
  const initialSelections = new Map<string, Set<string>>();
  names.forEach((name) => {
    initialSelections.set(name.id, new Set());
  });
  return initialSelections;
}
