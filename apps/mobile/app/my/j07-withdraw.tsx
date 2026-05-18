import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ApiError, api } from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';

/**
 * J07 — 계정 탈퇴 (FR-J05)
 *
 * 구성:
 *  - 탈퇴 시 데이터 처리 안내
 *  - 명시적 확인 체크
 *  - 탈퇴 버튼
 */
export default function J07Withdraw() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  function notify(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  function confirmWithdraw() {
    if (Platform.OS === 'web') {
      if (window.confirm('정말 탈퇴하시겠어요? 이 작업은 되돌릴 수 없어요.')) {
        void doWithdraw();
      }
    } else {
      Alert.alert(
        '정말 탈퇴하시겠어요?',
        '이 작업은 되돌릴 수 없어요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '탈퇴', style: 'destructive', onPress: () => void doWithdraw() },
        ],
      );
    }
  }

  async function doWithdraw() {
    setBusy(true);
    try {
      const token = await authStorage.getAccessToken();
      if (!token) {
        router.replace('/a03-login');
        return;
      }
      await api.withdrawAccount(token);
      await authStorage.clear();
      notify('탈퇴 완료', '프롤로그를 이용해주셔서 감사했어요.');
      router.replace('/a03-login');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await authStorage.clear();
        router.replace('/a03-login');
        return;
      }
      notify('탈퇴 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>계정 탈퇴</Text>
        <Text style={styles.subHeader}>
          탈퇴 전에 아래 내용을 확인해주세요.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>탈퇴 시 처리되는 내용</Text>
          <Bullet>계정 상태가 탈퇴 처리되고, 추천·매칭·대화 노출이 즉시 중단돼요.</Bullet>
          <Bullet>진행 중인 대화방은 상대 화면에서도 더 이상 열리지 않아요.</Bullet>
          <Bullet>프로필과 사진은 더 이상 다른 사용자에게 노출되지 않아요.</Bullet>
          <Bullet>법령상 보관이 필요한 정보(신고 기록 등)는 보존 정책에 따라 일정 기간 보관돼요.</Bullet>
          <Bullet>동일 본인 인증 정보로 재가입이 제한될 수 있어요.</Bullet>
        </View>

        <Pressable style={styles.checkboxRow} onPress={() => setAgreed(!agreed)}>
          <View style={[styles.checkbox, agreed && styles.checkboxOn]} />
          <Text style={styles.checkboxLabel}>
            위 내용을 확인했고, 탈퇴를 진행하는 데 동의해요.
          </Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footerRow}>
        <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>돌아가기</Text>
        </Pressable>
        <Pressable
          style={[styles.withdrawBtn, (!agreed || busy) && styles.withdrawBtnDisabled]}
          disabled={!agreed || busy}
          onPress={confirmWithdraw}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.withdrawText}>탈퇴하기</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>·</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingTop: 72 },
  header: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subHeader: { fontSize: 14, color: '#555', marginBottom: 20 },
  card: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 18,
    backgroundColor: '#fafaf8',
    marginBottom: 20,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  bulletRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-start' },
  bullet: { fontSize: 18, color: '#666', width: 16, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 13, color: '#444', lineHeight: 20 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: '#999',
    borderRadius: 4,
    marginRight: 10,
  },
  checkboxOn: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
  checkboxLabel: { fontSize: 14, color: '#333', flex: 1 },
  footerRow: { flexDirection: 'row', padding: 24, gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  cancelText: { color: '#333', fontSize: 16, fontWeight: '500' },
  withdrawBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#c44',
    alignItems: 'center',
  },
  withdrawBtnDisabled: { backgroundColor: '#e0c0c0' },
  withdrawText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
