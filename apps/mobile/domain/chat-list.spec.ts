import { describe, expect, it } from 'vitest';
import { buildChatList } from './chat-list';
import { emptyState } from './fixtures';
import type { AppState, Connection } from './types';

const now = new Date(2026, 9, 11, 9, 0);
const at = (min: number) => new Date(now.getTime() + min * 60_000).toISOString();
const conn = (over: Partial<Connection>): Connection => ({
  id: 'c1',
  name: '민준',
  photoUri: 'minjun.jpg',
  letterId: 'L1',
  ended: false,
  celebrated: true,
  messages: [],
  lastReadAt: null,
  ...over,
});

describe('대화 목록', () => {
  it('갈피는 늘 맨 위, 새 말은 숫자 없이 점으로만', () => {
    const st: AppState = {
      ...emptyState(),
      galpiMessages: [{ id: 'g1', kind: 'text', from: 'galpi', text: '안녕하세요', at: at(0) }],
    };
    const list = buildChatList(st);
    expect(list.galpi).toEqual({ preview: '안녕하세요', hasNew: true });
  });

  it('읽은 뒤에는 점이 사라진다', () => {
    const st: AppState = {
      ...emptyState(),
      galpiMessages: [{ id: 'g1', kind: 'text', from: 'galpi', text: '안녕하세요', at: at(0) }],
      galpiLastReadAt: at(1),
    };
    expect(buildChatList(st).galpi.hasNew).toBe(false);
  });

  it('내가 보낸 말은 새 말로 치지 않는다', () => {
    const st: AppState = {
      ...emptyState(),
      galpiMessages: [{ id: 'g1', kind: 'text', from: 'me', text: '응', at: at(0) }],
    };
    expect(buildChatList(st).galpi.hasNew).toBe(false);
  });

  it('편지는 미리보기에 편지라고만', () => {
    const st: AppState = {
      ...emptyState(),
      galpiMessages: [{ id: 'g1', kind: 'letter', from: 'galpi', letterId: 'L1', at: at(0) }],
    };
    expect(buildChatList(st).galpi.preview).toBe('✉️ 편지를 썼어요');
  });

  it('사람 대화는 최근 순, 안 읽은 수는 나에게만 센다', () => {
    const st: AppState = {
      ...emptyState(),
      connections: [
        conn({ id: 'c1', name: '민준', messages: [{ id: 'm1', from: 'them', text: '반가워요', at: at(1) }] }),
        conn({
          id: 'c2',
          name: '도윤',
          lastReadAt: at(0),
          messages: [
            { id: 'm2', from: 'them', text: '토요일 괜찮으세요?', at: at(2) },
            { id: 'm3', from: 'them', text: '3시는 어때요?', at: at(3) },
            { id: 'm4', from: 'me', text: '좋아요', at: at(4) },
          ],
        }),
      ],
    };
    const list = buildChatList(st);
    expect(list.active.map((r) => r.id)).toEqual(['c2', 'c1']);
    expect(list.active[0]).toMatchObject({ unreadCount: 2, preview: '좋아요' });
    expect(list.active[1].unreadCount).toBe(1);
  });

  it('끝난 연결은 지난 대화로, 사진 없이', () => {
    const st: AppState = { ...emptyState(), connections: [conn({ ended: true })] };
    const list = buildChatList(st);
    expect(list.active).toHaveLength(0);
    expect(list.past).toEqual([{ id: 'c1', name: '민준' }]);
    expect(JSON.stringify(list.past)).not.toContain('jpg');
  });

  it('메시지가 없는 연결의 미리보기는 재촉하지 않는다', () => {
    const st: AppState = { ...emptyState(), connections: [conn({})] };
    expect(buildChatList(st).active[0].preview).toBe('서로 이야기 나눠 보기로 했어요');
  });
});
