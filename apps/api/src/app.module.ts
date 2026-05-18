import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ActionsModule } from './actions/actions.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ConversationsModule } from './conversations/conversations.module';
import { ContactExchangesModule } from './contact-exchanges/contact-exchanges.module';
import { AllExceptionsFilter } from './common/exceptions/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggerModule } from './common/logger/logger.module';
import { HealthModule } from './health/health.module';
import { InfraModule } from './infra/infra.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PhotosModule } from './photos/photos.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { SafetyModule } from './safety/safety.module';
import { SupabaseModule } from './supabase/supabase.module';
import { UsersModule } from './users/users.module';
import { VerificationModule } from './verification/verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    LoggerModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    SupabaseModule,
    InfraModule,
    AuthModule,
    HealthModule,
    UsersModule,
    ProfileModule,
    PhotosModule,
    VerificationModule,
    OnboardingModule,
    RecommendationsModule,
    ConversationsModule,
    ContactExchangesModule,
    ActionsModule,
    SafetyModule,
  ],
  providers: [
    // 순서 중요: ThrottlerGuard 가 먼저 → 인증 가드가 나중
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
