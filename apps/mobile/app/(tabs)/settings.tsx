/**
 * @screen 설정 탭 — 앱 IA v2 8장. 기존 G 계정
 * 가벼운 소개에 나가기(기본 꺼짐), 편지 잠시 쉬기. 동의·결제·신고는 담백한 시스템 문구(갈피 문서 2.6).
 * __DEV__ 에서만 시나리오·팔레트 스위처(DevPanel)를 보인다.
 */
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { DevPanel } from '../../components/DevPanel';
import { Screen, TabTitle } from '../../components/ui';
import { useAppStore } from '../../state/app-store';
import { SPACE } from '../../theme/tokens';
import { useTheme } from '../../theme/use-theme';

function Row({ label, detail }: { label: string; detail?: string }) {
  const t = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: t.line }]}>
      <Text style={[styles.rowLabel, { color: t.ink }]}>{label}</Text>
      {detail ? <Text style={[styles.detail, { color: t.sub }]}>{detail}</Text> : null}
    </View>
  );
}

function ToggleRow({
  label,
  caption,
  value,
  onChange,
}: {
  label: string;
  caption: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: t.line }]}>
      <View style={styles.flex}>
        <Text style={[styles.toggleLabel, { color: t.ink }]}>{label}</Text>
        <Text style={[styles.caption, { color: t.sub }]}>{caption}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.accent.primary, false: t.line }} />
    </View>
  );
}

export default function SettingsTab() {
  const settings = useAppStore((s) => s.settings);
  const setSetting = useAppStore((s) => s.setSetting);
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TabTitle title="설정" />
        <Row label="내 정보·사진" detail="준비 중" />
        <Row label="편지에 담을 조건 정보" detail="준비 중" />
        <ToggleRow
          label="가벼운 소개에 나가기"
          caption="켜면 다른 분의 가벼운 소개에 내 사진이 나갈 수 있어요. 기본은 꺼져 있어요."
          value={settings.lightIntroExposure}
          onChange={(v) => setSetting('lightIntroExposure', v)}
        />
        <ToggleRow
          label="편지 잠시 쉬기"
          caption="켜 두면 새 편지를 쓰지 않아요. 언제든 다시 끌 수 있어요."
          value={settings.pauseLetters}
          onChange={(v) => setSetting('pauseLetters', v)}
        />
        <Row label="연결권" detail="준비 중" />
        <Row label="알림" detail="준비 중" />
        <Row label="차단·신고" detail="준비 중" />
        <Row label="결정 설명 요청" detail="준비 중" />
        <Row label="고객센터·약관" detail="준비 중" />
        <Row label="탈퇴" detail="준비 중" />
        {__DEV__ ? <DevPanel /> : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: SPACE.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.m,
    paddingHorizontal: SPACE.l,
    paddingVertical: SPACE.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { flex: 1, fontSize: 15 },
  toggleLabel: { fontSize: 15 },
  detail: { fontSize: 13 },
  caption: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});
