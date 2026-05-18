import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { UserStatus } from '@prisma/client';
import type { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { AdminJwtAuthGuard } from '../auth/admin-auth.guard';
import type { CurrentAdminData } from '../auth/admin-payload.types';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminUsersService } from './admin-users.service';
import { SetUserStatusDto } from './dto/set-status.dto';

/**
 * @fr FR-K01 사용자 목록 / 상세 / 상태 변경 (08_화면목록_IA K02)
 */
@ApiTags('admin/users')
@ApiBearerAuth()
@Public()
@UseGuards(AdminJwtAuthGuard)
@Controller('v1/admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'FR-K01 사용자 목록 (검색·필터·페이지네이션)' })
  @ApiQuery({ name: 'q', required: false, description: 'id/region 부분 일치 검색' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'active', 'suspended', 'withdrawn', 'all'] })
  @ApiQuery({ name: 'identityVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'faceVerified', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  list(
    @Query('q') q?: string,
    @Query('status') status?: UserStatus | 'all',
    @Query('identityVerified') identityVerified?: string,
    @Query('faceVerified') faceVerified?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list({
      q,
      status,
      identityVerified:
        identityVerified === 'true' ? true : identityVerified === 'false' ? false : undefined,
      faceVerified:
        faceVerified === 'true' ? true : faceVerified === 'false' ? false : undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'FR-K01 사용자 상세 (프로필·인증·최근 신고)' })
  detail(@Param('id') id: string) {
    return this.service.getDetail(id);
  }

  @Post(':id/status')
  @ApiOperation({ summary: '계정 상태 변경 (suspend / reactivate)' })
  setStatus(
    @Param('id') id: string,
    @Body() dto: SetUserStatusDto,
    @CurrentAdmin() admin: CurrentAdminData,
    @Req() req: Request,
  ) {
    return this.service.setStatus(id, dto.status, admin, dto.note, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
