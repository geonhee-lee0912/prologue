/**
 * Supabase 가 발급하는 JWT 의 페이로드 (HS256, 레거시 형식).
 * docs: https://supabase.com/docs/guides/auth/jwts
 */
export interface SupabaseJwtPayload {
  /** Supabase auth.users.id (UUID) */
  sub: string;
  email?: string;
  phone?: string;
  /** "authenticated" | "anon" | "service_role" 등 */
  role: string;
  aud: string | string[];
  iss: string;
  iat: number;
  exp: number;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

/**
 * validate() 통과 후 request.user 에 주입되는 정규화 형태.
 * @CurrentUser() 데코레이터가 이 타입을 반환한다.
 */
export interface CurrentUserData {
  /** Supabase auth.users.id (UUID) — public.users.id 와 동일 */
  userId: string;
  email?: string;
  phone?: string;
  role: string;
}
