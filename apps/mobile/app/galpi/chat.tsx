/**
 * @screen B1~B4 인터뷰, C2 매일 대화, D2 넘긴 이유(이어서), F2 만난 뒤 — 갈피 대화방
 * 앱 IA v2 3.5. 대화 탭 맨 위 고정, 친구 탭·알림·중요한 일 카드에서도 들어온다.
 * 답을 기다리는 편지는 위에 공지로 고정한다.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '../../components/AppText';
import { GalpiAvatar } from '../../components/GalpiAvatar';
import { GalpiMessageView } from '../../components/GalpiMessageView';
import { Header, Screen } from '../../components/ui';
import { expiryLabel, pinnedLetter } from '../../domain/letters';
import { useAppStore } from '../../state/app-store';
import { SPACE } from '../../theme/tokens';
import { useTheme } from '../../theme/use-theme';

export default function GalpiChatScreen() {
  const t = useTheme();
  const router = useRouter();
  const messages = useAppStore((s) => s.galpiMessages);
  const letters = useAppStore((s) => s.letters);
  const connections = useAppStore((s) => s.connections);
  const firstRunDone = useAppStore((s) => s.firstRunDone);
  const interviewDone = useAppStore((s) => s.interview.completed);
  const startFirstRun = useAppStore((s) => s.startFirstRun);
  const openGalpiChat = useAppStore((s) => s.openGalpiChat);
  const sendToGalpi = useAppStore((s) => s.sendToGalpi);
  const markGalpiRead = useAppStore((s) => s.markGalpiRead);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // 어느 입구로 들어와도 같은 대화 — 갈피가 먼저 건넬 말이 있으면 그 말에 바로 답하는 상태로 열린다 (앱 IA 3.5)
  useEffect(() => {
    if (!firstRunDone) startFirstRun();
    else openGalpiChat();
  }, [firstRunDone, startFirstRun, openGalpiChat]);

  useEffect(() => {
    markGalpiRead();
  }, [messages.length, markGalpiRead]);

  const now = new Date();
  const pending = pinnedLetter(letters, now);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/friends'));
  const send = () => {
    if (!draft.trim()) return;
    sendToGalpi(draft);
    setDraft('');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Header
        title="갈피"
        onBack={goBack}
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="갈피 프로필" onPress={() => router.push('/galpi/profile')}>
            <GalpiAvatar size={30} />
          </Pressable>
        }
      />
      {pending ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/letter/${pending.id}`)}
          style={[styles.notice, { backgroundColor: t.fill }]}
        >
          {/* 고정 표시는 갈피의 코랄 책갈피 */}
          <Ionicons name="bookmark" size={14} color={t.mark} />
          <Text style={[styles.noticeText, { color: t.ink }]}>
            {pending.status === 'acceptedWaiting' ? '답을 기다리는 편지' : '편지가 왔어요'} · {expiryLabel(pending)}
          </Text>
        </Pressable>
      ) : null}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <Text style={[styles.disclosure, { color: t.sub }]}>
            갈피는 AI예요. 들려주신 이야기는 소개를 위해서만 쓰이고, 다른 사용자에게 보여주지 않아요.
          </Text>
          {messages.map((m) => (
            <GalpiMessageView
              key={m.id}
              message={m}
              letter={m.kind === 'letter' ? letters.find((l) => l.id === m.letterId) : undefined}
              connectionEnded={m.kind === 'letter' && connections.find((c) => c.letterId === m.letterId)?.ended === true}
              now={now}
              onOpenLetter={(id) => router.push(`/letter/${id}`)}
              onOpenLightIntro={() => router.push('/light-intro')}
            />
          ))}
        </ScrollView>
        {!interviewDone ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => sendToGalpi('이 질문은 넘어갈게요', { skipped: true })}
            style={styles.skip}
          >
            <Text style={[styles.skipText, { color: t.sub }]}>이 질문은 넘어갈게요</Text>
          </Pressable>
        ) : null}
        <View style={[styles.inputRow, { borderTopColor: t.line, backgroundColor: t.bg }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="갈피에게 말하기"
            placeholderTextColor={t.sub}
            style={[styles.input, { color: t.ink, backgroundColor: t.fill }]}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="보내기"
            onPress={send}
            style={[styles.send, { backgroundColor: draft.trim() ? t.ink : t.line }]}
          >
            <Ionicons name="arrow-up" size={18} color={draft.trim() ? t.onInk : t.sub} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, paddingVertical: SPACE.s, paddingHorizontal: SPACE.l },
  noticeText: { fontSize: 13 },
  list: { padding: SPACE.m, gap: SPACE.s },
  disclosure: { fontSize: 12, textAlign: 'center', lineHeight: 18, paddingHorizontal: SPACE.l, paddingBottom: SPACE.s },
  skip: { alignSelf: 'center', paddingVertical: SPACE.xs },
  skipText: { fontSize: 13, textDecorationLine: 'underline' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACE.s,
    padding: SPACE.s,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, minHeight: 40, maxHeight: 120, fontSize: 15, borderRadius: 20, paddingHorizontal: SPACE.m, paddingVertical: SPACE.s },
  send: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
