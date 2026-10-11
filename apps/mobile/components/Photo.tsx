import { Image } from 'expo-image';
import { View } from 'react-native';
import { useTheme } from '../theme/use-theme';
import { Text } from './AppText';

/** 사진. mock 은 사진이 없어 이름 첫 글자로 자리를 채운다 */
export function Photo({
  uri,
  name,
  height,
  width,
  rounded = 12,
}: {
  uri: string | null;
  name: string;
  height: number;
  width?: number;
  rounded?: number;
}) {
  const t = useTheme();
  const box = { height, width, borderRadius: rounded };
  if (uri) return <Image source={{ uri }} style={box} contentFit="cover" />;
  return (
    <View style={[box, { backgroundColor: t.line, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: t.sub, fontWeight: '700', fontSize: height > 80 ? 40 : 16 }}>{name.slice(0, 1)}</Text>
    </View>
  );
}
