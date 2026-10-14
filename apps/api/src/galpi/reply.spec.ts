import { describe, expect, it } from 'vitest';
import { parseReply, readCrisisSignal } from './reply';

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

  it('300자 상한은 코드 포인트로 센다 — 300번째 글자가 이모지여도 반으로 가르지 않는다', () => {
    // 😌 는 UTF-16 으로 두 칸이다. 300칸에서 자르면 앞 절반만 남아 깨진 문자열이 된다
    const long = `${'a'.repeat(299)}😌 끝`;
    const text = parseReply(reply({ messages: [{ text: long }] }))?.bubbles[0].text ?? '';
    const points = Array.from(text);
    expect(text).not.toMatch(/\p{Surrogate}/u);
    expect(points.length).toBeLessThanOrEqual(300);
    expect(points.at(-1)).toBe('😌');
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

describe('위기 신호만 읽기 — 쓸 수 있는 말풍선이 없는 답도', () => {
  it('말풍선이 없거나 비어 parseReply 가 null 이어도 신호는 읽는다', () => {
    const noBubble = '{"bubbles":[],"signals":{"crisis":"self_harm"}}';
    expect(parseReply(noBubble)).toBeNull();
    expect(readCrisisSignal(noBubble)).toBe('self_harm');
    expect(readCrisisSignal(reply({ messages: [], signals: { crisis: 'danger' } }))).toBe('danger');
    expect(readCrisisSignal(reply({ messages: [{ text: '   ' }], signals: { crisis: 'self_harm' } }))).toBe('self_harm');
    expect(readCrisisSignal('```json\n{"signals":{"crisis":"danger"}}\n```')).toBe('danger');
  });

  it('JSON 객체가 아니거나 신호가 없거나 틀리면 none', () => {
    for (const raw of ['안녕하세요!', '', '[{"signals":{"crisis":"self_harm"}}]', reply({ messages: [] }), reply({ signals: { crisis: 'maybe' } })]) {
      expect(readCrisisSignal(raw), raw).toBe('none');
    }
  });

  it('말풍선이 있는 답에서는 parseReply 가 읽은 신호와 같다', () => {
    const raw = reply({ messages: [{ text: '많이 무서웠겠어요.' }], signals: { crisis: 'danger' } });
    expect(readCrisisSignal(raw)).toBe(parseReply(raw)?.signals.crisis);
  });
});
