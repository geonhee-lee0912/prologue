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
import { ApiError, api, type RecommendationCard } from '../lib/api';
import { authStorage } from '../lib/auth-storage';

/**
 * D01 — 오늘의 프롤로그 (홈)
 *
 * 백엔드 GET /me/recommendations 호출 → 카드 리스트.
 * 카드 탭 → /recommendations/[id] (D02 + D03 통합 상세).
 */
export default function Home() {
  const router = useRouter();
  const [cards, setCards] = useState<RecommendationCard[]>([]);
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
      const list = await api.listRecommendations(token);
      setCards(list);
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

  async function onLogout() {
    const token = await authStorage.getAccessToken();
    try {
      if (token) await api.logout(token);
    } catch {
      // ignore
    }
    await authStorage.clear();
    router.replace('/a03-login');
  }

  if (loading && cards.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>오늘의 프롤로그</Text>
        <Text style={styles.subtitle}>
          {cards.length > 0 ? `${cards.length}분이 도착했어요` : '아직 도착한 추천이 없어요'}
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={cards}
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
            <Text style={styles.emptyTitle}>아직 추천이 없어요</Text>
            <Text style={styles.emptyHint}>
              프로필을 더 채우면 좋은 분이 도착할 가능성이 높아져요.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/profile-edit')}
            >
              <Text style={styles.primaryButtonText}>프로필 편집</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: '/recommendations/[id]', params: { id: item.id } })}
          >
            <View style={styles.cardPhoto}>
              {item.target.mainPhotoUrl ? (
                <Image source={{ uri: item.target.mainPhotoUrl }} style={styles.cardImage} />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Text style={styles.cardImagePlaceholderText}>사진 없음</Text>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.reason.summary}</Text>
              {item.reason.matchedPoints.slice(0, 2).map((p, i) => (
                <Text key={i} style={styles.cardPoint}>
                  · {p}
                </Text>
              ))}
              <View style={styles.badgeRow}>
                {item.target.badges.identityVerified && <Badge text="본인" />}
                {item.target.badges.faceMatchVerified && <Badge text="얼굴" />}
                {item.target.badges.employmentVerified && <Badge text="직업" />}
              </View>
            </View>
          </Pressable>
        )}
      />

      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomButton} onPress={() => router.push('/profile-edit')}>
          <Text style={styles.bottomButtonText}>내 프로필</Text>
        </Pressable>
        <Pressable style={styles.bottomButton} onPress={onLogout}>
          <Text style={[styles.bottomButtonText, { color: '#999' }]}>로그아웃</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 50, paddingBottom: 12 },
  brand: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, color: '#333', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 20 },
  error: { color: '#C00', textAlign: 'center', marginVertical: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  cardPhoto: { width: 100, height: 130 },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  cardImagePlaceholderText: { color: '#999', fontSize: 11 },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 6 },
  cardPoint: { fontSize: 12, color: '#555', marginBottom: 2 },
  badgeRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
  badge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, color: '#555' },
  bottomBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
  },
  bottomButton: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  bottomButtonText: { fontSize: 13, color: '#333' },
  primaryButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  primaryButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});
