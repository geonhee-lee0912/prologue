import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ApiError, api, type IdentityInput } from '../../lib/api';
import { authStorage } from '../../lib/auth-storage';
import { routeForStep } from '../../lib/onboarding-route';

/**
 * A03 — 로그인/가입
 *
 * MVP 모의 모드 (mock identity provider) 에서 사용자가 본인 인증 정보를 직접 입력해
 * 가입 흐름을 시연한다. PASS 계약 후엔 외부 WebView 로 대체.
 *
 * 네 가지 진입점:
 *  1) 본인 인증으로 가입 (휴대폰)
 *  2) 카카오로 가입 (mock kakao token)
 *  3) 휴대폰 OTP 로그인
 *  4) 카카오로 로그인
 */
export default function A03Login() {
  const router = useRouter();

  // === 가입 폼 ===
  const [phoneNumber, setPhoneNumber] = useState('+821012345678');
  const [name, setName] = useState('홍길동');
  const [birthYear, setBirthYear] = useState('1992');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [agreeTos, setAgreeTos] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // === OTP 로그인 ===
  const [otpPhone, setOtpPhone] = useState('+821012345678');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);

  function notify(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  async function onSignupPhone() {
    if (!agreeTos || !agreePrivacy) {
      notify('동의 필요', '필수 약관에 모두 동의해 주세요.');
      return;
    }
    setBusy('signup-phone');
    try {
      const { sessionId } = await api.identityStart();
      const input: IdentityInput = {
        phoneNumber,
        name,
        birthYear: Number(birthYear),
        gender,
      };
      const consents = [
        { type: 'terms_of_service', required: true, agreed: agreeTos, version: '2026-05' },
        { type: 'privacy_policy', required: true, agreed: agreePrivacy, version: '2026-05' },
      ];
      const res = await api.identityComplete(sessionId, input, consents);
      await authStorage.setTokens(res.accessToken, res.refreshToken);
      await routeAfterAuth(res.accessToken);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  }

  async function onSignupKakao() {
    if (!agreeTos || !agreePrivacy) {
      notify('동의 필요', '필수 약관에 모두 동의해 주세요.');
      return;
    }
    setBusy('signup-kakao');
    try {
      const fakeKakaoToken = `mock_kakao_${Date.now()}`;
      const { sessionId } = await api.identityStart(fakeKakaoToken);
      const input: IdentityInput = {
        phoneNumber,
        name,
        birthYear: Number(birthYear),
        gender,
      };
      const consents = [
        { type: 'terms_of_service', required: true, agreed: agreeTos, version: '2026-05' },
        { type: 'privacy_policy', required: true, agreed: agreePrivacy, version: '2026-05' },
      ];
      const res = await api.identityComplete(sessionId, input, consents);
      // 카카오 토큰을 secure storage 에 저장해두면 이후 카카오로 로그인 검증 가능
      await authStorage.setTokens(res.accessToken, res.refreshToken);
      await routeAfterAuth(res.accessToken);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  }

  async function routeAfterAuth(accessToken: string) {
    try {
      const status = await api.getOnboardingStatus(accessToken);
      router.replace(routeForStep(status.nextStep) as never);
    } catch {
      router.replace('/home');
    }
  }

  async function onSendOtp() {
    setBusy('otp-send');
    try {
      await api.loginOtpSend(otpPhone);
      setOtpSent(true);
      notify('전송됨', '백엔드 콘솔에서 OTP 코드를 확인하세요 (mock SMS).');
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  }

  async function onVerifyOtp() {
    setBusy('otp-verify');
    try {
      const res = await api.loginOtpVerify(otpPhone, otpCode);
      await authStorage.setTokens(res.accessToken, res.refreshToken);
      await routeAfterAuth(res.accessToken);
    } catch (e) {
      handleError(e);
    } finally {
      setBusy(null);
    }
  }

  async function onLoginKakao() {
    notify(
      '안내',
      '이 데모에서는 "카카오로 가입" 시 사용한 토큰만 로그인됩니다. 새 가입을 원하면 위의 카카오로 가입 버튼을 사용하세요.',
    );
  }

  function handleError(e: unknown) {
    if (e instanceof ApiError) {
      notify(`오류 (${e.code})`, e.message);
    } else if (e instanceof Error) {
      notify('네트워크 오류', e.message);
    } else {
      notify('알 수 없는 오류', String(e));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>프롤로그 시작하기</Text>
      <Text style={styles.subtitle}>본인 인증으로 시작하세요</Text>

      {/* 1. 가입 폼 (mock 본인 인증 입력) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>본인 인증 (mock 입력)</Text>

        <Text style={styles.label}>휴대폰 번호 (+821012345678 형식)</Text>
        <TextInput
          style={styles.input}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          autoCapitalize="none"
          keyboardType="phone-pad"
          placeholder="+821012345678"
        />

        <Text style={styles.label}>이름</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />

        <Text style={styles.label}>출생연도</Text>
        <TextInput
          style={styles.input}
          value={birthYear}
          onChangeText={setBirthYear}
          keyboardType="number-pad"
          maxLength={4}
        />

        <Text style={styles.label}>성별</Text>
        <View style={styles.row}>
          <GenderButton label="남성" active={gender === 'male'} onPress={() => setGender('male')} />
          <View style={{ width: 8 }} />
          <GenderButton
            label="여성"
            active={gender === 'female'}
            onPress={() => setGender('female')}
          />
        </View>

        <Pressable style={styles.checkboxRow} onPress={() => setAgreeTos(!agreeTos)}>
          <View style={[styles.checkbox, agreeTos && styles.checkboxOn]} />
          <Text style={styles.checkboxLabel}>[필수] 서비스 이용약관 동의</Text>
        </Pressable>
        <Pressable style={styles.checkboxRow} onPress={() => setAgreePrivacy(!agreePrivacy)}>
          <View style={[styles.checkbox, agreePrivacy && styles.checkboxOn]} />
          <Text style={styles.checkboxLabel}>[필수] 개인정보 처리방침 동의</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, busy === 'signup-phone' && styles.disabled]}
          disabled={busy !== null}
          onPress={onSignupPhone}
        >
          {busy === 'signup-phone' ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryButtonText}>본인 인증으로 가입</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.kakaoButton, busy === 'signup-kakao' && styles.disabled]}
          disabled={busy !== null}
          onPress={onSignupKakao}
        >
          {busy === 'signup-kakao' ? (
            <ActivityIndicator color="#3C1E1E" />
          ) : (
            <Text style={styles.kakaoButtonText}>카카오로 가입 (mock)</Text>
          )}
        </Pressable>
      </View>

      {/* 2. 로그인 - OTP */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>이미 회원이신가요?</Text>
        <Text style={styles.label}>휴대폰 번호</Text>
        <TextInput
          style={styles.input}
          value={otpPhone}
          onChangeText={setOtpPhone}
          keyboardType="phone-pad"
        />
        {!otpSent ? (
          <Pressable
            style={[styles.secondaryButton, busy === 'otp-send' && styles.disabled]}
            disabled={busy !== null}
            onPress={onSendOtp}
          >
            {busy === 'otp-send' ? (
              <ActivityIndicator color="#1A1A1A" />
            ) : (
              <Text style={styles.secondaryButtonText}>OTP 코드 받기</Text>
            )}
          </Pressable>
        ) : (
          <>
            <Text style={styles.label}>OTP 코드 (백엔드 콘솔 확인)</Text>
            <TextInput
              style={styles.input}
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <Pressable
              style={[styles.primaryButton, busy === 'otp-verify' && styles.disabled]}
              disabled={busy !== null}
              onPress={onVerifyOtp}
            >
              {busy === 'otp-verify' ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>로그인</Text>
              )}
            </Pressable>
          </>
        )}

        <Pressable style={[styles.kakaoButton, { marginTop: 12 }]} onPress={onLoginKakao}>
          <Text style={styles.kakaoButtonText}>카카오로 로그인 (mock)</Text>
        </Pressable>
      </View>

      <Text style={styles.footer}>
        ※ 이 화면은 MVP 모의(mock) 모드입니다. PASS/NICE 계약 후엔 외부 본인 인증 페이지로 대체됩니다.
      </Text>
    </ScrollView>
  );
}

function GenderButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.genderButton, active && styles.genderButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.genderButtonText, active && styles.genderButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, paddingBottom: 40, backgroundColor: '#FAFAFA' },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#1A1A1A' },
  label: { fontSize: 13, color: '#555', marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FFF',
  },
  row: { flexDirection: 'row' },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  genderButtonActive: { borderColor: '#1A1A1A', backgroundColor: '#1A1A1A' },
  genderButtonText: { color: '#555', fontSize: 14 },
  genderButtonTextActive: { color: '#FFF', fontWeight: '600' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#999',
    marginRight: 8,
  },
  checkboxOn: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  checkboxLabel: { fontSize: 13, color: '#333' },
  primaryButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  secondaryButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#1A1A1A', fontSize: 15, fontWeight: '600' },
  kakaoButton: {
    backgroundColor: '#FEE500',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  kakaoButtonText: { color: '#3C1E1E', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  footer: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8 },
});
