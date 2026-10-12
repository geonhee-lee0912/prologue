import { describe, expect, it } from 'vitest';
import { BANNED_EMOJI, emojiCount, enforceVoice, stripEmoji } from './voice';

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

  // 금지 이모지는 맨 뒤에 둔다 — 마지막 허용 이모지만 남기는 규칙이라, 앞에 두면 금지가 빠졌어도 통과해 버린다
  it('하트 이모지는 뺀다', () => {
    expect(enforceVoice('고마워요 🙂 💛')).toBe('고마워요 🙂');
  });

  it('사랑 표현 이모지는 뺀다', () => {
    expect(enforceVoice('좋아요 🙂 😗')).toBe('좋아요 🙂');
  });

  it('우는 이모지는 뺀다', () => {
    expect(enforceVoice('힘들었겠어요 🙂 😢')).toBe('힘들었겠어요 🙂');
  });

  it('과장 이모지는 뺀다', () => {
    expect(enforceVoice('대단해요 🙂 🤯')).toBe('대단해요 🙂');
  });

  it('금지 목록의 이모지는 전부 뺀다 — 목록에 오타가 나면 여기서 잡힌다', () => {
    for (const emoji of BANNED_EMOJI) {
      expect(enforceVoice(`🙂 ${emoji}`)).toBe('🙂');
    }
  });

  it('피부색이 붙은 이모지는 하나로 보고 통째로 뺀다', () => {
    expect(enforceVoice('좋다 👍🏽🙂')).toBe('좋다 🙂');
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
