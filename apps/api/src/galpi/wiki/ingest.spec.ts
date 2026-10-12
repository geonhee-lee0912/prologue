import type { WikiPageKey } from '@prologue/shared';
import { describe, expect, it } from 'vitest';
import { type IngestContext, parseIngest } from './ingest';

const ctx = (over: Partial<IngestContext> = {}): IngestContext => ({
  batchUserMessageIds: new Set(['m1', 'm2']),
  existingClaims: new Map<string, WikiPageKey>([['c1', 'now']]),
  maxClaimsPerPage: 15,
  ...over,
});

const json = (value: unknown) => JSON.stringify(value);

const NOTHING = { adds: [], updates: [], removes: [], facts: [] };

describe('서고 수집 결과 검증', () => {
  it('출처가 이번 사용자 말인 문장만 더한다', () => {
    const ops = parseIngest(
      json({
        claims: [
          { op: 'add', page: 'now', text: '퇴근 뒤에는 혼자 걷는다', sources: ['m1', 'm1'] },
          { op: 'add', page: 'people', text: '출처를 지어냈다', sources: ['m9'] },
          { op: 'add', page: 'people', text: '출처가 없다' },
        ],
      }),
      ctx(),
    );
    expect(ops.adds).toEqual([{ page: 'now', text: '퇴근 뒤에는 혼자 걷는다', sources: ['m1'] }]);
  });

  it('만난 뒤 이야기(2단계)와 모르는 장에는 쓰지 않는다', () => {
    const ops = parseIngest(
      json({
        claims: [
          { op: 'add', page: 'met', text: 'a', sources: ['m1'] },
          { op: 'add', page: 'secret', text: 'b', sources: ['m1'] },
        ],
      }),
      ctx(),
    );
    expect(ops.adds).toEqual([]);
  });

  it('AI 만 보는 장(끌리는 것·다음에 꺼낼 것)에는 쓴다', () => {
    const ops = parseIngest(
      json({
        claims: [
          { op: 'add', page: 'attraction', text: '말수가 적어도 편안한 사람에게 끌린다', sources: ['m1'] },
          { op: 'add', page: 'next_topics', text: '금요일에 발표가 있다', sources: ['m2'] },
        ],
      }),
      ctx(),
    );
    expect(ops.adds.map((a) => a.page)).toEqual(['attraction', 'next_topics']);
  });

  it('민감정보나 연락처가 섞인 문장은 버린다 (스펙 3.5)', () => {
    const ops = parseIngest(
      json({
        claims: [
          { op: 'add', page: 'now', text: '주말마다 교회에 간다', sources: ['m1'] },
          { op: 'add', page: 'now', text: '[민감정보:건강] 이야기를 했다', sources: ['m1'] },
          { op: 'add', page: 'now', text: '번호는 010-1234-5678 이다', sources: ['m1'] },
        ],
      }),
      ctx(),
    );
    expect(ops.adds).toEqual([]);
  });

  it('고치는 문장에도 같은 검사를 한다 — 걸리면 고치지 않고 기존 문장을 그대로 둔다', () => {
    const ops = parseIngest(
      json({
        claims: [
          { op: 'update', id: 'c1', text: '주말마다 교회에 간다', sources: ['m1'] },
          { op: 'update', id: 'c1', text: '[민감정보:건강] 이야기를 했다', sources: ['m1'] },
          { op: 'update', id: 'c1', text: 'hello@example.com 으로 연락한다', sources: ['m1'] },
        ],
      }),
      ctx(),
    );
    expect(ops.updates).toEqual([]);
  });

  it('기존 문장을 고치고 뺀다 — 모르는 id 는 무시한다', () => {
    const ops = parseIngest(
      json({
        claims: [
          { op: 'update', id: 'c1', text: '예전엔 자주 걸었는데 요즘은 바쁘다', sources: ['m2'] },
          { op: 'remove', id: 'c9' },
          { op: 'update', id: 'c9', text: '없는 문장', sources: ['m2'] },
        ],
      }),
      ctx(),
    );
    expect(ops.updates).toEqual([{ id: 'c1', text: '예전엔 자주 걸었는데 요즘은 바쁘다', sources: ['m2'] }]);
    expect(ops.removes).toEqual([]);
  });

  it('고칠 때 새 출처는 이번 사용자 말에서만 — 없으면 글만 고친다', () => {
    const ops = parseIngest(
      json({ claims: [{ op: 'update', id: 'c1', text: '요즘은 바쁘다', sources: ['m9'] }] }),
      ctx(),
    );
    expect(ops.updates).toEqual([{ id: 'c1', text: '요즘은 바쁘다', sources: [] }]);
  });

  it('빼기로 한 문장을 고치라는 말은 버린다', () => {
    const ops = parseIngest(
      json({
        claims: [
          { op: 'update', id: 'c1', text: '고친 문장', sources: ['m1'] },
          { op: 'remove', id: 'c1' },
          { op: 'remove', id: 'c1' },
        ],
      }),
      ctx(),
    );
    expect(ops.updates).toEqual([]);
    expect(ops.removes).toEqual(['c1']);
  });

  it('같은 문장을 두 번 고치라고 하면 하나로 합친다 — 글은 뒤의 것, 출처는 둘을 겹치지 않게 모은다', () => {
    // 같은 출처를 두 번 달면 DB(문장·원문 한 쌍은 하나뿐)가 거절해 묶음이 통째로 실패한다
    const ops = parseIngest(
      json({
        claims: [
          { op: 'update', id: 'c1', text: '처음 고친 문장', sources: ['m1'] },
          { op: 'update', id: 'c1', text: '나중에 고친 문장', sources: ['m2', 'm1'] },
        ],
      }),
      ctx(),
    );
    expect(ops.updates).toEqual([{ id: 'c1', text: '나중에 고친 문장', sources: ['m1', 'm2'] }]);
  });

  it('장 하나에 15문장까지 — 빼는 문장을 먼저 센다', () => {
    const existing = new Map<string, WikiPageKey>(Array.from({ length: 15 }, (_, i) => [`c${i}`, 'now'] as [string, WikiPageKey]));
    const add = { op: 'add', page: 'now', text: '새 문장', sources: ['m1'] };
    expect(parseIngest(json({ claims: [add] }), ctx({ existingClaims: existing })).adds).toEqual([]);
    expect(parseIngest(json({ claims: [{ op: 'remove', id: 'c0' }, add] }), ctx({ existingClaims: existing })).adds).toHaveLength(1);
  });

  it('한 장에 14문장이 있으면 하나만 더하고 나머지는 버린다 — 다른 장은 따로 센다', () => {
    const existing = new Map<string, WikiPageKey>(Array.from({ length: 14 }, (_, i) => [`c${i}`, 'now'] as [string, WikiPageKey]));
    const ops = parseIngest(
      json({
        claims: [
          { op: 'add', page: 'now', text: '첫 문장', sources: ['m1'] },
          { op: 'add', page: 'now', text: '둘째 문장', sources: ['m1'] },
          { op: 'add', page: 'people', text: '다른 장 문장', sources: ['m1'] },
        ],
      }),
      ctx({ existingClaims: existing }),
    );
    expect(ops.adds.map((a) => a.text)).toEqual(['첫 문장', '다른 장 문장']);
  });

  it('문장은 200자, 조건 정보 값은 40자까지 — 코드 포인트로 자르니 이모지를 반으로 가르지 않는다', () => {
    const ops = parseIngest(
      json({
        claims: [{ op: 'add', page: 'now', text: `${'가'.repeat(199)}😌넘치는 글`, sources: ['m1'] }],
        facts: [{ key: 'company', value: `${'A'.repeat(39)}😌B` }],
      }),
      ctx(),
    );
    expect(ops.adds[0].text).toBe(`${'가'.repeat(199)}😌`);
    expect(ops.facts[0].value).toBe(`${'A'.repeat(39)}😌`);
    expect(`${ops.adds[0].text}${ops.facts[0].value}`).not.toMatch(/\p{Surrogate}/u);
  });

  it('조건 정보 값만 받는다 — 실용 정보와 민감한 값은 버린다', () => {
    const ops = parseIngest(
      json({
        facts: [
          { key: 'company', value: ' A사 ' },
          { key: 'income_band', value: '5천만원대' },
          { key: 'smoking', value: 'no' },
          { key: 'school', value: '신학대학교에서 신앙을 공부했다' },
        ],
      }),
      ctx(),
    );
    expect(ops.facts).toEqual([
      { key: 'company', value: 'A사' },
      { key: 'income_band', value: '5천만원대' },
    ]);
  });

  it('조건 정보 값에 연락처가 있거나 비어 있으면 버린다', () => {
    const ops = parseIngest(
      json({
        facts: [
          { key: 'company', value: '010-1234-5678' },
          { key: 'housing', value: 'a@b.com' },
          { key: 'school', value: '   ' },
        ],
      }),
      ctx(),
    );
    expect(ops.facts).toEqual([]);
  });

  it('JSON 이 아니면 아무것도 하지 않는다, 코드펜스는 벗긴다', () => {
    expect(parseIngest('정리할 게 없어요', ctx())).toEqual({ adds: [], updates: [], removes: [], facts: [] });
    expect(parseIngest('```json\n{"claims":[{"op":"add","page":"now","text":"걷는다","sources":["m1"]}]}\n```', ctx()).adds).toHaveLength(1);
  });

  it('JSON 이어도 객체가 아니거나 모양이 틀리면 건너뛴다 — 던지지 않는다', () => {
    expect(parseIngest('', ctx())).toEqual(NOTHING);
    expect(parseIngest('null', ctx())).toEqual(NOTHING);
    expect(parseIngest('[]', ctx())).toEqual(NOTHING);
    expect(parseIngest('7', ctx())).toEqual(NOTHING);
    expect(parseIngest(json({ claims: '없음', facts: { key: 'company', value: 'A사' } }), ctx())).toEqual(NOTHING);
    const crooked = parseIngest(
      json({
        claims: [
          null,
          '문장',
          3,
          ['add'],
          { op: 'add' },
          { op: 'replace', page: 'now', text: '모르는 작업', sources: ['m1'] },
          { op: 'add', page: 'now', text: 7, sources: ['m1'] },
          { op: 'add', page: 7, text: '장이 숫자', sources: ['m1'] },
          { op: 'add', page: 'now', text: '출처가 글자', sources: 'm1' },
          { op: 'update', id: 7, text: 'id 가 숫자', sources: ['m1'] },
          { op: 'remove', id: 7 },
        ],
        facts: ['company', null, { key: 'company' }, { key: 'company', value: 3 }, { key: 7, value: 'A사' }],
      }),
      ctx(),
    );
    expect(crooked).toEqual(NOTHING);
  });
});
