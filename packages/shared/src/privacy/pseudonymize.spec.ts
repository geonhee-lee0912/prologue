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

  it('국제전화 표기(+82)의 휴대폰 번호도 지운다', () => {
    for (const phone of ['+82 10-1234-5678', '+82-10-1234-5678', '+821012345678', '+82 (0)10-1234-5678', '82-10-1234-5678']) {
      expect(redactContacts(`제 번호는 ${phone} 이에요`)).toBe('제 번호는 [연락처] 이에요');
    }
  });

  it('주민등록번호는 하이픈 앞뒤에 공백이 있어도 지운다', () => {
    for (const rrn of ['901010 - 1234567', '901010- 1234567', '901010 -1234567', '901010-1234567']) {
      expect(redactContacts(`주민번호는 ${rrn} 이에요`)).toBe('주민번호는 [주민번호] 이에요');
    }
  });

  it('하이픈으로 바로 이어진 주민번호 꼴은 앞에 숫자가 더 붙어 있어도 예전처럼 지운다', () => {
    // 생년월일을 여덟 자리로 잘못 적은 경우 — 공백 없는 꼴의 탐지는 약해지면 안 된다
    expect(redactContacts('19900101-1234567')).not.toContain('1234567');
    expect(redactContacts('주민번호 12900101-1234567 입니다')).not.toContain('1234567');
  });

  it('값이나 연도 범위 같은 보통 숫자는 지우지 않는다', () => {
    for (const text of [
      '월급은 3,500,000원이고 보증금은 1,000만 원이에요',
      '2018-2024년에 일했고 2018 - 2024 사이에 이사했어요',
      '1982-10-12 에 태어났어요',
      '키는 182이고 몸무게는 82예요',
      '월급 범위는 3000000 - 4000000원이에요',
      '2018년 1월 1일 부터는 20180101 - 20241231 로 적어요',
    ]) {
      expect(redactContacts(text)).toBe(text);
    }
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
