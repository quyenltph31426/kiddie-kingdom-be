import { CallHandler, ExecutionContext } from '@nestjs/common';
import { DataResponse, MessageResponse, Meta, StatusCode } from '../http/response';
import { lastValueFrom, of } from 'rxjs';
import { ResponseTransformer } from './response.transformer';

describe('ResponseTransformerInterceptor', () => {
  let interceptor: ResponseTransformer;
  let context: ExecutionContext;
  let next: CallHandler;

  beforeEach(() => {
    interceptor = new ResponseTransformer();
    context = {} as ExecutionContext;
    next = {
      handle: jest.fn(),
    } as CallHandler;
  });
  it('should transform MessageResponse', async () => {
    const meta = new Meta(StatusCode.SUCCESS, 'Hello', undefined);
    const messageResponse = new MessageResponse(meta);
    jest.spyOn(next, 'handle').mockReturnValue(of(messageResponse));

    const result = await lastValueFrom(interceptor.intercept(context, next));

    expect(result).toBe(messageResponse);
  });

  it('should transform DataResponse', async () => {
    const dataResponse = new DataResponse(StatusCode.SUCCESS, 'success', undefined, {
      key: 'value',
    });
    jest.spyOn(next, 'handle').mockReturnValue(of(dataResponse));

    const result = await lastValueFrom(interceptor.intercept(context, next));

    expect(result).toBe(dataResponse);
  });

  it('should transform string to MessageResponse', async () => {
    const plainString = 'Hello, world!';
    jest.spyOn(next, 'handle').mockReturnValue(of(plainString));

    const result = await lastValueFrom(interceptor.intercept(context, next));

    const meta = new Meta(StatusCode.SUCCESS, plainString, undefined);
    expect(result).toEqual(new MessageResponse(meta));
  });

  it('should transform other types to DataResponse', async () => {
    const complexObject = { key: 'value' };
    jest.spyOn(next, 'handle').mockReturnValue(of(complexObject));

    const result = await lastValueFrom(interceptor.intercept(context, next));

    expect(result).toEqual(new DataResponse(StatusCode.SUCCESS, 'success', undefined, complexObject));
  });
});
