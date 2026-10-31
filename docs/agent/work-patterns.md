# 작업 패턴과 추가 명령

[루트 지침](../../AGENTS.md)의 상세 문서다. 절 번호는 기존 참조를 위해 유지한다. 이 문서의 파일 경로는 저장소 루트 기준이다.

## 15. 자주 묻는 패턴

### 새 기능 시작 시 확인할 것

현행 화면 ID·설계 근거, 데이터 흐름, 변경 영역과 정책 차이를 저장소에서 먼저 찾는다. 빠진 제품 결정만 묻는다.

### 기획 문서와 코드가 다를 때

최근 명시적 결정을 우선하고, 현재 구현과 미적용 목표를 구분해 기록한다. 미결정 정책은 운영자에게 확인한다. 이미 폐기된 계획을 다시 실행하지 않는다.

---

### 카피가 필요한 화면

1. 톤 가이드의 권장 표현으로 후보 3~5개 작성.
2. 금지 표현 체크리스트 통과 확인.
3. 사용자에게 어떤 후보가 좋은지 묻거나, 가장 일관된 후보 선택 후 PR 본문에 다른 후보 명시.

### 결제 압박/결핍 자극 의심 시

즉시 멈추고 사용자에게 확인. 추천권/Plus 안내, 대화 종료 안내, 빈 상태 화면이 위험 영역.

---

## 17. 자주 쓰는 명령어

Node.js 20 이상, pnpm 9.12.0. 전역 pnpm이 없으면 `corepack pnpm` 을 쓴다. 테스트·타입 검사는 `.env` 없이 실행한다.

```bash
bash scripts/agent/init.sh
corepack pnpm --filter @prologue/shared build
corepack pnpm --filter @prologue/shared test
corepack pnpm --filter @prologue/api typecheck
corepack pnpm --filter @prologue/api test
corepack pnpm --filter @prologue/mobile test
corepack pnpm --filter @prologue/mobile web
```

shared는 `dist`를 내보내므로 첫 실행과 shared 변경 후 먼저 빌드한다. API 실행은 원격 dev DB와 예약 작업에 연결하므로 승인된 환경·마이그레이션 적용 상태를 확인한 뒤 한다. DB 적용 명령은 `supabase/README.md`, 미리보기·전체 명령은 `README.md`를 본다.

---
