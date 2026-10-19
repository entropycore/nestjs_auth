import { ConflictException, Injectable } from '@nestjs/common';
import { DuplicateEmailError } from './user.errors';
import type { NewUser, User } from './user.types';
import { UsersRepository } from './users.repository';

export const DEFAULT_ROLE = 'USER';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  findByEmail(email: string): Promise<User | undefined> {
    return this.repository.findByEmail(normalizeEmail(email));
  }

  findById(id: string): Promise<User | undefined> {
    return this.repository.findById(id);
  }

  async register(data: NewUser): Promise<User> {
    try {
      return await this.repository.createWithRole(
        { ...data, email: normalizeEmail(data.email) },
        DEFAULT_ROLE,
      );
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }
}