import { SINGLE_PLEDGE_COPY } from '@prologue/shared';
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
import { routeForStep } from '../../lib/onboarding-route';

/**
 * B07 — 싱글 상태 서약 (FR-B06)
 */
export default function B07Single() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function notify(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  async function onAgree() {
    setBusy(true);
    try {
      const token = await authStorage.getAccessToken();
      if (!token) {
        router.replace('/a03-login');
        return;
      }
      const { nextStep } = await api.agreeSinglePledge(token, SINGLE_PLEDGE_COPY.version);
      router.replace(routeForStep(nextStep) as never);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await authStorage.clear();
        router.replace('/a03-login');
        return;
      }
      notify('동의 실패', e instanceof Error ? e.message : '잠시 후 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>{SINGLE_PLEDGE_COPY.header}</Text>
        <Text style={styles.subHeader}>{SINGLE_PLEDGE_COPY.subHeader}</Text>

        <View style={styles.card}>
          <Text style={styles.intro}>{SINGLE_PLEDGE_COPY.intro}</Text>
          {SINGLE_PLEDGE_COPY.clauses.map((clause, i) => (
            <View key={i} style={styles.clauseRow}>
              <Text style={styles.clauseBullet}>·</Text>
              <Text style={styles.clauseText}>{clause}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.note}>{SINGLE_PLEDGE_COPY.noteOnLegal}</Text>
      </ScrollView>

      <Pressable style={[styles.cta, busy && styles.ctaDisabled]} disabled={busy} onPress={onAgree}>
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.ctaText}>{SINGLE_PLEDGE_COPY.cta}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 24, paddingTop: 72 },
  header: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subHeader: { fontSize: 15, color: '#555', marginBottom: 24, lineHeight: 22 },
  card: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#fafaf8',
    marginBottom: 16,
  },
  intro: { fontSize: 15, color: '#1a1a1a', fontWeight: '600', marginBottom: 16 },
  clauseRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
  clauseBullet: { fontSize: 18, color: '#666', width: 16, lineHeight: 22 },
  clauseText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 22 },
  note: { fontSize: 13, color: '#888', lineHeight: 20, paddingHorizontal: 4 },
  cta: {
    backgroundColor: '#1a1a1a',
    margin: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaDisabled: { backgroundColor: '#cccccc' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
