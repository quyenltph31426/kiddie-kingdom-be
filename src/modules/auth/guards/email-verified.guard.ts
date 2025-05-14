import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const IS_EMAIL_VERIFICATION_REQUIRED = 'isEmailVerificationRequired';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isEmailVerificationRequired = this.reflector.getAllAndOverride<boolean>(IS_EMAIL_VERIFICATION_REQUIRED, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isEmailVerificationRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let the AuthGuard handle this case
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Email verification required. Please verify your email address.');
    }

    return true;
  }
}

// Decorator to mark routes that require email verification
export const RequireEmailVerification = () => {
  return (target: any, key?: string, descriptor?: any) => {
    Reflect.defineMetadata(IS_EMAIL_VERIFICATION_REQUIRED, true, descriptor.value);
    return descriptor;
  };
};
