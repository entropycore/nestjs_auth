import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_CONNECTION, type Database } from '../db/database.module';
import { isUniqueViolation } from '../db/pg-errors';
import * as schema from '../db/schema';
import { DuplicateEmailError } from './user.errors';
import type { NewUser, User } from './user.types';
import { UsersRepository } from './users.repository';

@Injectable()
export class DrizzleUsersRepository implements UsersRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async findByEmail(email: string): Promise<User | undefined> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return row ? this.withAccess(row) : undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return row ? this.withAccess(row) : undefined;
  }

  async createWithRole(data: NewUser, roleName: string): Promise<User> {
    try {
      const userId = await this.db.transaction(async (tx) => {
        const [role] = await tx
          .select({ id: schema.roles.id })
          .from(schema.roles)
          .where(eq(schema.roles.name, roleName))
          .limit(1);
        if (!role) {
          throw new Error(`Role "${roleName}" not found. Did you run "pnpm db:seed"?`);
        }

        const [user] = await tx
          .insert(schema.users)
          .values(data)
          .returning({ id: schema.users.id });

        await tx.insert(schema.userRoles).values({ userId: user.id, roleId: role.id });
        return user.id;
      });

      const created = await this.findById(userId);
      if (!created) throw new Error('User creation failed');
      return created;
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateEmailError();
      throw error;
    }
  }

  private async withAccess(row: typeof schema.users.$inferSelect): Promise<User> {
    const rows = await this.db
      .select({ role: schema.roles.name, permission: schema.permissions.name })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .leftJoin(schema.rolePermissions, eq(schema.rolePermissions.roleId, schema.roles.id))
      .leftJoin(
        schema.permissions,
        eq(schema.rolePermissions.permissionId, schema.permissions.id),
      )
      .where(eq(schema.userRoles.userId, row.id));

    return {
      ...row,
      roles: [...new Set(rows.map((r) => r.role))],
      permissions: [
        ...new Set(rows.map((r) => r.permission).filter((p): p is string => p !== null)),
      ],
    };
  }
}