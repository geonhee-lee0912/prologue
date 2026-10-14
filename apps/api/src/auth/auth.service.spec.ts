import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const EARLIER = new Date('2026-10-01T00:00:00Z');

/** logout 이 쓰는 두 테이블만 흉내 낸다 — 다른 사람의 행도 함께 둔다 */
function fakePrisma() {
  const db = {
    refreshTokens: [
      { id: 'r1', userId: 'u1', revokedAt: null as Date | null },
      { id: 'r2', userId: 'u1', revokedAt: EARLIER as Date | null },
      { id: 'r3', userId: 'u2', revokedAt: null as Date | null },
    ],
    pushTokens: [
      { userId: 'u1', token: 'ExponentPushToken[u1]' },
      { userId: 'u2', token: 'ExponentPushToken[u2]' },
    ],
  };
  const prisma = {
    refreshToken: {
      updateMany: async (args: { where: { userId: string; revokedAt: null }; data: { revokedAt: Date } }) => {
        const rows = db.refreshTokens.filter((t) => t.userId === args.where.userId && t.revokedAt === args.where.revokedAt);
        for (const row of rows) row.revokedAt = args.data.revokedAt;
        return { count: rows.length };
      },
    },
    pushToken: {
      deleteMany: async (args: { where: { userId: string } }) => {
        const before = db.pushTokens.length;
        db.pushTokens = db.pushTokens.filter((t) => t.userId !== args.where.userId);
        return { count: before - db.pushTokens.length };
      },
    },
  };
  return { db, prisma: prisma as unknown as PrismaService };
}

/** 로그아웃은 DB 만 쓴다 — 나머지 의존성은 비워 둔다 (vitest 는 데코레이터 메타데이터가 없어 Nest DI 없이 직접 만든다) */
const authService = (prisma: PrismaService) =>
  new AuthService({} as never, {} as never, {} as never, {} as never, prisma, {} as never, {} as never, {} as never);

describe('로그아웃', () => {
  it('그 사람의 살아 있는 refresh token 을 모두 거두고 푸시 토큰도 지운다 — 로그아웃한 기기 잠금화면에 갈피 말이 뜨지 않게', async () => {
    const { db, prisma } = fakePrisma();
    expect(await authService(prisma).logout('u1')).toEqual({ revokedCount: 1 });

    expect(db.refreshTokens.find((t) => t.id === 'r1')?.revokedAt).toBeInstanceOf(Date);
    // 이미 거둔 토큰의 시각은 그대로다
    expect(db.refreshTokens.find((t) => t.id === 'r2')?.revokedAt).toBe(EARLIER);
    expect(db.pushTokens.map((t) => t.userId)).toEqual(['u2']);
    // 다른 사람의 것은 건드리지 않는다
    expect(db.refreshTokens.find((t) => t.id === 'r3')?.revokedAt).toBeNull();
  });

  it('푸시 토큰이 없어도 로그아웃된다', async () => {
    const { db, prisma } = fakePrisma();
    db.pushTokens = [];
    expect(await authService(prisma).logout('u1')).toEqual({ revokedCount: 1 });
  });
});
