import { GALPI_COPY } from '@prologue/shared';
import { describe, expect, it } from 'vitest';
import { detectCrisis, safetyMessage } from './crisis';

describe('위기 신호 — 낱말 규칙 (갈피 문서 3.6 ③)', () => {
  it('자해 신호', () => {
    expect(detectCrisis('요즘 그냥 죽고 싶어요')).toBe('self_harm');
    expect(detectCrisis('다 끝내고 싶어')).toBe('self_harm');
    expect(detectCrisis('더 이상 살고 싶지 않아요')).toBe('self_harm');
    expect(detectCrisis('자해를 했어요')).toBe('self_harm');
    // 존재를 말하는 표현은 장소·업무 예외에서 빼지 않는다
    expect(detectCrisis('이 세상에 살고 싶지 않아요')).toBe('self_harm');
    expect(detectCrisis('인생 정리 다 끝내고 싶어')).toBe('self_harm');
    expect(detectCrisis('죽어버리고 싶어요')).toBe('self_harm');
    expect(detectCrisis('뛰어내리고 싶어요')).toBe('self_harm');
    expect(detectCrisis('세상을 떠나고 싶어요')).toBe('self_harm');
    expect(detectCrisis('손목을 그었어요')).toBe('self_harm');
  });

  it('때를 말하는 표현은 장소 예외에서 빼지 않는다 — 요즘엔 살고 싶지 않아요', () => {
    expect(detectCrisis('요즘엔 살고 싶지 않아요')).toBe('self_harm');
    expect(detectCrisis('요즘에는 살고 싶지 않아요')).toBe('self_harm');
    expect(detectCrisis('요즘에 살고 싶지 않아요')).toBe('self_harm');
    expect(detectCrisis('아침엔 살고 싶지 않아요')).toBe('self_harm');
    expect(detectCrisis('밤에는 살고 싶지 않다는 생각이 들어요')).toBe('self_harm');
    expect(detectCrisis('최근에는 살고 싶지 않아졌어요')).toBe('self_harm');
  });

  it('살고 싶지 않다는 말은 때·사람·상황 뒤에서도 자해 신호다', () => {
    expect(detectCrisis('너 때문에 살고 싶지 않아')).toBe('self_harm');
    expect(detectCrisis('직장 때문에 살고 싶지 않아요')).toBe('self_harm');
    expect(detectCrisis('외로움에 살고 싶지 않아졌어요')).toBe('self_harm');
    expect(detectCrisis('이런 상황에선 살고 싶지 않아요')).toBe('self_harm');
    expect(detectCrisis('오늘엔 살고 싶지 않아요')).toBe('self_harm');
    expect(detectCrisis('헤어진 후에는 살고 싶지 않아요')).toBe('self_harm');
    expect(detectCrisis('그 일 이후엔 살고 싶지 않아요')).toBe('self_harm');
  });

  it('삶·인생·세상을 끝내고 싶다는 말은 정리 없이도 자해 신호다', () => {
    expect(detectCrisis('삶을 끝내고 싶어요')).toBe('self_harm');
    expect(detectCrisis('내 삶을 끝내고 싶어요')).toBe('self_harm');
    expect(detectCrisis('인생 끝내고 싶어')).toBe('self_harm');
    expect(detectCrisis('내 인생 끝내고 싶다')).toBe('self_harm');
    expect(detectCrisis('인생을 끝내고 싶어요')).toBe('self_harm');
    expect(detectCrisis('세상을 끝내고 싶어요')).toBe('self_harm');
    expect(detectCrisis('이 세상 끝내고 싶어')).toBe('self_harm');
    expect(detectCrisis('삶 끝내고 싶어')).toBe('self_harm');
    expect(detectCrisis('인생 정리 끝내고 싶어')).toBe('self_harm');
  });

  it('폭력·스토킹 신호', () => {
    expect(detectCrisis('전 남친한테 협박 문자가 와요')).toBe('danger');
    expect(detectCrisis('누가 스토킹하는 것 같아요')).toBe('danger');
    expect(detectCrisis('위협을 받았어요')).toBe('danger');
    expect(detectCrisis('몰래 찍혔어요')).toBe('danger');
    expect(detectCrisis('불법 촬영을 당했어요')).toBe('danger');
  });

  it('흔한 말은 걸지 않는다', () => {
    for (const text of [
      '자살예방 교육을 받았어요',
      '웃겨 죽겠어요',
      '공을 세게 때렸어요',
      '정답 맞았어요',
      '강아지가 졸졸 따라다녀요',
      '자해 예방 교육을 받았어요',
      '시골에는 살고 싶지 않아요',
      '서울에서 살고 싶지 않아',
      '오늘 일 다 끝내고 싶어요',
      '과제를 다 끝내고 싶어',
      '몰래 찍은 사진이 예쁘게 나왔어요',
      '이 땅에서 살고 싶지 않아요',
      '신세계에서 살고 싶지 않아요',
      '시골에도 살고 싶지 않아요',
      '시골은 살고 싶지 않아요',
      '이 동네엔 살고 싶지 않아요',
      '여기서 살고 싶지 않아',
      '여기 살고 싶지 않아',
      '방 정리 다 끝내고 싶어',
      '세상 일 다 끝내고 싶어',
    ]) {
      expect(detectCrisis(text)).toBe('none');
    }
  });

  it('안전 안내는 고정 문구다 — 세계관을 거두고 담백하게', () => {
    expect(safetyMessage('self_harm')).toBe(GALPI_COPY.crisis.selfHarm);
    expect(safetyMessage('danger')).toBe(GALPI_COPY.crisis.danger);
  });
});
