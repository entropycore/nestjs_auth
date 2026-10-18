// src/auth/types/authenticated-user.type.ts
export type AuthenticatedUser = {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
};