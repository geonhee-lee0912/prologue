import { describe, expect, it } from 'vitest';
import { AI_REQUIRED_CONSENTS, CONSENT_TYPES } from './consents';

describe('동의 종류', () => {
  // 이미 저장된 행과 맞아야 하는 값이라 못 박는다. terms_of_service·privacy_policy 는
  // 가입 화면(apps/mobile/app/(auth)/a03-login.tsx)이 보내고 서버(auth.service.ts)가 그대로 저장한다.
  it('저장되는 값과 같다', () => {
    expect(CONSENT_TYPES).toEqual({
      TERMS_OF_SERVICE: 'terms_of_service',
      PRIVACY: 'privacy_policy',
      SENSITIVE_INFO: 'sensitive_info',
      CROSS_BORDER_TRANSFER: 'cross_border_transfer',
    });
  });

  it('갈피와 이야기하려면 민감정보와 국외이전 동의가 필요하다', () => {
    expect(AI_REQUIRED_CONSENTS).toEqual(['sensitive_info', 'cross_border_transfer']);
  });
});
