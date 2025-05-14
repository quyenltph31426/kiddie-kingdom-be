import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PageDto {
  @ApiProperty({
    name: 'page',
    required: false,
    type: String,
    description: 'The current index of page. Start from 1',
    example: '1',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1, { message: 'Page must be greater than or equal to 1' })
  page?: number;

  @ApiProperty({
    name: 'limit',
    required: false,
    type: String,
    description: 'Number of items per page.',
    example: '10',
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1, { message: 'Limit must be greater than or equal to 1' })
  limit?: number;
}
