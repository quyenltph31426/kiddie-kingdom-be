import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Generate a random token for email verification
   */
  generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate token expiration date
   * @param hours Number of hours until expiration
   */
  getTokenExpirationDate(hours: number = 24): Date {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + hours);
    return expirationDate;
  }

  /**
   * Generate JWT tokens for authentication
   */
  async generateAuthTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('auth.secret'),
          expiresIn: this.configService.get<string>('auth.jwtExpires') + 'm',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('auth.secret'),
          expiresIn: this.configService.get<string>('auth.refreshTokenTime') + 'm',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      accessTokenTtl: Number(this.configService.get<string>('auth.jwtExpires')),
      refreshTokenTtl: Number(this.configService.get<string>('auth.refreshTokenTime')),
    };
  }
}
