import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';

interface SuccessResponse<T> {
  data: T;
}

/**
 * 성공 응답을 { data: <T> } 규격으로 래핑.
 *
 * 컨트롤러는 항상 raw 데이터를 반환하면 됨. 인터셉터가 감싼다.
 *
 * 응답이 이미 { data: ... } 형태면 중첩 방지를 위해 그대로 통과.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((value) => {
        // 이미 { data: ... } 또는 { error: ... } 면 그대로
        if (value !== null && typeof value === 'object' && ('data' in value || 'error' in value)) {
          return value as SuccessResponse<T>;
        }
        return { data: value as T };
      }),
    );
  }
}
