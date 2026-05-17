import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtIssuerService } from './jwt-issuer.service';
import { KakaoUserInfoService } from './kakao-user-info.service';
import { OtpStoreService } from './otp-store.service';
import { SessionStoreService } from './session-store.service';
import { SupabaseJwtStrategy } from './supabase-jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    SupabaseJwtStrategy,
    AuthService,
    JwtIssuerService,
    SessionStoreService,
    OtpStoreService,
    KakaoUserInfoService,
  ],
})
export class AuthModule {}
