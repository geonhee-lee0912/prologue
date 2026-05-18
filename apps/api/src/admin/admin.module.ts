import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminJwtAuthGuard } from './auth/admin-auth.guard';
import { AdminAuthService } from './auth/admin-auth.service';
import { AdminJwtStrategy } from './auth/admin-jwt.strategy';
import { AdminReportsController } from './reports/admin-reports.controller';
import { AdminReportsService } from './reports/admin-reports.service';
import { AdminReviewsController } from './reviews/admin-reviews.controller';
import { AdminReviewsService } from './reviews/admin-reviews.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [
    AdminAuthController,
    AdminReportsController,
    AdminUsersController,
    AdminReviewsController,
  ],
  providers: [
    AdminAuthService,
    AdminJwtStrategy,
    AdminJwtAuthGuard,
    AdminReportsService,
    AdminUsersService,
    AdminReviewsService,
  ],
  exports: [AdminJwtAuthGuard, AdminAuthService],
})
export class AdminModule {}
