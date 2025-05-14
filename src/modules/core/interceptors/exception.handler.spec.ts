import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenExpiredError } from '@nestjs/jwt';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { StatusCode } from '../http/response';
import { ExceptionHandler } from './exception.handler';

describe('ExceptionHandler', () => {
  let exceptionHandler: ExceptionHandler;

  const mockSetStatus = jest.fn(() => ({ json: mockSetJson }));
  const mockSetJson = jest.fn();
  const mockAppendHeader = jest.fn();
  const mockServiceConfig = jest.fn();

  const hostMock: ArgumentsHost = {
    switchToHttp: () =>
      ({
        getResponse: () =>
          ({
            appendHeader: mockAppendHeader,
            status: mockSetStatus,
          }) as any,
        getRequest: () => ({ url: 'test' }),
      }) as HttpArgumentsHost,
    getArgs: () => ({}) as any,
    getArgByIndex: () => ({}) as any,
    switchToRpc: () => ({}) as any,
    switchToWs: () => ({}) as any,
    getType: () => ({}) as any,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ExceptionHandler,
        {
          provide: ConfigService,
          useValue: { getOrThrow: mockServiceConfig },
        },
        { provide: Logger, useValue: { error: jest.fn() } },
      ],
    }).compile();

    exceptionHandler = module.get(ExceptionHandler);
    mockServiceConfig.mockReturnValue({ nodeEnv: 'development' });
  });

  it('should set token expired data on TokenExpiredError', () => {
    const exception = new TokenExpiredError('Token is expired', new Date());
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.INVALID_ACCESS_TOKEN,
        message: 'Token Expired',
        url: 'test',
      },
    });

    expect(mockAppendHeader).toHaveBeenCalledWith('instruction', 'refresh_token');
    expect(exceptionHandler['logger'].error).not.toHaveBeenCalled();
  });

  it('should set logout instruction data on invalid access token UnauthorizedException', () => {
    const exception = new UnauthorizedException('Invalid Access Token');
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.INVALID_ACCESS_TOKEN,
        message: 'Invalid Access Token',
        url: 'test',
      },
    });

    expect(mockAppendHeader).toHaveBeenCalledWith('instruction', 'logout');
    expect(exceptionHandler['logger'].error).not.toHaveBeenCalled();
  });

  it('should set bad request data on BadRequestException', () => {
    const exception = new BadRequestException({ message: 'Bad Request' });
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.FAILURE,
        message: 'Bad Request',
        url: 'test',
      },
    });

    expect(mockAppendHeader).not.toHaveBeenCalled();
    expect(exceptionHandler['logger'].error).not.toHaveBeenCalled();
  });

  it('should set internal error data on InternalServerErrorException', () => {
    const exception = new InternalServerErrorException({ message: 'Something went wrong' });
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.FAILURE,
        message: 'Something went wrong',
        url: 'test',
      },
    });

    expect(mockAppendHeader).not.toHaveBeenCalled();
    expect(exceptionHandler['logger'].error).toHaveBeenCalled();
  });

  it('should log non http expections', () => {
    const exception = new Error('Other Error');
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.FAILURE,
        message: 'Other Error',
        url: 'test',
      },
    });

    expect(mockAppendHeader).not.toHaveBeenCalled();
    expect(exceptionHandler['logger'].error).toHaveBeenCalled();
  });

  it('should not send actual error on production', () => {
    mockServiceConfig.mockReturnValue({ nodeEnv: 'production' });
    const exception = new Error('Other Error');
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.FAILURE,
        message: 'Something went wrong',
        url: 'test',
      },
    });

    expect(mockAppendHeader).not.toHaveBeenCalled();
    expect(exceptionHandler['logger'].error).toHaveBeenCalled();
  });

  it('handles HttpException with string message', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.FAILURE,
        message: 'Forbidden',
        errors: undefined,
        url: 'test',
      },
    });
    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
  });

  it('handles HttpException with object message', () => {
    const exception = new HttpException({ message: 'Bad Request' }, HttpStatus.BAD_REQUEST);
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.FAILURE,
        message: 'Bad Request',
        errors: undefined,
        url: 'test',
      },
    });
    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('handles HttpException with array message', () => {
    const exception = new HttpException({ message: ['Error 1', 'Error 2'] }, HttpStatus.BAD_REQUEST);
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.FAILURE,
        message: 'Error 1',
        errors: ['Error 1', 'Error 2'],
        url: 'test',
      },
    });
    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('handles TokenExpiredError', () => {
    const exception = new TokenExpiredError('Token is expired', new Date('2024-08-09T06:21:18.087Z'));
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.INVALID_ACCESS_TOKEN,
        message: 'Token Expired',
        errors: undefined,
        url: 'test',
      },
    });
    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockAppendHeader).toHaveBeenCalledWith('instruction', 'refresh_token');
  });

  it('handles UnauthorizedException with invalid access token', () => {
    const exception = new UnauthorizedException('Invalid Access Token');
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.INVALID_ACCESS_TOKEN,
        message: 'Invalid Access Token',
        errors: undefined,
        url: 'test',
      },
    });
    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockAppendHeader).toHaveBeenCalledWith('instruction', 'logout');
  });

  it('handles generic Error in development environment', () => {
    mockServiceConfig.mockReturnValue({ nodeEnv: 'development' });
    const exception = new Error('Some error');
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.FAILURE,
        message: 'Some error',
        errors: undefined,
        url: 'test',
      },
    });
    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('handles generic Error in production environment', () => {
    mockServiceConfig.mockReturnValue({ nodeEnv: 'production' });
    const exception = new Error('Some error');
    exceptionHandler.catch(exception, hostMock);

    expect(mockSetJson).toHaveBeenCalledWith({
      meta: {
        code: StatusCode.FAILURE,
        message: 'Something went wrong',
        errors: undefined,
        url: 'test',
      },
    });
    expect(mockSetStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
