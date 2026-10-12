import type { GalpiMessage } from '@prisma/client';
import { MASKED_TEXT_DISPLAY } from '@prologue/shared';
import { describe, expect, it } from 'vitest';
import { readQuickReply, stripUnstorableChars, toMessageDto } from './messages';

const row = (over: Partial<GalpiMessage>): GalpiMessage => ({
  id: 'm1',
  userId: 'u1',
  sender: 'galpi',
  kind: 'text',
  content: '',
  expression: null,
  quickReply: null,
  answeredKey: null,
  skipped: false,
  proactive: false,
  safety: false,
  sensitiveCategories: [],
  createdAt: new Date('2026-10-11T03:00:00Z'),
  ...over,
});

describe('메시지 DTO', () => {
  it('갈피 말의 {name} 을 호칭으로 바꾼다 — 말을 놓은 뒤의 말만 반말 호칭', () => {
    const m = row({ content: '{name}, 반가워요', expression: 'wave' });
    expect(toMessageDto(m, { displayName: '지은', casualSince: null })).toEqual({
      id: 'm1',
      from: 'galpi',
      kind: 'text',
      text: '지은 님, 반가워요',
      expression: 'wave',
      at: '2026-10-11T03:00:00.000Z',
    });
    expect(toMessageDto(m, { displayName: '지은', casualSince: new Date('2026-10-11T02:00:00Z') }).text).toBe('지은아, 반가워요');
    // 말을 놓기 전에 한 말은 그때 호칭 그대로 — 지난 대화가 바뀌지 않는다
    expect(toMessageDto(m, { displayName: '지은', casualSince: new Date('2026-10-11T04:00:00Z') }).text).toBe('지은 님, 반가워요');
  });

  it('내 말의 가린 자리는 사용자에게 알아볼 수 있게 보인다', () => {
    const m = row({ sender: 'user', content: '[민감정보:건강]이 있어요' });
    expect(toMessageDto(m, { displayName: null, casualSince: null })).toMatchObject({ from: 'me', text: `${MASKED_TEXT_DISPLAY}이 있어요` });
  });

  it('버튼은 선택지와 답한 key 를 담는다', () => {
    const m = row({ content: '담배는 피워요?', quickReply: { type: 'practical', fact: 'smoking' }, answeredKey: 'no' });
    expect(toMessageDto(m, { displayName: null, casualSince: null }).quickReply).toEqual({
      type: 'practical',
      fact: 'smoking',
      options: [
        { key: 'no', label: '안 피워요' },
        { key: 'sometimes', label: '가끔 피워요' },
        { key: 'yes', label: '피워요' },
      ],
      answeredKey: 'no',
    });
  });

  it('이모티콘은 표정만 담는다', () => {
    expect(toMessageDto(row({ kind: 'emoticon', content: 'wave', expression: 'wave' }), { displayName: null, casualSince: null })).toEqual({
      id: 'm1',
      from: 'galpi',
      kind: 'emoticon',
      expression: 'wave',
      at: '2026-10-11T03:00:00.000Z',
    });
  });

  it('모양이 틀린 버튼은 읽지 않는다', () => {
    expect(readQuickReply({ type: 'practical', fact: 'company' })).toBeNull();
    expect(readQuickReply('x')).toBeNull();
    expect(readQuickReply({ type: 'speech_level' })).toEqual({ type: 'speech_level' });
  });

  it('버튼의 종류와 칸이 서로 맞아야 읽는다', () => {
    expect(readQuickReply({ type: 'practical', fact: 'smoking' })).toEqual({ type: 'practical', fact: 'smoking' });
    expect(readQuickReply({ type: 'condition_permission', fact: 'company' })).toEqual({ type: 'condition_permission', fact: 'company' });
    expect(readQuickReply({ type: 'condition_permission', fact: 'smoking' })).toBeNull();
    expect(readQuickReply({ type: 'practical' })).toBeNull();
    expect(readQuickReply(null)).toBeNull();
    expect(readQuickReply([])).toBeNull();
  });
});

describe('저장할 수 없는 글자 빼기 (리뷰 1 — 저장이 거절돼 500 이 나지 않게)', () => {
  it('짝 없는 서로게이트와 널 문자만 뺀다', () => {
    expect(stripUnstorableChars('a\ud83db\ude00c\u0000d')).toBe('abcd');
    // 짝이 거꾸로 놓인 것(낮은 쪽이 앞)도 둘 다 짝 없는 글자다
    expect(stripUnstorableChars('x\ude00\ud83dy')).toBe('xy');
  });

  it('짝이 맞는 이모지·한글·줄바꿈은 그대로 둔다', () => {
    const text = '좋아요 🙂 👍🏽 👩‍💻\nok';
    expect(stripUnstorableChars(text)).toBe(text);
  });
});
