import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveCartItemsDto {
  @ApiProperty({
    description: 'Array of cart item IDs to remove',
    example: ['60d5ec9af682fbd12a0b4b72', '60d5ec9af682fbd12a0b4b73'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  itemIds: string[];
}
