/**
 * @screen 갈피 프로필 = 갈피의 방 — 앱 IA v2 3.6~3.9
 * 다마고치 요소는 여기에만. 들어오면 갈피가 하던 일을 멈추고 알아본다.
 * 태엽은 보상만 — 게이지·숫자·벌 없음(하드룰 6). 방 꾸미기는 MVP 다음.
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoomScene } from '../../components/RoomScene';
import { GalpiText, IconButton, type IconName } from '../../components/ui';
import { selectHome } from '../../domain/home';
import { isNight } from '../../domain/time';
import { useAppStore } from '../../state/app-store';
import { SPACE } from '../../theme/tokens';
import { useTheme } from '../../theme/use-theme';

const WIND_REACTIONS = [
  '아, 따뜻하다. 고마워요 🙂',
  '태엽이 감기는 소리가 좋아요.',
  '헤헤, 조금 간지러워요.',
] as const;

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.action}>
      <View style={[styles.actionIcon, { backgroundColor: t.card }]}>
        <Ionicons name={icon} size={20} color={t.ink} />
      </View>
      <Text style={[styles.actionLabel, { color: t.ink }]}>{label}</Text>
    </Pressable>
  );
}

export default function GalpiProfileScreen() {
  const t = useTheme();
  const router = useRouter();
  const state = useAppStore();
  const [reaction, setReaction] = useState<string | null>(null);
  const now = new Date();
  const line = reaction ?? selectHome(state, now).primary.galpiLine;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/friends'));
  const wind = () => {
    setReaction(WIND_REACTIONS[state.windCount % WIND_REACTIONS.length]);
    state.windUp();
  };

  return (
    <View style={[styles.flex, { backgroundColor: t.bg }]}>
      <RoomScene
        night={isNight(now)}
        keepsakes={state.keepsakes}
        books={Math.min(15, state.chapters.length * 3)}
        // 모달 위에서 navigate 하면 (tabs)가 한 겹 더 쌓인다. dismissTo 로 기존 탭 화면으로 돌아간다
        onShelfPress={() => router.dismissTo('/story')}
      />
      <SafeAreaView edges={['top']} style={styles.closeWrap}>
        {/* 밤에도 읽히도록 방 색과 무관한 카드색 칩 위에 둔다 (앱 IA 3.6: 틀은 그대로, 방 안만 바뀐다) */}
        <View style={[styles.actionIcon, { backgroundColor: t.card }]}>
          <IconButton name="close" label="닫기" onPress={close} />
        </View>
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} style={[styles.panel, { backgroundColor: t.bg }]}>
        <Text style={[styles.name, { color: t.ink }]}>갈피</Text>
        <GalpiText style={styles.line}>{line}</GalpiText>
        <View style={styles.actions}>
          {/* 갈피 대화방의 머리 아바타가 이 방을 연다. push 로 열면 대화방이 겹쳐 쌓이므로 dismissTo 로 기존 대화방으로 돌아간다 */}
          <Action icon="chatbubble-outline" label="대화하기" onPress={() => router.dismissTo('/galpi/chat')} />
          <Action icon="key-outline" label="태엽 감기" onPress={wind} />
          <Action
            icon="leaf-outline"
            label="방 꾸미기"
            onPress={() => setReaction('방 꾸미기는 곧 열려요. 어떤 걸 놓을지 저도 기대돼요 🙂')}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  closeWrap: { position: 'absolute', left: SPACE.s, top: 0 },
  panel: { paddingHorizontal: SPACE.l, paddingTop: SPACE.m, paddingBottom: SPACE.m, alignItems: 'center', gap: SPACE.s },
  name: { fontSize: 17, fontWeight: '700' },
  line: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: SPACE.xl, marginTop: SPACE.s },
  action: { alignItems: 'center', gap: SPACE.xs },
  actionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  actionLabel: { fontSize: 11 },
});
