import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DuplicateEmailError } from './user.errors';
import { DEFAULT_ROLE, UsersService } from './users.service';
import { UsersRepository } from './users.repository';

describe('UsersService', () => {
  let service: UsersService;
  const repository = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    createWithRole: jest.fn(),
  };
  const input = {
    email: '  Jane@Example.COM ',
    passwordHash: 'hash',
    firstName: 'Jane',
    lastName: 'Doe',
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: UsersRepository, useValue: repository }],
    }).compile();
    service = module.get(UsersService);
  });

  it('normalizes the email and assigns the default role', async () => {
    repository.createWithRole.mockResolvedValue({ id: 'u1' });
    await service.register(input);
    expect(repository.createWithRole).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com' }),
      DEFAULT_ROLE,
    );
  });

  it('maps a duplicate email to ConflictException', async () => {
    repository.createWithRole.mockRejectedValue(new DuplicateEmailError());
    await expect(service.register(input)).rejects.toBeInstanceOf(ConflictException);
  });
});