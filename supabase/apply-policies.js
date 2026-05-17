#!/usr/bin/env node
/**
 * supabase/policies/ 의 모든 .sql 파일을 dev 프로젝트에 일괄 적용한다.
 *
 * 사용:
 *   pnpm db:rls
 *   또는 직접: node supabase/apply-policies.js
 *
 * apps/api/.env 의 DIRECT_URL 을 읽어서 psql 로 각 파일을 실행한다.
 * (psql 이 PATH 에 있어야 함)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.join(__dirname, '..');
const envPath = path.join(repoRoot, 'apps/api/.env');

if (!fs.existsSync(envPath)) {
  console.error('ERROR: apps/api/.env not found.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const m = envContent.match(/^DIRECT_URL\s*=\s*"?([^"\n]+)"?/m);
if (!m) {
  console.error('ERROR: DIRECT_URL not found in apps/api/.env.');
  process.exit(1);
}

const url = new URL(m[1].trim());
const env = {
  ...process.env,
  PGPASSWORD: decodeURIComponent(url.password),
};
const host = url.hostname;
const port = url.port || '5432';
const user = decodeURIComponent(url.username);
const db = url.pathname.replace(/^\//, '') || 'postgres';

const policiesDir = path.join(repoRoot, 'supabase/policies');
const files = fs
  .readdirSync(policiesDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

if (files.length === 0) {
  console.log('No policy files found in supabase/policies/.');
  process.exit(0);
}

console.log(`Applying ${files.length} policy file(s) to ${host}:${port}/${db}...\n`);

for (const f of files) {
  console.log(`==> ${f}`);
  const full = path.join(policiesDir, f);
  try {
    execSync(
      `psql -h "${host}" -p ${port} -U "${user}" -d "${db}" -v ON_ERROR_STOP=1 -f "${full}"`,
      { env, stdio: 'inherit' }
    );
  } catch (e) {
    console.error(`\nFailed at ${f}.`);
    process.exit(e.status || 1);
  }
}

console.log('\n✓ All policies applied.');
