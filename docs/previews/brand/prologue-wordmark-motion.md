# Prologue 로고 — 종이 모티브 배치 비교

상태 — 운영자는 기존 2번 친근형·3번 모던형을 기준으로 발전시키고, 편지나 종이비행기가 날아가는 형태 등 여러 방향을 살펴보자고 요청했다. 아래 배치·표식·궤적의 구체적인 모양은 검토용 제안이다. 실제 앱의 로고·아이콘·스플래시에 적용한 상태가 아니다.

## 비교 이미지

![2번과 3번을 기준으로 종이 모티브를 더한 여섯 배치](2026-11-07-wordmark-motion.png)

| 배치 | 글자 기준 | 추가 모티브 | SVG 원본 |
| --- | --- | --- | --- |
| 2A | 친근형 | 작은 편지와 짧은 물결 궤적 | [2A](../../../apps/mobile/assets/brand/wordmark-studies/2a-letter.svg) |
| 2B | 친근형 | 종이비행기와 짧은 궤적 | [2B](../../../apps/mobile/assets/brand/wordmark-studies/2b-plane.svg) |
| 2C | 친근형 | 접힌 모서리와 살짝 휜 종이 | [2C](../../../apps/mobile/assets/brand/wordmark-studies/2c-page.svg) |
| 3A | 모던형 | 작은 편지와 짧은 물결 궤적 | [3A](../../../apps/mobile/assets/brand/wordmark-studies/3a-letter.svg) |
| 3B | 모던형 | 종이비행기와 짧은 궤적 | [3B](../../../apps/mobile/assets/brand/wordmark-studies/3b-plane.svg) |
| 3C | 모던형 | 접힌 모서리와 살짝 휜 종이 | [3C](../../../apps/mobile/assets/brand/wordmark-studies/3c-page.svg) |

## 작업 방식과 확인

- 기존 힉스필드 원본의 글자 경로를 그대로 사용했다. 공정하게 비교할 수 있게 대문자 높이를 맞춰 균등 확대·축소하고 위치만 조정했다.
- 표식과 궤적은 글자와 분리된 SVG 그룹이다. 글자 원본을 수정하거나 새로 생성하지 않았다.
- 새 힉스필드 호출은 없으며 추가 생성 비용도 없다. 움직임은 정적인 모양과 선으로 표현한 배치 제안이다.
- 모든 배치의 바탕은 투명하고 먹색 단색이다. 큰 크기와 작은 크기의 렌더링을 함께 확인했다.
- 실제 앱의 시작 설정과 온보딩 화면은 이번 작업에서 바꾸지 않았다.

재현 명령은 `node scripts/design/build-logo-motion.mjs`다. 이 명령은 후보 SVG와 목록만 만들며 기존 글자 원본이나 앱 설정을 수정하지 않는다.

## 다음 의논

원하는 모티브와 글자 인상을 먼저 고른 뒤 표식 크기·획 굵기·궤적과 글자의 간격을 더 다듬는다. 최종 채택이나 앱 아이콘·스플래시 적용은 별도 검토다. 최초 글자 후보와 생성 경과는 [영문 로고 구성안](prologue-wordmark-brief.md)을 참고한다.
