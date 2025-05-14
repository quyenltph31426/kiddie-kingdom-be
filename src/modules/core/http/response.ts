import { Pagination } from '@/utils/common';

export class DataWithPage<T> {
  data: T[];
  numberOfItems: number;
  pageSize: number;
  currentPage: number;

  constructor(data: T[], numberOfItems: number, pageSize: number, currentPage: number) {
    this.data = data;
    this.numberOfItems = numberOfItems;
    this.pageSize = pageSize;
    this.currentPage = currentPage;
  }
}

export enum StatusCode {
  SUCCESS = 10000,
  FAILURE = 10001,
  RETRY = 10002,
  INVALID_ACCESS_TOKEN = 10003,
}

export class Meta {
  readonly code: number;

  readonly message: string;

  readonly pagination?: Pagination;

  constructor(code: number, message: string, pagination: Pagination | undefined) {
    this.code = code;
    this.message = message;
    this.pagination = pagination;
  }
}

export class MessageResponse {
  readonly meta: Meta;

  constructor(meta: Meta) {
    this.meta = meta;
  }
}

export class DataResponse<T> extends MessageResponse {
  readonly data: T;

  constructor(statusCode: StatusCode, message: string, pagination: Pagination | undefined, data: T) {
    const meta = new Meta(statusCode, message, pagination);
    super(meta);
    this.data = data;
  }
}
