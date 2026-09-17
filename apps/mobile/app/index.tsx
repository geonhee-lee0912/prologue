import { Redirect } from 'expo-router';

/**
 * 루트 진입. 토큰 검사 후 분기 예정.
 *  - 미인증: /a01-splash
 *  - 인증 완료: /(main) 주선자 대화창
 */
export default function Index() {
  return <Redirect href="/a01-splash" />;
}
