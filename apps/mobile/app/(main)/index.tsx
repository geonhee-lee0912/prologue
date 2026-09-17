import { StyleSheet, Text, View } from 'react-native';

/**
 * 주선자 대화창 (앱의 루트)
 *
 * 화면 흐름 설계 0.5 — 탭을 두지 않는다. 인터뷰·매일 대화·소개·넘긴 이유·
 * 만난 뒤 피드백이 전부 이 대화창 안에서 일어난다.
 * 하드룰 1(진열 금지)을 구조로 강제하기 위한 선택이다.
 *
 * 구현 예정. 지금은 자리만 잡아둔다.
 */
export default function MatchmakerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>주선자</Text>
      <Text style={styles.body}>
        여기가 앱의 루트입니다. 인터뷰, 매일 대화, 소개가 모두 이 화면에서
        일어납니다. 아직 구현 전입니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, opacity: 0.7 },
});
