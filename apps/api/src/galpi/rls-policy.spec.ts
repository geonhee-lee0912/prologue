import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// corepack pnpm --filter api test 는 apps/api 에서 돈다
const ROOT = resolve(process.cwd(), '../..');
const GALPI_TABLES = [
  'galpi_states',
  'galpi_messages',
  'wiki_claims',
  'wiki_claim_sources',
  'profile_facts',
  'self_reports',
  'llm_usages',
  'push_tokens',
];

describe('갈피 테이블 RLS (CLAUDE.md 7장)', () => {
  const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');

  it('스키마에 갈피 테이블이 모두 있다', () => {
    const schema = read('apps/api/prisma/schema.prisma');
    for (const table of GALPI_TABLES) expect(schema).toContain(`@@map("${table}")`);
  });

  it('갈피 테이블은 전부 RLS 를 켠다', () => {
    const sql = read('supabase/policies/galpi.sql');
    for (const table of GALPI_TABLES) expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
  });

  it('정책을 하나도 만들지 않는다 — 모바일은 직접 읽지도 쓰지도 않는다', () => {
    expect(read('supabase/policies/galpi.sql')).not.toMatch(/CREATE POLICY/i);
  });

  it('마이그레이션 SQL 이 갈피 테이블과 호칭 칸을 만든다', () => {
    const migration = read('apps/api/prisma/migrations/20261011000000_galpi_engine/migration.sql');
    for (const table of GALPI_TABLES) expect(migration).toContain(`CREATE TABLE "${table}"`);
    expect(migration).toMatch(/ADD COLUMN\s+"display_name" TEXT/);
  });
});
