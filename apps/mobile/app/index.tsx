import { Redirect } from 'expo-router';
import { useAppStore } from '../state/app-store';

/**
 * 루트 진입 — 첫 실행이면 갈피 대화방에서 첫 만남, 그 뒤로는 친구 탭 (앱 IA v2 2장)
 * 로그인(a01-splash, a03-login)은 백엔드가 붙을 때 다시 잇는다.
 */
export default function Index() {
  const firstRunDone = useAppStore((s) => s.firstRunDone);
  return <Redirect href={firstRunDone ? '/friends' : '/galpi/chat'} />;
}
