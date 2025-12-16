// Storage keys
export const STORAGE_KEYS = {
  SWIPE_STATE: 'swipe_state_v2',
  SWIPE_HINT_DISMISSED: 'swipe_hint_dismissed',
  TOKEN: 'token',
} as const;

// Gender options
export const GENDERS = [
  { value: 'M', label: 'Boy' },
  { value: 'F', label: 'Girl' },
  { value: 'U', label: 'Unisex' },
] as const;

export type Gender = 'M' | 'F' | 'U';
