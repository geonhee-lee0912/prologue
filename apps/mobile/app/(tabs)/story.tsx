/**
 * @screen 내 이야기 탭 ("지은 님의 서고") — 앱 IA v2 7장. 기존 C3 리포트
 * 책장, 오늘의 취향 카드, 제가 읽은 당신, 갈피가 발견한 것, 갈피가 기억하는 것(보기·빼기).
 * 세계관 이름(서고)은 탭 이름이 아니라 이 화면 안에서만 쓴다.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TasteCardView } from '../../components/TasteCardView';
import { Card, Empty, GalpiText, Screen, SectionLabel, TabTitle } from '../../components/ui';
import { localDateKey } from '../../domain/time';
import { useAppStore } from '../../state/app-store';
import { SPACE } from '../../theme/tokens';
import { useTheme } from '../../theme/use-theme';

export default function StoryTab() {
  const t = useTheme();
  const state = useAppStore();
  const [confirming, setConfirming] = useState<string | null>(null);
  const today = localDateKey(new Date());
  const todayCard = state.tasteCards.find((c) => c.date === today);
  const picked = state.tasteCards.flatMap((c) => (c.picked === null ? [] : [c.options[c.picked]]));

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TabTitle title="내 이야기" />
        <GalpiText style={styles.archiveTitle}>{state.userName} 님의 서고</GalpiText>

        <SectionLabel>책장</SectionLabel>
        {state.chapters.length === 0 ? (
          <Empty text="갈피와 이야기를 나누면 여기에 장이 꽂혀요." />
        ) : (
          state.chapters.map((c) => (
            <Card key={c.id}>
              <Text style={[styles.body, { color: t.ink }]}>📖 {c.title}</Text>
            </Card>
          ))
        )}

        <SectionLabel>오늘의 취향 카드</SectionLabel>
        {todayCard ? (
          <Card>
            <TasteCardView card={todayCard} onPick={(p) => state.pickTasteCard(todayCard.id, p)} />
          </Card>
        ) : (
          <Empty text="오늘의 카드는 아직 없어요." />
        )}
        {picked.length > 0 ? (
          <Text style={[styles.collected, { color: t.sub }]}>고른 장면 · {picked.join(' · ')}</Text>
        ) : null}

        <SectionLabel>제가 읽은 당신</SectionLabel>
        {state.interview.completed ? (
          <Card>
            <GalpiText>
              {state.userName} 님은 천천히 걷는 주말을 좋아하고, 조용히 곁에 있어 주는 사람에게 마음이 열리는 분이에요.
              말보다 시간을 함께 보내는 걸로 가까워지는 편이고요.
            </GalpiText>
            <GalpiText style={[styles.sign, { color: t.sub }]}>갈피 드림</GalpiText>
          </Card>
        ) : (
          <Empty text="이야기를 끝까지 들려주면 갈피가 편지를 써요." />
        )}

        <SectionLabel>갈피가 발견한 것</SectionLabel>
        <Empty text="만난 뒤 이야기가 쌓이면 여기에 생겨요." />

        <SectionLabel>갈피가 기억하는 것</SectionLabel>
        {state.chapters.map((c) => (
          <Card key={`memory-${c.id}`}>
            <View style={styles.memoryRow}>
              <Text style={[styles.flex, styles.body, { color: t.ink }]}>{c.title}</Text>
              {confirming === c.id ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    state.removeChapter(c.id);
                    setConfirming(null);
                  }}
                >
                  <Text style={[styles.danger, { color: t.dot }]}>정말 뺄게요</Text>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => setConfirming(c.id)}>
                  <Text style={[styles.link, { color: t.sub }]}>갈피 빼기</Text>
                </Pressable>
              )}
            </View>
          </Card>
        ))}
        <Text style={[styles.collected, { color: t.sub }]}>갈피를 빼면 그 장은 다시 펼치지 않아요.</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: SPACE.xl },
  archiveTitle: { fontSize: 18, paddingHorizontal: SPACE.l },
  body: { fontSize: 14, lineHeight: 20 },
  collected: { fontSize: 12, paddingHorizontal: SPACE.l, lineHeight: 18 },
  sign: { textAlign: 'right', marginTop: SPACE.s },
  memoryRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.s },
  link: { fontSize: 12, textDecorationLine: 'underline' },
  danger: { fontSize: 12, fontWeight: '700' },
});
