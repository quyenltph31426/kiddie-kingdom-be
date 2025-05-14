import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { DataResponse, DataWithPage, MessageResponse, Meta, StatusCode } from '../http/response';
import { generatePageMeta } from '@/utils/common';

@Injectable()
export class ResponseTransformer implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof MessageResponse) return data;
        if (data instanceof DataResponse) return data;
        if (data instanceof DataWithPage) {
          const pageMeta = generatePageMeta(data.numberOfItems, data.pageSize, data.currentPage);
          return new DataResponse(StatusCode.SUCCESS, 'success', pageMeta, data.data);
        }
        if (typeof data == 'string') {
          const meta = new Meta(StatusCode.SUCCESS, data, undefined);
          return new MessageResponse(meta);
        }
        return new DataResponse(StatusCode.SUCCESS, 'success', undefined, data);
      }),
    );
  }
}
