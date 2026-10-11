/**
 * @screen 대화 탭 — 앱 IA v2 6장
 * 갈피는 맨 위 고정(새 말은 점만). 사람은 서로 수락한 분만, 안 읽은 수는 나에게만.
 * 끝난 연결은 "지난 대화"로, 사진 없이 이름만.
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GalpiAvatar } from '../../components/GalpiAvatar';
import { Photo } from '../../components/Photo';
import { Empty, Screen, SectionLabel, TabTitle } from '../../components/ui';
import { buildChatList } from '../../domain/chat-list';
import { useAppStore } from '../../state/app-store';
import { RADIUS, SPACE } from '../../theme/tokens';
import { useTheme } from '../../theme/use-theme';

export default function ChatsTab() {
  const t = useTheme();
  const router = useRouter();
  const state = useAppStore();
  const list = buildChatList(state);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TabTitle title="대화" />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/galpi/chat')}
          style={[styles.row, styles.galpiRow, { backgroundColor: t.accent.soft }]}
        >
          <GalpiAvatar size={46} />
          <View style={styles.flex}>
            <Text style={[styles.name, { color: t.ink }]}>갈피</Text>
            <Text numberOfLines={1} style={[styles.preview, { color: t.sub }]}>
              {list.galpi.preview}
            </Text>
          </View>
          {list.galpi.hasNew ? <View accessibilityLabel="새 말" style={[styles.dot, { backgroundColor: t.dot }]} /> : null}
        </Pressable>

        {list.active.length === 0 ? (
          <Empty text="아직 연결된 분이 없어요. 갈피가 편지를 쓰면 여기에 대화가 생겨요." />
        ) : null}

        {list.active.map((row) => (
          <Pressable key={row.id} accessibilityRole="button" onPress={() => router.push(`/chat/${row.id}`)} style={styles.row}>
            <Photo uri={row.photoUri} name={row.name} height={46} width={46} rounded={17} />
            <View style={styles.flex}>
              <Text style={[styles.name, { color: t.ink }]}>{row.name} 님</Text>
              <Text numberOfLines={1} style={[styles.preview, { color: t.sub }]}>
                {row.preview}
              </Text>
            </View>
            {row.unreadCount > 0 ? (
              <Text style={[styles.badge, { backgroundColor: t.dot }]}>{row.unreadCount}</Text>
            ) : null}
          </Pressable>
        ))}

        {list.past.length > 0 ? (
          <>
            <SectionLabel>지난 대화</SectionLabel>
            {list.past.map((row) => (
              <Pressable key={row.id} accessibilityRole="button" onPress={() => router.push(`/chat/${row.id}`)} style={styles.row}>
                <Text style={[styles.pastName, { color: t.sub }]}>{row.name} 님</Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: SPACE.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.m, paddingHorizontal: SPACE.l, paddingVertical: SPACE.s },
  galpiRow: { marginHorizontal: SPACE.s, borderRadius: RADIUS.card, paddingHorizontal: SPACE.s },
  name: { fontSize: 15, fontWeight: '600' },
  preview: { fontSize: 13, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', borderRadius: 9, minWidth: 18, textAlign: 'center', paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden' },
  pastName: { fontSize: 14 },
});
