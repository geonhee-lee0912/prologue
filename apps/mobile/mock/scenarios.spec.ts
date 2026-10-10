import { describe, expect, it } from 'vitest';
import { buildChatList } from '../domain/chat-list';
import { buildFeed } from '../domain/feed';
import { selectHome } from '../domain/home';
import { SCENARIOS, type ScenarioKey } from './scenarios';

const now = new Date(2026, 9, 11, 9, 0);
const keys = Object.keys(SCENARIOS) as ScenarioKey[];

describe('mock 시나리오', () => {
  it.each(keys)('%s 시나리오는 화면 규칙을 통과한다', (key) => {
    const s = SCENARIOS[key](now);
    expect(() => selectHome(s, now)).not.toThrow();
    expect(() => buildFeed(s, now)).not.toThrow();
    expect(() => buildChatList(s)).not.toThrow();
  });

  it('시나리오마다 친구 탭 첫 장면이 다르다', () => {
    expect(SCENARIOS.firstRun(now).firstRunDone).toBe(false);
    expect(selectHome(SCENARIOS.waiting(now), now).primary.kind).toBe('everyday');
    expect(selectHome(SCENARIOS.considering(now), now).primary.kind).toBe('letterConsidering');
    expect(selectHome(SCENARIOS.interviewMidway(now), now).primary.kind).toBe('interviewResume');
    expect(selectHome(SCENARIOS.letterTwo(now), now).primary.kind).toBe('letterArrived');
    expect(selectHome(SCENARIOS.letterOne(now), now).primary.kind).toBe('letterArrived');
    const m = selectHome(SCENARIOS.meetingAndLetter(now), now);
    expect(m.primary.kind).toBe('meetingNextDay');
    expect(m.secondary?.kind).toBe('letterArrived');
    expect(selectHome(SCENARIOS.connected(now), now).primary.kind).toBe('mutualAccept');
  });
});
