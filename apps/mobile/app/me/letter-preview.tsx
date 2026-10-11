/**
 * @screen 내 편지 미리보기 — 앱 IA v2 3.1 ① "상대에게는 이렇게 소개돼요"
 * 진열되지 않는다는 안심 + 사진·정보를 다듬을 동기. 갈피에게 한 말은 실리지 않는다(하드룰 2).
 */
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from '../../components/AppText';
import { LetterView } from '../../components/LetterView';
import { Header, Screen } from '../../components/ui';
import type { LetterProfile } from '../../domain/types';
import { useAppStore } from '../../state/app-store';
import { SPACE } from '../../theme/tokens';
import { useTheme } from '../../theme/use-theme';

export default function LetterPreviewScreen() {
  const t = useTheme();
  const router = useRouter();
  const userName = useAppStore((s) => s.userName);
  const me = useAppStore((s) => s.me);
  const profile: LetterProfile = {
    name: userName,
    photoUri: null,
    ...me,
    why: '이 자리에는 갈피가 받는 분에게 맞춰 "왜 이 분인가"를 써요. 받는 사람마다 내용이 달라져요.',
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="내 편지 미리보기" onBack={() => (router.canGoBack() ? router.back() : router.replace('/friends'))} />
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={[styles.note, { color: t.sub }]}>
          상대에게는 이렇게 소개돼요. 갈피에게 한 말은 그대로 실리지 않고, 조건 정보는 허락한 것만 담겨요.
        </Text>
        <LetterView profile={profile} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: SPACE.l, gap: SPACE.m },
  note: { fontSize: 13, lineHeight: 19 },
});
