export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}