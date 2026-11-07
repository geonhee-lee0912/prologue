import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { authStorage } from '../../lib/auth-storage';
import { useTheme } from '../../theme/use-theme';

/**
 * A01 — Splash
 *
 * 1.2초 후 토큰 보유 여부에 따라 분기.
 * - 토큰 있음 → /friends
 * - 없음 → /a02-intro (서비스 소개 네 장)
 */
export default function A01Splash() {
  const router = useRouter();
  const t = useTheme();

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void authStorage.getAccessToken()
        .then((token) => {
          if (active) router.replace(token ? '/friends' : '/a02-intro');
        })
        .catch(() => {
          if (active) router.replace('/a02-intro');
        });
    }, 1200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        <Image
          source={require('../../assets/brand/splash-pencil-wash.webp')}
          contentFit="fill"
          style={styles.texture}
        />
      </View>
      <Image
        source={require('../../assets/brand/prologue-wordmark-friendly.png')}
        accessibilityLabel="Prologue"
        contentFit="contain"
        style={styles.brand}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    overflow: 'hidden',
  },
  texture: { width: '100%', height: '100%' },
  brand: {
    width: 196,
    height: 54,
  },
});
