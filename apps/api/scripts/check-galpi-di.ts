/**
 * 갈피 모듈 DI 점검 — 빌드한 dist 로 Nest 의존성이 다 풀리는지 본다. DB·외부 서비스에 붙지 않는다.
 * vitest(esbuild)는 데코레이터 메타데이터를 만들지 않아 단위 테스트로는 볼 수 없다.
 * 실행: corepack pnpm --filter shared build && corepack pnpm --filter api build && corepack pnpm --filter api exec tsx scripts/check-galpi-di.ts
 */
import 'reflect-metadata';
import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LLM_PROVIDER, MockLlmProvider, PUSH_PROVIDER } from '@prologue/shared';

/* eslint-disable @typescript-eslint/no-require-imports -- 컴파일된 dist 를 그대로 읽어야 메타데이터가 있다 */
const { GalpiModule } = require('../dist/galpi/galpi.module');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { ConversationService } = require('../dist/galpi/conversation.service');
const { GalpiController } = require('../dist/galpi/galpi.controller');
const { GalpiScheduler } = require('../dist/galpi/galpi.scheduler');
/* eslint-enable @typescript-eslint/no-require-imports */

@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: {} },
    { provide: LLM_PROVIDER, useValue: new MockLlmProvider() },
    { provide: PUSH_PROVIDER, useValue: { send: async () => ({ id: 'check', status: 'ok' }) } },
  ],
  exports: [PrismaService, LLM_PROVIDER, PUSH_PROVIDER],
})
class CheckInfraModule {}

async function main(): Promise<void> {
  const moduleRef = await Test.createTestingModule({ imports: [CheckInfraModule, GalpiModule] }).compile();
  for (const token of [ConversationService, GalpiController, GalpiScheduler]) moduleRef.get(token);
  await moduleRef.close();
  console.log('galpi DI ok');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
