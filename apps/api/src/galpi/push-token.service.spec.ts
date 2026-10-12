import { beforeEach, describe, expect, it } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { PushTokenService } from './push-token.service';
import { FakePrisma } from './testing/fake-prisma';

describe('푸시 토큰', () => {
  let db: FakePrisma;
  let tokens: PushTokenService;

  beforeEach(() => {
    db = new FakePrisma();
    tokens = new PushTokenService(db as unknown as PrismaService);
  });

  it('등록하고, 다시 등록하면 바꾼다 — 사용자당 마지막 기기 하나', async () => {
    await tokens.register('u1', 'ExponentPushToken[a]');
    await tokens.register('u1', 'ExponentPushToken[b]');
    expect(db.pushTokens).toEqual([expect.objectContaining({ userId: 'u1', token: 'ExponentPushToken[b]' })]);
  });

  it('한 기기에서 다른 사람이 로그인하면 앞사람의 토큰을 지운다', async () => {
    await tokens.register('u1', 'ExponentPushToken[same]');
    await tokens.register('u2', 'ExponentPushToken[same]');
    expect(db.pushTokens.map((t) => t.userId)).toEqual(['u2']);
  });

  it('로그아웃하면 지운다', async () => {
    await tokens.register('u1', 'ExponentPushToken[a]');
    await tokens.remove('u1');
    expect(db.pushTokens).toEqual([]);
  });

  it('같은 토큰을 다시 등록해도 한 줄이다', async () => {
    await tokens.register('u1', 'ExponentPushToken[a]');
    await tokens.register('u1', 'ExponentPushToken[a]');
    expect(db.pushTokens).toEqual([expect.objectContaining({ userId: 'u1', token: 'ExponentPushToken[a]' })]);
  });

  it('앞사람의 토큰만 지운다 — 다른 기기를 쓰는 사람의 토큰은 그대로다', async () => {
    await tokens.register('u1', 'ExponentPushToken[phone]');
    await tokens.register('u3', 'ExponentPushToken[tablet]');
    await tokens.register('u2', 'ExponentPushToken[phone]');
    expect(db.pushTokens.map((t) => [t.userId, t.token]).sort()).toEqual([
      ['u2', 'ExponentPushToken[phone]'],
      ['u3', 'ExponentPushToken[tablet]'],
    ]);
  });

  it('기기를 바꿔 등록하면 새 기기 토큰으로 바뀐다', async () => {
    await tokens.register('u1', 'ExponentPushToken[old-phone]');
    await tokens.register('u1', 'ExponentPushToken[new-phone]');
    expect(db.pushTokens.map((t) => t.token)).toEqual(['ExponentPushToken[new-phone]']);
  });

  it('지우기와 등록은 한 트랜잭션에서 한다 — 앞사람 토큰만 지우고 새 토큰은 못 넣는 상태가 남지 않게', async () => {
    const outer = new FakePrisma();
    const inner = new FakePrisma();
    outer.$transaction = async (fn) => fn(inner as never);
    inner.pushTokens.push({ userId: 'u1', token: 'ExponentPushToken[same]', updatedAt: new Date() });
    await new PushTokenService(outer as unknown as PrismaService).register('u2', 'ExponentPushToken[same]');
    expect(inner.pushTokens.map((t) => t.userId)).toEqual(['u2']);
    expect(outer.pushTokens).toEqual([]);
  });

  it('로그아웃은 그 사람 토큰만 지우고, 토큰이 없는 사람이 해도 괜찮다', async () => {
    await tokens.register('u1', 'ExponentPushToken[a]');
    await tokens.register('u2', 'ExponentPushToken[b]');
    await tokens.remove('u1');
    await expect(tokens.remove('u1')).resolves.toBeUndefined();
    await expect(tokens.remove('nobody')).resolves.toBeUndefined();
    expect(db.pushTokens.map((t) => t.userId)).toEqual(['u2']);
  });
});
