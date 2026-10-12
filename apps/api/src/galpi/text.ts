/**
 * 코드 포인트로 자른다 — UTF-16 칸으로 자르면 이모지 같은 두 칸 글자(서로게이트 쌍)를 반으로 갈라
 * 외톨이 서로게이트가 남고, 그런 문자열은 DB 와 JSON 에서 깨진다.
 * 한도는 칸 수가 아니라 글자(코드 포인트) 수다. 한도 안에 들어오는 글은 그대로 돌려준다
 */
export function truncateCodePoints(text: string, max: number): string {
  let end = 0;
  let count = 0;
  for (const point of text) {
    if (count >= max) break;
    end += point.length;
    count += 1;
  }
  return text.slice(0, end);
}
