# HANDOFF — 홈 책방·사서 컨셉(HOME v1) 7월 작업 — 폐기 여부 운영자 판단
- 마지막 갱신: 2026-10-31 · 자리: 로컬/Claude

## 목표
2026-07 에 `main` 워킹 트리에 브랜치 없이 떠 있던 HOME v1 작업을 브랜치로 보존한다. 이어서 만들 것이 아니라, 운영자가 폐기할지 재개할지 정할 때까지 잃지 않는 것이 목표다.

## 지금 상태
- 수정 8파일: `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`, `apps/api/src/recommendations/recommendations.service.ts`, `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/app/(tabs)/home.tsx`, `apps/mobile/lib/api.ts`
- 삭제 2: `apps/mobile/app/(tabs)/conversations.tsx`, `apps/mobile/app/(tabs)/interests.tsx`
- 새 파일 3: `apps/mobile/app/(tabs)/activity.tsx`, `apps/mobile/app/(tabs)/connections.tsx`, `apps/mobile/app/(tabs)/story.tsx`
- 마이그레이션 1: `apps/api/prisma/migrations/20260710130935_add_profile_book_title/` (DB 에 적용 안 됨)
- 실행·타입·테스트 확인 0. 이 커밋은 보존용 `wip:` 이다.
- 기준 커밋 `fea6e57`(2026-07 "홈 책방·사서 컨셉 설계 HOME v1"). `origin/main` 은 그 뒤 2026-09 컨셉 재설정과 2026-10-30 `AGENTS.md` 통합이 들어가 멀리 앞서 있다.

## 다음 할 일 (순서대로)
1. 운영자가 폐기/재개를 결정한다 — `ROADMAP.md` "다음" 1번 [어디서든]
2. 재개면: `origin/main` 위에 새 브랜치를 따고 이 브랜치의 변경을 파일 단위로 옮긴다(머지 금지 — 아래 "건드리면 안 되는 것") [어디서든]
3. 폐기면: PR 없이 원격 브랜치를 지운다 [어디서든]

## 확인 못 한 것
- 이 변경이 2026-09 컨셉 재설정 뒤에도 유효한지(추천 점수 체계는 폐기됨 — `recommendations.service.ts` 변경이 그 체계에 걸릴 가능성 큼)
- 마이그레이션이 현재 `schema.prisma` 와 호환되는지

## 건드리면 안 되는 것
- 이 브랜치를 `origin/main` 에 그대로 합치지 말 것 — `AGENTS.md` 하드룰 1(진열 금지)·3(정기 배급 금지)·8(조건으로 거르지 않음)과 충돌할 수 있는 7월 코드다.
- `apps/api/prisma/migrations/` 를 dev DB 에 적용하지 말 것(운영자 승인 범위).
