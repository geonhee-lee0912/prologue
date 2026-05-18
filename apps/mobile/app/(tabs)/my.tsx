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
import { ApiError, api, type MeSummary } from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';

/**
 * J01 — 마이페이지
 *
 * 구성 (08_화면목록_IA 7.9):
 *  - 내 프로필 요약
 *  - 인증 상태
 *  - 멤버십 상태
 *  - 설정 목록 (인증 상태 관리, 프로필 관리, 탈퇴)
 */
export default function My() {
  const router = useRouter();
  const [summary, setSummary] = useState<MeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const token = await authStorage.getAccessToken();
    if (!token) {
      router.replace('/a03-login');
      return;
    }
    try {
      const res = await api.getMeSummary(token);
      setSummary(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await authStorage.clear();
        router.replace('/a03-login');
      }
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

  if (loading && !summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!summary) {
    return null;
  }

  const age = new Date().getFullYear() - summary.user.birthYear;
  const region = [summary.user.region1, summary.user.region2].filter(Boolean).join(' ');
  const completion = summary.profile?.completionScore ?? 0;

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
      {/* 프로필 요약 */}
      <View style={styles.profileCard}>
        {summary.profile?.mainPhotoUrl ? (
          <Image source={{ uri: summary.profile.mainPhotoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarEmpty]}>
            <Text style={styles.avatarEmptyText}>?</Text>
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.profileMeta}>
            {age}세 · {region || '지역 미설정'}
          </Text>
          <Text style={styles.profileJob}>
            {summary.profile?.jobCategory ?? '직업 미입력'}
          </Text>
          <Text style={styles.completion}>프로필 완성도 {completion}%</Text>
        </View>
      </View>

      {/* 멤버십 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>멤버십</Text>
        <View style={styles.membership}>
          <Text style={styles.membershipName}>
            {summary.user.membershipType === 'plus' ? 'Plus' : 'Free'}
          </Text>
        </View>
      </View>

      {/* 인증 요약 */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>인증 상태</Text>
        <Badge label="본인 인증" verified={summary.verification.identityVerified} />
        <Badge label="얼굴 인증" verified={summary.verification.faceMatchStatus === 'verified'} />
        <Badge label="매너 서약" verified={summary.verification.mannerPledgeAgreed} />
        <Badge label="싱글 상태 서약" verified={summary.verification.singlePledgeAgreed} />
        <Badge
          label="직업/재직 인증"
          verified={summary.verification.employmentVerificationStatus === 'verified'}
          optional={summary.verification.employmentVerificationStatus === 'not_submitted'}
        />
      </View>

      {/* 설정 */}
      <View style={styles.section}>
        <MenuRow
          label="내 프로필 관리"
          onPress={() => router.push('/profile-edit')}
        />
        <MenuRow
          label="인증 상태 관리"
          onPress={() => router.push('/my/j03-verifications' as never)}
        />
        <MenuRow label="로그아웃" onPress={onLogout} />
        <MenuRow
          label="탈퇴하기"
          danger
          onPress={() => router.push('/my/j07-withdraw' as never)}
        />
      </View>
    </ScrollView>
  );
}

function Badge({
  label,
  verified,
  optional,
}: {
  label: string;
  verified: boolean;
  optional?: boolean;
}) {
  return (
    <View style={styles.badgeRow}>
      <Text style={styles.badgeLabel}>{label}</Text>
      <Text
        style={[
          styles.badgeStatus,
          verified && styles.badgeStatusOk,
          optional && styles.badgeStatusOptional,
        ]}
      >
        {verified ? '완료' : optional ? '선택' : '미완료'}
      </Text>
    </View>
  );
}

function MenuRow({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 16,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eee' },
  avatarEmpty: { justifyContent: 'center', alignItems: 'center' },
  avatarEmptyText: { fontSize: 24, color: '#bbb' },
  profileInfo: { marginLeft: 16, flex: 1 },
  profileMeta: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  profileJob: { fontSize: 14, color: '#666', marginTop: 4 },
  completion: { fontSize: 12, color: '#888', marginTop: 6 },
  section: {
    marginBottom: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionLabel: { fontSize: 12, color: '#888', marginBottom: 8 },
  membership: { paddingVertical: 4 },
  membershipName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  badgeLabel: { fontSize: 14, color: '#333' },
  badgeStatus: { fontSize: 13, color: '#c44' },
  badgeStatusOk: { color: '#3a7a4d' },
  badgeStatusOptional: { color: '#999' },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuLabel: { fontSize: 15, color: '#1a1a1a' },
  menuLabelDanger: { color: '#c44' },
  menuArrow: { fontSize: 18, color: '#bbb' },
});
