/**
 * 온보딩 nextStep → expo-router 경로 매핑.
 *
 * 2026-09 컨셉 재설정으로 기존 온보딩 단계(나이 확인, 관계 설문, 매너 서약,
 * 싱글 서약, 조건표형 프로필)는 폐기됐다. 새 온보딩은 동의 3종 분리 수집 →
 * 기본 정보 → AI 인터뷰이며 아직 구현 전이다.
 *
 * 화면 흐름 설계 2장(A 진입) 참조.
 */
import type { OnboardingStep } from './api';

export function routeForStep(step: OnboardingStep): string {
  switch (step) {
    case 'identity_verification':
      return '/a03-login';
    case 'completed':
      return '/friends';
    default:
      // 새 온보딩 화면이 서기 전까지는 루트로 보낸다
      return '/friends';
  }
}
