import { GALPI_COPY } from '@prologue/shared';

/**
 * 위기 신호 — 세계관을 거두고 담백하게 안내한다 (갈피 문서 3.6 ③, AI 엔진 문서 8장)
 * 1차는 이 낱말 규칙, 2차는 갈피 답의 signals.crisis (reply.ts). 둘 중 하나라도 걸리면 안전 안내를 붙인다.
 * 1차는 뜻이 분명한 말만 잡는다. '살고 싶지 않다'는 기본으로 자해 신호다. 장소 명사 + 조사 바로 뒤에 올 때만
 * 생활권 이야기로 빼고(시골에는 살고 싶지 않아요), 때·사람·상황 뒤의 말은 모두 자해 신호로 남긴다(요즘엔, 너 때문에).
 * 업무 낱말 뒤의 '다 끝내고 싶다'(오늘 일 다 끝내고 싶어요)는 빼고, 삶·인생·세상을 끝내고 싶다는 말은 살린다.
 * 자살예방·자해 예방 교육, 몰래 찍은 사진, 때렸다, 따라다닌다 같은 흔한 말은 규칙에서 빼고 2차에 맡긴다.
 */
export type CrisisKind = 'none' | 'danger' | 'self_harm';

/**
 * 장소 명사 — 조사가 붙거나 바로 '살고 싶지 않다'가 올 때만 생활권 이야기로 뺀다.
 * 신세계는 백화점·상권 이름이라 장소로 넣었다 (신세계에서 살고 싶지 않아요 → 생활권).
 */
const PLACE_NOUN = '(?:시골|도시|대도시|동네|지역|지방|나라|땅|해외|외국|서울|부산|대구|인천|광주|대전|울산|제주|경기|수도권|아파트|집|근처|주변|여기|거기|저기|신세계)';
/** 장소 뒤의 조사 — 에서는·에서도·에서·에는·에도·에선·엔·에, 은·는·도, 말이 줄어든 서·선(여기서, 시골선) */
const PARTICLE = '(?:에서는|에서도|에서|에는|에도|에선|엔|에|은|는|도|서|선)';
/** 업무 낱말 — 이 뒤의 '다 끝내고 싶다'는 자해가 아니다 (오늘 일 다 끝내고 싶어요) */
const TASK_WORD = '(?:일|숙제|과제|업무|공부|정리|청소|작업|보고서|프로젝트)(?:을|를)?';

const SELF_HARM: readonly RegExp[] = [
  /죽고\s*싶/,
  /죽어\s*버리고\s*싶/,
  /뛰어\s*내리고\s*싶/,
  /자살(?!\s*예방)/,
  /자해(?!\s*예방)/,
  /목숨을\s*끊/,
  // 장소 명사 + 조사(없어도 됨) 바로 뒤의 '살고 싶지 않다'만 생활권 이야기로 뺀다 (시골에는 살고 싶지 않아요)
  new RegExp(String.raw`(?<!${PLACE_NOUN}(?:\s*${PARTICLE})?\s*)살고\s*싶지\s*않`),
  // 업무를 끝내고 싶다는 말은 뺀다 (오늘 일 다 끝내고 싶어요)
  new RegExp(String.raw`(?<!${TASK_WORD}\s*)다\s*끝내고\s*싶`),
  // 삶·인생·세상을 끝내고 싶다는 말은 업무 예외에서 빼지 않는다 (인생 정리 다 끝내고 싶어, 삶을 끝내고 싶어요)
  new RegExp(String.raw`(?:세상|삶|인생)(?:을|를|${PARTICLE})?\s*(?:정리\s*)?(?:다\s*)?끝내고\s*싶`),
  /세상을\s*떠나고\s*싶/,
  /손목을\s*긋/,
  /손목을\s*그(?:었|어)/,
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

/** 자모를 풀어 쓴 한글(NFD)은 낱말 규칙에 걸리지 않는다 — 붙인 꼴(NFC)로 맞춘 뒤에 본다 */
export function detectCrisis(text: string): CrisisKind {
  const nfc = text.normalize('NFC');
  if (SELF_HARM.some((re) => re.test(nfc))) return 'self_harm';
  if (DANGER.some((re) => re.test(nfc))) return 'danger';
  return 'none';
}

export function safetyMessage(kind: Exclude<CrisisKind, 'none'>): string {
  return kind === 'self_harm' ? GALPI_COPY.crisis.selfHarm : GALPI_COPY.crisis.danger;
}
