import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GALPI_EXPRESSIONS } from '../assets/galpi';
import type { GalpiMessage, Letter } from '../domain/types';
import { RADIUS, SPACE } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';
import { GalpiAvatar } from './GalpiAvatar';
import { GalpiText } from './ui';

function letterStatusText(letter: Letter | undefined): string {
  if (!letter) return '';
  switch (letter.status) {
    case 'choosing':
      return '두 분 중 누구 이야기를 먼저 들을까요?';
    case 'open':
      return '편지가 열려 있어요';
    case 'acceptedWaiting':
      return '상대분의 답을 기다리는 중이에요';
    case 'connected':
      return '서로 이야기 나눠 보기로 했어요';
    case 'passed':
      return '넘긴 편지예요';
    case 'expired':
      return '기한이 지난 편지예요';
  }
}

const OPENABLE: readonly Letter['status'][] = ['choosing', 'open', 'acceptedWaiting', 'connected'];

export function GalpiMessageView({
  message,
  letter,
  onOpenLetter,
  onOpenLightIntro,
}: {
  message: GalpiMessage;
  letter?: Letter;
  onOpenLetter: (letterId: string) => void;
  onOpenLightIntro: () => void;
}) {
  const t = useTheme();
  switch (message.kind) {
    case 'text':
      if (message.from === 'me') {
        return (
          <View style={styles.mineRow}>
            <Text style={[styles.mine, { backgroundColor: t.accent.soft, color: t.ink }]}>{message.text}</Text>
          </View>
        );
      }
      return (
        <View style={styles.galpiRow}>
          <GalpiAvatar size={30} />
          <View style={[styles.galpiBubble, { backgroundColor: t.card }]}>
            <GalpiText>{message.text}</GalpiText>
          </View>
        </View>
      );
    case 'emoticon':
      return (
        <View style={styles.galpiRow}>
          <GalpiAvatar size={30} />
          <Image source={GALPI_EXPRESSIONS[message.expression]} style={styles.emoticon} contentFit="contain" />
        </View>
      );
    case 'letter': {
      const openable = letter !== undefined && OPENABLE.includes(letter.status);
      return (
        <View style={styles.galpiRow}>
          <GalpiAvatar size={30} />
          <Pressable
            accessibilityRole="button"
            disabled={!openable}
            onPress={() => onOpenLetter(message.letterId)}
            style={[styles.letterCard, { backgroundColor: t.card, borderColor: t.accent.a1, opacity: openable ? 1 : 0.6 }]}
          >
            <Text style={[styles.letterTitle, { color: t.ink }]}>✉️ 갈피의 편지</Text>
            <Text style={[styles.letterStatus, { color: t.sub }]}>{letterStatusText(letter)}</Text>
          </Pressable>
        </View>
      );
    }
    case 'lightIntroInvite':
      return (
        <View style={styles.galpiRow}>
          <GalpiAvatar size={30} />
          <Pressable
            accessibilityRole="button"
            onPress={onOpenLightIntro}
            style={[styles.invite, { backgroundColor: t.accent.primary }]}
          >
            <Text style={styles.inviteText}>가볍게 볼 분이 있어요 · 열기</Text>
          </Pressable>
        </View>
      );
    case 'passedLetter':
      return <Text style={[styles.system, { color: t.sub }]}>넘긴 편지</Text>;
  }
}

const styles = StyleSheet.create({
  galpiRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.s, maxWidth: '86%' },
  galpiBubble: { borderRadius: RADIUS.bubble, paddingVertical: SPACE.s, paddingHorizontal: SPACE.m, flexShrink: 1 },
  mineRow: { alignItems: 'flex-end' },
  mine: {
    maxWidth: '80%',
    borderRadius: RADIUS.bubble,
    paddingVertical: SPACE.s,
    paddingHorizontal: SPACE.m,
    fontSize: 15,
    lineHeight: 22,
    overflow: 'hidden',
  },
  emoticon: { width: 96, height: 96 },
  letterCard: { borderRadius: RADIUS.card, borderWidth: 1, padding: SPACE.m, minWidth: 200, gap: SPACE.xs },
  letterTitle: { fontSize: 15, fontWeight: '600' },
  letterStatus: { fontSize: 13 },
  invite: { borderRadius: RADIUS.chip, paddingVertical: SPACE.s, paddingHorizontal: SPACE.m },
  inviteText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  system: { alignSelf: 'center', fontSize: 12, paddingVertical: SPACE.xs },
});
