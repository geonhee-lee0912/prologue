# HANDOFF — 작업 구조 적용 — 공통 규칙·절차·로드맵
- 마지막 갱신: 2026-10-31 · 자리: 로컬/Claude

## 목표
별콩톡과 글자까지 같은 `AGENTS.md` "공통 규칙" 절을 넣고, `scripts/agent/{init,start,stop}.sh` 와 `ROADMAP.md`(BACKLOG·NEXT_STEPS 통합)·HANDOFF 가드·결정 카드를 더한다. 설계는 회사 저장소(비공개) `docs/2026-10-31-작업-구조-design.md`.

## 지금 상태
- 브랜치만 땄다. 아직 바뀐 파일 없음.

## 다음 할 일 (순서대로)
1. `AGENTS.md` 0절 → 공통 규칙 절(별콩톡 복사), 고유 항목은 "프롤로그 고유 규칙"으로 [어디서든]
2. `scripts/agent/{init,start,stop}.sh` (pnpm, 기본 브랜치 main) + 시험 [어디서든]
3. `ROADMAP.md`, `BACKLOG.md`·`NEXT_STEPS.md` 통합·삭제, `docs/decisions/`, 가드 워크플로 [어디서든]
4. `pnpm typecheck`·`pnpm test` → 이 파일 삭제 → PR(base main) → `@codex review` [어디서든]

## 확인 못 한 것
- 없음(시작 시점)

## 건드리면 안 되는 것
- `AGENTS.md` 1절 이후(하드룰·아키텍처·문서 표)는 표의 BACKLOG 줄 말고는 손대지 않는다.
- `main` 에 직접 푸시하지 않는다.
