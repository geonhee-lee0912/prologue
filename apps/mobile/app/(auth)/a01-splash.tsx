import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { authStorage } from '../../lib/auth-storage';

/**
 * A01 — Splash
 *
 * 1.2초 후 토큰 보유 여부에 따라 분기.
 * - 토큰 있음 → /home
 * - 없음 → /a03-login
 */
export default function A01Splash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const token = await authStorage.getAccessToken();
      router.replace(token ? '/home' : '/a03-login');
    }, 1200);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>프롤로그</Text>
      <Text style={styles.tagline}>좋은 만남은, 좋은 첫문장에서 시작됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  brand: {
    fontSize: 40,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 20,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
