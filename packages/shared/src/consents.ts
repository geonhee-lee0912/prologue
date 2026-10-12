/** 동의 종류 — UserConsent.consentType 값 (CLAUDE.md 10.2b·10.2c) */
export const CONSENT_TYPES = {
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY: 'privacy',
  SENSITIVE_INFO: 'sensitive_info',
  CROSS_BORDER_TRANSFER: 'cross_border_transfer',
} as const;

export type ConsentType = (typeof CONSENT_TYPES)[keyof typeof CONSENT_TYPES];

/** 갈피와 이야기하려면 필요한 별도 동의 — 대화에 민감정보가 섞이고 AI API(국외)로 간다 */
export const AI_REQUIRED_CONSENTS: readonly ConsentType[] = [
  CONSENT_TYPES.SENSITIVE_INFO,
  CONSENT_TYPES.CROSS_BORDER_TRANSFER,
];
