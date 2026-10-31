import { Tabs } from 'expo-router';

/**
 * 하단 5탭 (IA v0.3, TAB-v0.3 — 탭 이름은 전부 가칭):
 *  - 추천   (home)        오늘의 큐레이션
 *  - 이야기 (story)       순수 무료 피드
 *  - 이어짐 (connections) 관심~대화 한 퍼널 (관심+대화 병합)
 *  - 활동   (activity)    참여형 프로그램 선반
 *  - 마이   (my)          내 책 가꾸기
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1a1a1a',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { borderTopColor: '#eee' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: '추천' }} />
      <Tabs.Screen name="story" options={{ title: '이야기' }} />
      <Tabs.Screen name="connections" options={{ title: '이어짐' }} />
      <Tabs.Screen name="activity" options={{ title: '활동' }} />
      <Tabs.Screen name="my" options={{ title: '마이' }} />
    </Tabs>
  );
}
