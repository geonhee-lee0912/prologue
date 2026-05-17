import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ApiError, api, type RecommendationCard } from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';

/**
 * D02 + D03 — 추천 카드 상세 (target 프로필 + 추천 이유 통합 1페이지).
 *
 * 진입 시 자동으로 status: created → shown 으로 마킹.
 * "관심 보내기" / "넘기기" 버튼은 placeholder — FR-E 구현 시 연결.
 */
export default function RecommendationDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<RecommendationCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const confirm = (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        { text: '확인', onPress: () => resolve(true) },
      ]);
    });
  };

  async function onSendInterest() {
    if (!card) return;
    const ok = await confirm('관심 보내기', '관심을 표현하시겠어요?');
    if (!ok) return;
    setBusy(true);
    try {
      const token = await authStorage.getAccessToken();
      if (!token) return;
      const result = await api.sendInterest(token, card.id);
      if (result.isMutualMatch) {
        notify('첫문장이 이어졌어요', '두 분이 모두 관심을 표현했어요.');
      } else {
        notify('관심을 보냈어요', '상대도 관심을 보내면 첫 대화가 시작됩니다.');
      }
      router.replace('/home');
    } catch (e) {
      if (e instanceof ApiError) notify(`오류 (${e.code})`, e.message);
      else notify('오류', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSkip() {
    if (!card) return;
    const ok = await confirm('넘기기', '이 추천을 넘기시겠어요?');
    if (!ok) return;
    setBusy(true);
    try {
      const token = await authStorage.getAccessToken();
      if (!token) return;
      await api.skip(token, card.id);
      router.replace('/home');
    } catch (e) {
      if (e instanceof ApiError) notify(`오류 (${e.code})`, e.message);
      else notify('오류', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const load = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      router.replace('/a03-login');
      return;
    }
    try {
      const c = await api.getRecommendation(token, id);
      setCard(c);
      // 진입 시 자동으로 shown 마킹
      if (c.status === 'created') {
        void api.markRecommendationShown(token, id).catch(() => undefined);
      }
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
  }, [id, router]);

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
  if (error || !card) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#C00' }}>{error ?? '추천을 불러올 수 없습니다.'}</Text>
        <Pressable onPress={() => router.back()} style={styles.linkButton}>
          <Text style={styles.linkText}>뒤로</Text>
        </Pressable>
      </View>
    );
  }

  const age = new Date().getFullYear() - card.target.birthYear;
  const region = card.target.region2
    ? `${card.target.region1} ${card.target.region2}`
    : card.target.region1;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>‹ 뒤로</Text>
      </Pressable>

      {/* 메인 사진 */}
      <View style={styles.photoWrap}>
        {card.target.mainPhotoUrl ? (
          <Image source={{ uri: card.target.mainPhotoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Text style={styles.photoFallbackText}>사진 없음</Text>
          </View>
        )}
      </View>

      {/* 기본 정보 + 배지 */}
      <View style={styles.section}>
        <Text style={styles.basic}>
          {age}세 · {region}
          {card.target.profile?.jobCategory ? ` · ${card.target.profile.jobCategory}` : ''}
        </Text>
        <View style={styles.badgeRow}>
          {card.target.badges.identityVerified && <Badge text="본인 인증" />}
          {card.target.badges.faceMatchVerified && <Badge text="얼굴 인증" />}
          {card.target.badges.employmentVerified && <Badge text="직업 인증" />}
        </View>
      </View>

      {/* 큐레이터의 메모 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>큐레이터의 메모</Text>
        <Text style={styles.summary}>{card.reason.summary}</Text>
        <Text style={styles.curatorMemo}>{card.reason.curatorMemo}</Text>
      </View>

      {/* 매칭 포인트 */}
      {card.reason.matchedPoints.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>잘 맞는 점</Text>
          {card.reason.matchedPoints.map((p, i) => (
            <Text key={i} style={styles.bullet}>
              · {p}
            </Text>
          ))}
        </View>
      )}

      {/* 다른 점 */}
      {card.reason.differencePoints.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>다른 점</Text>
          {card.reason.differencePoints.map((p, i) => (
            <Text key={i} style={styles.bullet}>
              · {p}
            </Text>
          ))}
        </View>
      )}

      {/* 자기소개 */}
      {card.target.profile?.intro && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>나의 프롤로그</Text>
          <Text style={styles.intro}>{card.target.profile.intro}</Text>
        </View>
      )}

      {/* 라이프스타일 태그 */}
      {(card.target.profile?.lifestyleTags?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>라이프스타일</Text>
          <View style={styles.tagRow}>
            {card.target.profile!.lifestyleTags.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 첫 대화 소재 */}
      {card.reason.conversationTopics.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>첫 대화를 이렇게 시작해보세요</Text>
          {card.reason.conversationTopics.map((t, i) => (
            <Text key={i} style={styles.bullet}>
              · {t}
            </Text>
          ))}
        </View>
      )}

      {/* 액션 버튼 */}
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionButton, styles.skipButton, busy && styles.disabled]}
          disabled={busy || card.status !== 'created' && card.status !== 'shown'}
          onPress={onSkip}
        >
          <Text style={styles.skipText}>넘기기</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.interestButton, busy && styles.disabled]}
          disabled={busy || card.status !== 'created' && card.status !== 'shown'}
          onPress={onSendInterest}
        >
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.interestText}>관심 보내기</Text>
          )}
        </Pressable>
      </View>
      {(card.status === 'interested' || card.status === 'skipped') && (
        <Text style={styles.placeholder}>
          ※ 이미 {card.status === 'interested' ? '관심 보낸' : '넘긴'} 추천이에요.
        </Text>
      )}
    </ScrollView>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>✓ {text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 40, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  back: { padding: 16, paddingTop: 50 },
  backText: { color: '#666', fontSize: 14 },
  linkButton: { padding: 12 },
  linkText: { color: '#1A1A1A' },
  photoWrap: { paddingHorizontal: 20 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#EEE' },
  photoFallback: { justifyContent: 'center', alignItems: 'center' },
  photoFallbackText: { color: '#999', fontSize: 14 },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  basic: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  badge: {
    backgroundColor: '#EEF6FF',
    borderColor: '#B7D7FF',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: { fontSize: 11, color: '#2D6FBE' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  summary: { fontSize: 15, color: '#1A1A1A', marginBottom: 6 },
  curatorMemo: { fontSize: 13, color: '#777', fontStyle: 'italic' },
  bullet: { fontSize: 14, color: '#333', marginBottom: 4, lineHeight: 20 },
  intro: { fontSize: 14, color: '#333', lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  tagText: { fontSize: 12, color: '#333' },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  actionButton: { flex: 1, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  skipButton: { backgroundColor: '#F0F0F0' },
  skipText: { color: '#555', fontSize: 14 },
  interestButton: { backgroundColor: '#1A1A1A' },
  interestText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  placeholder: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8 },
  disabled: { opacity: 0.5 },
});
