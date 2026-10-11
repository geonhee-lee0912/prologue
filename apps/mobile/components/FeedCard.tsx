/** 친구 탭 소식 카드 — 갈피·서고·나에 대한 것만 (앱 IA 3.3) */
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import type { FeedItem } from '../domain/feed';
import { useAppStore } from '../state/app-store';
import { useTheme } from '../theme/use-theme';
import { Text } from './AppText';
import { TasteCardView } from './TasteCardView';
import { Card, GalpiText } from './ui';

export function FeedCard({ item }: { item: FeedItem }) {
  const t = useTheme();
  const router = useRouter();
  const tasteCards = useAppStore((s) => s.tasteCards);
  const pickTasteCard = useAppStore((s) => s.pickTasteCard);
  const kicker = [styles.kicker, { color: t.sub }];
  const body = [styles.body, { color: t.ink }];

  switch (item.kind) {
    case 'tasteCard': {
      const card = tasteCards.find((c) => c.id === item.cardId);
      if (!card) return null;
      return (
        <Card>
          <Text style={kicker}>오늘의 취향 카드</Text>
          <TasteCardView card={card} onPick={(p) => pickTasteCard(card.id, p)} />
        </Card>
      );
    }
    case 'lightIntroAvailable':
      return (
        <Card onPress={() => router.push('/light-intro')}>
          <Text style={kicker}>가벼운 소개</Text>
          <Text style={body}>가볍게 볼 분이 있어요</Text>
        </Card>
      );
    case 'journal':
      return (
        <Card>
          <Text style={kicker}>갈피의 서고 일지</Text>
          <GalpiText>{item.text}</GalpiText>
        </Card>
      );
    case 'profileChanged':
      return (
        <Card onPress={() => router.push('/galpi/profile')}>
          <Text style={kicker}>갈피가 프로필을 바꿨어요</Text>
          <Text style={body}>{item.text}</Text>
        </Card>
      );
    case 'archiveNews':
      return (
        <Card>
          <Text style={kicker}>서고 소식</Text>
          <Text style={body}>{item.text}</Text>
        </Card>
      );
    case 'myStory':
      return (
        <Card onPress={() => router.navigate('/story')}>
          <Text style={kicker}>내 이야기</Text>
          <Text style={body}>{item.text}</Text>
        </Card>
      );
  }
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, marginBottom: 4 },
  body: { fontSize: 14, lineHeight: 20 },
});
