import { Redirect } from 'expo-router';

/**
 * 루트 진입 — 스플래시에서 기존 세션과 첫 가입 진입을 나눈다.
 */
export default function Index() {
  return <Redirect href="/a01-splash" />;
}
