import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from '@/database/schemas/user.schema';
import { ConfigModule } from '@nestjs/config';
import { GoogleAuthService } from './google-auth.service';
import { AuthGuard } from './guards/auth.guard';
import { TokenService } from './token.service';
import { EmailModule } from '../email/email.module';
import { EmailVerifiedGuard } from './guards/email-verified.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({}),
    ConfigModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleAuthService, AuthGuard, TokenService, EmailVerifiedGuard],
  exports: [AuthGuard, TokenService, EmailVerifiedGuard],
})
export class AuthModule {}
