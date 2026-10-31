import { StyleSheet, Text, View } from 'react-native';

/**
 * 이야기 (TAB-2, IA v0.3) — 가칭
 *
 * 순수 무료 피드(성역). 익명 이야기 조각 피드, 긍정 반응만,
 * 상호 반응 시 신원 공개 → 관심 진입로.
 * 백엔드 미구현 — 현재는 빈 상태 placeholder.
 */
export default function Story() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>이야기</Text>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>아직 준비 중이에요</Text>
        <Text style={styles.emptyHint}>
          곧 다른 분들의 이야기 조각을 만나볼 수 있어요.
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
