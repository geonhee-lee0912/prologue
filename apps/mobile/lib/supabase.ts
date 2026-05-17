/**
 * Supabase 클라이언트 (모바일).
 *
 * - Realtime 구독 전용. 데이터 변경(INSERT/UPDATE)은 항상 NestJS API 경유 (CLAUDE.md 패턴 2).
 * - JWT 인증: NestJS 가 발급한 access_token 을 setAuth() 로 주입.
 *   Supabase 는 SUPABASE_JWT_SECRET 으로 동일 검증 → RLS 의 auth.uid() 가 sub 클레임으로 작동.
 * - 세션 영속화 / 자동 갱신은 끔 (NestJS 가 토큰 관리).
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/** JWT 의 sub 클레임 (= User.id) 추출. 실패 시 null. */
export function decodeUserId(accessToken: string): string | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    b64 += '='.repeat((4 - (b64.length % 4)) % 4);
    // atob 은 RN/Expo modern Hermes 에서 동작. 폴백은 generic.
    const raw =
      typeof atob === 'function'
        ? atob(b64)
        : Buffer.from(b64, 'base64').toString('utf-8');
    const payload = JSON.parse(raw) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
