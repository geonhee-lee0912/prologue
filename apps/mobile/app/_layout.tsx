import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_FILES } from '../assets/fonts';
import { useAppStore } from '../state/app-store';

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONT_FILES);
  const insets = useSafeAreaInsets();
  const beginSession = useAppStore((s) => s.beginSession);

  useEffect(() => {
    beginSession();
  }, [beginSession]);

  if (!fontsLoaded) return null;

  const screens = (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="galpi/chat" />
        <Stack.Screen name="letter/[id]" />
        <Stack.Screen name="light-intro" options={{ presentation: 'modal' }} />
        <Stack.Screen name="galpi/profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="me/letter-preview" options={{ presentation: 'modal' }} />
        <Stack.Screen name="chat/[id]" />
      </Stack>
    </>
  );

  // The local preview draws its camera outside the iframe, so the browser reports no inset.
  if (__DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' && window.name === 'prologue-device-frame') {
    // Camera bottom (26 + 32) minus the frame bezel (14), in unscaled frame pixels.
    return <SafeAreaInsetsContext.Provider value={{ ...insets, top: Math.max(insets.top, 44) }}>{screens}</SafeAreaInsetsContext.Provider>;
  }
  return screens;
}
