/**
 * 호칭 — 갈피의 말에 든 {name} 을 서버가 사용자에게 보내기 직전에 바꾼다 (갈피 문서 3.6 ④, CLAUDE.md 13장)
 * - mixed(반존대): "지은 님" / casual(말을 놓은 뒤): "지은아"·"수지야" / letter(리포트·편지): 늘 "지은 님"
 * - {name} 이 없는 글은 이름과 상관없이 그대로 돌려준다. 공백·줄바꿈도 바꾸지 않는다 — 리포트는 여러 문단이다
 * - 이름이 없으면 자리표시자와 그 둘레의 쉼표·물결·공백만 지운다. 줄바꿈과 나머지 글은 건드리지 않는다
 */
export type NameStyle = 'mixed' | 'casual' | 'letter';

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;

// 이름이 없을 때 지우는 자리. 줄을 넘어가지 않도록 공백은 [ \t] 만 센다(\s 는 줄바꿈까지 먹는다)
/** 호칭 바로 뒤의 쉼표 — "{name}, 오늘" → "오늘", "그래서 {name}, 오늘은" → "그래서 오늘은" */
const NAME_THEN_COMMA = /\{name\}[,，][ \t]*/g;
/**
 * 문장 끝에 붙은 호칭은 앞의 쉼표·공백까지 — "고마워요, {name}." → "고마워요.", "고마워요, {name}" → "고마워요"
 * (?<=\S): 공백만 앞세운 호칭은 앞이 글자일 때만 문장 끝으로 본다. 줄 첫머리(들여쓰기 뒤)의 호칭을 문장 끝으로 보지 않고,
 * 길게 이어진 공백을 자리마다 다시 훑지 않는다
 */
const NAME_AT_CLAUSE_END = /(?:[,，][ \t]*|(?<=\S)[ \t]+)\{name\}(?=[ \t]*(?:[.?!…~]|$))/gm;
/** 나머지 호칭은 바로 붙은 물결·문장부호와 뒤의 공백까지 — "{name}~ 오늘" → "오늘" */
const NAME_REST = /\{name\}[~!?….]*[ \t]*/g;

export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < HANGUL_FIRST || code > HANGUL_LAST) return false;
  return (code - HANGUL_FIRST) % 28 !== 0;
}

export function renderName(text: string, name: string | null | undefined, style: NameStyle): string {
  if (!text.includes('{name}')) return text;
  const trimmed = name?.trim();
  if (!trimmed) return text.replace(NAME_THEN_COMMA, '').replace(NAME_AT_CLAUSE_END, '').replace(NAME_REST, '');
  const called = style === 'casual' ? `${trimmed}${hasFinalConsonant(trimmed) ? '아' : '야'}` : `${trimmed} 님`;
  return text.split('{name}').join(called);
}
