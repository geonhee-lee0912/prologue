import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FACE_VERIFICATION_PROVIDER,
  IDENTITY_VERIFICATION_PROVIDER,
  LLM_PROVIDER,
  PAYMENT_PROVIDER,
  PHOTO_MODERATION_PROVIDER,
  PUSH_PROVIDER,
  SMS_PROVIDER,
} from '@prologue/shared';
import { galpiMockRespond } from '../galpi/mock-responder';
import { PrismaService } from '../prisma/prisma.service';
import { createLlmProvider } from './llm-provider.factory';
import { MockFaceVerificationService } from './mock-face-verification.service';
import { MockIdentityVerificationService } from './mock-identity-verification.service';
import { MockPaymentService } from './mock-payment.service';
import { MockPhotoModerationService } from './mock-photo-moderation.service';
import { MockPushService } from './mock-push.service';
import { MockSmsService } from './mock-sms.service';

/**
 * 외부 서비스 제공자 (Provider) 의 DI 등록.
 * LLM 은 env 의 LLM_PROVIDER(mock|openai)로 고르고, 운영에서는 mock 을 막는다 (llm-provider.factory.ts).
 *
 * MVP 는 mock 만. 실 연동 (NHN Toast / PASS / NICE / AWS Rekognition / Expo Push / 토스) 은
 * 계약 후 useFactory 패턴으로 env 의 *_PROVIDER 변수에 따라 분기 등록할 예정.
 *
 * 사용 예:
 *   constructor(@Inject(SMS_PROVIDER) private readonly sms: SmsProvider) {}
 */
@Global()
@Module({
  providers: [
    { provide: SMS_PROVIDER, useClass: MockSmsService },
    { provide: IDENTITY_VERIFICATION_PROVIDER, useClass: MockIdentityVerificationService },
    { provide: FACE_VERIFICATION_PROVIDER, useClass: MockFaceVerificationService },
    { provide: PHOTO_MODERATION_PROVIDER, useClass: MockPhotoModerationService },
    { provide: PUSH_PROVIDER, useClass: MockPushService },
    { provide: PAYMENT_PROVIDER, useClass: MockPaymentService },
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService, PrismaService],
      useFactory: (config: ConfigService, prisma: PrismaService) =>
        createLlmProvider(
          (key) => config.get<string>(key),
          { llmUsage: { create: (args) => prisma.llmUsage.create(args) } },
          // mock 일 때 갈피 대화가 첫 리포트까지 돌게 한다 (운영에서는 mock 자체가 막힌다)
          { mockRespond: galpiMockRespond },
        ),
    },
  ],
  exports: [
    SMS_PROVIDER,
    IDENTITY_VERIFICATION_PROVIDER,
    FACE_VERIFICATION_PROVIDER,
    PHOTO_MODERATION_PROVIDER,
    PUSH_PROVIDER,
    PAYMENT_PROVIDER,
    LLM_PROVIDER,
  ],
})
export class InfraModule {}
