import { ApiResponseProperty } from '@nestjs/swagger';

import { BaseResponse } from './baseResponse.dto';
import { EmptyObject } from './emptyObject.dto';

export class EmptyObjectBase extends BaseResponse {
  @ApiResponseProperty({
    type: EmptyObject,
  })
  data: EmptyObject;
}
