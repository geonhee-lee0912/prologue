import { Image } from 'expo-image';
import { GALPI_AVATAR, GALPI_EXPRESSIONS } from '../assets/galpi';
import type { Expression } from '../domain/types';

export function GalpiAvatar({ size = 44, expression }: { size?: number; expression?: Expression }) {
  return (
    <Image
      accessibilityLabel="갈피"
      source={expression ? GALPI_EXPRESSIONS[expression] : GALPI_AVATAR}
      style={{ width: size, height: size, borderRadius: size * 0.36 }}
      contentFit="cover"
    />
  );
}
