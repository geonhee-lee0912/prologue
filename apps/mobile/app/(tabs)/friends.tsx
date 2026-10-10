/** @screen 친구 탭 (첫 화면) — 앱 IA v2 3.1. Task 11에서 채운다 */
import { Empty, Screen, TabTitle } from '../../components/ui';

export default function FriendsTab() {
  return (
    <Screen>
      <TabTitle title="친구" />
      <Empty text="준비 중이에요." />
    </Screen>
  );
}
