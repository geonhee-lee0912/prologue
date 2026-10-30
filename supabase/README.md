# Supabase DB 자산과 적용 방식

갱신: 2026-10-30. 현재 스키마는 Prisma, RLS는 별도 SQL 스크립트로 관리한다. `supabase/migrations` 통합은 결정된 목표이며 아직 적용하지 않았다.

## 현재 구조

```text
apps/api/prisma/schema.prisma             스키마
apps/api/prisma/migrations/*/migration.sql 테이블·enum·인덱스 변경
supabase/policies/*.sql                   RLS·정책 부속 SQL
supabase/apply-policies.js                파일 이름순으로 정책 적용
```

현재 `supabase/`에는 `migrations/`, `functions/`, `seed/`, `config.toml`이 없다. Prisma SQL을 없는 디렉터리로 옮기거나 `supabase db push`만 실행해 정책이 적용됐다고 판단하지 않는다.

## 변경 SQL 준비 (원격 DB 없이)

1. `apps/api/prisma/schema.prisma`를 바꾸고 변경 이유를 기록한다.
2. 이전 스키마와 변경한 스키마를 비교해 SQL을 만든다. Prisma 5 기준, **저장소 루트에서** 새 마이그레이션 경로를 정한 뒤 실행한다.

```bash
git show HEAD:apps/api/prisma/schema.prisma > /tmp/prologue-schema-before.prisma
mkdir -p apps/api/prisma/migrations/<timestamp>_<name>
corepack pnpm --filter @prologue/api exec prisma migrate diff \
  --from-schema-datamodel /tmp/prologue-schema-before.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > apps/api/prisma/migrations/<timestamp>_<name>/migration.sql
```

`--filter ... exec`의 작업 디렉터리는 `apps/api`다. `<timestamp>_<name>`은 실제 경로로 바꾼다. 이 비교는 스키마 구조의 차이만 만든다. 데이터 변환·삭제 영향·이미 SQL로만 관리하는 자산은 따로 검토한다. 이미 커밋한 변경을 비교할 때는 `HEAD` 대신 변경 전 커밋을 선택한다.

3. `supabase/policies/<table>.sql`에 RLS를 추가·수정한다. 직접 읽지 않는 테이블도 RLS를 켠다.
4. shared 타입·DTO·화면 계약을 갱신하고 정책 검사·관련 테스트를 실행한다.
5. 실제 접근 거부 검증은 임시 Postgres 또는 승인된 dev 환경에서 anon·authenticated 역할로 수행한다. 로컬 예시는 [개발 환경](../docs/context/개발-환경.md) 6장에 있다.

## dev DB 적용 (사람 확인 후)

**이 명령은 원격 DB를 변경한다.** 대상과 적용 SQL을 사람이 확인한 뒤 실행한다. SQL을 준비하고 PR을 만드는 일과 DB 적용 승인은 구분한다.

```bash
corepack pnpm --filter @prologue/api exec prisma migrate deploy
corepack pnpm db:rls
```

Prisma는 `DATABASE_URL`·`DIRECT_URL` 설정을 사용한다. RLS 스크립트는 **`apps/api/.env`의 `DIRECT_URL`을 읽고**, `psql`로 `policies/*.sql`을 이름순 적용하며 오류에서 멈춘다. 런타임 환경변수만 주입한 클라우드에서는 현재 스크립트가 그대로 동작하지 않을 수 있다. 비밀값·접속 문자열은 출력하거나 커밋하지 않는다.

적용 후 테이블별 RLS 활성화와 역할별 읽기·쓰기 거부를 확인한다. 파일 검사만 통과했다고 실제 DB 적용·권한 검증을 완료한 것은 아니다. 2026-10-14의 오래된 테이블 참조 정리는 끝났고, dev 적용·실제 권한 검증은 [BACKLOG](../BACKLOG.md) 1·9·10절에 남아 있다.

## 향후 통합과 운영 반영

[멀티 서비스 플랫폼 스펙](../docs/superpowers/specs/2026-10-15-멀티서비스-플랫폼-design.md) 8.1·13장은 Supabase PR 미리보기 브랜치를 위해 스키마·RLS를 `supabase/migrations`에 통합하고 Prisma를 클라이언트·SQL 생성에 쓰기로 했다. 경로·이력·적용 도구를 전환하는 구현이 끝나기 전까지는 위의 현재 방식을 따른다.

운영 반영은 dev에서 검증한 동일 SQL과 적용 순서를 검토한 뒤 별도 승인으로 진행한다. Supabase Studio 직접 변경, 운영 DB 선적용, RLS를 끈 채 출시하는 일은 금지한다. 정책 원칙은 [AGENTS](../AGENTS.md) 6·7장과 [아키텍처](../09_아키텍처_의사결정_v0_2.md) 6장을 본다.
