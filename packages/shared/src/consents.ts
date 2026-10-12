/**
 * 동의 종류 — UserConsent.consentType 값 (CLAUDE.md 10.2b·10.2c)
 * terms_of_service·privacy_policy 는 가입 화면이 보내 서버가 그대로 저장하는 값이다. 바꾸면 이미 저장된 행을 못 찾는다
 */
export const CONSENT_TYPES = {
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY: 'privacy_policy',
  SENSITIVE_INFO: 'sensitive_info',
  CROSS_BORDER_TRANSFER: 'cross_border_transfer',
} as const;

export type ConsentType = (typeof CONSENT_TYPES)[keyof typeof CONSENT_TYPES];

/** 갈피와 이야기하려면 필요한 별도 동의 — 대화에 민감정보가 섞이고 AI API(국외)로 간다 */
export const AI_REQUIRED_CONSENTS: readonly ConsentType[] = [
  CONSENT_TYPES.SENSITIVE_INFO,
  CONSENT_TYPES.CROSS_BORDER_TRANSFER,
];
