import { StyleSheet, Text, View } from 'react-native';

/**
 * A01 — Splash
 *
 * 화면 ID: A01
 * 첫 진입 화면. 추후 자동 로그인 검사 → 다음 화면 라우팅으로 확장.
 */
export default function A01Splash() {
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
