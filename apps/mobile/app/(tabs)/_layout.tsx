/**
 * 하단 탭 — 앱 IA v2.1: 친구 / 대화 / 내 이야기 / 설정
 * 어떤 탭도 다른 사람을 둘러보는 곳이 되지 않는다 (하드룰 1)
 */
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { FONT } from '../../theme/fonts';
import { useTheme } from '../../theme/use-theme';

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.ink,
        tabBarInactiveTintColor: t.sub,
        tabBarStyle: { backgroundColor: t.bg, borderTopColor: t.line },
        // 탭 이름은 react-navigation 이 그려서 AppText 를 거치지 않는다
        tabBarLabelStyle: { fontFamily: FONT.medium },
      }}
    >
      <Tabs.Screen
        name="friends"
        options={{ title: '친구', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="chats"
        options={{ title: '대화', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="story"
        options={{ title: '내 이야기', tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={color} size={size} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '설정', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} /> }}
      />
    </Tabs>
  );
}
