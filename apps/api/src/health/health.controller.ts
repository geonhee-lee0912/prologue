import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: '헬스체크 — 서비스 가동 여부 확인' })
  check() {
    return {
      ok: true,
      service: 'prologue-api',
      version: process.env.npm_package_version ?? '0.0.1',
      env: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }
}
