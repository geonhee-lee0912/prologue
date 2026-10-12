import { GALPI_COPY } from '@prologue/shared';

/**
 * 위기 신호 — 세계관을 거두고 담백하게 안내한다 (갈피 문서 3.6 ③, AI 엔진 문서 8장)
 * 1차는 이 낱말 규칙, 2차는 갈피 답의 signals.crisis (reply.ts). 둘 중 하나라도 걸리면 안전 안내를 붙인다.
 * 흔한 말과 겹치는 표현(자살예방, 때렸다, 따라다닌다)은 규칙에서 빼고 2차에 맡긴다.
 */
export type CrisisKind = 'none' | 'danger' | 'self_harm';

const SELF_HARM: readonly RegExp[] = [
  /죽고\s*싶/,
  /자살(?!\s*예방)/,
  /자해/,
  /목숨을\s*끊/,
  /살고\s*싶지\s*않/,
  /다\s*끝내고\s*싶/,
  /손목을\s*긋/,
];

const DANGER: readonly RegExp[] = [/폭행/, /협박/, /스토킹/, /스토커/, /위협(을|당|받)/, /감금/, /몰래\s*찍/];

export function detectCrisis(text: string): CrisisKind {
  if (SELF_HARM.some((re) => re.test(text))) return 'self_harm';
  if (DANGER.some((re) => re.test(text))) return 'danger';
  return 'none';
}

export function safetyMessage(kind: Exclude<CrisisKind, 'none'>): string {
  return kind === 'self_harm' ? GALPI_COPY.crisis.selfHarm : GALPI_COPY.crisis.danger;
}
