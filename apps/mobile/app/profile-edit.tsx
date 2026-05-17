import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ApiError,
  api,
  type AnswerItem,
  type PhotoView,
  type PreferenceData,
  type ProfilePatch,
  type ProfileResponse,
  type VerificationStatus,
} from '../lib/api';
import { authStorage } from '../lib/auth-storage';

const STORY_KEYS = [
  { key: 'work_career', label: '일과 커리어' },
  { key: 'weekend_rest', label: '주말과 휴식' },
  { key: 'friends_family', label: '친구와 가족' },
  { key: 'taste_interests', label: '취향과 관심사' },
] as const;

const REL_KEYS = [
  { key: 'contact_frequency', label: '연락 빈도' },
  { key: 'conversation_style', label: '대화 스타일' },
  { key: 'relationship_pace', label: '관계 시작 속도' },
  { key: 'conflict_resolution', label: '갈등 해결' },
  { key: 'affection_expression', label: '애정 표현' },
] as const;

const INTENT_OPTIONS = [
  { value: 'serious_long_term', label: '진지한 장기 관계' },
  { value: 'natural_dating', label: '자연스러운 연애' },
  { value: 'open_to_marriage', label: '결혼도 가능' },
  { value: 'friendship_first', label: '친구처럼 시작' },
] as const;

const PACE_OPTIONS = [
  { value: 'slow', label: '천천히' },
  { value: 'moderate', label: '적당히' },
  { value: 'fast', label: '빠르게' },
] as const;

const FREQ_OPTIONS = [
  { value: 'low', label: '낮음' },
  { value: 'medium', label: '적당' },
  { value: 'high', label: '높음' },
] as const;

export default function ProfileEdit() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [photos, setPhotos] = useState<PhotoView[]>([]);
  const [verification, setVerification] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifyingFace, setVerifyingFace] = useState(false);

  // 폼 상태
  const [region1, setRegion1] = useState('');
  const [region2, setRegion2] = useState('');
  const [jobCategory, setJobCategory] = useState('');
  const [intro, setIntro] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [storyAns, setStoryAns] = useState<Record<string, string>>({});
  const [relAns, setRelAns] = useState<Record<string, string>>({});
  const [intent, setIntent] = useState<PreferenceData['intent'] | ''>('');
  const [pace, setPace] = useState<PreferenceData['pace'] | ''>('');
  const [freq, setFreq] = useState<PreferenceData['contactFrequency'] | ''>('');

  const notify = (title: string, message: string) => {
    if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const handleError = (e: unknown) => {
    if (e instanceof ApiError) notify(`오류 (${e.code})`, e.message);
    else if (e instanceof Error) notify('오류', e.message);
    else notify('알 수 없는 오류', String(e));
  };

  const loadAll = useCallback(async () => {
    const t = await authStorage.getAccessToken();
    if (!t) {
      router.replace('/a03-login');
      return;
    }
    setToken(t);
    try {
      const [profile, photoList, ver] = await Promise.all([
        api.getMyProfile(t),
        api.listPhotos(t),
        api.getVerification(t),
      ]);
      setData(profile);
      setPhotos(photoList);
      setVerification(ver);
      // 폼 상태 초기화
      setRegion1(profile.user.region1 === '미설정' ? '' : profile.user.region1);
      setRegion2(profile.user.region2 ?? '');
      setJobCategory(profile.profile?.jobCategory ?? '');
      setIntro(profile.profile?.intro ?? '');
      setTagsInput((profile.profile?.lifestyleTags ?? []).join(', '));
      const story: Record<string, string> = {};
      const rel: Record<string, string> = {};
      for (const a of profile.answers) {
        if (a.category === 'story') story[a.questionKey] = a.answer;
        else rel[a.questionKey] = a.answer;
      }
      setStoryAns(story);
      setRelAns(rel);
      if (profile.preference) {
        setIntent(profile.preference.intent);
        setPace(profile.preference.pace);
        setFreq(profile.preference.contactFrequency);
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await authStorage.clear();
        router.replace('/a03-login');
        return;
      }
      handleError(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function onSave() {
    if (!token) return;
    setSaving(true);
    try {
      const patch: ProfilePatch = {};
      if (region1.trim()) patch.region1 = region1.trim();
      if (region2.trim()) patch.region2 = region2.trim();
      if (jobCategory.trim()) patch.jobCategory = jobCategory.trim();
      if (intro.trim().length >= 30) patch.intro = intro.trim();
      const tags = tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (tags.length > 0) patch.lifestyleTags = tags;

      const answers: AnswerItem[] = [];
      for (const { key } of STORY_KEYS) {
        const v = storyAns[key]?.trim();
        if (v) answers.push({ category: 'story', questionKey: key, answer: v });
      }
      for (const { key } of REL_KEYS) {
        const v = relAns[key]?.trim();
        if (v) answers.push({ category: 'relationship', questionKey: key, answer: v });
      }
      if (answers.length) patch.answers = answers;

      if (intent && pace && freq) {
        patch.preference = { intent, pace, contactFrequency: freq };
      }

      const updated = await api.updateMyProfile(token, patch);
      setData(updated);
      notify('저장됨', `완성도: ${updated.completion}%`);
    } catch (e) {
      handleError(e);
    } finally {
      setSaving(false);
    }
  }

  async function onPickPhoto() {
    if (!token) return;
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notify('권한 필요', '사진 라이브러리 접근을 허용해 주세요.');
        return;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setUploading(true);
    try {
      await api.uploadPhoto(
        token,
        {
          uri: asset.uri,
          mimeType: asset.mimeType,
          fileName: asset.fileName ?? undefined,
          file: (asset as unknown as { file?: File }).file,
        },
        'daily',
      );
      const list = await api.listPhotos(token);
      setPhotos(list);
    } catch (e) {
      handleError(e);
    } finally {
      setUploading(false);
    }
  }

  async function onSetMain(photoId: string) {
    if (!token) return;
    try {
      const list = await api.setMainPhoto(token, photoId);
      setPhotos(list);
    } catch (e) {
      handleError(e);
    }
  }

  async function onDeletePhoto(photoId: string) {
    if (!token) return;
    try {
      await api.deletePhoto(token, photoId);
      const list = await api.listPhotos(token);
      setPhotos(list);
    } catch (e) {
      handleError(e);
    }
  }

  async function onVerifyFace() {
    if (!token) return;
    if (!photos.find((p) => p.isMain)) {
      notify('대표 사진 필요', '먼저 대표 사진을 등록해 주세요.');
      return;
    }
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        notify('권한 필요', '사진 라이브러리 접근을 허용해 주세요.');
        return;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setVerifyingFace(true);
    try {
      const result = await api.verifyFace(token, {
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName ?? undefined,
        file: (asset as unknown as { file?: File }).file,
      });
      const ver = await api.getVerification(token);
      setVerification(ver);
      notify(
        result.matched ? '인증 완료' : '인증 실패',
        result.matched
          ? `얼굴 인증이 완료되었습니다. (신뢰도 ${result.confidence}%)`
          : '얼굴 매칭에 실패했습니다. 다시 시도해 주세요.',
      );
    } catch (e) {
      handleError(e);
    } finally {
      setVerifyingFace(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 헤더 + 완성도 */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹ 뒤로</Text>
        </Pressable>
        <Text style={styles.title}>프로필 편집</Text>
        <Text style={styles.completion}>완성도 {data?.completion ?? 0}%</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${data?.completion ?? 0}%` }]} />
        </View>
      </View>

      {/* 사진 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>사진</Text>
        <Text style={styles.hint}>JPEG / PNG / WEBP · 최대 5MB · 6장까지</Text>
        <View style={styles.photoGrid}>
          {photos.map((p) => (
            <View key={p.id} style={styles.photoCell}>
              {p.signedUrl ? (
                <Image source={{ uri: p.signedUrl }} style={styles.photoImage} />
              ) : (
                <View style={[styles.photoImage, styles.photoFallback]} />
              )}
              {p.isMain && <Text style={styles.mainBadge}>대표</Text>}
              <View style={styles.photoActions}>
                {!p.isMain && (
                  <Pressable style={styles.photoAction} onPress={() => onSetMain(p.id)}>
                    <Text style={styles.photoActionText}>대표로</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.photoAction, styles.photoActionDanger]}
                  onPress={() => onDeletePhoto(p.id)}
                >
                  <Text style={styles.photoActionText}>삭제</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {photos.length < 6 && (
            <Pressable
              style={[styles.photoCell, styles.photoAddCell]}
              onPress={onPickPhoto}
              disabled={uploading}
            >
              {uploading ? <ActivityIndicator /> : <Text style={styles.photoAddText}>+ 추가</Text>}
            </Pressable>
          )}
        </View>
      </View>

      {/* 얼굴 인증 */}
      <Section title="얼굴 인증 (FR-B02)">
        <View style={styles.verificationRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>본인 인증</Text>
            <Text style={styles.value}>
              {verification?.identityVerified ? '✓ 완료' : '미완료'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>얼굴 인증</Text>
            <Text style={styles.value}>
              {verification?.faceMatchStatus === 'verified'
                ? `✓ 완료 (${verification.faceConfidence ?? '-'}%)`
                : verification?.faceMatchStatus === 'rejected'
                  ? '✗ 반려'
                  : verification?.faceMatchStatus === 'pending'
                    ? '검수 중'
                    : '미제출'}
            </Text>
          </View>
        </View>
        {verification?.faceMatchStatus !== 'verified' && (
          <Pressable
            style={[styles.secondaryButton, verifyingFace && styles.disabled]}
            disabled={verifyingFace || !photos.find((p) => p.isMain)}
            onPress={onVerifyFace}
          >
            {verifyingFace ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={styles.secondaryButtonText}>
                {photos.find((p) => p.isMain) ? '셀피 업로드 → 얼굴 인증' : '대표 사진 먼저 등록'}
              </Text>
            )}
          </Pressable>
        )}
        <Text style={styles.hint}>
          MVP: mock 얼굴 매칭 (항상 성공). 실 연동 시 AWS Rekognition / Clova 사용.
        </Text>
      </Section>

      {/* 기본 정보 */}
      <Section title="기본 정보 (FR-C02)">
        <Field label="시/도" value={region1} onChange={setRegion1} placeholder="예: 서울특별시" />
        <Field label="시/군/구 (선택)" value={region2} onChange={setRegion2} placeholder="예: 강남구" />
        <Field
          label="직업군"
          value={jobCategory}
          onChange={setJobCategory}
          placeholder="예: IT/개발, 디자이너, 교사"
        />
      </Section>

      {/* 자기소개 */}
      <Section title="나의 프롤로그 (FR-C03)">
        <Text style={styles.hint}>최소 30자, 최대 800자</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={intro}
          onChangeText={setIntro}
          multiline
          placeholder="당신의 일상과 태도를 짧게 들려주세요."
        />
        <Text style={styles.charCount}>{intro.length}자</Text>
      </Section>

      {/* 라이프스타일 태그 */}
      <Section title="라이프스타일 태그">
        <Text style={styles.hint}>쉼표로 구분 · 최대 8개</Text>
        <TextInput
          style={styles.input}
          value={tagsInput}
          onChangeText={setTagsInput}
          placeholder="독서, 러닝, 요리"
        />
      </Section>

      {/* 이야기의 목차 */}
      <Section title="이야기의 목차 (FR-C04)">
        {STORY_KEYS.map(({ key, label }) => (
          <View key={key} style={styles.subField}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={storyAns[key] ?? ''}
              onChangeText={(v) => setStoryAns((s) => ({ ...s, [key]: v }))}
              multiline
              placeholder="2~3문장 정도로 짧게."
            />
          </View>
        ))}
      </Section>

      {/* 관계의 문체 */}
      <Section title="관계의 문체 (FR-C05)">
        {REL_KEYS.map(({ key, label }) => (
          <View key={key} style={styles.subField}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={relAns[key] ?? ''}
              onChangeText={(v) => setRelAns((s) => ({ ...s, [key]: v }))}
              multiline
              placeholder="평소 어떤 편인지 자유롭게."
            />
          </View>
        ))}
      </Section>

      {/* 관계 선호 */}
      <Section title="관계 선호">
        <Text style={styles.label}>만남 목적</Text>
        <Segment
          options={INTENT_OPTIONS}
          value={intent}
          onChange={(v) => setIntent(v as PreferenceData['intent'])}
        />
        <Text style={styles.label}>관계 속도</Text>
        <Segment
          options={PACE_OPTIONS}
          value={pace}
          onChange={(v) => setPace(v as PreferenceData['pace'])}
        />
        <Text style={styles.label}>연락 빈도</Text>
        <Segment
          options={FREQ_OPTIONS}
          value={freq}
          onChange={(v) => setFreq(v as PreferenceData['contactFrequency'])}
        />
      </Section>

      <Pressable style={[styles.saveButton, saving && styles.disabled]} onPress={onSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>저장</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.subField}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder={placeholder} />
    </View>
  );
}

function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | '';
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmentRow}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          style={[styles.segment, value === opt.value && styles.segmentActive]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={[styles.segmentText, value === opt.value && styles.segmentTextActive]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 40, paddingBottom: 60, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 12 },
  back: { color: '#666', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  completion: { fontSize: 13, color: '#555', marginBottom: 6 },
  progressTrack: {
    height: 6,
    backgroundColor: '#EEE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#1A1A1A' },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', marginBottom: 10, color: '#1A1A1A' },
  hint: { fontSize: 11, color: '#888', marginBottom: 6 },
  subField: { marginBottom: 10 },
  label: { fontSize: 12, color: '#555', marginTop: 4, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFF',
  },
  textarea: { minHeight: 60, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#888', textAlign: 'right', marginTop: 2 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoCell: {
    width: 100,
    height: 130,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: { width: '100%', height: '100%' },
  photoFallback: { backgroundColor: '#EEE' },
  mainBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#1A1A1A',
    color: '#FFF',
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  photoActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  photoAction: { flex: 1, paddingVertical: 4, alignItems: 'center' },
  photoActionDanger: { backgroundColor: 'rgba(180,0,0,0.5)' },
  photoActionText: { color: '#FFF', fontSize: 11 },
  photoAddCell: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  photoAddText: { color: '#666', fontSize: 13 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  segmentActive: { borderColor: '#1A1A1A', backgroundColor: '#1A1A1A' },
  segmentText: { fontSize: 12, color: '#555' },
  segmentTextActive: { color: '#FFF', fontWeight: '600' },
  saveButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: { color: '#1A1A1A', fontSize: 14, fontWeight: '600' },
  verificationRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  value: { fontSize: 14, color: '#1A1A1A', fontWeight: '600', marginTop: 2 },
  disabled: { opacity: 0.5 },
});
