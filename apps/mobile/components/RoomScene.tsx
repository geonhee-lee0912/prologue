/**
 * 갈피의 방 — 갈피 프로필의 배경 (앱 IA 3.6)
 * 밤에는 방 안만 바뀐다. 책장은 내 이야기만큼 찬다. 기념품은 여정의 순간에만 놓인다.
 */
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { GALPI_FRONT } from '../assets/galpi';
import type { Keepsake } from '../domain/types';
import { useTheme } from '../theme/use-theme';
import { Text } from './AppText';

const KEEPSAKE_ICON: Record<Keepsake['kind'], string> = {
  firstLetter: '✉️',
  firstConnection: '🕯️',
  firstMeeting: '🖼️',
};

const PER_ROW = 5;

export function RoomScene({
  night,
  keepsakes,
  books,
  onShelfPress,
}: {
  night: boolean;
  keepsakes: Keepsake[];
  books: number;
  onShelfPress: () => void;
}) {
  const t = useTheme();
  const room = t.room;
  const spines = room.spines;
  return (
    <View style={[styles.room, { backgroundColor: night ? room.nightWall : room.wall }]}>
      <View style={[styles.floor, { backgroundColor: night ? room.nightFloor : room.floor }]} />
      <View style={[styles.window, { borderColor: room.wood, backgroundColor: night ? '#1B2638' : '#DCE6F2' }]}>
        {night ? <View style={styles.moon} /> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="책장 — 내 이야기"
        onPress={onShelfPress}
        style={[styles.shelf, { borderColor: room.wood }]}
      >
        {[0, 1, 2].map((row) => (
          <View key={row} style={[styles.shelfRow, { borderBottomColor: room.wood }]}>
            {Array.from({ length: Math.max(0, Math.min(PER_ROW, books - row * PER_ROW)) }).map((_, i) => (
              <View key={i} style={[styles.spine, { backgroundColor: spines[(row + i) % spines.length] }]} />
            ))}
          </View>
        ))}
      </Pressable>
      <View style={[styles.desk, { backgroundColor: room.wood }]}>
        <Text style={styles.keepsakes}>{keepsakes.map((k) => KEEPSAKE_ICON[k.kind]).join(' ')}</Text>
      </View>
      {night ? <View style={[styles.lamp, { backgroundColor: room.lamp }]} /> : null}
      <Image source={GALPI_FRONT} style={[styles.galpi, night ? styles.galpiNight : null]} contentFit="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  room: { flex: 1, overflow: 'hidden' },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '34%' },
  window: { position: 'absolute', right: 28, top: 80, width: 64, height: 76, borderWidth: 5, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  moon: { position: 'absolute', right: 10, top: 10, width: 12, height: 12, borderRadius: 6, backgroundColor: '#F3E6B0' },
  shelf: { position: 'absolute', left: 24, top: 110, width: 70, height: 150, borderWidth: 4, justifyContent: 'space-around' },
  shelfRow: { flexDirection: 'row', alignItems: 'flex-end', height: 44, borderBottomWidth: 3, paddingHorizontal: 3, gap: 2 },
  spine: { width: 9, height: 34, borderRadius: 1 },
  desk: { position: 'absolute', right: 20, bottom: '30%', width: 96, height: 30, borderRadius: 3, alignItems: 'center', justifyContent: 'flex-start' },
  keepsakes: { fontSize: 16, marginTop: -20 },
  lamp: { position: 'absolute', right: 52, bottom: '36%', width: 12, height: 12, borderRadius: 6, boxShadow: '0 0 40px 20px rgba(243,201,122,0.45)' },
  galpi: { position: 'absolute', alignSelf: 'center', bottom: '12%', width: 170, height: 330 },
  galpiNight: { opacity: 0.85 },
});
