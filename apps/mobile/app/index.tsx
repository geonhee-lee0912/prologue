import { Redirect } from 'expo-router';

/**
 * 루트 진입. 향후 토큰 검사 후
 *  - 미인증: /a01-splash
 *  - 인증 + 프로필 미완료: /b01-intro 등
 *  - 인증 + 프로필 완료: /(tabs)/home
 * 로 분기. 지금은 항상 스플래시.
 */
export default function Index() {
  return <Redirect href="/a01-splash" />;
}
