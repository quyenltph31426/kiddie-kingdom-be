import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { AdminRoles } from '@/shared/enums';

export class CreateAdminDto {
  @ApiProperty({
    description: 'Username',
    example: 'admin',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Email',
    example: 'admin@example.com',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'password123',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({
    description: 'Admin role',
    enum: AdminRoles,
    example: AdminRoles.ADMIN,
  })
  @IsNotEmpty()
  @IsEnum(AdminRoles)
  role: AdminRoles;

  @ApiPropertyOptional({
    description: 'Is admin active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
