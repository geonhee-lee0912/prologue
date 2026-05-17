import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError, api } from '../lib/api';
import { authStorage } from '../lib/auth-storage';

/**
 * H01 — 신고 화면 (FR-H01)
 *
 * 라우팅 파라미터:
 * - targetUserId (필수): 신고 대상 사용자 ID
 * - conversationId (선택): 대화방 컨텍스트
 * - messageId (선택): 특정 메시지 컨텍스트
 *
 * 정책:
 * - description 은 운영자 전용. 사용자에게 다시 보여주지 않는다.
 * - 신고 후 같은 화면을 다시 띄우지 않고 안내만 표시 후 뒤로 이동.
 */

const REPORT_TYPES: Array<{ value: string; label: string }> = [
  { value: 'rude_message', label: '무례하거나 모욕적인 표현' },
  { value: 'sexual_content', label: '성적 표현 / 부적절한 사진 요청' },
  { value: 'harassment', label: '괴롭힘 / 스토킹 / 위협' },
  { value: 'fake_information', label: '허위 정보 (사진/직업/나이 등)' },
  { value: 'in_relationship', label: '교제 중인 것으로 보임' },
  { value: 'scam_or_money_request', label: '금전 요구 / 사기 의심' },
  { value: 'external_contact_pressure', label: '외부 연락 강요' },
  { value: 'other', label: '기타' },
];

export default function ReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    targetUserId?: string;
    conversationId?: string;
    messageId?: string;
  }>();
  const targetUserId = params.targetUserId ?? '';
  const conversationId = params.conversationId;
  const messageId = params.messageId;

  const [reportType, setReportType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  async function onSubmit() {
    if (!targetUserId) {
      notify('오류', '신고 대상이 지정되지 않았습니다.');
      return;
    }
    if (!reportType) {
      notify('선택 필요', '신고 사유를 선택해 주세요.');
      return;
    }
    const token = await authStorage.getAccessToken();
    if (!token) {
      router.replace('/a03-login');
      return;
    }
    setSubmitting(true);
    try {
      await api.createReport(token, {
        targetUserId,
        reportType,
        description: description.trim() || undefined,
        conversationId,
        messageId,
      });
      notify(
        '신고가 접수되었어요',
        '검토 후 필요한 조치를 취하겠습니다. 결과는 별도로 알려드리지 않을 수 있어요.',
      );
      router.back();
    } catch (e) {
      if (e instanceof ApiError) notify(`오류 (${e.code})`, e.message);
      else notify('오류', e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ 취소</Text>
        </Pressable>
        <Text style={styles.headerTitle}>신고</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          어떤 점이 불편하셨나요? 신고 내용은 운영팀에서만 확인합니다. 상대에게는 누가 신고했는지
          공유되지 않아요.
        </Text>

        <Text style={styles.sectionTitle}>신고 사유</Text>
        <View style={styles.reasonList}>
          {REPORT_TYPES.map((r) => {
            const selected = reportType === r.value;
            return (
              <Pressable
                key={r.value}
                style={[styles.reasonItem, selected && styles.reasonItemSelected]}
                onPress={() => setReportType(r.value)}
              >
                <View style={[styles.radio, selected && styles.radioSelected]} />
                <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>상세 설명 (선택)</Text>
        <TextInput
          style={styles.descInput}
          placeholder="상황을 자세히 적어주시면 검토에 도움이 됩니다."
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{description.length}/2000</Text>

        <Pressable
          style={[styles.submitBtn, (!reportType || submitting) && styles.disabled]}
          disabled={!reportType || submitting}
          onPress={onSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>신고 접수</Text>
          )}
        </Pressable>

        <Text style={styles.footer}>
          허위 신고가 반복되면 서비스 이용이 제한될 수 있어요.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  back: { color: '#666', fontSize: 14 },
  headerTitle: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  body: { padding: 16, paddingBottom: 32 },
  intro: { fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 12,
    marginBottom: 8,
  },
  reasonList: { gap: 6 },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#FAFAFA',
  },
  reasonItemSelected: { borderColor: '#1A1A1A', backgroundColor: '#FFF' },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBB',
    marginRight: 10,
  },
  radioSelected: { borderColor: '#1A1A1A', backgroundColor: '#1A1A1A' },
  reasonText: { fontSize: 13, color: '#555' },
  reasonTextSelected: { color: '#1A1A1A', fontWeight: '600' },
  descInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    minHeight: 100,
    backgroundColor: '#FFF',
  },
  charCount: { textAlign: 'right', fontSize: 11, color: '#999', marginTop: 4 },
  submitBtn: {
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  footer: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 16, lineHeight: 16 },
});
