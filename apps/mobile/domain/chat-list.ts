/**
 * 대화 탭 목록 — 앱 IA 6장
 *
 * - 갈피는 맨 위 고정. 새 말은 숫자 없이 점 하나 (하드룰 6, 갈피는 먼저 말을 거는 일이 잦다)
 * - 사람은 서로 수락한 분만. 안 읽은 수는 나에게만 보인다. 상대 쪽 읽음 표시는 없다
 * - 끝난 연결은 "지난 대화"로, 사진 없이 이름만 (하드룰 1)
 */
import type { AppState, GalpiMessage } from './types';

export interface GalpiRow {
  preview: string;
  hasNew: boolean;
}

export interface PersonRow {
  id: string;
  name: string;
  photoUri: string | null;
  preview: string;
  unreadCount: number;
  lastAt: string | null;
}

export interface PastRow {
  id: string;
  name: string;
}

export interface ChatList {
  galpi: GalpiRow;
  active: PersonRow[];
  past: PastRow[];
}

export function galpiPreview(message: GalpiMessage | undefined): string {
  if (!message) return '갈피와 이야기를 시작해 보세요';
  switch (message.kind) {
    case 'text':
      return message.text;
    case 'emoticon':
      return '(이모티콘)';
    case 'letter':
      return '✉️ 편지를 썼어요';
    case 'lightIntroInvite':
      return '가볍게 볼 분이 있어요';
    case 'passedLetter':
      return '넘긴 편지';
  }
}

export function buildChatList(state: AppState): ChatList {
  const last = state.galpiMessages[state.galpiMessages.length - 1];
  const readAt = state.galpiLastReadAt;
  const hasNew = state.galpiMessages.some((m) => m.from === 'galpi' && (readAt === null || m.at > readAt));

  const active: PersonRow[] = state.connections
    .filter((c) => !c.ended)
    .map((c) => {
      const lastMessage = c.messages[c.messages.length - 1];
      return {
        id: c.id,
        name: c.name,
        photoUri: c.photoUri,
        preview: lastMessage ? lastMessage.text : '서로 이야기 나눠 보기로 했어요',
        unreadCount: c.messages.filter((m) => m.from === 'them' && (c.lastReadAt === null || m.at > c.lastReadAt)).length,
        lastAt: lastMessage ? lastMessage.at : null,
      };
    })
    .sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));

  const past: PastRow[] = state.connections.filter((c) => c.ended).map((c) => ({ id: c.id, name: c.name }));

  return { galpi: { preview: galpiPreview(last), hasNew }, active, past };
}
