/**
 * 친구 탭 소식 — 앱 IA 3.3
 *
 * 갈피·서고·나에 대한 소식만. 다른 사용자는 익명으로도 나오지 않는다(하드룰 1).
 * 오늘 몇 개만 — 끝없이 내려가지 않는다.
 * 그래서 FeedItem 에는 사람을 담을 필드가 아예 없다.
 */
import { POLICY } from '@prologue/shared/policy';
import { currentLightIntro } from './light-intros';
import { localDateKey, pickByDay } from './time';
import type { AppState } from './types';

export type FeedItem =
  | { id: string; kind: 'lightIntroAvailable' }
  | { id: string; kind: 'tasteCard'; cardId: string }
  | { id: string; kind: 'myStory'; text: string }
  | { id: string; kind: 'profileChanged'; text: string }
  | { id: string; kind: 'journal'; text: string }
  | { id: string; kind: 'archiveNews'; text: string };

const JOURNAL = [
  '오늘은 오래된 편지들을 다시 읽었어요. 다들 첫 문장을 제일 오래 고민했더라고요.',
  '서고 창문을 열어 두었어요. 종이 냄새가 조금 옅어졌어요.',
  '책장 맨 아래 칸을 정리했어요. 생각보다 오래된 이야기가 많았어요.',
  '오늘은 편지 대신 일지를 써요. 조용한 날도 필요하니까요.',
  '비가 와서 서고가 조용해요. 이런 날엔 이야기가 더 잘 들려요.',
] as const;

export function buildFeed(state: AppState, now: Date): FeedItem[] {
  const today = localDateKey(now);
  const items: FeedItem[] = [];

  if (currentLightIntro(state, now)) {
    items.push({ id: `light-${today}`, kind: 'lightIntroAvailable' });
  }

  const card = state.tasteCards.find((c) => c.date === today && c.picked === null);
  if (card) items.push({ id: `taste-${card.id}`, kind: 'tasteCard', cardId: card.id });

  const chapter = [...state.chapters].reverse().find((c) => localDateKey(new Date(c.addedAt)) === today);
  if (chapter) {
    items.push({ id: `story-${chapter.id}`, kind: 'myStory', text: `책장에 「${chapter.title}」 장이 꽂혔어요` });
  }

  if (state.keepsakes.some((k) => localDateKey(new Date(k.at)) === today)) {
    items.push({ id: `room-${today}`, kind: 'profileChanged', text: '갈피의 방에 기념품이 하나 놓였어요' });
  }

  items.push({ id: `journal-${today}`, kind: 'journal', text: pickByDay(JOURNAL, now) });
  items.push({
    id: `archive-${today}`,
    kind: 'archiveNews',
    text: `이 서고에 이야기를 남긴 분이 ${state.archiveCount}명이에요`,
  });

  return items.slice(0, POLICY.feed.maxItems);
}
