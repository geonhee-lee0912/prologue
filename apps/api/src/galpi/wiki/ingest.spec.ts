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

  // 가명처리가 사용자의 이름 자리에 넣은 [이름] 은 서고에 남기지 않는다 — 서고 문장은 사용자에게 그대로 보이고 리포트의 재료가 된다
  describe('이름 자리표시자 [이름]', () => {
    const addText = (text: string) => parseIngest(json({ claims: [{ op: 'add', page: 'now', text, sources: ['m1'] }] }), ctx()).adds.map((a) => a.text);

    it('"[이름]은 …" 꼴 — 자리표시자와 조사를 빼고 주어 없이 남긴다', () => {
      expect(addText('[이름]은 퇴근 뒤에 걷는다')).toEqual(['퇴근 뒤에 걷는다']);
    });

    it('"[이름]의 …" 꼴', () => {
      expect(addText('[이름]의 친구들은 차분하다고 한다')).toEqual(['친구들은 차분하다고 한다']);
    });

    it.each([
      ['[이름]는 혼자 걷는 편이다', '혼자 걷는 편이다'],
      ['[이름]이 걷기를 좋아한다', '걷기를 좋아한다'],
      ['[이름]가 걷기를 좋아한다', '걷기를 좋아한다'],
      ['[이름]을 편하게 부르길 원한다', '편하게 부르길 원한다'],
      ['[이름]를 편하게 부르길 원한다', '편하게 부르길 원한다'],
      ['[이름]에게 가족은 중요하다', '가족은 중요하다'],
      ['[이름]도 비슷하게 생각한다', '비슷하게 생각한다'],
    ])('조사 %s', (text, expected) => {
      expect(addText(text)).toEqual([expected]);
    });

    it('문장 가운데에 있어도 빼고, 남은 띄어쓰기를 다듬는다', () => {
      expect(addText('친구들은 [이름]을 믿음직하다고 본다')).toEqual(['친구들은 믿음직하다고 본다']);
      expect(addText('[이름]은 [이름]의 친구와 자주 지낸다')).toEqual(['친구와 자주 지낸다']);
      expect(addText('  [이름]은   퇴근 뒤에   걷는다  ')).toEqual(['퇴근 뒤에 걷는다']);
      // 앞 말에 붙어 있어도 낱말이 달라붙지 않는다
      expect(addText('친구들은[이름]을 믿음직하다고 본다')).toEqual(['친구들은 믿음직하다고 본다']);
    });

    it('벗기고 나면 아무것도 남지 않는 문장은 버린다', () => {
      for (const text of ['[이름]', '[이름]은', '  [이름]이  ', '[이름] [이름]도']) expect(addText(text)).toEqual([]);
    });

    it('자리표시자 바로 뒤에 다른 말이 붙어 벗겨도 말이 깨지는 문장은 버린다 — 남기지 않는다', () => {
      // "[이름]이라고" 의 "이" 는 조사가 아니라 이라고 의 일부다. 벗기면 "라고 불리는 …" 이 남는다
      for (const text of ['[이름]이라고 불리는 걸 좋아한다', '[이름]처럼 걷는 사람이 좋다', '[이름]와 친구들은 차분하다', '[이름]이다']) expect(addText(text)).toEqual([]);
    });

    it('자리표시자가 없는 글은 건드리지 않는다', () => {
      expect(addText('친구들이 이름을 자주 부른다')).toEqual(['친구들이 이름을 자주 부른다']);
      expect(addText('은행에 다니고 도서관에 자주 간다')).toEqual(['은행에 다니고 도서관에 자주 간다']);
    });

    it('벗긴 문장에도 같은 검사를 한다 — 길이는 벗긴 뒤의 글로 센다', () => {
      expect(addText('[이름]은 주말마다 교회에 간다')).toEqual([]);
      expect(addText(`[이름]은 ${'가'.repeat(200)}`)).toEqual(['가'.repeat(200)]);
    });

    it('고치는 문장도 같다 — 벗기고 나서 비면 고치지 않고 기존 문장을 그대로 둔다', () => {
      const ops = parseIngest(
        json({
          claims: [
            { op: 'update', id: 'c1', text: '[이름]은 요즘 바빠서 덜 걷는다', sources: ['m1'] },
            { op: 'update', id: 'c1', text: '[이름]은', sources: ['m2'] },
          ],
        }),
        ctx(),
      );
      expect(ops.updates).toEqual([{ id: 'c1', text: '요즘 바빠서 덜 걷는다', sources: ['m1'] }]);
    });

    it('조건 정보 값도 같다 — 벗기고 나서 비거나 말이 깨지면 버린다', () => {
      const ops = parseIngest(
        json({
          facts: [
            { key: 'housing', value: '[이름]의 전세 아파트' },
            { key: 'company', value: '[이름]' },
            { key: 'school', value: '[이름]고등학교' },
            { key: 'income_band', value: '5천만원대' },
          ],
        }),
        ctx(),
      );
      expect(ops.facts).toEqual([
        { key: 'housing', value: '전세 아파트' },
        { key: 'income_band', value: '5천만원대' },
      ]);
    });
  });
});
