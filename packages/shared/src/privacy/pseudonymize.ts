/**
 * 식별자 지우기 (CLAUDE.md 10.1·10.2c·13장)
 * - 연락처는 저장 전과 LLM 전송 전 모두 지운다
 * - 이름은 LLM 전송 전에만 [이름] 으로 바꾼다. AI 는 실명을 알 필요가 없다
 */
const RRN = /\d{6}-?[1-4]\d{6}/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g;

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
