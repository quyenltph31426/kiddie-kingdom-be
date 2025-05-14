import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { getLogger } from '../../shared/logger';
import { Response } from './response';

const logger = getLogger('Response');
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const { statusCode } = context.switchToHttp().getResponse();
    if (context.switchToHttp().getRequest().url.indexOf('/nft/') >= 0) {
      return next.handle().pipe(map((data) => data));
    }
    return next.handle().pipe(
      map(
        (data) => (
          logger.info(`API Response Status Code: ${statusCode}`),
          {
            meta: {
              code: context.switchToHttp().getResponse().statusCode,
              message: data.message ? data.message : 'Successful',
              pagination: data.pagination,
            },
            data: data.results ? data.results : data,
          }
        ),
      ),
    );
  }
}
