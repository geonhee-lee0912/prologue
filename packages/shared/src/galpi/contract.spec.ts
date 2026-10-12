import { describe, expect, it } from 'vitest';
import { POLICY } from '../policy';
import {
  AI_ONLY_WIKI_PAGES,
  isConditionFact,
  isPracticalFact,
  isVisibleWikiPage,
  PRACTICAL_FACTS,
  type QuickReplySpec,
  quickReplyOptions,
  VISIBLE_WIKI_PAGES,
  WIKI_PAGE_TITLES,
  WIKI_PAGES,
} from './contract';

describe('서고의 장', () => {
  it('보이는 장과 AI 만 보는 장을 합치면 전부다', () => {
    expect(WIKI_PAGES).toEqual([...VISIBLE_WIKI_PAGES, ...AI_ONLY_WIKI_PAGES]);
    for (const page of WIKI_PAGES) expect(WIKI_PAGE_TITLES[page]).toBeTruthy();
  });

  it('AI 만 보는 장은 보이는 장이 아니다 (스펙 3.3)', () => {
    expect(isVisibleWikiPage('now')).toBe(true);
    expect(isVisibleWikiPage('attraction')).toBe(false);
    expect(isVisibleWikiPage('next_topics')).toBe(false);
  });
});

describe('구조화 칸', () => {
  it('조건 정보와 실용 정보를 구분한다', () => {
    expect(isConditionFact('company')).toBe(true);
    expect(isConditionFact('smoking')).toBe(false);
    expect(isPracticalFact('marriage_intent')).toBe(true);
  });

  it('알게 됨에 필요한 실용 정보는 실용 정보 목록 안에 있다', () => {
    for (const fact of POLICY.galpi.known.requiredPracticalFacts) {
      expect((PRACTICAL_FACTS as readonly string[]).includes(fact)).toBe(true);
    }
  });
});

describe('버튼', () => {
  it('조건 허락은 두 개, 말 놓기는 두 개', () => {
    expect(quickReplyOptions({ type: 'condition_permission', fact: 'company' }).map((o) => o.key)).toEqual(['allow', 'deny']);
    expect(quickReplyOptions({ type: 'speech_level' }).map((o) => o.key)).toEqual(['casual', 'keep']);
  });

  it('실용 정보는 칸마다 선택지가 다르다', () => {
    expect(quickReplyOptions({ type: 'practical', fact: 'smoking' }).map((o) => o.key)).toEqual(['no', 'sometimes', 'yes']);
    expect(quickReplyOptions({ type: 'practical', fact: 'children_intent' })).toHaveLength(3);
  });

  it('칸이 없거나 맞지 않는 실용 정보 버튼은 선택지가 없다', () => {
    expect(quickReplyOptions({ type: 'practical' })).toEqual([]);
    expect(quickReplyOptions({ type: 'practical', fact: 'company' })).toEqual([]);
  });

  it('돌려준 선택지를 바꿔도 다음 호출에는 영향이 없다', () => {
    const specs: QuickReplySpec[] = [
      { type: 'condition_permission', fact: 'company' },
      { type: 'speech_level' },
      ...PRACTICAL_FACTS.map((fact): QuickReplySpec => ({ type: 'practical', fact })),
    ];
    for (const spec of specs) {
      const before = JSON.parse(JSON.stringify(quickReplyOptions(spec)));
      const returned = quickReplyOptions(spec);
      returned[0].label = '바꿔 버렸다';
      returned.pop();
      expect(quickReplyOptions(spec)).toEqual(before);
    }
  });
});

describe('정책 숫자', () => {
  it('조용한 시간은 21시부터 8시 전까지', () => {
    expect(POLICY.galpi.quietHours).toEqual({ startHour: 21, endHour: 8 });
  });

  it('기본 시각은 조용한 시간 밖이다', () => {
    const { startHour, endHour } = POLICY.galpi.quietHours;
    expect(POLICY.galpi.defaultProactiveHour).toBeGreaterThanOrEqual(endHour);
    expect(POLICY.galpi.defaultProactiveHour).toBeLessThan(startHour);
  });
});
