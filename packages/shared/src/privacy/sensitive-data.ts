/**
 * 민감정보 탐지·마스킹 — 개인정보보호법 제23조, 시행령 제18조 (CLAUDE.md 10.2b)
 *
 * 갈피와의 대화는 자유 대화라서 우리가 묻지 않아도 민감정보가 들어온다. 저장 전에 반드시 거친다.
 * 마스킹은 우리 DB 만 보호한다. 실시간 대화라 LLM 전송 시점은 막지 못하므로 국외이전 동의 범위에 민감정보를 넣는다.
 *
 * 1단계는 낱말 규칙이다. 놓치는 것이 있으므로 서고 수집 때 민감정보가 섞인 문장은 버린다(ingest.ts).
 * 흔한 말과 겹치는 낱말(게이트·전과목·미사일·전도유망·불경기·대선배)은 넣지 않는다.
 */
export const SensitiveCategory = {
  BELIEF: 'BELIEF',
  UNION_PARTY: 'UNION_PARTY',
  POLITICAL: 'POLITICAL',
  HEALTH: 'HEALTH',
  SEXUAL: 'SEXUAL',
  GENETIC: 'GENETIC',
  CRIMINAL: 'CRIMINAL',
  BIOMETRIC: 'BIOMETRIC',
  RACE_ETHNICITY: 'RACE_ETHNICITY',
} as const;

export type SensitiveCategory = (typeof SensitiveCategory)[keyof typeof SensitiveCategory];

const CATEGORIES: readonly SensitiveCategory[] = Object.values(SensitiveCategory);

const LABEL: Record<SensitiveCategory, string> = {
  BELIEF: '사상·신념',
  UNION_PARTY: '노조·정당',
  POLITICAL: '정치',
  HEALTH: '건강',
  SEXUAL: '성생활',
  GENETIC: '유전',
  CRIMINAL: '범죄경력',
  BIOMETRIC: '생체',
  RACE_ETHNICITY: '인종·민족',
};

const KEYWORDS: Record<SensitiveCategory, readonly string[]> = {
  BELIEF: [
    '종교', '교회', '성당', '불교', '기독교', '천주교', '개신교', '이슬람', '무슬림', '힌두교',
    '목사님', '신부님', '스님', '예배', '주일 미사', '미사에', '신앙', '모태신앙', '전도하', '선교',
    '성경', '절에 다니',
  ],
  UNION_PARTY: ['노조', '노동조합', '당원', '정당에 가입', '정당 가입'],
  POLITICAL: [
    '정치 성향', '지지하는 정당', '지지 정당', '보수 성향', '진보 성향', '좌파', '우파', '탄핵',
    '대통령 선거', '국회의원 선거', '민주당', '국민의힘', '정의당', '투표했',
  ],
  HEALTH: [
    '우울증', '공황장애', '공황 발작', '조울증', '양극성 장애', '불안장애', '조현병', 'ADHD', '자폐',
    '암 진단', '항암', '수술을 받', '입원했', '입원 중', '지병', '만성질환', '장애등급', '정신과',
    '상담치료', '약을 먹', '복용 중', '치료를 받', '당뇨', '고혈압', '갑상선', '난임', '불임', '자해', '자살',
  ],
  SEXUAL: [
    '성관계', '성경험', '성적 취향', '성 정체성', '성정체성', '피임', '임신중절', '낙태', '성병',
    '동성애', '양성애', '레즈비언', '트랜스젠더', '무성애',
  ],
  GENETIC: ['유전자 검사', '유전병', '유전 질환', '유전질환'],
  CRIMINAL: ['전과자', '전과가 있', '전과 기록', '범죄경력', '범죄 경력', '수감', '징역', '집행유예', '교도소에'],
  BIOMETRIC: ['지문 인식', '지문인식', '홍채', '안면 인식', '안면인식', '정맥 인식'],
  RACE_ETHNICITY: ['인종', '혼혈', '한국계', '흑인', '백인', '조선족', '탈북', '고려인'],
};

const ENTRIES = CATEGORIES.flatMap((category) => KEYWORDS[category].map((keyword) => ({ keyword, category }))).sort(
  (a, b) => b.keyword.length - a.keyword.length,
);
const CATEGORY_OF = new Map(ENTRIES.map((e) => [e.keyword.toLowerCase(), e.category]));
const KEYWORD_RE = new RegExp(ENTRIES.map((e) => escapeRegExp(e.keyword)).join('|'), 'gi');
/** 이미 가린 자리 — 두 번 돌려도 다시 가리지 않게 나눠 둔다 */
const PLACEHOLDER_RE = /(\[민감정보:[^\]]+\])/;

export interface MaskSensitiveResult {
  masked: string;
  categories: SensitiveCategory[];
}

export function maskSensitive(text: string): MaskSensitiveResult {
  const found = new Set<SensitiveCategory>();
  const masked = text
    .split(PLACEHOLDER_RE)
    .map((part, i) => (i % 2 === 1 ? part : maskPart(part, found)))
    .join('');
  return { masked, categories: CATEGORIES.filter((c) => found.has(c)) };
}

function maskPart(part: string, found: Set<SensitiveCategory>): string {
  return part.replace(KEYWORD_RE, (keyword) => {
    const category = CATEGORY_OF.get(keyword.toLowerCase()) ?? SensitiveCategory.HEALTH;
    found.add(category);
    return `[민감정보:${LABEL[category]}]`;
  });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
