/**
 * 개발용 패널 — 미리보기에서 시나리오를 바꾼다. __DEV__ 에서만 보인다.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { SCENARIO_LABELS, type ScenarioKey } from '../mock/scenarios';
import { useAppStore } from '../state/app-store';
import { RADIUS, SPACE } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';
import { Text } from './AppText';
import { SectionLabel } from './ui';

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? t.ink : t.line, backgroundColor: active ? t.fill : t.bg },
      ]}
    >
      <Text style={[styles.chipText, { color: t.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function DevPanel() {
  const scenario = useAppStore((s) => s.scenario);
  const loadScenario = useAppStore((s) => s.loadScenario);
  return (
    <View>
      <SectionLabel>개발용 — 시나리오</SectionLabel>
      <View style={styles.chips}>
        {(Object.keys(SCENARIO_LABELS) as ScenarioKey[]).map((key) => (
          <Chip key={key} label={SCENARIO_LABELS[key]} active={scenario === key} onPress={() => loadScenario(key)} />
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
