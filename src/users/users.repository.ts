import type { NewUser, User } from './user.types';

export abstract class UsersRepository {
  abstract findByEmail(email: string): Promise<User | undefined>;
  abstract findById(id: string): Promise<User | undefined>;
  /** @throws DuplicateEmailError si l'email existe déjà */
  abstract createWithRole(data: NewUser, roleName: string): Promise<User>;
}