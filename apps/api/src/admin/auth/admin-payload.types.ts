/**
 * Admin JWT payload — 일반 사용자 JWT 와 분리.
 *
 * 별도 시크릿(`ADMIN_JWT_SECRET`)으로 서명되며, 별도 가드(`AdminJwtAuthGuard`)에서만 검증한다.
 * `kind: 'admin'` 으로 일반 사용자 토큰과 mix-up 방지.
 */
export interface AdminJwtPayload {
  sub: string; // adminId
  role: 'owner' | 'manager' | 'reviewer';
  kind: 'admin';
  iss: 'prologue-admin';
  iat?: number;
  exp?: number;
}

export interface CurrentAdminData {
  adminId: string;
  role: 'owner' | 'manager' | 'reviewer';
}
