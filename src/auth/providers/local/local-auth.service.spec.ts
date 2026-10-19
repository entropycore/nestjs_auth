// local-auth.service.spec.ts
import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PasswordHasher } from '../../domain/password-hasher.port';
import type { User } from '../../../users/user.types';
import { UsersService } from '../../../users/users.service';
import { LocalAuthService } from './local-auth.service';
import { LocalTokenService } from './local-token.service';

describe('LocalAuthService', () => {
  let service: LocalAuthService;

  const users = { register: jest.fn(), findByEmail: jest.fn(), findById: jest.fn() };
  const hasher = { hash: jest.fn(), compare: jest.fn() };
  const tokens = { issue: jest.fn(), consume: jest.fn(), revoke: jest.fn() };

  const user: User = {
    id: 'user-1',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    passwordHash: 'hashed',
    isActive: true,
    roles: ['USER'],
    permissions: ['profile:read'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const issued = {
    accessToken: 'access',
    refreshToken: 'refresh',
    tokenType: 'Bearer',
    expiresIn: '15m',
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    hasher.hash.mockResolvedValue('hashed');
    tokens.issue.mockResolvedValue(issued);

    const module = await Test.createTestingModule({
      providers: [
        LocalAuthService,
        { provide: UsersService, useValue: users },
        { provide: PasswordHasher, useValue: hasher },
        { provide: LocalTokenService, useValue: tokens },
      ],
    }).compile();
    service = module.get(LocalAuthService);
  });

  it('registers: hashes the password, never exposes it, returns tokens', async () => {
    users.register.mockResolvedValue(user);

    const result = await service.register({
      email: user.email,
      password: 'StrongPass123!',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    expect(users.register).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hashed' }),
    );
    expect(result.accessToken).toBe('access');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects an unknown email (and still runs a hash comparison)', async () => {
    users.findByEmail.mockResolvedValue(undefined);
    hasher.compare.mockResolvedValue(false);

    await expect(
      service.login({ email: 'nobody@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(hasher.compare).toHaveBeenCalled();
  });

  it('rejects a wrong password', async () => {
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(false);

    await expect(
      service.login({ email: user.email, password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an inactive account', async () => {
    users.findByEmail.mockResolvedValue({ ...user, isActive: false });
    hasher.compare.mockResolvedValue(true);

    await expect(
      service.login({ email: user.email, password: 'StrongPass123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logs in with valid credentials', async () => {
    users.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);

    const result = await service.login({ email: user.email, password: 'StrongPass123!' });

    expect(result.accessToken).toBe('access');
    expect(result.user.roles).toEqual(['USER']);
  });

  it('refresh rejects an invalid or already used token', async () => {
    tokens.consume.mockResolvedValue(undefined);
    await expect(service.refresh('x'.repeat(30))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refresh rotates the token for an active user', async () => {
    tokens.consume.mockResolvedValue(user.id);
    users.findById.mockResolvedValue(user);

    const result = await service.refresh('x'.repeat(30));
    expect(result.refreshToken).toBe('refresh');
  });
});