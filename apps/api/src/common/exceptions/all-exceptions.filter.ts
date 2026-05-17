import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ErrorCode } from '@prologue/shared';
import type { Response } from 'express';
import { AppException } from './app.exception';

/**
 * 모든 예외를 다음 규격으로 변환.
 *   { error: { code: string, message: string, details?: unknown } }
 *
 * 5xx 는 로깅, 4xx 는 warn.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INTERNAL_ERROR;
    let message: string = '서버 오류가 발생했습니다.';
    let details: unknown = undefined;

    if (exception instanceof AppException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const r = res as { code?: string; message?: string | string[]; error?: string };
        if (Array.isArray(r.message)) {
          // ValidationPipe 결과
          message = '입력값 검증 실패';
          details = r.message;
        } else if (typeof r.message === 'string') {
          message = r.message;
        }
        code = r.code ?? this.mapStatusToCode(status);
      } else if (typeof res === 'string') {
        message = res;
        code = this.mapStatusToCode(status);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 서버 에러 로깅
    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
        AllExceptionsFilter.name,
      );
    } else if (status >= 400) {
      this.logger.warn(`${status} ${code}: ${message}`);
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    });
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMIT;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
