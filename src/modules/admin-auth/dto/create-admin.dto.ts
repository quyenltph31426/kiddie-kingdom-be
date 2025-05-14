import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AdminCreateInDto {
  @ApiProperty({
    description: 'Email ',
    example: 'admin@example.com',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Username ',
    example: 'admin',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Password',
    example: 'admin123',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
