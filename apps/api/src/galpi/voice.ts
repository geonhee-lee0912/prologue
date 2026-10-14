/**
 * 갈피의 목소리 다듬기 — 이모지는 한 메시지에 하나, 하트·사랑 표현·과장·울음 금지 (갈피 문서 3.6 ④)
 * 금지 표현은 고쳐 쓰지 않고 다시 생성한다 (conversation.service.ts).
 * 한 이모지 = 기본 그림 + (변형 선택자 | 피부색 | 이어 붙임(ZWJ) 뒤 그림)
 * 기본 그림에는 이모지가 아닌 기호 ♡ ❥ 도 넣는다 — 하트 금지 목록이 이 기호를 보게 하려고 (\p{Extended_Pictographic} 에 없다)
 */
const EMOJI = /[\p{Extended_Pictographic}♡❥](?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic})*/gu;

/** 금지 이모지 — 카테고리별 블록리스트다 (허용 목록으로 뒤집지 않는다). 목록에 없는 이모지는 허용으로 보고 마지막 하나만 남긴다 */
export const BANNED_EMOJI: readonly string[] = [
  // 하트
  '❤', '💕', '💖', '💗', '💘', '💞', '💓', '💛', '💙', '💚', '💜', '🧡', '🖤', '🤍', '🤎',
  '💝', '💟', '💔', '❣', '♥', '♡', '❥', '🫶', '🩷', '🩵', '🩶', '🫀',
  // 사랑 표현
  '😍', '😘', '🥰', '💋', '😗', '😙', '😚', '😻', '😽', '💑', '💏', '💌',
  // 과장
  '🔥', '💯', '🎉', '😱', '🤯', '💥',
  // 울음
  '😭', '😢', '🥹', '🥲', '😿',
];

/**
 * 이어 붙인 이모지(ZWJ)는 한 덩이로 잡힌다 — 덩이 안 어디에든 금지 이모지가 있으면 통째로 금지다(👩‍❤️‍👨, 👨‍❤️‍💋‍👨).
 * 맨 앞만 보면 사람 그림으로 시작하는 커플·키스 이모지가 빠져나간다
 */
function isBanned(emoji: string): boolean {
  return BANNED_EMOJI.some((banned) => emoji.includes(banned));
}

function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([.?!,])/g, '$1')
    .replace(/ +\n/g, '\n')
    .trim();
}

/** 금지 이모지가 있는가 — 목소리 다듬기(enforceVoice)와 평가 세트(eval/rules.ts)가 같은 판정을 쓴다 */
export function hasBannedEmoji(text: string): boolean {
  return [...text.matchAll(EMOJI)].some((match) => isBanned(match[0]));
}

export function emojiCount(text: string): number {
  return text.match(EMOJI)?.length ?? 0;
}

/** 금지 이모지를 빼고, 허용 이모지는 마지막 하나만 남긴다 */
export function enforceVoice(text: string): string {
  let keepAt = -1;
  for (const match of text.matchAll(EMOJI)) {
    if (!isBanned(match[0])) keepAt = match.index ?? -1;
  }
  return tidy(text.replace(EMOJI, (emoji: string, offset: number) => (offset === keepAt ? emoji : '')));
}

/** 이모지를 전부 뺀다 — 리포트·안전 안내 */
export function stripEmoji(text: string): string {
  return tidy(text.replace(EMOJI, ''));
}
