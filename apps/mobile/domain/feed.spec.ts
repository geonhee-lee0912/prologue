import { describe, expect, it } from 'vitest';
import { buildFeed } from './feed';
import { emptyState, profile } from './fixtures';
import { createLetter } from './letters';
import { endOfLocalDay, localDateKey } from './time';
import type { AppState } from './types';

const now = new Date(2026, 9, 11, 9, 0);

const busy = (): AppState => ({
  ...emptyState(),
  connections: [
    {
      id: 'c1',
      name: '민준',
      photoUri: 'minjun.jpg',
      letterId: 'L1',
      ended: false,
      celebrated: true,
      messages: [{ id: 'm1', from: 'them', text: '안녕하세요 반가워요', at: now.toISOString() }],
      lastReadAt: null,
    },
  ],
  lightIntros: [
    {
      id: 'li1',
      name: '현우',
      photoUri: 'hyunwoo.jpg',
      age: 30,
      area: '합정',
      oneLine: '사진 찍으러 혼자 여행 다녀요',
      status: 'new',
      expiresAt: endOfLocalDay(now).toISOString(),
    },
  ],
  letters: [
    createLetter({
      id: 'L9',
      sentAt: now,
      candidates: [{ id: 'a', storyLine: '주말마다 동네 빵집을 찾아다니는 분' }],
      profiles: { a: profile('도윤', { photoUri: 'doyun.jpg' }) },
    }),
  ],
  tasteCards: [{ id: 't1', date: localDateKey(now), options: ['비 오는 날 작은 서점', '새벽 한강 라면'], picked: null }],
  chapters: [{ id: 'ch1', title: '첫 장 — 요즘의 나', addedAt: now.toISOString() }],
  keepsakes: [{ id: 'k1', kind: 'firstLetter', at: now.toISOString() }],
});

describe('소식', () => {
  it('다른 사용자의 이름·사진·이야기는 소식에 절대 나오지 않는다', () => {
    const feed = buildFeed(busy(), now);
    const json = JSON.stringify(feed);
    for (const leak of ['민준', '현우', '도윤', '.jpg', '안녕하세요', '혼자 여행', '빵집', '합정']) {
      expect(json).not.toContain(leak);
    }
    expect(feed.some((i) => i.kind === 'lightIntroAvailable')).toBe(true);
  });

  it('하루 소식은 최대 5개, 끝없이 내려가지 않는다', () => {
    expect(buildFeed(busy(), now)).toHaveLength(5);
  });

  it('조용한 날에도 일지와 서고 소식은 있다', () => {
    const kinds = buildFeed(emptyState(), now).map((i) => i.kind);
    expect(kinds).toEqual(['journal', 'archiveNews']);
  });

  it('고른 취향 카드는 소식에서 빠진다', () => {
    const st = { ...busy(), tasteCards: [{ ...busy().tasteCards[0], picked: 0 as const }] };
    expect(buildFeed(st, now).some((i) => i.kind === 'tasteCard')).toBe(false);
  });

  it('넘긴 가벼운 소개는 소식에 알리지 않는다', () => {
    const st = { ...busy(), lightIntros: [{ ...busy().lightIntros[0], status: 'passed' as const }] };
    expect(buildFeed(st, now).some((i) => i.kind === 'lightIntroAvailable')).toBe(false);
  });

  it('오늘 꽂힌 장은 내 이야기 소식이 된다', () => {
    const story = buildFeed(busy(), now).find((i) => i.kind === 'myStory');
    expect(story).toMatchObject({ text: '책장에 「첫 장 — 요즘의 나」 장이 꽂혔어요' });
  });
});
