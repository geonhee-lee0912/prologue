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

export function LetterView({
  profile,
  footer,
  showPhoto = true,
}: {
  profile: LetterProfile;
  footer?: ReactNode;
  /** 끝난 연결의 첫 장에는 사진이 남지 않는다 (앱 IA 6장) */
  showPhoto?: boolean;
}) {
  const t = useTheme();
  const chips = [`${profile.age} · ${profile.area}`, ...profile.practical, ...profile.badges, ...profile.allowedConditions];
  return (
    <View style={[styles.paper, { backgroundColor: t.card }]}>
      {showPhoto ? <Photo uri={profile.photoUri} name={profile.name} height={240} /> : null}
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
      {/* AI가 만든 글임을 알린다 (CLAUDE.md 13장, AI 기본법 투명성) */}
      <Text style={[styles.aiNote, { color: t.sub }]}>이 편지는 AI가 썼어요</Text>
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
  aiNote: { fontSize: 11, textAlign: 'right', marginTop: -SPACE.s },
});
