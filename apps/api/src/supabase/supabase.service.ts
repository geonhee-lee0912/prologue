import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * SupabaseService
 *
 * service_role 키로 Supabase 에 접근하는 단일 클라이언트를 노출한다.
 * - Storage Admin SDK (사진 업로드/검수)
 * - Auth Admin SDK (사용자 생성/조회)
 * - 일반 테이블 조회/쓰기 (RLS 우회 — 비즈니스 규칙은 NestJS 가 검증)
 *
 * 모바일/관리자 클라이언트에는 절대 service_role 키를 노출하지 않는다.
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  public readonly admin: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.',
      );
    }

    this.admin = createClient(url, serviceRoleKey, {
      auth: {
        // service_role 은 세션이 필요 없음
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  onModuleInit(): void {
    this.logger.log('Supabase admin client ready');
  }
}
