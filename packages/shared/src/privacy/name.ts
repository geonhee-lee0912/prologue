/**
 * 호칭 — 갈피의 말에 든 {name} 을 서버가 사용자에게 보내기 직전에 바꾼다 (갈피 문서 3.6 ④, CLAUDE.md 13장)
 * - mixed(반존대): "지은 님" / casual(말을 놓은 뒤): "지은아"·"수지야" / letter(리포트·편지): 늘 "지은 님"
 * - 이름이 없으면 자리표시자와 바로 뒤의 쉼표·공백을 지운다
 */
export type NameStyle = 'mixed' | 'casual' | 'letter';

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;

export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < HANGUL_FIRST || code > HANGUL_LAST) return false;
  return (code - HANGUL_FIRST) % 28 !== 0;
}

export function renderName(text: string, name: string | null | undefined, style: NameStyle): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return text
      .replace(/\{name\}[,，]?\s*/g, '')
      .replace(/\s+([,.?!])/g, '$1')
      .replace(/[,，]\s*([.?!])/g, '$1')
      .trim();
  }
  const called = style === 'casual' ? `${trimmed}${hasFinalConsonant(trimmed) ? '아' : '야'}` : `${trimmed} 님`;
  return text.split('{name}').join(called);
}
