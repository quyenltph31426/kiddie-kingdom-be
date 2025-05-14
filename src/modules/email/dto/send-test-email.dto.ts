import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendTestEmailDto {
  @ApiProperty({
    description: 'Email recipient',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    description: 'Email subject',
    example: 'Test Email',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({
    description: 'Email text content (used if templateName is not provided)',
    example: 'This is a test email from the API.',
  })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({
    description: 'Template name to use (welcome, password-reset, order-confirmation)',
    example: 'welcome',
  })
  @IsString()
  @IsOptional()
  templateName?: string;

  @ApiPropertyOptional({
    description: 'Context data for the template',
    example: {
      username: 'John Doe',
      year: 2023,
      appName: 'MyKingdom',
      loginUrl: 'https://example.com/login',
    },
  })
  @IsOptional()
  context?: Record<string, any>;
}
