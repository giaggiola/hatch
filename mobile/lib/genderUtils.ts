import { Colors } from '@/constants/theme';

export type Gender = 'M' | 'F' | 'U';

export function getGenderIcon(gender?: string): string {
  switch (gender) {
    case 'M':
      return '♂';
    case 'F':
      return '♀';
    default:
      return '◎';
  }
}

export function getGenderColor(
  gender: string | undefined,
  colors: typeof Colors.light
): string {
  switch (gender) {
    case 'M':
      return '#3b82f6'; // blue
    case 'F':
      return colors.primary; // pink from theme
    default:
      return '#8b5cf6'; // purple for unisex
  }
}

export function getGenderLabel(gender?: string): string {
  switch (gender) {
    case 'M':
      return 'Boy';
    case 'F':
      return 'Girl';
    default:
      return 'Unisex';
  }
}
