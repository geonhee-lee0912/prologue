import { describe, expect, it } from 'vitest';
import { hasFinalConsonant, renderName } from './name';

describe('받침', () => {
  it('마지막 한글 글자의 받침을 본다', () => {
    expect(hasFinalConsonant('지은')).toBe(true);
    expect(hasFinalConsonant('수지')).toBe(false);
  });

  it('한글이 아니거나 비어 있으면 false', () => {
    expect(hasFinalConsonant('Jay')).toBe(false);
    expect(hasFinalConsonant('')).toBe(false);
  });
});

describe('호칭 치환', () => {
  it('반존대와 편지는 이름 + 님', () => {
    expect(renderName('{name}, 반가워요', '지은', 'mixed')).toBe('지은 님, 반가워요');
    expect(renderName('{name}, 들려준 이야기를 읽었어요.', '지은', 'letter')).toBe('지은 님, 들려준 이야기를 읽었어요.');
  });

  it('말을 놓으면 받침에 따라 아/야', () => {
    expect(renderName('{name}, 오늘 어땠어?', '지은', 'casual')).toBe('지은아, 오늘 어땠어?');
    expect(renderName('{name}, 오늘 어땠어?', '수지', 'casual')).toBe('수지야, 오늘 어땠어?');
  });

  it('여러 번 나와도 모두 바꾼다', () => {
    expect(renderName('{name}, 그래요. {name}다워요', '지은', 'mixed')).toBe('지은 님, 그래요. 지은 님다워요');
  });

  it('이름이 없으면 자리표시자와 뒤의 쉼표를 지운다', () => {
    expect(renderName('{name}, 좋은 아침이에요', null, 'mixed')).toBe('좋은 아침이에요');
    expect(renderName('고마워요, {name}.', '', 'mixed')).toBe('고마워요.');
  });

  it('자리표시자가 없으면 이름이 없어도 글을 그대로 둔다 — 공백과 줄바꿈도 바꾸지 않는다', () => {
    const body = '들려준 이야기를 읽었어요 .\n\n그랬군요\n...계속 말해 주세요 ,\n\n\n  마무리예요.  \n';
    for (const name of [null, undefined, '', '   ', '지은']) {
      expect(renderName(body, name, 'letter')).toBe(body);
    }
  });

  it('이름이 없으면 문장 끝의 ", {name}" 은 앞의 쉼표와 함께 지운다', () => {
    expect(renderName('오늘도 수고했어요, {name}', null, 'mixed')).toBe('오늘도 수고했어요');
    expect(renderName('오늘도 수고했어요, {name}!', null, 'mixed')).toBe('오늘도 수고했어요!');
    expect(renderName('오늘 어땠어요, {name}?', null, 'mixed')).toBe('오늘 어땠어요?');
    expect(renderName('안녕하세요 {name}. 오늘 어땠어요?', null, 'mixed')).toBe('안녕하세요. 오늘 어땠어요?');
  });

  it('이름이 없으면 전각 쉼표(，)도 쉼표처럼 함께 지운다', () => {
    expect(renderName('{name}， 오늘 어땠어요?', null, 'mixed')).toBe('오늘 어땠어요?');
    expect(renderName('오늘도 수고했어요， {name}', null, 'mixed')).toBe('오늘도 수고했어요');
  });

  it('이름이 없어도 여러 문단의 글은 줄바꿈을 지키고 자리표시자 둘레만 지운다', () => {
    const body = '{name}, 들려준 이야기를 읽었어요.\n\n고마워요, {name}\n\n또 들려줘요, {name}.\n';
    expect(renderName(body, null, 'letter')).toBe('들려준 이야기를 읽었어요.\n\n고마워요\n\n또 들려줘요.\n');
  });

  it('이름이 없어도 줄바꿈은 하나도 지우지 않는다 — 자리표시자가 줄 앞뒤 어디에 있어도', () => {
    for (const text of [
      '{name}\n오늘 어땠어요?',
      '고마워요, {name}\n\n다음 문단',
      '고마워요,\n{name}.',
      '첫 줄\n{name}, 둘째 줄',
      '{name},\n\n다음 문단',
      '앞 문단\n\n{name}~\n뒷 문단',
    ]) {
      expect(renderName(text, null, 'letter').split('\n').length).toBe(text.split('\n').length);
    }
  });

  it('줄 첫머리의 호칭은 문장 끝이 아니다 — 들여쓴 줄의 "{name}." 도 문장부호가 홀로 남지 않는다', () => {
    expect(renderName('첫 줄\n  {name}. 들여쓴 줄', null, 'mixed')).toBe('첫 줄\n  들여쓴 줄');
  });

  it('이름이 없으면 물결·문장 중간의 쉼표도 자리표시자와 함께 지워 문장부호가 홀로 남지 않게 한다', () => {
    expect(renderName('{name}~ 오늘 뭐 했어?', null, 'casual')).toBe('오늘 뭐 했어?');
    expect(renderName('고마워, {name}~', null, 'casual')).toBe('고마워~');
    expect(renderName('그래서 {name}, 오늘은 어땠어요?', null, 'mixed')).toBe('그래서 오늘은 어땠어요?');
    expect(renderName('{name}, {name}, 안녕', null, 'mixed')).toBe('안녕');
    expect(renderName('{name}', null, 'mixed')).toBe('');
  });
});
