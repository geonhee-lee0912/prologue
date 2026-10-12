import { describe, expect, it } from 'vitest';
import { scrubForStorage } from './scrub';

describe('저장 전 정리', () => {
  it('연락처를 지우고 민감정보를 가린다', () => {
    const result = scrubForStorage('제 번호는 010-1234-5678 이고 우울증이 있어요');
    expect(result.text).toBe('제 번호는 [연락처] 이고 [민감정보:건강]이 있어요');
    expect(result.categories).toEqual(['HEALTH']);
  });

  it('깨끗한 말은 그대로 둔다', () => {
    expect(scrubForStorage('퇴근하고 동네를 걸어요')).toEqual({ text: '퇴근하고 동네를 걸어요', categories: [] });
  });
});
