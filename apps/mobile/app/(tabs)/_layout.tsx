import { Tabs } from 'expo-router';

/**
 * 하단 4탭 (08_화면목록_IA 4장):
 *  - 홈 (D01)
 *  - 관심 (E04)
 *  - 대화 (G01)
 *  - 마이 (J01)
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
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="interests" options={{ title: '관심' }} />
      <Tabs.Screen name="conversations" options={{ title: '대화' }} />
      <Tabs.Screen name="my" options={{ title: '마이' }} />
    </Tabs>
  );
}
