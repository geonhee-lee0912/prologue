import { GowunBatang_400Regular, useFonts } from '@expo-google-fonts/gowun-batang';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAppStore } from '../state/app-store';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ GowunBatang_400Regular });
  const beginSession = useAppStore((s) => s.beginSession);

  useEffect(() => {
    beginSession();
  }, [beginSession]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="galpi/chat" />
        <Stack.Screen name="letter/[id]" />
        <Stack.Screen name="light-intro" options={{ presentation: 'modal' }} />
        <Stack.Screen name="galpi/profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="me/letter-preview" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}
