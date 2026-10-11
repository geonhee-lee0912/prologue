/**
 * @screen 가벼운 소개 시트 (새로) — 앱 IA v2 4.1, 4.3, 4.4
 * 사진 중심, 한 장씩. 확신이 덜하다고 솔직히 말한다. 남은 개수를 숫자로 보여주지 않는다(하드룰 3).
 * 넘긴 한마디는 선택이고 상대에게 전달되지 않는다. 나가기를 켠 사람끼리만 주고받는다(양쪽 동의).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Photo } from '../components/Photo';
import { Button, GalpiText, Header, Screen } from '../components/ui';
import { currentLightIntro } from '../domain/light-intros';
import { useAppStore } from '../state/app-store';
import { RADIUS, SPACE } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';

const REASONS = ['분위기가 달라요', '사진만으론 모르겠어요', '생활권이 멀어요'] as const;

export default function LightIntroSheet() {
  const t = useTheme();
  const router = useRouter();
  const intros = useAppStore((s) => s.lightIntros);
  const settings = useAppStore((s) => s.settings);
  const userName = useAppStore((s) => s.userName);
  const answerLightIntro = useAppStore((s) => s.answerLightIntro);
  const [passing, setPassing] = useState(false);

  const now = new Date();
  const current = currentLightIntro({ lightIntros: intros, settings }, now);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/galpi/chat'));
  const pass = (reason?: string) => {
    if (!current) return;
    answerLightIntro(current.id, 'pass', reason);
    setPassing(false);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="가벼운 소개" onBack={close} />
      {!settings.lightIntroExposure ? (
        <View style={styles.pad}>
          {/* 양쪽 동의 (앱 IA 4.4). 사실만 알리고 켜라고 권하지 않는다 — 노출은 본인이 정한다 (하드룰 3) */}
          <Text style={[styles.caption, { color: t.sub }]}>
            가벼운 소개는 ‘가벼운 소개에 나가기’를 켠 분끼리 주고받아요. 설정 탭에서 켜고 끌 수 있어요.
          </Text>
          <View style={styles.row}>
            <Button label="닫기" onPress={close} />
          </View>
        </View>
      ) : !current ? (
        <View style={styles.pad}>
          <GalpiText>오늘은 여기까지예요. 또 보여드릴 분이 생기면 말할게요 🙂</GalpiText>
          <View style={styles.row}>
            <Button label="닫기" onPress={close} />
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.pad}>
          <Text style={[styles.caption, { color: t.sub }]}>
            확신은 덜해요. {userName} 님 취향을 더 알고 싶어서 보여드려요
          </Text>
          <Photo uri={current.photoUri} name={current.name} height={320} />
          <Text style={[styles.meta, { color: t.ink }]}>
            {current.age} · {current.area}
          </Text>
          <GalpiText>{current.oneLine}</GalpiText>
          {passing ? (
            <View style={styles.gap}>
              <Text style={[styles.caption, { color: t.sub }]}>한마디 남길까요? 상대에게는 전달되지 않아요</Text>
              <View style={styles.chips}>
                {REASONS.map((r) => (
                  <Pressable
                    key={r}
                    accessibilityRole="button"
                    onPress={() => pass(r)}
                    style={[styles.chip, { borderColor: t.line, backgroundColor: t.card }]}
                  >
                    <Text style={{ color: t.ink }}>{r}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.row}>
                <Button variant="secondary" label="그냥 넘길게요" onPress={() => pass()} />
              </View>
            </View>
          ) : (
            <View style={styles.row}>
              <Button variant="secondary" label="넘기기" onPress={() => setPassing(true)} />
              <Button label="이야기 나눠볼게요" onPress={() => answerLightIntro(current.id, 'accept')} />
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: SPACE.l, gap: SPACE.m },
  gap: { gap: SPACE.s },
  row: { flexDirection: 'row', gap: SPACE.s },
  caption: { fontSize: 13, lineHeight: 19 },
  meta: { fontSize: 16, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s },
  chip: { borderWidth: 1, borderRadius: RADIUS.chip, paddingVertical: SPACE.s, paddingHorizontal: SPACE.m },
});
