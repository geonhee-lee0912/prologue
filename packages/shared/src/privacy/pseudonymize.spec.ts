import { describe, expect, it } from 'vitest';
import { pseudonymize, redactContacts } from './pseudonymize';

describe('연락처 지우기와 가명처리', () => {
  it('휴대폰 번호를 하이픈·공백·점 모양 모두 지운다', () => {
    for (const phone of ['010-1234-5678', '01012345678', '010 1234 5678', '010.1234.5678']) {
      expect(redactContacts(`제 번호는 ${phone} 이에요`)).toBe('제 번호는 [연락처] 이에요');
    }
  });

  it('이메일과 주민등록번호를 지운다', () => {
    expect(redactContacts('abc@example.com 으로 보내 주세요')).toBe('[이메일] 으로 보내 주세요');
    expect(redactContacts('900101-1234567 이에요')).toBe('[주민번호] 이에요');
    expect(redactContacts('9001011234567 이에요')).toBe('[주민번호] 이에요');
  });

  it('알려진 이름을 [이름] 으로 바꾼다', () => {
    expect(pseudonymize('저는 지은이라고 해요', { name: '지은' })).toBe('저는 [이름]이라고 해요');
  });

  it('한 글자 이름은 다른 낱말을 망가뜨릴 수 있어 바꾸지 않는다', () => {
    expect(pseudonymize('오늘 별 보러 가요', { name: '별' })).toBe('오늘 별 보러 가요');
  });

  it('식별자가 없으면 그대로 돌려준다', () => {
    const text = '주말에는 등산을 자주 해요';
    expect(pseudonymize(text, { name: null })).toBe(text);
  });
});
