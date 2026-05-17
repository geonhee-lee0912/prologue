/**
 * 토큰 영구 저장소.
 *
 * - 네이티브 (iOS/Android): expo-secure-store (Keychain/Keystore)
 * - 웹: localStorage (브라우저 미리보기용 fallback)
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_KEY = 'prologue.accessToken';
const REFRESH_KEY = 'prologue.refreshToken';

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const authStorage = {
  async setTokens(accessToken: string, refreshToken: string) {
    await Promise.all([setItem(ACCESS_KEY, accessToken), setItem(REFRESH_KEY, refreshToken)]);
  },
  getAccessToken: () => getItem(ACCESS_KEY),
  getRefreshToken: () => getItem(REFRESH_KEY),
  async clear() {
    await Promise.all([deleteItem(ACCESS_KEY), deleteItem(REFRESH_KEY)]);
  },
};
