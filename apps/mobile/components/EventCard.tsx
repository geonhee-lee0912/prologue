/** 친구 탭 중요한 일 카드 — 크게 하나 + 작게 하나 (앱 IA 3.2) */
import { Pressable, StyleSheet, View } from 'react-native';
import type { HomeCard } from '../domain/home';
import { RADIUS, SPACE } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';
import { Text } from './AppText';

export function EventCard({ card, size, onPress }: { card: HomeCard; size: 'large' | 'small'; onPress: () => void }) {
  const t = useTheme();
  const large = size === 'large';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: t.fill, paddingVertical: large ? 14 : 10 }]}
    >
      <View style={styles.flex}>
        <Text style={[large ? styles.titleLarge : styles.titleSmall, { color: t.ink }]}>{card.title}</Text>
        {card.subtitle ? <Text style={[styles.subtitle, { color: t.sub }]}>{card.subtitle}</Text> : null}
      </View>
      {/* 회색 상자 안의 보조 버튼은 흰색 + 선 */}
      <View style={[styles.action, large ? { backgroundColor: t.ink } : { backgroundColor: t.bg, borderWidth: 1, borderColor: t.line }]}>
        <Text style={[styles.actionText, { color: large ? t.onInk : t.ink }]}>{card.actionLabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACE.m,
    marginHorizontal: SPACE.l,
    marginBottom: SPACE.s,
  },
  titleLarge: { fontSize: 15, fontWeight: '700' },
  titleSmall: { fontSize: 13, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  action: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: SPACE.m },
  actionText: { fontSize: 12, fontWeight: '600' },
});
