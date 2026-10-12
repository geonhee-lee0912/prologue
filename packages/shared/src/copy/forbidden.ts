/**
 * 금지 표현 — CLAUDE.md 9.1 과 16장. 갈피가 만든 모든 글(대화·리포트·알림)에서 걸러낸다.
 * 짧은 낱말("운명", "보장", "100%")이 긴 문구를 덮는다.
 */
export const FORBIDDEN_EXPRESSIONS: readonly string[] = [
  // 추천/매칭
  '운명',
  '완벽',
  '100%',
  '반드시 잘 맞',
  '보장',
  '실패 없는 추천',
  '수준이 높은 상대',
  '고급 회원',
  '프리미엄 등급',
  '놓치면 후회',
  '지금 안 보면 끝',
  // 대화/연락처
  '대화가 사라져요',
  '매칭이 사라집니다',
  '기회를 잃어요',
  '상대가 기다리고 있어요',
  '빨리 답장',
  // 결제/유료
  '프리미엄 회원만',
  '매칭 확률',
  // 안전/개인정보
  '걱정하지 마세요, 안전합니다',
  '프롤로그가 알아서',
  '검증된 사람만',
  // 사람 상품화
  '쓸어보기',
  '쇼핑하기',
  '사냥하기',
  '랭킹',
  '품절',
  '대출',
  '반납',
  '장바구니',
  '소장',
];

/** CLAUDE.md 9.1 이 막는 것은 사람을 상품처럼 다루는 말과 결과를 약속하는 말이지, 이 평범한 낱말들이 아니다 — 검사 전에 지운다. */
export const FORBIDDEN_ALLOWED_COMPOUNDS: readonly string[] = [
  // 대출
  '전세대출',
  '주택담보대출',
  '신용대출',
  '학자금 대출',
  '학자금대출',
  '대출금',
  '대출 이자',
  // 완벽
  '완벽주의',
  // 보장
  '보장성',
  '사회보장',
  // 소장
  '소장님',
  '연구소장',
];

export function findForbidden(text: string): string[] {
  // 지운 자리는 공백으로 메운다 — 양옆 글자가 이어 붙어 없던 금지 표현이 생기지 않게
  const scanned = FORBIDDEN_ALLOWED_COMPOUNDS.reduce((rest, compound) => rest.split(compound).join(' '), text);
  return FORBIDDEN_EXPRESSIONS.filter((word) => scanned.includes(word));
}
