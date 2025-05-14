import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  ssoServerDomain: process.env.SSO_SERVER_DOMAIN,
  apiKey: process.env.CLIENT_SECRET_KEY,
  clientScope: process.env.CLIENT_SCOPE,
  clientId: process.env.CLIENT_ID,

  accessTokenKey: `a_${process.env.CLIENT_ID}`,
  refreshTokenKey: `r_${process.env.CLIENT_ID}`,
}));
