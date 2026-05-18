import { Body, Controller, Get, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from '@prologue/shared';
import type { Request } from 'express';
import { AppException } from '../../common/exceptions/app.exception';
import { Public } from '../../auth/decorators/public.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import type { CurrentAdminData } from './admin-payload.types';
import { AdminLoginDto } from './dto/login.dto';

/**
 * /api/v1/admin/auth
 *
 * @fr FR-K01 운영자 로그인
 */
@ApiTags('admin/auth')
@Controller('v1/admin/auth')
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({
    summary: 'FR-K01 운영자 로그인',
    description: 'email + password (bcrypt) 검증 후 admin JWT 발급. 일반 사용자 JWT 와 시크릿/가드 분리.',
  })
  async login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    return this.service.login(dto.email, dto.password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @Public() // 전역 JwtAuthGuard 우회
  @UseGuards(AdminJwtAuthGuard) // 그리고 AdminGuard 만 적용
  @ApiOperation({ summary: '내 운영자 정보 조회 (세션 유효성 검사)' })
  async me(@CurrentAdmin() admin: CurrentAdminData) {
    const data = await this.service.getById(admin.adminId);
    if (!data) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        '운영자 정보를 찾을 수 없습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return data;
  }
}
