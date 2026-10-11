/**
 * @screen E2 대화 (E3 통화·F1 만남 약속은 나중) — 앱 IA v2 6장
 * 첫 장(소개 편지) 고정 → "두 분만의 대화예요. 갈피는 읽지 않아요".
 * 읽음 표시·온라인 상태 없음(하드룰 6). 연락처 교환은 메뉴 안쪽, 권하지 않는다(하드룰 5).
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Empty, GalpiText, Header, IconButton, Screen } from '../../components/ui';
import { revealedProfile } from '../../domain/letters';
import { useAppStore } from '../../state/app-store';
import { RADIUS, SPACE } from '../../theme/tokens';
import { useTheme } from '../../theme/use-theme';

function MenuItem({ label, onPress, disabled }: { label: string; onPress?: () => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={styles.menuItem}>
      <Text style={{ color: disabled ? t.sub : t.ink, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export default function PersonChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const router = useRouter();
  const connection = useAppStore((s) => s.connections.find((c) => c.id === id));
  const letter = useAppStore((s) => s.letters.find((l) => l.id === connection?.letterId));
  const sendToPerson = useAppStore((s) => s.sendToPerson);
  const markPersonRead = useAppStore((s) => s.markPersonRead);
  const markCelebrated = useAppStore((s) => s.markCelebrated);
  const endConnection = useAppStore((s) => s.endConnection);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const connectionId = connection?.id;
  const messageCount = connection?.messages.length ?? 0;
  const celebrated = connection?.celebrated ?? true;

  useEffect(() => {
    if (!connectionId) return;
    markPersonRead(connectionId);
  }, [connectionId, messageCount, markPersonRead]);

  useEffect(() => {
    if (connectionId && !celebrated) markCelebrated(connectionId);
  }, [connectionId, celebrated, markCelebrated]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/chats'));

  if (!connection) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title="대화" onBack={back} />
        <Empty text="대화를 찾을 수 없어요." />
      </Screen>
    );
  }

  const profile = letter ? revealedProfile(letter) : null;
  const send = () => {
    if (!draft.trim()) return;
    sendToPerson(connection.id, draft);
    setDraft('');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title={`${connection.name} 님`}
        onBack={back}
        right={<IconButton name="ellipsis-horizontal" label="메뉴" onPress={() => setMenuOpen((v) => !v)} />}
      />
      {menuOpen ? (
        <View style={[styles.menu, { backgroundColor: t.card, borderColor: t.line }]}>
          <MenuItem
            label="연결 끝내기"
            onPress={() => {
              endConnection(connection.id);
              setMenuOpen(false);
            }}
          />
          <MenuItem label="신고·차단 (준비 중)" disabled />
          <MenuItem label="연락처 교환 (준비 중)" disabled />
        </View>
      ) : null}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {profile && letter ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/letter/${letter.id}`)}
              style={[styles.firstPage, { backgroundColor: t.card }]}
            >
              <Text style={[styles.kicker, { color: t.sub }]}>첫 장</Text>
              <GalpiText numberOfLines={3}>{profile.why}</GalpiText>
            </Pressable>
          ) : null}
          <Text style={[styles.notice, { color: t.sub }]}>두 분만의 대화예요. 갈피는 읽지 않아요.</Text>
          {connection.messages.map((m) => (
            <View key={m.id} style={m.from === 'me' ? styles.mineRow : styles.theirRow}>
              <Text
                style={[
                  styles.bubble,
                  { color: t.ink, backgroundColor: m.from === 'me' ? t.accent.soft : t.card },
                ]}
              >
                {m.text}
              </Text>
            </View>
          ))}
        </ScrollView>
        {connection.ended ? (
          <Text style={[styles.ended, { color: t.sub }]}>끝난 대화예요.</Text>
        ) : (
          <View style={[styles.inputRow, { borderTopColor: t.line, backgroundColor: t.card }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="메시지"
              placeholderTextColor={t.sub}
              style={[styles.input, { color: t.ink }]}
              multiline
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="보내기"
              onPress={send}
              style={[styles.send, { backgroundColor: draft.trim() ? t.accent.primary : t.line }]}
            >
              <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  menu: { position: 'absolute', right: SPACE.m, top: 52, zIndex: 10, borderWidth: 1, borderRadius: RADIUS.chip, paddingVertical: SPACE.xs, minWidth: 180 },
  menuItem: { paddingVertical: SPACE.s, paddingHorizontal: SPACE.m },
  list: { padding: SPACE.m, gap: SPACE.s },
  firstPage: { borderRadius: RADIUS.card, padding: SPACE.m, gap: SPACE.xs, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  kicker: { fontSize: 11 },
  notice: { fontSize: 12, textAlign: 'center', paddingVertical: SPACE.s },
  mineRow: { alignItems: 'flex-end' },
  theirRow: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: RADIUS.bubble, paddingVertical: SPACE.s, paddingHorizontal: SPACE.m, fontSize: 15, lineHeight: 22, overflow: 'hidden' },
  ended: { textAlign: 'center', padding: SPACE.m, fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.s, padding: SPACE.s, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 40, maxHeight: 120, fontSize: 15, paddingHorizontal: SPACE.s, paddingVertical: SPACE.s },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
