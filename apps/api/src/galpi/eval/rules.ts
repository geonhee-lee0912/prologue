import { findForbidden } from '@prologue/shared';
import { BANNED_EMOJI, emojiCount } from '../voice';

/**
 * 갈피 말 하나를 규칙으로 본다 — 어긴 것을 돌려준다 (AI 엔진 문서 8장 평가 세트)
 * 서버가 고쳐 보내는 것(이모지 개수, [이름])도 본다 — 모델이 규칙을 얼마나 지키는지가 평가 대상이다
 */
export function checkReplyText(text: string, opts: { emojiAllowed?: boolean } = {}): string[] {
  const issues = findForbidden(text).map((word) => `금지 표현: ${word}`);
  const emojis = emojiCount(text);
  if (opts.emojiAllowed === false ? emojis > 0 : emojis > 1) issues.push(`이모지 ${emojis}개`);
  if (BANNED_EMOJI.some((emoji) => text.includes(emoji))) issues.push('금지 이모지');
  if (text.includes('[이름]')) issues.push('가명 [이름] 을 그대로 썼다');
  return issues;
}

/** 질문 수 — 대개 질문 하나로 끝맺는다 (스펙 5.2) */
export function questionCount(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}
