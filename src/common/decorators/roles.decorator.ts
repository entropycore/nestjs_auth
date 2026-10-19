import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/** L'utilisateur doit avoir AU MOINS UN des rôles. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);