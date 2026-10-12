import { describe, expect, it } from 'vitest';
import { parseReply } from './reply';

const reply = (value: unknown) => JSON.stringify(value);

describe('갈피 답 해석 (리뷰 1)', () => {
  it('말풍선·표정·버튼·신호를 읽는다', () => {
    const parsed = parseReply(
      reply({
        messages: [{ text: '오, 좋다. 요즘도 걸어요?', expression: 'curious' }],
        quickReply: { type: 'practical', fact: 'smoking' },
        signals: { userUsedCasual: true, crisis: 'none' },
      }),
    );
    expect(parsed).toEqual({
      bubbles: [{ text: '오, 좋다. 요즘도 걸어요?', expression: 'curious' }],
      quickReply: { type: 'practical', fact: 'smoking' },
      signals: { userUsedCasual: true, crisis: 'none' },
    });
  });

  it('코드펜스로 감싼 JSON 도 읽는다', () => {
    const parsed = parseReply('```json\n{"messages":[{"text":"안녕"}]}\n```');
    expect(parsed?.bubbles).toEqual([{ text: '안녕', expression: null }]);
  });

  it('JSON 이 아니거나 말풍선이 없으면 null', () => {
    expect(parseReply('안녕하세요!')).toBeNull();
    expect(parseReply('')).toBeNull();
    expect(parseReply(reply({ messages: [] }))).toBeNull();
    expect(parseReply(reply({ messages: [{ text: '   ' }] }))).toBeNull();
  });

  it('모르는 표정은 버리고, 말풍선은 두 개까지', () => {
    const parsed = parseReply(reply({ messages: [{ text: 'a', expression: 'angry' }, { text: 'b' }, { text: 'c' }] }));
    expect(parsed?.bubbles).toEqual([
      { text: 'a', expression: null },
      { text: 'b', expression: null },
    ]);
  });

  it('말 놓기 버튼과 맞지 않는 칸의 버튼은 버린다 — 말 놓기는 서버만 건넨다', () => {
    expect(parseReply(reply({ messages: [{ text: 'a' }], quickReply: { type: 'speech_level' } }))?.quickReply).toBeNull();
    expect(parseReply(reply({ messages: [{ text: 'a' }], quickReply: { type: 'practical', fact: 'company' } }))?.quickReply).toBeNull();
    expect(parseReply(reply({ messages: [{ text: 'a' }], quickReply: { type: 'condition_permission', fact: 'company' } }))?.quickReply).toEqual({
      type: 'condition_permission',
      fact: 'company',
    });
  });

  it('신호가 없거나 틀리면 기본값', () => {
    expect(parseReply(reply({ messages: [{ text: 'a' }], signals: { crisis: 'maybe' } }))?.signals).toEqual({ userUsedCasual: false, crisis: 'none' });
    expect(parseReply(reply({ messages: [{ text: 'a' }], signals: { crisis: 'self_harm' } }))?.signals.crisis).toBe('self_harm');
  });
});
