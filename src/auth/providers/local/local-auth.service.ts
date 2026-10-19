// local-auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  CredentialsAuth,
  type AuthResult,
  type AuthTokens,
  type LoginInput,
  type RegisterInput,
} from '../../domain/credentials-auth.port';
import { PasswordHasher } from '../../domain/password-hasher.port';
import type { User } from '../../../users/user.types';
import { UsersService } from '../../../users/users.service';
import { LocalTokenService } from './local-token.service';

@Injectable()
export class LocalAuthService implements CredentialsAuth {
  private dummyHash?: Promise<string>;

  constructor(
    private readonly users: UsersService,
    private readonly hasher: PasswordHasher,
    private readonly tokens: LocalTokenService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.register({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });
    return this.buildResult(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);

    if (!user) {
      // Même coût CPU qu'un vrai login : empêche de deviner quels emails existent.
      await this.hasher.compare(input.password, await this.getDummyHash());
      throw new UnauthorizedException('Invalid credentials');
    }

    const matches = await this.hasher.compare(input.password, user.passwordHash);
    if (!matches || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildResult(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const userId = await this.tokens.consume(refreshToken);
    if (!userId) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.users.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.tokens.issue(user.id);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revoke(refreshToken);
  }

  private async buildResult(user: User): Promise<AuthResult> {
    const tokens = await this.tokens.issue(user.id);
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        permissions: user.permissions,
      },
    };
  }

  private getDummyHash(): Promise<string> {
    return (this.dummyHash ??= this.hasher.hash('dummy-password-for-timing'));
  }
}