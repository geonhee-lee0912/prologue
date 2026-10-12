import { describe, expect, it } from 'vitest';
import { buildIngestMessages, formatBatchLine, formatContextLine, INGEST_SYSTEM_PROMPT, type IngestPromptInput } from './ingest.prompt';

const input: IngestPromptInput = {
  claims: [{ id: 'c1', page: 'now', text: '퇴근 뒤에는 걷는다' }],
  facts: [
    { key: 'company', value: 'A사' },
    { key: 'school', value: null },
  ],
  batch: [
    { id: 'g1', sender: 'galpi', text: '요즘 퇴근하고 뭐 해요?' },
    { id: 'm1', sender: 'user', text: '걸어요' },
  ],
};

describe('서고 수집 프롬프트', () => {
  it('JSON 으로 답하라고 말한다 — OpenAI JSON 모드는 프롬프트에 JSON 이라는 말이 없으면 요청을 거절한다', () => {
    // mock 은 그 낱말이 없어도 받아 준다. 프롬프트를 고치다 낱말이 빠지면 진짜 API 에서만 모든 수집이 실패하므로 여기서 못박는다
    const prompt = buildIngestMessages(input)
      .map((m) => m.content)
      .join('\n');
    expect(prompt).toContain('JSON');
    expect(INGEST_SYSTEM_PROMPT).toContain('JSON');
  });

  it('고정 안내가 앞, 사용자별 서고·조건 정보·새 대화가 뒤에 온다 (캐시)', () => {
    const [system, user, ...rest] = buildIngestMessages(input);
    expect(rest).toEqual([]);
    expect(system).toEqual({ role: 'system', content: INGEST_SYSTEM_PROMPT });
    expect(INGEST_SYSTEM_PROMPT).not.toContain('c1');
    expect(user).toEqual({
      role: 'user',
      content: [
        '[지금 서고]',
        '- (c1) [now] 퇴근 뒤에는 걷는다',
        '',
        '[알고 있는 조건 정보]',
        '- company: A사',
        '- school: (모름)',
        '',
        '[새 대화]',
        '[g1] 갈피: 요즘 퇴근하고 뭐 해요?',
        '[m1] 나: 걸어요',
      ].join('\n'),
    });
  });

  it('서고와 조건 정보가 비어 있으면 (없음)', () => {
    const [, user] = buildIngestMessages({ claims: [], facts: [], batch: input.batch });
    expect(user.content).toContain('[지금 서고]\n(없음)');
    expect(user.content).toContain('[알고 있는 조건 정보]\n(없음)');
  });

  it('새 대화 한 줄은 [id] 나: / [id] 갈피: 꼴이다', () => {
    expect(formatBatchLine('m1', 'user', '걸어요')).toBe('[m1] 나: 걸어요');
    expect(formatBatchLine('g1', 'galpi', '그렇군요')).toBe('[g1] 갈피: 그렇군요');
  });

  describe('바로 앞 대화 (묶음 사이의 흐름)', () => {
    it('id 없이 [새 대화] 앞에 따로 둔다 — id 가 없으니 근거로 댈 수 없다', () => {
      const [, user] = buildIngestMessages({
        ...input,
        context: [
          { sender: 'galpi', text: '그럼 주말에는 뭐 해요?' },
          { sender: 'user', text: '산에 가요' },
        ],
      });
      expect(user.content).toBe(
        [
          '[지금 서고]',
          '- (c1) [now] 퇴근 뒤에는 걷는다',
          '',
          '[알고 있는 조건 정보]',
          '- company: A사',
          '- school: (모름)',
          '',
          '[바로 앞 대화]',
          '갈피: 그럼 주말에는 뭐 해요?',
          '나: 산에 가요',
          '',
          '[새 대화]',
          '[g1] 갈피: 요즘 퇴근하고 뭐 해요?',
          '[m1] 나: 걸어요',
        ].join('\n'),
      );
    });

    it('앞 대화가 없으면 그 장 자체를 넣지 않는다 — 처음 정리하는 사람', () => {
      for (const context of [undefined, []]) {
        const [, user] = buildIngestMessages({ ...input, context });
        expect(user.content).not.toContain('[바로 앞 대화]');
        expect(user.content).toContain('[알고 있는 조건 정보]\n- company: A사\n- school: (모름)\n\n[새 대화]\n');
      }
    });

    it('앞 대화 한 줄은 나: / 갈피: 꼴이다 — [id] 가 없다', () => {
      expect(formatContextLine('user', '산에 가요')).toBe('나: 산에 가요');
      expect(formatContextLine('galpi', '그럼 주말에는 뭐 해요?')).toBe('갈피: 그럼 주말에는 뭐 해요?');
    });

    it('안내가 앞 대화는 참고일 뿐이라고 말한다', () => {
      expect(INGEST_SYSTEM_PROMPT).toContain(
        '- [바로 앞 대화]가 있으면 [새 대화]를 이해하는 참고일 뿐이다. 이미 정리한 말이라 거기서 문장을 새로 쓰거나 sources 로 대지 않는다.',
      );
    });
  });

  it('안내가 이름이나 [이름] 을 쓰지 말고 주어 없이 쓰라고 말한다', () => {
    expect(INGEST_SYSTEM_PROMPT).toContain('- 사용자를 가리킬 때 이름이나 [이름] 을 쓰지 않고 주어 없이 쓴다.');
  });
});
