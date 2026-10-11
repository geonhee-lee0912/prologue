/** 취향 카드 — 사람이 아니라 장면을 둘 중 하나. 아무도 비교당하지 않는다 (앱 IA 7장) */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TasteCard } from '../domain/types';
import { RADIUS, SPACE } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';

export function TasteCardView({ card, onPick }: { card: TasteCard; onPick: (picked: 0 | 1) => void }) {
  const t = useTheme();
  const choices: (0 | 1)[] = [0, 1];
  return (
    <View style={styles.row}>
      {choices.map((i) => {
        const picked = card.picked === i;
        const dimmed = card.picked !== null && !picked;
        return (
          <Pressable
            key={card.options[i]}
            accessibilityRole="button"
            disabled={card.picked !== null}
            onPress={() => onPick(i)}
            style={[
              styles.option,
              { backgroundColor: picked ? t.accent.a1 : t.accent.soft, opacity: dimmed ? 0.5 : 1 },
            ]}
          >
            <Text style={[styles.label, { color: t.ink }]}>{card.options[i]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACE.s, marginTop: SPACE.s },
  option: { flex: 1, borderRadius: RADIUS.chip, paddingVertical: SPACE.m, paddingHorizontal: SPACE.s },
  label: { fontSize: 13, textAlign: 'center' },
});
