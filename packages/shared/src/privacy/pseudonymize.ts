/**
 * 식별자 지우기 (CLAUDE.md 10.1·10.2c·13장)
 * - 연락처는 저장 전과 LLM 전송 전 모두 지운다
 * - 이름은 LLM 전송 전에만 [이름] 으로 바꾼다. AI 는 실명을 알 필요가 없다
 */
// 주민번호 — 하이픈이 없거나 바로 이어진 꼴(9001011234567 · 900101-1234567)은 앞에 무엇이 붙어 있어도 지운다.
// 하이픈 앞뒤에 공백이 있는 꼴(901010 - 1234567)도 지우되, 이 꼴만은 앞에 숫자가 붙어 있으면 지우지 않는다 —
// 더 긴 숫자의 꼬리일 뿐인 숫자 범위(3000000 - 4000000 · 20180101 - 20241231)를 주민번호로 오인하지 않게. 공백은 줄을 넘지 않는다
const RRN = /\d{6}-?[1-4]\d{6}|(?<!\d)\d{6}(?:[ \t]+-[ \t]*|[ \t]*-[ \t]+)[1-4]\d{6}/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// 휴대폰 — 010-1234-5678 · 01012345678 · 010 1234 5678 · 010.1234.5678, 국제 표기 +82 10-1234-5678 · +82-10-… · +821012345678 · +82 (0)10-… (+ 는 빠져도 된다)
// 아직 지우지 않는 것(보류): 엔 대시·전각 숫자·한글로 쓴 숫자, 유선전화
const PHONE = /(?:\+?82[-\s.]?(?:\(0\))?[-\s.]?|0)1[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g;

export function redactContacts(text: string): string {
  // 주민번호를 먼저 — 휴대폰 패턴과 겹치지 않게
  return text.replace(RRN, '[주민번호]').replace(EMAIL, '[이메일]').replace(PHONE, '[연락처]');
}

export interface PseudonymizeOptions {
  /** 본인이 정한 호칭 이름. 대화에 나오면 [이름] 으로 바꾼다 */
  name?: string | null;
}

export function pseudonymize(text: string, options: PseudonymizeOptions = {}): string {
  const result = redactContacts(text);
  const name = options.name?.trim();
  // 한 글자 이름은 다른 낱말을 망가뜨린다
  if (!name || name.length < 2) return result;
  return result.split(name).join('[이름]');
}
