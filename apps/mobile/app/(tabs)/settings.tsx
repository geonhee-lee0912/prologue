/** @screen 설정 탭 — 앱 IA v2 8장. Task 13에서 채운다. 개발용 패널은 지금부터 쓴다 */
import { ScrollView } from 'react-native';
import { DevPanel } from '../../components/DevPanel';
import { Empty, Screen, TabTitle } from '../../components/ui';

export default function SettingsTab() {
  return (
    <Screen>
      <ScrollView>
        <TabTitle title="설정" />
        <Empty text="준비 중이에요." />
        {__DEV__ ? <DevPanel /> : null}
      </ScrollView>
    </Screen>
  );
}
