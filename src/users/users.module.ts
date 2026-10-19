import { Module } from '@nestjs/common';
import { DrizzleUsersRepository } from './drizzle-users.repository';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  providers: [
    { provide: UsersRepository, useClass: DrizzleUsersRepository },
    UsersService,
  ],
  exports: [UsersService],
})
export class UsersModule {}