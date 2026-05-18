import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { ReportStatus } from '@prisma/client';
import type { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { AdminJwtAuthGuard } from '../auth/admin-auth.guard';
import type { CurrentAdminData } from '../auth/admin-payload.types';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminReportsService } from './admin-reports.service';
import { ResolveReportDto } from './dto/resolve-report.dto';

/**
 * @fr FR-K04 신고 관리 (08_화면목록_IA K04, 04_신고_차단_제재 정책)
 *
 * 운영자만 신고 description/resolutionNote 에 접근 가능.
 * 일반 사용자 JWT 로는 접근 불가 (AdminJwtAuthGuard).
 */
@ApiTags('admin/reports')
@ApiBearerAuth()
@Public() // 전역 JwtAuthGuard 우회
@UseGuards(AdminJwtAuthGuard)
@Controller('v1/admin/reports')
export class AdminReportsController {
  constructor(private readonly service: AdminReportsService) {}

  @Get()
  @ApiOperation({ summary: 'FR-K04 신고 목록 조회' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'reviewing', 'resolved', 'rejected', 'all'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  list(
    @Query('status') status?: ReportStatus | 'all',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list({
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'FR-K04 신고 상세 (관련 대화·이전 신고 수 포함)' })
  detail(@Param('id') id: string) {
    return this.service.getDetail(id);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'FR-K04 신고 처리 (dismiss/resolve/제재)' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @CurrentAdmin() admin: CurrentAdminData,
    @Req() req: Request,
  ) {
    return this.service.resolve(id, dto, admin, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
