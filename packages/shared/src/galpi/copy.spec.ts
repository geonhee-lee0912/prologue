import { describe, expect, it } from 'vitest';
import { findForbidden } from '../copy/forbidden';
import { GALPI_COPY } from './copy';

const EMOJI = /\p{Extended_Pictographic}/gu;

function allLines(): string[] {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(GALPI_COPY);
  return out;
}

describe('갈피 고정 대사', () => {
  it('금지 표현이 없다', () => {
    for (const line of allLines()) expect(findForbidden(line)).toEqual([]);
  });

  it('이모지는 한 줄에 하나까지', () => {
    for (const line of allLines()) expect((line.match(EMOJI) ?? []).length).toBeLessThanOrEqual(1);
  });

  it('안전 안내에는 이모지가 없다', () => {
    expect(GALPI_COPY.crisis.danger.match(EMOJI)).toBeNull();
    expect(GALPI_COPY.crisis.selfHarm.match(EMOJI)).toBeNull();
  });

  it('인터뷰라는 말을 쓰지 않는다 (스펙 5.1)', () => {
    for (const line of allLines()) expect(line).not.toContain('인터뷰');
  });
});
