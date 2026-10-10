/** @screen 내 이야기 탭 — 앱 IA v2 7장. Task 13에서 채운다 */
import { Empty, Screen, TabTitle } from '../../components/ui';

export default function StoryTab() {
  return (
    <Screen>
      <TabTitle title="내 이야기" />
      <Empty text="준비 중이에요." />
    </Screen>
  );
}
