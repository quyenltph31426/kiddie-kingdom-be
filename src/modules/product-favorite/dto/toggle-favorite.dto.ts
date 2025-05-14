import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class ToggleFavoriteDto {
  @ApiProperty({
    description: 'Product ID to toggle favorite status',
    example: '60c72b2f9b44a52b88d56789',
  })
  @IsMongoId()
  productId: Types.ObjectId;
}
