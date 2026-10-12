import { GALPI_COPY } from '@prologue/shared';
import { describe, expect, it } from 'vitest';
import { detectCrisis, safetyMessage } from './crisis';

describe('위기 신호 — 낱말 규칙 (갈피 문서 3.6 ③)', () => {
  it('자해 신호', () => {
    expect(detectCrisis('요즘 그냥 죽고 싶어요')).toBe('self_harm');
    expect(detectCrisis('다 끝내고 싶어')).toBe('self_harm');
  });

  it('폭력·스토킹 신호', () => {
    expect(detectCrisis('전 남친한테 협박 문자가 와요')).toBe('danger');
    expect(detectCrisis('누가 스토킹하는 것 같아요')).toBe('danger');
    expect(detectCrisis('위협을 받았어요')).toBe('danger');
  });

  it('흔한 말은 걸지 않는다', () => {
    for (const text of ['자살예방 교육을 받았어요', '웃겨 죽겠어요', '공을 세게 때렸어요', '정답 맞았어요', '강아지가 졸졸 따라다녀요']) {
      expect(detectCrisis(text)).toBe('none');
    }
  });

  it('안전 안내는 고정 문구다 — 세계관을 거두고 담백하게', () => {
    expect(safetyMessage('self_harm')).toBe(GALPI_COPY.crisis.selfHarm);
    expect(safetyMessage('danger')).toBe(GALPI_COPY.crisis.danger);
  });
});
