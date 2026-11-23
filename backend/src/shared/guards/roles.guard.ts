import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUserPayload } from '../decorators/current-user.decorator';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';
import { DomainException } from '../exceptions/domain.exception';

/**
 * Enforces @Roles(...) metadata against request.user.role after JwtAuthGuard runs.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthUserPayload }>();
    const role = request.user?.role;

    if (!role || !requiredRoles.includes(role)) {
      throw new DomainException(
        'AUTH_004',
        'User is not authorized for this resource',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
