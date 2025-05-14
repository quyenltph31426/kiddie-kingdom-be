import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminSignInDto {
  @ApiProperty({
    description: 'Email or username',
    example: 'admin@example.com',
  })
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @ApiProperty({
    description: 'Password',
    example: 'admin123',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
