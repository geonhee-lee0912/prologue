import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GALPI_EXPRESSIONS } from '../assets/galpi';
import { letterCardView } from '../domain/letters';
import type { GalpiMessage, Letter } from '../domain/types';
import { RADIUS, SPACE } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';
import { GalpiAvatar } from './GalpiAvatar';
import { GalpiText } from './ui';

export function GalpiMessageView({
  message,
  letter,
  connectionEnded,
  now,
  onOpenLetter,
  onOpenLightIntro,
}: {
  message: GalpiMessage;
  letter?: Letter;
  /** 이 편지로 생긴 연결이 끝났는가 */
  connectionEnded: boolean;
  now: Date;
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
      if (!letter) return null;
      // 닫힌 편지는 다시 열 수 없는 조용한 한 줄로만 남는다 (앱 IA 5장)
      const view = letterCardView(letter, now, connectionEnded);
      if (view.kind === 'line') {
        return <Text style={[styles.system, { color: t.sub }]}>{view.text}</Text>;
      }
      return (
        <View style={styles.galpiRow}>
          <GalpiAvatar size={30} />
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpenLetter(message.letterId)}
            style={[styles.letterCard, { backgroundColor: t.card, borderColor: t.accent.a1 }]}
          >
            <Text style={[styles.letterTitle, { color: t.ink }]}>✉️ 갈피의 편지</Text>
            <Text style={[styles.letterStatus, { color: t.sub }]}>{view.text}</Text>
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
