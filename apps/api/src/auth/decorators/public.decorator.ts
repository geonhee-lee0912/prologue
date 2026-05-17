import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 인증을 요구하지 않는 엔드포인트에 부착.
 * 전역 JwtAuthGuard 가 이 메타데이터를 확인해 우회한다.
 */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
