/**
 * 편지 본문 — 사진, 실용 정보·신뢰 배지·허락한 조건(하드룰 8), "왜 이 분인가", 갈피 드림.
 * 인터뷰 원문과 넘긴 이유는 담지 않는다 (하드룰 2).
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LetterProfile } from '../domain/types';
import { RADIUS, SPACE } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';
import { Photo } from './Photo';
import { GalpiText } from './ui';

export function LetterView({ profile, footer }: { profile: LetterProfile; footer?: ReactNode }) {
  const t = useTheme();
  const chips = [`${profile.age} · ${profile.area}`, ...profile.practical, ...profile.badges, ...profile.allowedConditions];
  return (
    <View style={[styles.paper, { backgroundColor: t.card }]}>
      <Photo uri={profile.photoUri} name={profile.name} height={240} />
      <Text style={[styles.name, { color: t.ink }]}>{profile.name} 님</Text>
      <View style={styles.chips}>
        {chips.map((c) => (
          <Text key={c} style={[styles.chip, { backgroundColor: t.accent.soft, color: t.ink }]}>
            {c}
          </Text>
        ))}
      </View>
      <GalpiText style={styles.why}>{profile.why}</GalpiText>
      <GalpiText style={[styles.sign, { color: t.sub }]}>갈피 드림</GalpiText>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { borderRadius: RADIUS.card, padding: SPACE.l, gap: SPACE.m, boxShadow: '0 3px 14px rgba(0,0,0,0.07)' },
  name: { fontSize: 18, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs },
  chip: { fontSize: 12, borderRadius: 10, paddingVertical: 3, paddingHorizontal: SPACE.s, overflow: 'hidden' },
  why: { fontSize: 16, lineHeight: 26 },
  sign: { textAlign: 'right' },
});
