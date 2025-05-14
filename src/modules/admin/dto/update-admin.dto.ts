import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { AdminRoles } from '@/shared/enums';

export class UpdateAdminDto {
  @ApiPropertyOptional({
    description: 'Username',
    example: 'admin',
  })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({
    description: 'Email',
    example: 'admin@example.com',
  })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Password',
    example: 'password123',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'Admin role',
    enum: AdminRoles,
    example: AdminRoles.ADMIN,
  })
  @IsOptional()
  @IsEnum(AdminRoles)
  role?: AdminRoles;

  @ApiPropertyOptional({
    description: 'Is admin active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
