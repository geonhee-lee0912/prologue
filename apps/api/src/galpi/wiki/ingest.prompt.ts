import { type LlmMessage, POLICY } from '@prologue/shared';

/**
 * 서고 수집 프롬프트 — 새 대화를 읽고 서고 문장을 더하고·고치고·뺀다 (AI 엔진 문서 3.5)
 * LLM 결과는 그대로 믿지 않는다. ingest.ts 가 다시 검증한다.
 */
export const INGEST_SYSTEM_PROMPT = [
  '너는 갈피의 서고를 정리한다. 새로 나눈 대화를 읽고, 이 사람에 대한 서고의 문장을 더하거나 고치거나 뺀다. 반드시 JSON 객체 하나로만 답한다.',
  '',
  '[장]',
  '- now(요즘의 나): 하루와 주말, 쉬는 법, 일, 요즘 마음',
  '- people(사람들): 가까운 사람들과 지내는 방식, 친구들이 보는 나, 가족과의 거리',
  '- relationship(바라는 관계): 연락 빈도, 다툼을 푸는 방식, 관계의 속도, 함께 하고 싶은 것',
  '- attraction(끌리는 것과 아닌 것): 끌린다고 말한 분위기나 사람',
  '- next_topics(다음에 꺼낼 것): 다가오는 일, 하다 만 이야기 (예: "금요일에 발표가 있다")',
  '- met(만난 뒤 이야기)는 지금 쓰지 않는다.',
  '',
  '[쓰는 법]',
  '- 문장 하나에 사실 하나. 해석해서 짧게 쓴다 (예: "퇴근 뒤에는 혼자 걸으며 하루를 정리하는 편이다").',
  '- 사용자가 한 말에서만 쓴다. 갈피가 한 말은 근거가 아니다. 지어내지 않는다.',
  '- sources 에는 근거가 된 사용자 말의 id 만 쓴다. [새 대화]의 [id] 를 그대로 쓴다.',
  '- 이미 있는 문장과 겹치면 add 대신 update 로 고친다. 이제 맞지 않는 문장은 시간 순으로 고치거나("예전엔 자주 걸었는데 요즘은 바빠서 못 걷는다") remove 한다.',
  `- 장 하나에 문장은 ${POLICY.galpi.ingest.maxClaimsPerPage}개까지. 넘치면 비슷한 문장을 합친다.`,
  '- 쓰지 않는 것: 민감정보(종교 등 사상·신념, 노동조합·정당, 정치적 견해, 건강, 성생활, 유전·범죄경력·생체·인종·민족), [민감정보:…]로 가려진 내용, 다른 사람을 알아볼 수 있는 이름과 연락처.',
  '- 학교·회사 이름, 연봉, 주거 형태는 문장에 쓰지 않고 facts 에만 적는다(school, income_band, housing, company). 연봉은 "5천만원대"처럼 구간으로 쓴다.',
  '',
  '[형식]',
  '{"claims": [{"op": "add", "page": "now", "text": "문장", "sources": ["id"]}, {"op": "update", "id": "기존 문장 id", "text": "고친 문장", "sources": ["id"]}, {"op": "remove", "id": "기존 문장 id"}], "facts": [{"key": "company", "value": "값"}]}',
  '바꿀 것이 없으면 {"claims": [], "facts": []} 로 답한다.',
].join('\n');

export interface IngestPromptInput {
  claims: { id: string; page: string; text: string }[];
  facts: { key: string; value: string | null }[];
  /** 가명처리를 마친 새 대화 (오래된 것부터) */
  batch: { id: string; sender: 'galpi' | 'user'; text: string }[];
}

export function formatBatchLine(id: string, sender: 'galpi' | 'user', text: string): string {
  return `[${id}] ${sender === 'user' ? '나' : '갈피'}: ${text}`;
}

export function buildIngestMessages(input: IngestPromptInput): LlmMessage[] {
  const claims = input.claims.length ? input.claims.map((c) => `- (${c.id}) [${c.page}] ${c.text}`).join('\n') : '(없음)';
  const facts = input.facts.length ? input.facts.map((f) => `- ${f.key}: ${f.value ?? '(모름)'}`).join('\n') : '(없음)';
  const batch = input.batch.map((m) => formatBatchLine(m.id, m.sender, m.text)).join('\n');
  return [
    { role: 'system', content: INGEST_SYSTEM_PROMPT },
    { role: 'user', content: `[지금 서고]\n${claims}\n\n[알고 있는 조건 정보]\n${facts}\n\n[새 대화]\n${batch}` },
  ];
}
