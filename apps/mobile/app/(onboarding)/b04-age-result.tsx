import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, api } from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';
import { routeForStep } from '../../lib/onboarding-route';

/**
 * B04 — 나이 확인 결과 (FR-B03)
 *
 * 본인 인증 시 자동으로 ageVerified=true 가 세팅된다.
 * 이 화면은 사용자에게 확인 안내만 보여주고 다음 단계로 진행.
 */
export default function B04AgeResult() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(true);

  useEffect(() => {
    void (async () => {
      const token = await authStorage.getAccessToken();
      if (!token) {
        router.replace('/a03-login');
        return;
      }
      try {
        const status = await api.getOnboardingStatus(token);
        setEligible(status.ageVerified);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await authStorage.clear();
          router.replace('/a03-login');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function onNext() {
    const token = await authStorage.getAccessToken();
    if (!token) return;
    const status = await api.getOnboardingStatus(token);
    router.replace(routeForStep(status.nextStep === 'age_check' ? 'relationship_survey' : status.nextStep) as never);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.title}>
          {eligible ? '나이 확인이 완료됐어요.' : '서비스 이용 가능 연령이 아니에요.'}
        </Text>
        <Text style={styles.subtitle}>
          {eligible
            ? '프롤로그는 26~39세를 대상으로 한 서비스예요.\n본인 인증 결과로 자동 확인됐습니다.'
            : '프롤로그는 만 26~39세를 대상으로 합니다.\n계정 이용에 제한이 있을 수 있어요.'}
        </Text>
      </View>
      <Pressable
        style={[styles.cta, !eligible && styles.ctaDisabled]}
        disabled={!eligible}
        onPress={onNext}
      >
        <Text style={styles.ctaText}>다음으로</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 24, paddingTop: 96, backgroundColor: '#fff' },
  body: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },
  subtitle: { fontSize: 15, lineHeight: 24, color: '#555' },
  cta: { backgroundColor: '#1a1a1a', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  ctaDisabled: { backgroundColor: '#cccccc' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
