/**
 * @screen D1 소개 편지, D2 넘긴 이유 — 앱 IA v2 4.1, 5장
 * 후보가 둘이면 이야기 한 줄로 고르고, 고른 쪽만 열린다(revealedProfile).
 * 넘긴 이유는 자유 입력, 건너뛸 수 있고, 상대에게 전달되지 않는다고 적는다.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LetterView } from '../../components/LetterView';
import { Button, Empty, GalpiText, Header, Screen } from '../../components/ui';
import { expiryLabel, isLetterClosed, revealedProfile } from '../../domain/letters';
import { useAppStore } from '../../state/app-store';
import { RADIUS, SPACE } from '../../theme/tokens';
import { useTheme } from '../../theme/use-theme';

export default function LetterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const t = useTheme();
  const letter = useAppStore((s) => s.letters.find((l) => l.id === id));
  const userName = useAppStore((s) => s.userName);
  const connections = useAppStore((s) => s.connections);
  const choose = useAppStore((s) => s.chooseLetterCandidate);
  const answer = useAppStore((s) => s.answerLetter);
  const simulateMutualAccept = useAppStore((s) => s.simulateMutualAccept);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');

  const close = () => (router.canGoBack() ? router.back() : router.replace('/galpi/chat'));

  if (!letter) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Header title="갈피의 편지" onBack={close} />
        <Empty text="편지를 찾을 수 없어요." />
      </Screen>
    );
  }

  const now = new Date();
  const closed = isLetterClosed(letter, now);
  const profile = closed ? null : revealedProfile(letter);
  const connection = connections.find((c) => c.letterId === letter.id);

  const finishPass = (withReason: boolean) => {
    answer(letter.id, 'pass', withReason ? reason : undefined);
    close();
  };

  let body: ReactNode;
  if (asking) {
    body = (
      <View style={styles.pad}>
        <GalpiText>어떤 점이 아니었는지 말해 주면 다음 편지에 반영할게요.</GalpiText>
        <Text style={[styles.note, { color: t.sub }]}>이 말은 상대에게 전달되지 않아요. 서고에만 남아요.</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="편하게 적어 주세요"
          placeholderTextColor={t.sub}
          style={[styles.reason, { backgroundColor: t.card, color: t.ink, borderColor: t.line }]}
        />
        <View style={styles.row}>
          <Button variant="secondary" label="건너뛰기" onPress={() => finishPass(false)} />
          <Button label="남기기" disabled={!reason.trim()} onPress={() => finishPass(true)} />
        </View>
      </View>
    );
  } else if (closed) {
    body = <Empty text="닫힌 편지예요." />;
  } else if (letter.status === 'choosing') {
    body = (
      <View style={styles.pad}>
        <GalpiText>{userName} 님과 맞을 것 같은 분이 두 분 있어요. 어느 분 이야기를 먼저 들려드릴까요?</GalpiText>
        {letter.candidates.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            onPress={() => choose(letter.id, c.id)}
            style={[styles.story, { borderColor: t.accent.primary, backgroundColor: t.card }]}
          >
            <GalpiText>{c.storyLine}</GalpiText>
          </Pressable>
        ))}
        <Text style={[styles.note, { color: t.sub }]}>{expiryLabel(letter)}</Text>
        <Pressable accessibilityRole="button" onPress={() => setAsking(true)}>
          <Text style={[styles.link, { color: t.sub }]}>이번엔 두 분 다 넘길게요</Text>
        </Pressable>
      </View>
    );
  } else if (profile) {
    let footer: ReactNode = null;
    if (letter.status === 'open') {
      footer = (
        <>
          <Text style={[styles.note, { color: t.sub }]}>{expiryLabel(letter)}</Text>
          <View style={styles.row}>
            <Button variant="secondary" label="이번엔 넘길게요" onPress={() => setAsking(true)} />
            <Button label="이야기 나눠볼게요" onPress={() => answer(letter.id, 'accept')} />
          </View>
        </>
      );
    } else if (letter.status === 'acceptedWaiting') {
      footer = (
        <>
          <Text style={[styles.note, { color: t.sub }]}>상대분의 답을 기다리는 중이에요. 좋다고 하면 바로 알려 드릴게요.</Text>
          {__DEV__ ? (
            <View style={styles.row}>
              <Button variant="secondary" label="(mock) 상대도 수락" onPress={() => simulateMutualAccept(letter.id)} />
            </View>
          ) : null}
        </>
      );
    } else if (letter.status === 'connected' && connection) {
      footer = (
        <View style={styles.row}>
          <Button label="대화하러 가기" onPress={() => router.push(`/chat/${connection.id}`)} />
        </View>
      );
    }
    body = (
      <ScrollView contentContainerStyle={styles.pad}>
        <LetterView profile={profile} footer={footer} showPhoto={!connection?.ended} />
      </ScrollView>
    );
  } else {
    body = <Empty text="닫힌 편지예요." />;
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="갈피의 편지" onBack={close} />
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { padding: SPACE.l, gap: SPACE.m },
  note: { fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', gap: SPACE.s },
  story: { borderWidth: 1, borderRadius: RADIUS.card, padding: SPACE.l },
  link: { fontSize: 13, textDecorationLine: 'underline', textAlign: 'center' },
  reason: { minHeight: 120, borderWidth: 1, borderRadius: RADIUS.card, padding: SPACE.m, fontSize: 15, textAlignVertical: 'top' },
});
