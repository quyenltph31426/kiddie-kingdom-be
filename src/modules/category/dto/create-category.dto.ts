import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Strategy Games' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Strategic board games and simulations' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'https://picsum.photos/300/300' })
  @IsString()
  @IsOptional()
  image?: string;
}
