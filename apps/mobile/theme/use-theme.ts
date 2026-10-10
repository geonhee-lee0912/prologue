import { useAppStore } from '../state/app-store';
import { BASE, type Palette, PALETTES } from './tokens';

export type Theme = typeof BASE & { accent: Palette };

export function useTheme(): Theme {
  const key = useAppStore((s) => s.palette);
  return { ...BASE, accent: PALETTES[key] };
}
