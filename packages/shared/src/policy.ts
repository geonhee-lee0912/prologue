/**
 * 프롤로그 정책 상수
 *
 * 기획 문서에서 결정된 모든 정책 수치는 여기에 모은다.
 * 코드의 어떤 곳에서도 magic number 로 작성하지 않는다.
 *
 * 변경 시: 이 파일 수정 + 관련 기획 문서 갱신 + PR 본문에 둘 다 반영했음을 명시.
 *
 * 출처:
 * - prologue_service_concept_v1_1.md
 * - 08_MVP_기능범위_정의서_v_0_1.md
 * - 08_추천_알고리즘_기준서_v_0_1.md
 * - prologue_03_conversation_experience_plan_v0_2.md
 */

export const POLICY = {
  /** 회원가입 / 인증 */
  account: {
    minAge: 19,
    targetMinAge: 26,
    targetMaxAge: 39,
    smsOtpTtlSeconds: 180,
    smsOtpMaxAttempts: 5,
  },

  /** 추천 시스템 (08_추천_알고리즘_기준서) */
  recommendation: {
    /** 점수 만점 (사용자 응답에 노출 금지) */
    scoreMax: 100,
    /** 점수 컴포넌트 가중치 — 합계 100 */
    weights: {
      relationshipIntent: 25,
      trustVerification: 20,
      lifestyle: 20,
      conversationStyle: 15,
      proximity: 10,
      profileQuality: 10,
    },
    /** 일일 추천 한도 (가설값. BM 결정 후 확정) */
    dailyLimit: {
      free: 3,
      plus: 10,
    },
    /** 최근 스킵된 상대를 재추천 제외하는 기간 (일) */
    recentSkipExclusionDays: 30,
    /** 추가 추천권 월 구매 한도 (가설값) */
    extraTicketMonthlyLimit: 10,
  } as const,

  /** 대화방 (prologue_03_conversation_experience_plan_v0_2 9.6) */
  conversation: {
    defaultDurationDays: 7,
    extensionUnitDays: 7,
    /** MVP 가설값 */
    maxFreeDurationDays: 14,
    maxPlusDurationDays: 21,
    /** 종료 N시간 전 안내 */
    expiryReminderHours: 24,
  } as const,

  /** 연락처 교환 */
  contactExchange: {
    /** 양쪽 동의 필수 */
    requireMutualConsent: true,
    /** 동의해도 자동 노출 금지. 동의 시점에 사용자가 직접 입력. */
    autoExposeOnConsent: false,
  } as const,

  /** 프로필 */
  profile: {
    minIntroLength: 30,
    maxIntroLength: 800,
    maxLifestyleTags: 8,
    minPhotosForActive: 1,
    recommendedPhotos: 3,
  } as const,

  /** 보안 */
  security: {
    bcryptRounds: 12,
    accessTokenTtl: '15m',
    refreshTokenTtl: '30d',
  } as const,

  /** 개인정보 보관 */
  privacy: {
    /** 얼굴 인증 이미지 보관 시간 */
    faceAuthImageTtlHours: 24,
    /** 신고 검토 후 메시지 보관 (일) - 법무 검토 후 확정 */
    messageRetentionAfterReportDays: 90,
  } as const,
} as const;

export type Policy = typeof POLICY;
