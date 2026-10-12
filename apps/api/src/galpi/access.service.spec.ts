import { ErrorCode } from '@prologue/shared';
import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { GalpiAccessService } from './access.service';
import { FakePrisma, type FakeUserInput } from './testing/fake-prisma';

function serviceWith(user?: FakeUserInput) {
  const db = new FakePrisma();
  if (user) db.addUser(user);
  return new GalpiAccessService(db as unknown as PrismaService);
}

describe('갈피 출입 조건', () => {
  it('본인인증과 동의를 마치면 대화도 열람도 된다', async () => {
    const access = serviceWith({ id: 'u1' });
    await expect(access.assertCanTalk('u1')).resolves.toBeUndefined();
    await expect(access.assertVerified('u1')).resolves.toBeUndefined();
  });

  it('본인인증을 안 했으면 아무것도 못 한다 (스펙 9장)', async () => {
    const access = serviceWith({ id: 'u1', identityVerified: false });
    await expect(access.assertVerified('u1')).rejects.toMatchObject({ code: ErrorCode.IDENTITY_VERIFICATION_REQUIRED });
    await expect(access.assertCanTalk('u1')).rejects.toMatchObject({ code: ErrorCode.IDENTITY_VERIFICATION_REQUIRED });
  });

  it('동의가 없으면 대화만 막히고 열람은 된다', async () => {
    const access = serviceWith({ id: 'u1', consents: [] });
    await expect(access.assertCanTalk('u1')).rejects.toMatchObject({ code: ErrorCode.AI_CONSENT_REQUIRED });
    await expect(access.assertVerified('u1')).resolves.toBeUndefined();
  });

  it('동의를 철회하면(가장 최근 기록이 거절) 대화가 막힌다', async () => {
    const access = serviceWith({
      id: 'u1',
      consents: [
        { consentType: 'sensitive_info', agreed: true, agreedAt: new Date('2026-10-01T00:00:00Z') },
        { consentType: 'cross_border_transfer', agreed: true, agreedAt: new Date('2026-10-01T00:00:00Z') },
        { consentType: 'sensitive_info', agreed: false, agreedAt: new Date('2026-10-05T00:00:00Z') },
      ],
    });
    await expect(access.assertCanTalk('u1')).rejects.toMatchObject({ code: ErrorCode.AI_CONSENT_REQUIRED });
  });

  it('정지·탈퇴 계정은 막는다', async () => {
    await expect(serviceWith({ id: 'u1', status: 'suspended' }).assertVerified('u1')).rejects.toMatchObject({ code: ErrorCode.ACCOUNT_SUSPENDED });
    await expect(serviceWith({ id: 'u1', status: 'withdrawn' }).assertVerified('u1')).rejects.toMatchObject({ code: ErrorCode.ACCOUNT_WITHDRAWN });
  });

  it('없는 사용자는 NOT_FOUND', async () => {
    await expect(serviceWith().assertVerified('nobody')).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });
});
