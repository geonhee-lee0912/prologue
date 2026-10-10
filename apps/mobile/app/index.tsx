import { Redirect } from 'expo-router';

/**
 * 루트 진입. mock 단계에서는 로그인 없이 바로 친구 탭으로 간다.
 * 첫 실행 분기(갈피 대화방에서 첫 만남)는 Task 8에서 붙인다.
 * 로그인(a01-splash, a03-login)은 백엔드가 붙을 때 다시 잇는다.
 */
export default function Index() {
  return <Redirect href="/friends" />;
}
