import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  secret: process.env.JWT_SECRET_KEY,
  jwtExpires: process.env.JWT_EXPIRATION_TIME,
  refreshTokenTime: process.env.JWT_REFRESH_TOKEN_EXPIRATION_TIME,
}));
