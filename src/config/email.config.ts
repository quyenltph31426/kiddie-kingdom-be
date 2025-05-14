import { registerAs } from '@nestjs/config';

export const EmailConfigName = 'email';

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  secure: boolean;
  frontendUrl: string;
  appName: string;
}

export default registerAs(EmailConfigName, () => ({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
  from: process.env.EMAIL_FROM || 'noreply@example.com',
  secure: process.env.EMAIL_SECURE === 'true',
  frontendUrl: process.env.FRONTEND_URL || 'https://example.com',
  appName: process.env.APP_NAME || 'MyKingdom',
}));
