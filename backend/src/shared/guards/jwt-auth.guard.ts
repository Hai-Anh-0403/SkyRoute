import { ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { DomainException } from '../exceptions/domain.exception';

/**
 * Global JWT guard. Every route requires a valid access token
 * unless it is decorated with @Public().
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: unknown, user: TUser, info: unknown): TUser {
    if (err || !user) {
      const isExpired =
        info instanceof Error && info.name === 'TokenExpiredError';
      throw new DomainException(
        isExpired ? 'AUTH_002' : 'AUTH_003',
        isExpired ? 'Access token expired' : 'Invalid or missing access token',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return user;
  }
}
