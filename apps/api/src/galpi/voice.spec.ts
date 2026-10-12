import { describe, expect, it } from 'vitest';
import { emojiCount, enforceVoice, stripEmoji } from './voice';

describe('갈피 목소리 — 이모지 규칙 (갈피 문서 3.6 ④)', () => {
  it('이모지는 하나만 남긴다 — 마지막 것', () => {
    expect(enforceVoice('좋다 🙂🙂')).toBe('좋다 🙂');
    expect(enforceVoice('🌿 산책 좋다 ☕')).toBe('산책 좋다 ☕');
  });

  it('하트·과장·울음 이모지는 뺀다', () => {
    expect(enforceVoice('고마워요 ❤️')).toBe('고마워요');
    expect(enforceVoice('대단해요 🔥 🙂')).toBe('대단해요 🙂');
    expect(enforceVoice('헉 😭')).toBe('헉');
  });

  it('이모지가 없으면 그대로', () => {
    expect(enforceVoice('요즘도 걸어요?')).toBe('요즘도 걸어요?');
  });

  it('변형 선택자가 붙은 이모지도 하나로 센다', () => {
    expect(emojiCount('편지를 썼어요 ✉️')).toBe(1);
  });

  it('리포트는 이모지를 전부 빼고 줄바꿈은 둔다', () => {
    expect(stripEmoji('첫 문단이에요 🙂\n둘째 문단이에요 🌿')).toBe('첫 문단이에요\n둘째 문단이에요');
  });
});
