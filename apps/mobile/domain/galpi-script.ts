/**
 * mock 갈피 대본 — LLM 이 붙기 전까지 화면 흐름을 돌리기 위한 고정 대사.
 * 말투: 해요체, 짧게, 질문 하나로 끝맺기 (갈피 문서 3.3, 3.6 ④)
 * 종교·건강·성생활은 묻지 않는다 (갈피 문서 3.4). 조건 정보는 편지에 적을지 따로 묻는다 (4장)
 */
import { POLICY } from '@prologue/shared/policy';
import type { AppState, Chapter, GalpiMessage } from './types';

export const INTERVIEW_QUESTIONS: readonly string[] = [
  '가볍게 시작해 볼까요? 요즘 퇴근하고 나면 주로 뭐 해요?',
  '그 시간이 좋은 이유가 뭐예요?',
  '주말에는 주로 어떻게 보내요?',
  '최근에 웃었던 일 하나만 들려줄래요?',
  '가까운 친구들은 당신을 어떤 사람이라고 말해요?',
  '하는 일 이야기도 조금 들려줄래요? 편지에 적을지는 나중에 따로 물어볼게요.',
  '일하면서 가장 보람 있었던 순간은 언제였어요?',
  '누군가와 함께 있을 때 가장 편안했던 순간은 언제였어요?',
  '연락은 자주 하는 편이 좋아요, 아니면 각자 시간이 있는 편이 좋아요?',
  '다투게 되면 보통 어떻게 풀어요?',
  '함께 해 보고 싶은 데이트가 있다면 뭐예요?',
  '마지막으로, 어떤 사람과 있을 때 가장 나다워져요?',
];

/** 답한 수 → 책장에 꽂히는 장 (IA 3.7) */
const CHAPTER_AT: Record<number, string> = {
  4: '첫 장 — 요즘의 나',
  8: '두 번째 장 — 나를 둘러싼 사람들',
  12: '세 번째 장 — 내가 바라는 관계',
};

const ACKS = ['그렇군요.', '좋네요 🙂', '아, 그런 시간이 있군요.', '적어 둘게요.'] as const;

const EVERYDAY_REPLIES = [
  '그랬군요. 그때 기분은 어땠어요?',
  '적어 둘게요 🌿 오늘은 뭐가 제일 좋았어요?',
  '아, 그 이야기 좋네요. 조금 더 들려줄래요?',
  '그럴 때가 있죠. 요즘 자주 그래요?',
] as const;

export interface ScriptContext {
  now: Date;
  newId: () => string;
}

export interface ScriptResult {
  replies: GalpiMessage[];
  interview: AppState['interview'];
  newChapters: Chapter[];
}

/** 첫 만남 — 자기소개, 사람이 아님, 서고 규칙, 가벼운 질문 하나 (갈피 문서 3.6 ③) */
export function firstMeetingMessages(ctx: ScriptContext): GalpiMessage[] {
  const at = ctx.now.toISOString();
  return [
    { id: ctx.newId(), kind: 'emoticon', from: 'galpi', expression: 'wave', at },
    { id: ctx.newId(), kind: 'text', from: 'galpi', text: '안녕하세요, 갈피예요. 이 서고의 기록 인형이에요.', at },
    {
      id: ctx.newId(),
      kind: 'text',
      from: 'galpi',
      text: '여기서 들려주시는 이야기는 소개를 위해서만 써요. 다른 사용자에게는 보여주지 않아요.',
      at,
    },
    { id: ctx.newId(), kind: 'text', from: 'galpi', text: INTERVIEW_QUESTIONS[0], at },
  ];
}

export function replyToUser(state: AppState, opts: { skipped: boolean }, ctx: ScriptContext): ScriptResult {
  const at = ctx.now.toISOString();
  const text = (t: string): GalpiMessage => ({ id: ctx.newId(), kind: 'text', from: 'galpi', text: t, at });

  if (state.interview.completed) {
    const reply = EVERYDAY_REPLIES[state.galpiMessages.length % EVERYDAY_REPLIES.length];
    return { replies: [text(reply)], interview: state.interview, newChapters: [] };
  }

  const answered = state.interview.step + 1;
  const total = Math.min(INTERVIEW_QUESTIONS.length, POLICY.interview.minTurns);
  const replies: GalpiMessage[] = [
    text(opts.skipped ? '괜찮아요. 다른 이야기로 가 볼게요.' : ACKS[state.interview.step % ACKS.length]),
  ];

  const newChapters: Chapter[] = [];
  const chapterTitle = CHAPTER_AT[answered];
  if (chapterTitle) newChapters.push({ id: ctx.newId(), title: chapterTitle, addedAt: at });

  const completed = answered >= total;
  if (completed) {
    replies.push({ id: ctx.newId(), kind: 'emoticon', from: 'galpi', expression: 'proud', at });
    replies.push(text('이야기 들려줘서 고마워요. 제가 읽은 당신을 편지로 써서 내 이야기 탭에 두었어요 ✉️'));
  } else {
    replies.push(text(INTERVIEW_QUESTIONS[answered]));
  }

  return { replies, interview: { step: answered, completed }, newChapters };
}
