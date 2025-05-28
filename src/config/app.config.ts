import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  ssoServerDomain: process.env.SSO_SERVER_DOMAIN,
  apiKey: process.env.CLIENT_SECRET_KEY,
  clientScope: process.env.CLIENT_SCOPE,
  clientId: process.env.CLIENT_ID,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,

  accessTokenKey: `a_${process.env.CLIENT_ID}`,
}));
