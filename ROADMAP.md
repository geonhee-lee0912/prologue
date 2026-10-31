# ROADMAP — 프롤로그

할 일의 **순서**다. 항목마다 상세(완료 부분·남은 체크리스트·재개 방법)는 `BACKLOG.md` 의 절 번호를 따라간다. "지금 진행 중"은 여기 없다 — 아직 `main` 에 합쳐지지 않은 브랜치와 그 안의 `HANDOFF.md` 가 정본이고, `scripts/agent/start.sh` 가 이 파일의 "다음"과 함께 찍는다. 일을 끝내는 PR 이 그 줄을 "다음"에서 "끝남"으로 옮긴다(로드맵만 고치는 PR 은 열지 않는다). 공개 저장소라 숫자·날짜·식별자는 쓰지 않는다 — 판정 일정은 회사 저장소 `ROADMAP.md`.

순서는 운영자가 정한다. 이 초안은 2026-10-31 `BACKLOG.md` 상태에서 만든 것이라 운영자가 GitHub 웹에서 바로 고쳐도 된다(`main` 보호 때문에 PR 이 될 수 있다 — 운영자 혼자 합치면 된다).

## 다음 (순서대로)
- 현재 구현·기존 결정 정리와 로드맵 구체화 — 운영자 요청, 브랜치 `codex/roadmap-current-state`
1. 갈피 AI 엔진 1단계 남은 일 — `BACKLOG.md` 10절
2. 앱 IA v2 화면 골격 남은 일 — `BACKLOG.md` 8절
3. RLS 정책 파일 dev DB 적용 — `BACKLOG.md` 1절 (DB 적용은 운영자 승인 범위)

## 나중
- 카카오 로그인 실 연동 end-to-end 검증 — `BACKLOG.md` 5절
- 카카오 OAuth 모바일 통합 — `BACKLOG.md` 6절
- 얼굴 인증 이미지 24시간 TTL cron — `BACKLOG.md` 7절
- 옛 컨셉 기준으로 남아 있는 코드 정리 — `BACKLOG.md` 3절
- 최종 점검 — 보안·운영 차단(출시 전 반드시) — `BACKLOG.md` 9절
- `apps/admin` typecheck(React `useActionState` 미노출)·`apps/mobile` test(`TZ=` 접두가 Windows 에서 안 됨) 고치기 — 2026-10-31 로컬 Windows 에서 확인, 이 저장소 코드 변경 없이도 실패
- 어드민은 `apps/admin`(이미 있음, Prisma 타입 공유). 회사 대시보드는 별도 결정

## 끝남 (최근 5)
- 홈 책방·사서 컨셉(HOME v1) 7월 작업 — 제품 반영 없이 종료, 기록은 보관 태그로 보존 — [종료 결정](docs/decisions/2026-10-31-HOME-v1-종료.md)
- 작업 지침 분리와 인계 정본 정리 — 브랜치 `codex/agent-guidance-handoff`
- 작업 구조 적용 — 공통 규칙·절차·로드맵 — 브랜치 `claude/work-structure` (2026-10-31)
- 공통 작업 지침을 AGENTS.md 로 통합 — 브랜치 `codex/docs-agents-refresh-2026-10-30` (2026-10-30)
