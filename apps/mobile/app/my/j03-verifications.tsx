import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ApiError, api, type MyVerifications } from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';

/**
 * J03 — 인증 상태 관리 (FR-J03)
 *
 * 구성:
 *  - 본인 인증 상태
 *  - 얼굴 인증 상태
 *  - 매너 서약 / 싱글 상태 서약 상태
 *  - 직업/재직 인증 상태
 *
 * 미완료 인증은 완료 CTA 버튼을 제공.
 */
export default function J03Verifications() {
  const router = useRouter();
  const [data, setData] = useState<MyVerifications | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      router.replace('/a03-login');
      return;
    }
    try {
      const res = await api.getMyVerifications(token);
      setData(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await authStorage.clear();
        router.replace('/a03-login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading || !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.header}>인증 상태</Text>
      <Text style={styles.subHeader}>
        프롤로그는 인증을 통해 신뢰할 수 있는 만남을 만들어요.
      </Text>

      <Row
        label="본인 인증"
        sub={data.identityVerifiedAt ? formatDate(data.identityVerifiedAt) : null}
        status={data.identityVerified ? 'verified' : 'required'}
      />
      <Row
        label="얼굴 인증"
        sub={data.faceVerifiedAt ? formatDate(data.faceVerifiedAt) : null}
        status={
          data.faceMatchStatus === 'verified'
            ? 'verified'
            : data.faceMatchStatus === 'rejected'
              ? 'rejected'
              : 'required'
        }
        cta={
          data.faceMatchStatus !== 'verified'
            ? { label: '얼굴 인증하기', onPress: () => router.push('/profile-edit' as never) }
            : undefined
        }
      />
      <Row
        label="매너 서약"
        sub={data.mannerPledgeAgreedAt ? formatDate(data.mannerPledgeAgreedAt) : null}
        status={data.mannerPledgeAgreed ? 'verified' : 'required'}
        cta={
          !data.mannerPledgeAgreed
            ? {
                label: '서약하기',
                onPress: () => router.push('/(onboarding)/b06-manner' as never),
              }
            : undefined
        }
      />
      <Row
        label="싱글 상태 서약"
        sub={data.singlePledgeAgreedAt ? formatDate(data.singlePledgeAgreedAt) : null}
        status={data.singlePledgeAgreed ? 'verified' : 'required'}
        cta={
          !data.singlePledgeAgreed
            ? {
                label: '서약하기',
                onPress: () => router.push('/(onboarding)/b07-single' as never),
              }
            : undefined
        }
      />
      <Row
        label="직업/재직 인증"
        sub={data.employmentVerifiedAt ? formatDate(data.employmentVerifiedAt) : null}
        status={
          data.employmentVerificationStatus === 'verified'
            ? 'verified'
            : data.employmentVerificationStatus === 'rejected'
              ? 'rejected'
              : 'optional'
        }
      />

      <Text style={styles.note}>
        직업/재직 인증은 선택이에요. 완료하면 추천 신뢰도가 높아질 수 있어요.
      </Text>
    </ScrollView>
  );
}

function Row({
  label,
  sub,
  status,
  cta,
}: {
  label: string;
  sub: string | null;
  status: 'verified' | 'required' | 'rejected' | 'optional';
  cta?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub !== null && <Text style={styles.rowSub}>{sub}</Text>}
        <Text
          style={[
            styles.rowStatus,
            status === 'verified' && styles.statusOk,
            status === 'rejected' && styles.statusBad,
            status === 'required' && styles.statusRequired,
            status === 'optional' && styles.statusOptional,
          ]}
        >
          {status === 'verified'
            ? '완료'
            : status === 'rejected'
              ? '반려'
              : status === 'optional'
                ? '선택'
                : '미완료'}
        </Text>
      </View>
      {cta && (
        <Pressable style={styles.cta} onPress={cta.onPress}>
          <Text style={styles.ctaText}>{cta.label}</Text>
        </Pressable>
      )}
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} 완료`;
}
function pad(n: number) {
  return String(n).padStart(2, '0');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingTop: 72 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  subHeader: { fontSize: 14, color: '#555', marginTop: 6, marginBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLabel: { fontSize: 15, color: '#1a1a1a', fontWeight: '500' },
  rowSub: { fontSize: 12, color: '#888', marginTop: 2 },
  rowStatus: { fontSize: 13, marginTop: 6 },
  statusOk: { color: '#3a7a4d' },
  statusBad: { color: '#c44' },
  statusRequired: { color: '#c44' },
  statusOptional: { color: '#888' },
  cta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  ctaText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  note: { fontSize: 12, color: '#999', lineHeight: 18, marginTop: 16 },
});
