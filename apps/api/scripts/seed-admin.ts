/**
 * 첫 운영자 계정 생성 스크립트.
 *
 * 사용:
 *   pnpm --filter api seed:admin -- --email=ops@prologue.com --password='strong-pw' --role=owner
 *
 * role: owner | manager | reviewer (기본 owner)
 *
 * 동일 이메일이 이미 있으면 비밀번호만 갱신.
 */
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

function parseArgs(): { email?: string; password?: string; role?: string } {
  const out: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function main() {
  const { email, password, role = 'owner' } = parseArgs();
  if (!email || !password) {
    console.error('Usage: pnpm seed:admin -- --email=<email> --password=<pw> [--role=owner|manager|reviewer]');
    process.exit(1);
  }
  if (!['owner', 'manager', 'reviewer'].includes(role)) {
    console.error(`role 은 owner | manager | reviewer 중 하나여야 합니다 (입력: ${role}).`);
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('password 는 최소 8자 이상이어야 합니다.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await prisma.adminUser.upsert({
      where: { email },
      create: { email, passwordHash, role: role as 'owner' | 'manager' | 'reviewer' },
      update: { passwordHash },
    });
    console.log(`✓ Admin upserted: ${result.id} (${result.email}, role=${result.role})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
