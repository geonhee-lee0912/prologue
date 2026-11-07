# 프롤로그 앱 글꼴 사용서

화면을 만들 때 문장을 읽는 목적에 따라 아래 역할을 고른다. 프롤로그의 기본 본문은 **Pretendard Regular 16 / 24**다. 앞 숫자는 글자 크기, 뒤 숫자는 줄높이이며 모두 React Native 기본 배율의 논리 단위다.

## 기준을 잡은 근거

iOS는 사용자 정의 글자 크기의 기본값으로 17pt를 제시하고, Android Material 3의 본문은 큰 역할부터 16/24, 14/20, 12/16sp를 사용한다. 프롤로그는 한글 소개 편지와 대화를 기준으로 본문에 16/24를 채택하고, 작은 안내는 줄높이를 18로 넓혔다. 아래 값은 두 플랫폼에서 함께 쓰는 프롤로그의 기준이다. [Apple 접근성 가이드](https://developer.apple.com/design/human-interface-guidelines/accessibility) · [AndroidX Material 3 공식 글자 규격](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/TypeScaleTokens.kt)

## 역할별 규격

| 역할 | 크기 / 줄높이 | 굵기 | 화면에서 쓰는 곳 |
| --- | --- | --- | --- |
| `hero` | 26 / 36 | Bold 700 | 온보딩 한 장의 핵심 문장, 가입 첫 제목 |
| `title` | 22 / 30 | Bold 700 | 친구·설정 등 탭의 큰 제목 |
| `heading` | 18 / 26 | SemiBold 600 | 상단바 제목, 양식의 구역 제목, 편지 속 이름 |
| `body` | 16 / 24 | Regular 400 | 소개 편지, 말풍선, 온보딩 본문, 입력 중인 글 |
| `label` | 16 / 24 | SemiBold 600 | 친구 이름, 편지 카드 제목처럼 먼저 읽을 짧은 문구 |
| `supporting` | 14 / 20 | Regular 400 | 폼 설명, 설정 항목의 설명, 최근 대화 미리보기 |
| `action` | 14 / 20 | SemiBold 600 | 로그인 링크, 보조 버튼 |
| `caption` | 12 / 18 | Regular 400 | AI 작성 안내, 프로필 칩, 날짜, 짧은 메타데이터. 탭 이름은 같은 크기에서 Medium 500 |
| `primaryButton` | 19 / 26 | Bold 700 | 코랄 위의 흰 글자. ‘다음’, ‘본인 인증으로 가입’, ‘이야기 나눠볼게요’ |

## 화면에서 쓰는 방법

- 한 화면의 핵심 문장은 큰 제목 한 개로 세운다. 읽어야 할 조건이나 동의 내용은 본문이나 설명 크기로 쓴다. 작은 글씨는 부가 정보에 쓴다.
- 본문 기본색은 먹색 `#191919`, 설명과 안내는 공통 그레이 `#5A5A5A`다. 코랄 `#C8603C`와 흰색의 대비는 약 4.04:1이므로 코랄 위 흰 문구에는 큰 볼드인 `primaryButton`을 쓴다. [WCAG 글자 대비 기준](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- 온보딩처럼 짧고 고정된 문구는 의미 단위로 줄을 나눈다. 사용자 이름·대화·편지는 화면 너비와 글자 확대에 맞춰 자연스럽게 줄을 바꾼다. 긴 버튼은 중앙 정렬로 두 줄을 허용한다.
- 기기의 글자 확대 설정을 따른다. 좁은 폭과 확대 상태에서 본문·입력·버튼이 잘리면 여백과 컨테이너 높이를 먼저 조정한다. 읽기용 텍스트와 별도로 이미지 로고, 아바타 이니셜, 장식용 글리프는 그래픽 크기를 따른다.

## 코드에 적용

역할별 값은 [모바일 디자인 토큰](../../apps/mobile/theme/tokens.ts)의 `TYPE`에서 관리한다. 화면에서는 `<Text style={TYPE.body}>`처럼 역할을 지정하고 색과 정렬만 화면 스타일로 더한다. 새 화면도 [공통 Text·TextInput](../../apps/mobile/components/AppText.tsx)을 사용한다. 공통 컴포넌트가 굵기에 맞는 Pretendard 파일을 선택하며, 본문 안의 강조는 상위 글자 크기를 이어받는다.
