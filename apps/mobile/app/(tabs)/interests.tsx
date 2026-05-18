import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ApiError, api, type SentInterest } from '../lib/api';
import { authStorage } from '../lib/auth-storage';

/**
 * E04 — 관심 목록
 *
 * MVP: 보낸 관심만. 받은 관심 (E05) 은 Plus 차별화 후보로 후순위.
 */
export default function Interests() {
  const router = useRouter();
  const [items, setItems] = useState<SentInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      router.replace('/a03-login');
      return;
    }
    try {
      const list = await api.listSentInterests(token);
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
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
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
        <Text style={styles.title}>보낸 관심</Text>
        <Text style={styles.subtitle}>{items.length}건</Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>아직 관심을 보낸 분이 없어요.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.photoBox}>
              {item.target.mainPhotoUrl ? (
                <Image source={{ uri: item.target.mainPhotoUrl }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.photoFallback]} />
              )}
            </View>
            <View style={styles.body}>
              <Text style={styles.region}>
                {item.target.region1}
                {item.target.region2 ? ` ${item.target.region2}` : ''}
              </Text>
              {item.target.jobCategory && (
                <Text style={styles.meta}>{item.target.jobCategory}</Text>
              )}
              {item.target.intro && (
                <Text style={styles.intro} numberOfLines={2}>
                  {item.target.intro}
                </Text>
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
  emptyText: { fontSize: 14, color: '#888' },
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
  photoBox: { width: 80, height: 110 },
  photo: { width: '100%', height: '100%' },
  photoFallback: { backgroundColor: '#EEE' },
  body: { flex: 1, padding: 12 },
  region: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  meta: { fontSize: 12, color: '#666', marginTop: 2 },
  intro: { fontSize: 12, color: '#555', marginTop: 4, lineHeight: 18 },
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
