/**
 * 개발용 패널 — 미리보기에서 시나리오와 팔레트를 바꾼다. __DEV__ 에서만 보인다.
 * 팔레트는 아직 잠정이라(IA 10.6) 화면을 만들며 비교해 고른다.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SCENARIO_LABELS, type ScenarioKey } from '../mock/scenarios';
import { useAppStore } from '../state/app-store';
import { PALETTES, type PaletteKey, RADIUS, SPACE } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';
import { SectionLabel } from './ui';

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? t.accent.primary : t.line, backgroundColor: active ? t.accent.soft : t.card },
      ]}
    >
      <Text style={[styles.chipText, { color: t.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function DevPanel() {
  const scenario = useAppStore((s) => s.scenario);
  const palette = useAppStore((s) => s.palette);
  const loadScenario = useAppStore((s) => s.loadScenario);
  const setPalette = useAppStore((s) => s.setPalette);
  return (
    <View>
      <SectionLabel>개발용 — 시나리오</SectionLabel>
      <View style={styles.chips}>
        {(Object.keys(SCENARIO_LABELS) as ScenarioKey[]).map((key) => (
          <Chip key={key} label={SCENARIO_LABELS[key]} active={scenario === key} onPress={() => loadScenario(key)} />
        ))}
      </View>
      <SectionLabel>개발용 — 팔레트</SectionLabel>
      <View style={styles.chips}>
        {(Object.keys(PALETTES) as PaletteKey[]).map((key) => (
          <Chip key={key} label={PALETTES[key].label} active={palette === key} onPress={() => setPalette(key)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s, paddingHorizontal: SPACE.l },
  chip: { borderWidth: 1, borderRadius: RADIUS.chip, paddingVertical: 6, paddingHorizontal: SPACE.m },
  chipText: { fontSize: 12 },
});
