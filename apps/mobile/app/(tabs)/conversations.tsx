import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ApiError, api, type ConversationListItem } from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';

/**
 * G01 — 대화 목록
 */
export default function Conversations() {
  const router = useRouter();
  const [items, setItems] = useState<ConversationListItem[]>([]);
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
      const list = await api.listMyConversations(token);
      setItems(list);
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

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ 뒤로</Text>
        </Pressable>
        <Text style={styles.title}>대화</Text>
        <Text style={styles.subtitle}>{items.length}건</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={items}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              아직 매칭된 대화가 없어요.{'\n'}추천에서 관심을 보내보세요.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: '/conversations/[id]', params: { id: item.id } })}
          >
            <View style={styles.photoBox}>
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
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 50 },
  back: { color: '#666', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
  error: { color: '#C00', textAlign: 'center', marginVertical: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  photoBox: { width: 60, height: 60 },
  photo: { width: '100%', height: '100%' },
  photoFallback: { backgroundColor: '#EEE' },
  body: { flex: 1, padding: 12, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  peerName: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', flex: 1 },
  daysLeft: { fontSize: 11, color: '#2D6FBE' },
  lastMsg: { fontSize: 12, color: '#666', marginTop: 4 },
});
