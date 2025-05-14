import { ApiResponseProperty } from '@nestjs/swagger';

import { Pagination } from '../../config/rest/pagination';

export class MetaResponse {
  @ApiResponseProperty({
    type: Number,
    example: 200,
  })
  code: number;

  @ApiResponseProperty({
    type: String,
    example: 'Successful',
  })
  message: string;

  // @ApiResponseProperty({
  //     type: String,
  //     example: '',
  // })
  // messageDetails: string;

  @ApiResponseProperty({
    type: Pagination,
    example: {
      itemCount: 10,
      totalItems: 100,
      itemsPerPage: 10,
      totalPages: 10,
      currentPage: 0,
    },
  })
  pagination: Pagination;
}
