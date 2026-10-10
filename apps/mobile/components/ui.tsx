import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';
import { FONT, RADIUS, SPACE } from '../theme/tokens';
import { useTheme } from '../theme/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, edges = ['top'] }: { children: ReactNode; edges?: Edge[] }) {
  const t = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: t.bg }]}>
      {children}
    </SafeAreaView>
  );
}

/** 탭 화면의 큰 제목 — 카톡의 "친구", "채팅"처럼 */
export function TabTitle({ title, right }: { title: string; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.tabTitle}>
      <Text style={[styles.tabTitleText, { color: t.ink }]}>{title}</Text>
      {right}
    </View>
  );
}

export function Header({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[styles.header, { borderBottomColor: t.line }]}>
      <View style={styles.headerSide}>
        {onBack ? <IconButton name="chevron-back" label="뒤로" onPress={onBack} /> : null}
      </View>
      <Text style={[styles.headerTitle, { color: t.ink }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  );
}

export function IconButton({
  name,
  label,
  onPress,
  size = 22,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  size?: number;
}) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={styles.iconButton}>
      <Ionicons name={name} size={size} color={t.ink} />
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[styles.section, { color: t.sub }]}>{children}</Text>;
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const t = useTheme();
  const base = [styles.card, { backgroundColor: t.card }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={base}>
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}) {
  const t = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: primary ? t.accent.primary : t.card,
          borderColor: primary ? t.accent.primary : t.line,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? '#FFFFFF' : t.ink }]}>{label}</Text>
    </Pressable>
  );
}

/** 갈피의 말 — 명조. 세계관은 여기에만 담는다 (갈피 문서 2.7) */
export function GalpiText({
  children,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text numberOfLines={numberOfLines} style={[styles.galpiText, { color: t.ink }, style]}>
      {children}
    </Text>
  );
}

export function Empty({ text }: { text: string }) {
  const t = useTheme();
  return <Text style={[styles.empty, { color: t.sub }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACE.l,
    paddingTop: SPACE.m,
    paddingBottom: SPACE.s,
  },
  tabTitleText: { fontSize: 22, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACE.s,
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: 64, flexDirection: 'row', alignItems: 'center' },
  headerRight: { justifyContent: 'flex-end' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600' },
  iconButton: { padding: SPACE.xs },
  section: { fontSize: 12, marginTop: SPACE.l, marginBottom: SPACE.s, paddingHorizontal: SPACE.l },
  card: {
    borderRadius: RADIUS.card,
    padding: SPACE.m,
    marginHorizontal: SPACE.l,
    marginBottom: SPACE.s,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.chip,
    borderWidth: 1,
    paddingVertical: SPACE.m,
  },
  buttonText: { fontSize: 14, fontWeight: '600' },
  galpiText: { fontFamily: FONT.letter, fontSize: 15, lineHeight: 23 },
  empty: { fontSize: 13, lineHeight: 20, paddingHorizontal: SPACE.l, paddingVertical: SPACE.m },
});
