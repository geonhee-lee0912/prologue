/** 친구 탭 중요한 일 카드 — 크게 하나 + 작게 하나 (앱 IA 3.2) */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { HomeCard } from '../domain/home';
import { RADIUS, SPACE } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';

export function EventCard({ card, size, onPress }: { card: HomeCard; size: 'large' | 'small'; onPress: () => void }) {
  const t = useTheme();
  const large = size === 'large';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.card, { backgroundColor: t.card, paddingVertical: large ? 14 : 10 }]}
    >
      <View style={styles.flex}>
        <Text style={[large ? styles.titleLarge : styles.titleSmall, { color: t.ink }]}>{card.title}</Text>
        {card.subtitle ? <Text style={[styles.subtitle, { color: t.sub }]}>{card.subtitle}</Text> : null}
      </View>
      <View style={[styles.action, { backgroundColor: large ? t.accent.primary : t.accent.soft }]}>
        <Text style={[styles.actionText, { color: large ? '#FFFFFF' : t.ink }]}>{card.actionLabel}</Text>
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
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  titleLarge: { fontSize: 15, fontWeight: '700' },
  titleSmall: { fontSize: 13, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  action: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: SPACE.m },
  actionText: { fontSize: 12, fontWeight: '600' },
});
