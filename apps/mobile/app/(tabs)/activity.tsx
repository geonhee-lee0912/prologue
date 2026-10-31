import { StyleSheet, Text, View } from 'react-native';

/**
 * 활동 (TAB-4, IA v0.3) — 가칭
 *
 * 참여형 프로그램이 들고 나는 확장 수익 선반 (이야기 라운드 등).
 * 백엔드·상품 미구현 — 현재는 빈 상태 placeholder.
 */
export default function Activity() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>활동</Text>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>아직 준비 중이에요</Text>
        <Text style={styles.emptyHint}>
          함께 참여할 수 있는 프로그램을 준비하고 있어요.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 20, paddingTop: 50, paddingBottom: 12 },
  brand: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, color: '#333', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#888', textAlign: 'center' },
});
