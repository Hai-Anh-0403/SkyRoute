import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from './roles.decorator';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/** Injects the authenticated user (set by JwtStrategy) into a controller handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthUserPayload;
  },
);
