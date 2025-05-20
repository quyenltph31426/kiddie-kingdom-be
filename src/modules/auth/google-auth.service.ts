import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuthenData } from '@/shared/interfaces/google-authen-data';
import axios from 'axios';

@Injectable()
export class GoogleAuthService {
  constructor(private configService: ConfigService) {}

  async verify(token: string): Promise<GoogleAuthenData> {
    try {
      // Verify token using Google's tokeninfo endpoint
      const response = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);

      const payload = response.data;

      if (!payload || !payload.email || !payload.email_verified) {
        throw new UnauthorizedException('Invalid token payload or email not verified');
      }

      return {
        email: payload.email,
        name: payload.name || '',
        picture: payload.picture || '',
        email_verified: payload.email_verified === 'true' || payload.email_verified === true,
      };
    } catch (error) {
      console.log(error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
