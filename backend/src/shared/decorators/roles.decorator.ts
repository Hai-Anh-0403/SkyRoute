import { SetMetadata } from '@nestjs/common';

export type UserRole = 'traveler' | 'admin';

export const ROLES_KEY = 'roles';

/** Restricts route access to callers carrying one of the specified roles. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
