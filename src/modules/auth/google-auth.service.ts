import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { GoogleAuthenData } from '@/shared/interfaces/google-authen-data';

@Injectable()
export class GoogleAuthService {
  private oAuth2Client: OAuth2Client;

  constructor(private configService: ConfigService) {
    this.oAuth2Client = new OAuth2Client(this.configService.get<string>('app.clientId'));
  }

  async verify(token: string): Promise<GoogleAuthenData> {
    try {
      const ticket = await this.oAuth2Client.verifyIdToken({
        idToken: token,
        audience: this.configService.get<string>('app.clientId'),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.email_verified) {
        throw new UnauthorizedException('Invalid token payload or email not verified');
      }

      return {
        email: payload.email,
        name: payload.name || '',
        picture: payload.picture || '',
        email_verified: payload.email_verified,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
