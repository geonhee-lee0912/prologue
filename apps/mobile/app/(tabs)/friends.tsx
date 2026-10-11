/**
 * @screen 친구 탭 (첫 화면) — 앱 IA v2 3.1~3.4. 기존 C1 대기 상태의 카운터는 소식(서고 소식)으로
 * 내 프로필(편지 미리보기) → 중요한 일 카드 → 친구(갈피) → 소식.
 * 사람은 이 화면에 들어오지 않는다(하드룰 1). "친구 추가"가 없다.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EventCard } from '../../components/EventCard';
import { FeedCard } from '../../components/FeedCard';
import { GalpiAvatar } from '../../components/GalpiAvatar';
import { Screen, SectionLabel, TabTitle } from '../../components/ui';
import { buildFeed } from '../../domain/feed';
import { type HomeEvent, selectHome } from '../../domain/home';
import { useAppStore } from '../../state/app-store';
import { SPACE } from '../../theme/tokens';
import { useTheme } from '../../theme/use-theme';

export default function FriendsTab() {
  const t = useTheme();
  const router = useRouter();
  const state = useAppStore();
  const now = new Date();
  const { primary, secondary } = selectHome(state, now);
  const feed = buildFeed(state, now);

  const openEvent = (event: HomeEvent) => {
    if (!event.card) return;
    if (event.kind === 'meetingNextDay' && event.meetingConnectionId) {
      state.askMeetingFeedback(event.meetingConnectionId);
    }
    router.push(event.card.href);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TabTitle title="친구" />

        <Pressable accessibilityRole="button" onPress={() => router.push('/me/letter-preview')} style={styles.me}>
          <View style={[styles.meAvatar, { backgroundColor: t.accent.a1 }]}>
            <Text style={styles.meInitial}>{state.userName.slice(0, 1)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.meName, { color: t.ink }]}>{state.userName}</Text>
            <Text style={[styles.meSub, { color: t.sub }]}>내 편지 미리보기 — 상대에게 이렇게 소개돼요</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={t.sub} />
        </Pressable>

        {primary.card ? <EventCard card={primary.card} size="large" onPress={() => openEvent(primary)} /> : null}
        {secondary?.card ? <EventCard card={secondary.card} size="small" onPress={() => openEvent(secondary)} /> : null}

        <SectionLabel>친구</SectionLabel>
        <Pressable accessibilityRole="button" onPress={() => router.push('/galpi/profile')} style={styles.friend}>
          <GalpiAvatar size={46} />
          <View style={styles.flex}>
            <Text style={[styles.friendName, { color: t.ink }]}>갈피</Text>
            <Text numberOfLines={1} style={[styles.friendStatus, { color: t.sub }]}>
              {primary.galpiLine}
            </Text>
          </View>
        </Pressable>

        <SectionLabel>소식</SectionLabel>
        {feed.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: SPACE.xl },
  me: { flexDirection: 'row', alignItems: 'center', gap: SPACE.m, paddingHorizontal: SPACE.l, paddingVertical: SPACE.m },
  meAvatar: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  meInitial: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  meName: { fontSize: 15, fontWeight: '700' },
  meSub: { fontSize: 12, marginTop: 2 },
  friend: { flexDirection: 'row', alignItems: 'center', gap: SPACE.m, paddingHorizontal: SPACE.l, paddingVertical: SPACE.s },
  friendName: { fontSize: 15, fontWeight: '600' },
  friendStatus: { fontSize: 13, marginTop: 2 },
});
