/**
 * 식별자 지우기 (CLAUDE.md 10.1·10.2c·13장)
 * - 연락처는 저장 전과 LLM 전송 전 모두 지운다
 * - 이름은 LLM 전송 전에만 [이름] 으로 바꾼다. AI 는 실명을 알 필요가 없다
 */
// 주민번호 — 하이픈이 없거나 바로 이어진 꼴: 9001011234567 · 900101-1234567. 앞에 무엇이 붙어 있어도 지운다
const RRN = /\d{6}-?[1-4]\d{6}/g;
// 주민번호 — 하이픈 앞뒤에 공백이 있는 꼴: 901010 - 1234567. 공백은 줄을 넘지 않는다.
// 두 번째 판이다: RRN 이 잡던 것은 전과 똑같이 먼저 지워지고 이 판은 남은 것만 더 지운다(한 정규식의 갈래로 합치면 앞선 갈래가 뒤의 진짜 번호 앞머리를 먹을 수 있다).
// 앞에 숫자가 붙어 있으면 지우지 않는다 — 더 긴 숫자의 꼬리일 뿐인 숫자 범위(3000000 - 4000000 · 20180101 - 20241231)를 주민번호로 오인하지 않게
const RRN_SPACED = /(?<!\d)\d{6}(?:[ \t]+-[ \t]*|[ \t]*-[ \t]+)[1-4]\d{6}/g;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
// 휴대폰 — 한 글자 구분자(하이픈·점·공백): 010-1234-5678 · 01012345678 · 010 1234 5678 · 010.1234.5678
// 아직 지우지 않는 것(보류): 엔 대시·전각 숫자·한글로 쓴 숫자, 유선전화
const PHONE = /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g;
// 휴대폰 — 국제 표기: +82 10-1234-5678 · +82-10-… · +821012345678 · +82 (0)10-… (+ 는 빠져도 된다). 구분자는 PHONE 과 같다.
// 두 번째 판이다: 국내 꼴(PHONE)을 먼저 지운다. 한 정규식의 갈래로 합치면 국가 번호 뒤에 0 을 다시 붙인 번호(+82 10 010-1234-5678)에서
// 국제 갈래가 '+82 10 010-1234' 까지만 먹고 꼬리 '-5678' 을 남긴다
const PHONE_INTL = /\+?82[-\s.]?(?:\(0\))?[-\s.]?1[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g;
// 휴대폰 — 하이픈·점을 공백으로 감싼 꼴: 010 - 1234 - 5678 · +82 - 10 - 1234 - 5678. 모양은 PHONE·PHONE_INTL 과 같고 구분자만 넓다.
// PHONE·PHONE_INTL 뒤의 판이다: 그 둘이 잡던 것은 전과 똑같이 먼저 지워지고 이 판들은 남은 것만 더 지운다(한 정규식의 갈래로 합치면 앞선 갈래가 뒤의 진짜 번호 앞머리를 먹을 수 있다).
// 여기서도 국내 꼴(PHONE_SPACED)을 먼저, 국제 표기(PHONE_INTL_SPACED)를 다음에 돌린다 — 합치면 국가 번호 뒤에 0 을 다시 붙인 번호
// (+82 10 010 - 1234 - 5678)에서 국제 갈래가 '+82 10 010 - 1234' 까지만 먹고 꼬리 ' - 5678' 을 남긴다.
// 앞에 숫자가 붙어 있으면 지우지 않는다 — 더 긴 숫자의 꼬리일 뿐인 숫자 범위(20180101 - 20241231)를 번호로 오인하지 않게
const SPACED_SEP = String.raw`(?:[ \t]*[-.][ \t]*|\s)?`;
const PHONE_SPACED = new RegExp(String.raw`(?<!\d)01[016789]${SPACED_SEP}\d{3,4}${SPACED_SEP}\d{4}`, 'g');
const PHONE_INTL_SPACED = new RegExp(
  String.raw`(?<!\d)\+?82${SPACED_SEP}(?:\(0\))?${SPACED_SEP}1[016789]${SPACED_SEP}\d{3,4}${SPACED_SEP}\d{4}`,
  'g',
);

export function redactContacts(text: string): string {
  // 주민번호를 먼저 — 휴대폰 패턴과 겹치지 않게. 휴대폰은 국내 꼴 다음에 국제 표기.
  // 공백 낀 꼴은 앞의 네 판이 지운 뒤에 남은 것만 더 지운다(이때도 주민번호가 먼저, 휴대폰은 국내 꼴 다음에 국제 표기)
  return text
    .replace(RRN, '[주민번호]')
    .replace(EMAIL, '[이메일]')
    .replace(PHONE, '[연락처]')
    .replace(PHONE_INTL, '[연락처]')
    .replace(RRN_SPACED, '[주민번호]')
    .replace(PHONE_SPACED, '[연락처]')
    .replace(PHONE_INTL_SPACED, '[연락처]');
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
