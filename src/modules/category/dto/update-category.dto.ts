import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
