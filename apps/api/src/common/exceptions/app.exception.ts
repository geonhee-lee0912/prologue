import { HttpException } from '@nestjs/common';
import { ErrorCode } from '@prologue/shared';

/**
 * 비즈니스 에러용 통합 예외.
 *
 * @example
 *   throw new AppException(ErrorCode.ALREADY_INTERESTED, '이미 관심을 보냈습니다.', HttpStatus.CONFLICT);
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: number,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}
