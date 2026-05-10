# supabase/

이 디렉토리는 Supabase 프로젝트의 데이터베이스 관련 자산을 관리한다.

## 구조

```
supabase/
├─ migrations/   # Prisma 가 만든 SQL (테이블, 컬럼, 인덱스, 외래키)
├─ policies/     # RLS 정책 SQL (사람이 작성)
├─ functions/    # DB 함수 / 트리거 SQL
├─ seed/         # 개발용 시드 SQL
└─ config.toml   # Supabase CLI 설정 (프로젝트 연결)
```

## 작업 흐름

### 1. 테이블 구조를 바꿀 때

1. `apps/api/prisma/schema.prisma` 수정
2. `pnpm --filter api prisma migrate dev --name <name>` 실행
3. 생성된 SQL 을 `supabase/migrations/` 로 이동 (또는 자동화 스크립트)
4. `supabase db push` 로 dev 프로젝트에 적용

### 2. RLS 정책을 바꿀 때

1. `supabase/policies/<table>.sql` 직접 수정
2. `supabase db push` 로 적용
3. 정책 테스트 (pgTAP 또는 통합 테스트)

### 3. dev → prod 반영

```bash
# dev 에서 검증된 후
supabase link --project-ref <prod-project-ref>
supabase db push
```

## 절대 하지 말 것

- **Supabase Studio (웹 UI) 에서 스키마/정책 직접 변경 금지.**
  - 변경 이력 추적 불가, 환경 간 일관성 깨짐
  - 모든 변경은 git → CLI 흐름

- **prod 프로젝트에 먼저 적용 금지.**
  - 항상 dev 에서 검증 후 prod 에 동일한 흐름

- **RLS 비활성화한 채로 푸시 금지.**
  - 모든 사용자 노출 테이블은 RLS 활성화 + 정책 작성

## 참고

- Supabase CLI 설치: https://supabase.com/docs/guides/local-development/cli/getting-started
- RLS 패턴: https://supabase.com/docs/guides/database/postgres/row-level-security
- 프로젝트 정책 설계 원칙: `../09_아키텍처_의사결정_v0_2.md` 6장
