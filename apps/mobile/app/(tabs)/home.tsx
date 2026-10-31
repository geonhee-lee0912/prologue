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
import { ApiError, api, type RecommendationCard } from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';
import { routeForStep } from '../../lib/onboarding-route';

/**
 * D01 — 오늘의 프롤로그 (홈) · 책방/사서 컨셉 (HOME v1)
 *
 * 설계: docs/superpowers/specs/2026-07-10-홈-책방컨셉-진열대-design.md
 * - 사서는 목소리로만 (상단 인사 + 진열대 안내판 + 책마다 띠지 메모)
 * - 진열대(택1 틀)가 세로로 쌓임. 각 틀 = 2권, 이 중 한 분께.
 * - 표지 = 텍스트 제목 + 진한 블러 대표사진 배경 + 최소 메타·배지.
 * - 백엔드에 아직 "책 제목"·"세트" 개념이 없어, intro를 제목 대용으로 쓰고
 *   추천 목록을 2권씩 진열대로 묶어 보여준다(프리뷰).
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
      const status = await api.getOnboardingStatus(token);
      if (status.nextStep !== 'completed') {
        router.replace(routeForStep(status.nextStep) as never);
        return;
      }
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

  if (loading && cards.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  // 추천을 2권씩 진열대로 묶는다. 첫 진열대 = 오늘의 진열, 이후 = 청하신 한 묶음.
  const shelves: RecommendationCard[][] = [];
  for (let i = 0; i < cards.length; i += 2) {
    shelves.push(cards.slice(i, i + 2));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
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
      <View style={styles.header}>
        <Text style={styles.brand}>오늘의 프롤로그</Text>
        <Text style={styles.greeting}>
          {shelves.length > 0
            ? '책방지기가 오늘 두 분을 골라 두었어요. 천천히 읽어보세요.'
            : ''}
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {shelves.length === 0 ? (
        <EmptyShelf onTune={() => router.push('/profile-edit')} />
      ) : (
        shelves.map((pair, idx) => (
          <Shelf
            key={pair.map((c) => c.id).join('-')}
            title={idx === 0 ? '오늘의 진열' : '청하신 한 묶음'}
            icon={idx === 0 ? '📚' : '📖'}
            pair={pair}
            onOpen={(id) =>
              router.push({ pathname: '/recommendations/[id]', params: { id } })
            }
          />
        ))
      )}

      {shelves.length > 0 && (
        <Pressable style={styles.moreBox} onPress={() => {}}>
          <View>
            <Text style={styles.moreTitle}>한 묶음 더 청하기</Text>
            <Text style={styles.moreHint}>사서에게 두 분을 더 부탁해요</Text>
          </View>
          <Text style={styles.coin}>◎ 재화 1</Text>
        </Pressable>
      )}

      {shelves.length > 0 && (
        <View style={styles.corner}>
          <Text style={styles.cornerLabel}>사서 코너</Text>
          <Pressable style={styles.cornerRow} onPress={() => {}}>
            <Text style={styles.cornerText}>왜 이런 책이 왔을까요</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable style={styles.cornerRow} onPress={() => router.push('/profile-edit')}>
            <Text style={styles.cornerText}>취향 다듬기 · 인증 더하기</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// 진열대 = 택1 틀. 두 권을 뚜렷한 패널로 감싸 "이 중 한 분께"를 드러낸다.
function Shelf({
  title,
  icon,
  pair,
  onOpen,
}: {
  title: string;
  icon: string;
  pair: RecommendationCard[];
  onOpen: (id: string) => void;
}) {
  return (
    <View style={styles.shelf}>
      <View style={styles.shelfHead}>
        <Text style={styles.shelfIcon}>{icon}</Text>
        <Text style={styles.shelfTitle}>{title}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.shelfRule}>이 중 한 분께</Text>
      </View>

      {pair.map((card, i) => (
        <View key={card.id}>
          <BookCover card={card} onPress={() => onOpen(card.id)} />
          {i === 0 && pair.length > 1 && (
            <View style={styles.orDiv}>
              <View style={styles.orLine} />
              <Text style={styles.orChip}>또는</Text>
              <View style={styles.orLine} />
            </View>
          )}
        </View>
      ))}

      <View style={styles.shelfFoot}>
        <Text style={styles.footHint}>표지를 펼쳐 읽고 한 분을 고르세요</Text>
        {pair.length > 1 && <Text style={styles.footBoth}>◎ 두 분 다 · 재화 2</Text>}
      </View>
    </View>
  );
}

const COVER_BG = ['#3F5A54', '#5A4038', '#473F5C', '#5C5340'];

// 책 표지 = 얼굴 없는 텍스트 제목 + 진한 블러 대표사진 배경 + 최소 메타·배지 + 띠지 메모.
function BookCover({ card, onPress }: { card: RecommendationCard; onPress: () => void }) {
  const { target, reason } = card;
  const age = new Date().getFullYear() - target.birthYear + 1;
  const region = target.region1;
  const title = target.profile?.bookTitle?.trim() || target.profile?.intro?.trim() || reason.summary;
  const memo = reason.curatorMemo || reason.matchedPoints[0] || '';
  const fallback = COVER_BG[target.userId.charCodeAt(0) % COVER_BG.length];

  return (
    <Pressable style={styles.cover} onPress={onPress}>
      {target.mainPhotoUrl ? (
        <Image
          source={{ uri: target.mainPhotoUrl }}
          blurRadius={28}
          style={styles.coverPhoto}
        />
      ) : (
        <View style={[styles.coverPhoto, { backgroundColor: fallback }]} />
      )}
      <View style={styles.coverScrim} />

      <Text style={styles.coverTitle} numberOfLines={2}>
        {title}
      </Text>

      <View style={styles.obi}>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {age} · {region}
          </Text>
          {target.badges.identityVerified && <Badge text="본인" />}
          {target.badges.faceMatchVerified && <Badge text="얼굴" />}
          {target.badges.employmentVerified && <Badge text="직업" />}
        </View>
        {!!memo && (
          <Text style={styles.memo} numberOfLines={1}>
            🔖 {memo}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

function EmptyShelf({ onTune }: { onTune: () => void }) {
  return (
    <View style={styles.shelf}>
      <View style={styles.shelfHead}>
        <Text style={styles.shelfIcon}>📚</Text>
        <Text style={styles.shelfTitle}>오늘의 진열</Text>
      </View>
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>오늘은 골라 둘 만한 분을 찾지 못했어요.</Text>
        <Text style={styles.emptyHint}>
          프로필을 더 채우면 좋은 분이 도착할 가능성이 높아져요.
        </Text>
        <Pressable style={styles.emptyButton} onPress={onTune}>
          <Text style={styles.emptyButtonText}>취향 다듬기 · 인증 더하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF7' },
  content: { padding: 16, paddingTop: 50, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 2, paddingBottom: 14 },
  brand: { fontSize: 22, fontWeight: '500', color: '#1A1A1A' },
  greeting: { fontSize: 14, color: '#666', marginTop: 6, lineHeight: 21 },
  error: { color: '#C00', textAlign: 'center', marginVertical: 8 },

  shelf: {
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#DAD8D0',
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
  },
  shelfHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 12 },
  shelfIcon: { fontSize: 14, marginRight: 6 },
  shelfTitle: { fontSize: 13, fontWeight: '500', color: '#1A1A1A' },
  shelfRule: { fontSize: 12, color: '#999' },

  cover: {
    height: 168,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#EAEAEA',
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  coverPhoto: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  coverScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,18,14,0.46)' },
  coverTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '500',
    margin: 14,
    marginBottom: 0,
  },
  obi: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20,14,10,0.62)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 5 },
  metaText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },
  memo: { fontSize: 12, color: 'rgba(255,255,255,0.9)', lineHeight: 18 },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, color: '#FFFFFF' },

  orDiv: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, paddingHorizontal: 2 },
  orLine: { flex: 1, height: 0.5, backgroundColor: '#DAD8D0' },
  orChip: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: '#DAD8D0',
    borderRadius: 999,
    backgroundColor: '#F4F2EC',
    overflow: 'hidden',
  },

  shelfFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  footHint: { fontSize: 12, color: '#999' },
  footBoth: { fontSize: 12, color: '#666' },

  moreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 0.5,
    borderColor: '#CFCDC4',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 22,
  },
  moreTitle: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  moreHint: { fontSize: 12, color: '#999', marginTop: 3 },
  coin: { fontSize: 13, color: '#666' },

  corner: { backgroundColor: '#F1EFE8', borderRadius: 12, padding: 14 },
  cornerLabel: { fontSize: 13, fontWeight: '500', color: '#666', marginBottom: 8 },
  cornerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderTopWidth: 0.5,
    borderTopColor: '#DAD8D0',
  },
  cornerText: { fontSize: 13, color: '#666' },
  chevron: { fontSize: 16, color: '#AAA' },

  empty: { alignItems: 'center', paddingVertical: 26, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 15, color: '#1A1A1A', textAlign: 'center', lineHeight: 24 },
  emptyHint: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 6, marginBottom: 16, lineHeight: 18 },
  emptyButton: {
    borderWidth: 0.5,
    borderColor: '#CFCDC4',
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyButtonText: { fontSize: 13, color: '#333' },
});
