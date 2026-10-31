import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ApiError,
  api,
  type ConversationListItem,
  type SentInterest,
} from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';

/**
 * 이어짐 (TAB-3, IA v0.3) — 가칭
 *
 * 관심~대화를 한 퍼널로 묶은 섹션 스택 (MERGE-1, 통합설계 §3):
 *  ① 새로 받은 관심  ← 결정 대기 (백엔드 미구현, 준비 중)
 *  ② 대화 중         ← 매칭 진행 중 방 목록 (핵심)
 *  ③ 보낸 관심       ← 상대 응답 대기
 * 대화방은 이 목록 위에 뜨는 전체화면(/conversations/[id]).
 */
export default function Connections() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [sent, setSent] = useState<SentInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      router.replace('/a03-login');
      return;
    }
    try {
      const [convs, interests] = await Promise.all([
        api.listMyConversations(token),
        api.listSentInterests(token),
      ]);
      setConversations(convs);
      setSent(interests);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await authStorage.clear();
        router.replace('/a03-login');
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading && conversations.length === 0 && sent.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
        />
      }
    >
      <Text style={styles.brand}>이어짐</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {/* ① 새로 받은 관심 — 백엔드 미구현 */}
      <Section label="새로 받은 관심">
        <Text style={styles.mutedNote}>곧 받은 관심을 여기서 확인할 수 있어요.</Text>
      </Section>

      {/* ② 대화 중 */}
      <Section label="대화 중">
        {conversations.length === 0 ? (
          <Text style={styles.mutedNote}>아직 이어진 대화가 없어요.</Text>
        ) : (
          conversations.map((item) => (
            <Pressable
              key={item.id}
              style={styles.card}
              onPress={() =>
                router.push({ pathname: '/conversations/[id]', params: { id: item.id } })
              }
            >
              <View style={styles.photoBoxSm}>
                {item.peer.mainPhotoUrl ? (
                  <Image source={{ uri: item.peer.mainPhotoUrl }} style={styles.photo} />
                ) : (
                  <View style={[styles.photo, styles.photoFallback]} />
                )}
              </View>
              <View style={styles.body}>
                <View style={styles.row}>
                  <Text style={styles.peerName}>
                    {item.peer.region1}
                    {item.peer.jobCategory ? ` · ${item.peer.jobCategory}` : ''}
                  </Text>
                  {item.status === 'active' && (
                    <Text style={styles.daysLeft}>{item.daysLeft}일 남음</Text>
                  )}
                  {item.status === 'expired' && (
                    <Text style={[styles.daysLeft, { color: '#999' }]}>만료</Text>
                  )}
                </View>
                <Text style={styles.lastMsg} numberOfLines={1}>
                  {item.lastMessage
                    ? item.lastMessage.messageType.startsWith('system')
                      ? `[안내] ${item.lastMessage.content}`
                      : item.lastMessage.content
                    : '아직 메시지가 없어요'}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </Section>

      {/* ③ 보낸 관심 */}
      <Section label="보낸 관심">
        {sent.length === 0 ? (
          <Text style={styles.mutedNote}>아직 관심을 보낸 분이 없어요.</Text>
        ) : (
          sent.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.photoBox}>
                {item.target.mainPhotoUrl ? (
                  <Image source={{ uri: item.target.mainPhotoUrl }} style={styles.photo} />
                ) : (
                  <View style={[styles.photo, styles.photoFallback]} />
                )}
              </View>
              <View style={styles.body}>
                <Text style={styles.peerName}>
                  {item.target.region1}
                  {item.target.region2 ? ` ${item.target.region2}` : ''}
                </Text>
                {item.target.jobCategory && (
                  <Text style={styles.meta}>{item.target.jobCategory}</Text>
                )}
                {item.target.isMatched ? (
                  <View style={[styles.statusBadge, styles.matched]}>
                    <Text style={styles.statusBadgeText}>첫문장이 이어졌어요</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.waiting]}>
                    <Text style={styles.statusBadgeText}>응답 대기</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </Section>
    </ScrollView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  brand: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  error: { color: '#C00', marginVertical: 8 },
  section: { marginTop: 20 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 10 },
  mutedNote: { fontSize: 13, color: '#AAA', paddingVertical: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  photoBox: { width: 80, height: 110 },
  photoBoxSm: { width: 60, height: 60 },
  photo: { width: '100%', height: '100%' },
  photoFallback: { backgroundColor: '#EEE' },
  body: { flex: 1, padding: 12, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  peerName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', flex: 1 },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
  daysLeft: { fontSize: 11, color: '#2D6FBE' },
  lastMsg: { fontSize: 12, color: '#666', marginTop: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  matched: { backgroundColor: '#E8F5EA' },
  waiting: { backgroundColor: '#F0F0F0' },
});
