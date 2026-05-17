import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError, api } from '../lib/api';
import { authStorage } from '../lib/auth-storage';

interface MeData {
  userId: string;
  email?: string;
  phone?: string;
  role: string;
}

/**
 * 임시 홈 화면 — 가입/로그인 후 도착하는 자리.
 *
 * 본 화면은 D01 의 placeholder 다. 실제 D01 (오늘의 프롤로그) 는 추천 시스템 구현 후.
 */
export default function Home() {
  const router = useRouter();
  const [me, setMe] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = await authStorage.getAccessToken();
    if (!token) {
      router.replace('/a03-login');
      return;
    }
    try {
      const data = await api.me(token);
      setMe(data);
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

  async function onLogout() {
    const token = await authStorage.getAccessToken();
    try {
      if (token) await api.logout(token);
    } catch {
      // 무시: 어차피 로컬 토큰은 지움
    }
    await authStorage.clear();
    router.replace('/a03-login');
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
      <Text style={styles.title}>가입/로그인 완료</Text>
      <Text style={styles.subtitle}>본인 인증 흐름이 정상 동작합니다.</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {me && (
        <View style={styles.card}>
          <Text style={styles.label}>userId</Text>
          <Text style={styles.value} selectable>
            {me.userId}
          </Text>
          <Text style={styles.label}>role</Text>
          <Text style={styles.value}>{me.role}</Text>
          {me.email && (
            <>
              <Text style={styles.label}>email</Text>
              <Text style={styles.value}>{me.email}</Text>
            </>
          )}
        </View>
      )}

      <Pressable style={styles.primaryButton} onPress={() => router.push('/profile-edit')}>
        <Text style={styles.primaryButtonText}>프로필 편집</Text>
      </Pressable>

      <Pressable style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </Pressable>

      <Text style={styles.note}>
        다음 단계 (얼굴 인증 · 추천) 는 후속 Phase 에서 구현됩니다.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 80, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginBottom: 24,
  },
  label: { fontSize: 12, color: '#888', marginTop: 8 },
  value: { fontSize: 14, color: '#1A1A1A', marginTop: 2 },
  error: { color: '#C00', marginBottom: 12 },
  primaryButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  logoutButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutText: { color: '#333', fontSize: 14 },
  note: { fontSize: 12, color: '#888', textAlign: 'center', marginTop: 'auto' },
});
