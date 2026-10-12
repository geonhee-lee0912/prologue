import { GALPI_COPY } from '@prologue/shared';

/**
 * 위기 신호 — 세계관을 거두고 담백하게 안내한다 (갈피 문서 3.6 ③, AI 엔진 문서 8장)
 * 1차는 이 낱말 규칙, 2차는 갈피 답의 signals.crisis (reply.ts). 둘 중 하나라도 걸리면 안전 안내를 붙인다.
 * 1차는 뜻이 분명한 말만 잡는다. 흔한 말과 겹치는 표현은 2차에 맡긴다 — 자살예방·자해 예방 교육, 생활권 이야기
 * (시골에는 살고 싶지 않아요), 업무 이야기(오늘 일 다 끝내고 싶어요), 몰래 찍은 사진, 때렸다, 따라다닌다.
 * 다만 존재를 말하는 표현(이 세상에 살고 싶지 않아요)은 장소·업무 예외에서 빼지 않는다.
 */
export type CrisisKind = 'none' | 'danger' | 'self_harm';

const SELF_HARM: readonly RegExp[] = [
  /죽고\s*싶/,
  /자살(?!\s*예방)/,
  /자해(?!\s*예방)/,
  /목숨을\s*끊/,
  // 장소 조사 바로 뒤의 '살고 싶지 않다'는 생활권 이야기다 (시골에는 살고 싶지 않아요)
  /(?<!(?:에서는|에는|에서|에선|엔|에)\s*)살고\s*싶지\s*않/,
  // 업무를 끝내고 싶다는 말은 뺀다 (오늘 일 다 끝내고 싶어요)
  /(?<!(?:일|숙제|과제|업무|공부|정리|청소|작업|보고서|프로젝트)(?:을|를)?\s*)다\s*끝내고\s*싶/,
  // 존재를 말하는 표현은 위 두 예외에서 빼지 않는다 (이 세상에 살고 싶지 않아요)
  /(?:세상|세계|땅|삶|인생)(?:을|를|에서는|에는|에서|에선|엔|에)?\s*(?:정리\s*)?(?:다\s*)?(?:살고\s*싶지\s*않|끝내고\s*싶)/,
  /손목을\s*긋/,
];

const DANGER: readonly RegExp[] = [
  /폭행/,
  /협박/,
  /스토킹/,
  /스토커/,
  /위협(을|당|받)/,
  /감금/,
  /몰래\s*찍혔/,
  /불법\s*촬영/,
];

export function detectCrisis(text: string): CrisisKind {
  if (SELF_HARM.some((re) => re.test(text))) return 'self_harm';
  if (DANGER.some((re) => re.test(text))) return 'danger';
  return 'none';
}

export function safetyMessage(kind: Exclude<CrisisKind, 'none'>): string {
  return kind === 'self_harm' ? GALPI_COPY.crisis.selfHarm : GALPI_COPY.crisis.danger;
}
