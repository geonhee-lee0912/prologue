import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// corepack pnpm --filter api test 는 apps/api 에서 돈다
const ROOT = resolve(process.cwd(), '../..');
const POLICIES = resolve(ROOT, 'supabase/policies');
// 모바일·관리자 앱이 직접 읽지 않는 테이블 — 정책 없이 RLS 만 켠다 (BACKLOG 2)
const SERVICE_ONLY = ['users', 'user_auths', 'user_consents', 'refresh_tokens', 'admin_users', 'admin_reviews', 'admin_audit_logs'];
// 정책 SQL 에 나오지만 테이블이 아닌 이름 (역할, 시스템 카탈로그)
const NOT_TABLES = new Set(['anon', 'authenticated', 'service_role', 'public', 'pg_publication_tables']);

const read = (path: string) => readFileSync(path, 'utf8');
const schemaTables = () =>
  [...read(resolve(ROOT, 'apps/api/prisma/schema.prisma')).matchAll(/@@map\("([a-z_]+)"\)/g)].map((m) => m[1]);
const policyFiles = () => readdirSync(POLICIES).filter((f) => f.endsWith('.sql'));

describe('RLS 적용 범위 (CLAUDE.md 7장·14장)', () => {
  it('스키마의 모든 테이블이 어느 정책 파일에서든 RLS 를 켠다', () => {
    const sql = policyFiles()
      .map((f) => read(resolve(POLICIES, f)))
      .join('\n');
    const missing = schemaTables().filter((t) => !sql.includes(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`));
    expect(missing).toEqual([]);
  });

  it('정책 파일이 가리키는 테이블은 모두 스키마에 있다 — 없는 테이블이면 pnpm db:rls 가 그 파일에서 멈춘다', () => {
    const tables = new Set(schemaTables());
    const unknown = policyFiles().flatMap((f) => {
      const sql = read(resolve(POLICIES, f)).replace(/--.*$/gm, '');
      return [...sql.matchAll(/\b(?:ALTER TABLE|FROM|JOIN|ON)\s+([a-z_]+)/g)]
        .map((m) => m[1])
        .filter((name) => !tables.has(name) && !NOT_TABLES.has(name))
        .map((name) => `${f}: ${name}`);
    });
    expect(unknown).toEqual([]);
  });

  it('서비스 전용 테이블은 정책을 만들지 않는다 — anon·authenticated 는 전부 거부', () => {
    for (const table of SERVICE_ONLY) {
      const sql = read(resolve(POLICIES, `${table}.sql`));
      expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      expect(sql).not.toMatch(/CREATE POLICY/i);
    }
  });
});
