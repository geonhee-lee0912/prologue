/**
 * 온보딩 nextStep → expo-router 경로 매핑.
 *
 * 로그인/가입 직후 + 홈 진입 시 GET /me/onboarding-status 호출 후 분기.
 */
import type { OnboardingStep } from './api';

export function routeForStep(step: OnboardingStep): string {
  switch (step) {
    case 'identity_verification':
      return '/a03-login';
    case 'face_verification':
      // FR-B02 얼굴 인증은 현재 profile-edit 안에 통합되어 있음
      return '/profile-edit';
    case 'age_check':
      return '/(onboarding)/b04-age-result';
    case 'relationship_survey':
      return '/(onboarding)/b05-relationship';
    case 'manner_pledge':
      return '/(onboarding)/b06-manner';
    case 'single_pledge':
      return '/(onboarding)/b07-single';
    case 'profile_intro':
      return '/profile-edit';
    case 'completed':
      return '/home';
  }
}
