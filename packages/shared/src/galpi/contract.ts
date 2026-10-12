/**
 * 갈피 API 계약 — 서버(apps/api)와 앱(apps/mobile)이 같이 쓴다.
 * 출처: docs/superpowers/specs/2026-10-11-갈피-AI-엔진-design.md
 * 서버 계약: AI 만 보는 장(attraction, next_topics)은 어떤 응답에도 담지 않는다 (스펙 3.3)
 */

/** 갈피 표정 9종 — 표정 시트(r3) 순서 (갈피 문서 3.6 ③) */
export const GALPI_EXPRESSIONS = [
  'welcome',
  'wave',
  'curious',
  'thinking',
  'worried',
  'comfort',
  'shy',
  'proud',
  'sleepy',
] as const;
export type GalpiExpression = (typeof GALPI_EXPRESSIONS)[number];

/** 서고의 장 (스펙 3.3) */
export const VISIBLE_WIKI_PAGES = ['now', 'people', 'relationship', 'met'] as const;
export const AI_ONLY_WIKI_PAGES = ['attraction', 'next_topics'] as const;
export type VisibleWikiPage = (typeof VISIBLE_WIKI_PAGES)[number];
export type AiOnlyWikiPage = (typeof AI_ONLY_WIKI_PAGES)[number];
export type WikiPageKey = VisibleWikiPage | AiOnlyWikiPage;
export const WIKI_PAGES: readonly WikiPageKey[] = [...VISIBLE_WIKI_PAGES, ...AI_ONLY_WIKI_PAGES];

export const WIKI_PAGE_TITLES: Record<WikiPageKey, string> = {
  now: '요즘의 나',
  people: '사람들',
  relationship: '바라는 관계',
  met: '만난 뒤 이야기',
  attraction: '끌리는 것과 아닌 것',
  next_topics: '다음에 꺼낼 것',
};

export function isVisibleWikiPage(page: string): page is VisibleWikiPage {
  return (VISIBLE_WIKI_PAGES as readonly string[]).includes(page);
}

/** 구조화 칸 (스펙 3.4). 조건 정보는 본인이 허락한 항목만 편지에 담는다 (하드룰 8) */
export const CONDITION_FACTS = ['school', 'income_band', 'housing', 'company'] as const;
export const PRACTICAL_FACTS = ['smoking', 'marriage_intent', 'children_intent'] as const;
export type ConditionFact = (typeof CONDITION_FACTS)[number];
export type PracticalFact = (typeof PRACTICAL_FACTS)[number];
export type ProfileFactKey = ConditionFact | PracticalFact;

export function isConditionFact(key: string): key is ConditionFact {
  return (CONDITION_FACTS as readonly string[]).includes(key);
}

export function isPracticalFact(key: string): key is PracticalFact {
  return (PRACTICAL_FACTS as readonly string[]).includes(key);
}

/** 갈피가 건네는 버튼 (스펙 5.2·5.3) */
export type QuickReplyType = 'condition_permission' | 'practical' | 'speech_level';

export interface QuickReplySpec {
  type: QuickReplyType;
  fact?: ProfileFactKey;
}

export interface QuickReplyOption {
  key: string;
  label: string;
}

const PRACTICAL_OPTIONS: Record<PracticalFact, QuickReplyOption[]> = {
  smoking: [
    { key: 'no', label: '안 피워요' },
    { key: 'sometimes', label: '가끔 피워요' },
    { key: 'yes', label: '피워요' },
  ],
  marriage_intent: [
    { key: 'yes', label: '생각 있어요' },
    { key: 'unsure', label: '아직 모르겠어요' },
    { key: 'no', label: '생각 없어요' },
  ],
  children_intent: [
    { key: 'yes', label: '원해요' },
    { key: 'unsure', label: '아직 모르겠어요' },
    { key: 'no', label: '원하지 않아요' },
  ],
};

export function quickReplyOptions(spec: QuickReplySpec): QuickReplyOption[] {
  switch (spec.type) {
    case 'condition_permission':
      return [
        { key: 'allow', label: '적어도 돼요' },
        { key: 'deny', label: '서고에만 둘게요' },
      ];
    case 'speech_level':
      return [
        { key: 'casual', label: '좋아, 편하게 하자' },
        { key: 'keep', label: '지금이 좋아요' },
      ];
    case 'practical':
      return spec.fact && isPracticalFact(spec.fact) ? PRACTICAL_OPTIONS[spec.fact] : [];
  }
}

/** 응답 DTO */
export interface GalpiQuickReplyDto {
  type: QuickReplyType;
  fact?: ProfileFactKey;
  options: QuickReplyOption[];
  /** 이미 답했으면 고른 key */
  answeredKey: string | null;
}

export interface GalpiMessageDto {
  id: string;
  from: 'galpi' | 'me';
  kind: 'text' | 'emoticon';
  text?: string;
  expression?: GalpiExpression;
  quickReply?: GalpiQuickReplyDto;
  /** ISO 시각 */
  at: string;
}

export interface GalpiTurnResultDto {
  messages: GalpiMessageDto[];
}

/** 갈피가 기억하는 것 — 보이는 장의 문장만 (스펙 3.3·3.6) */
export interface GalpiMemoryDto {
  id: string;
  page: VisibleWikiPage;
  pageTitle: string;
  text: string;
}

export interface GalpiReportDto {
  id: string;
  body: string;
  aiNotice: string;
  createdAt: string;
}

/** 편지·리포트에 붙는 AI 고지 (CLAUDE.md 13장, 화면과 같은 문구) */
export const AI_LETTER_NOTICE = '이 편지는 AI가 썼어요';

/** "다른 얘기 할래요" 를 누르면 저장되는 말 — 알아가기는 인터뷰가 아니다 (스펙 5.1) */
export const GALPI_SKIP_TEXT = '다른 얘기 할래요';

/** 저장할 때 가린 민감정보 자리를 사용자에게 보여줄 때 (CLAUDE.md 10.2b) */
export const MASKED_TEXT_DISPLAY = '(가린 이야기)';
