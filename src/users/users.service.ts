import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_CONNECTION } from '../db/database.module';
import * as schema from '../db/schema';
import type { RegisterDto } from '../auth/dto/register.dto';

type DbUser = typeof schema.users.$inferSelect;
export type UserWithAccess = DbUser & {
  roles: string[];
  permissions: string[];
};

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByEmail(email: string): Promise<UserWithAccess | undefined> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);
    return user ? this.withAccess(user) : undefined;
  }

  async findById(id: string): Promise<UserWithAccess | undefined> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return user ? this.withAccess(user) : undefined;
  }

  async create(dto: RegisterDto): Promise<UserWithAccess> {
    const email = dto.email.toLowerCase();

    if (await this.findByEmail(email)) {
      throw new ConflictException('Email already registered');
    }

    const password = await bcrypt.hash(dto.password, 12);

    const userId = await this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(schema.users)
        .values({
          email,
          password,
          firstName: dto.firstName,
          lastName: dto.lastName,
        })
        .returning({ id: schema.users.id });

      // Rôle USER par défaut (créé s'il n'existe pas encore)
      await tx
        .insert(schema.roles)
        .values({ name: 'USER', description: 'Default user role' })
        .onConflictDoNothing({ target: schema.roles.name });

      const [role] = await tx
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(eq(schema.roles.name, 'USER'))
        .limit(1);

      await tx
        .insert(schema.userRoles)
        .values({ userId: user.id, roleId: role.id });

      return user.id;
    });

    return (await this.findById(userId))!;
  }

  toSafeUser(user: UserWithAccess) {
    const { password: _password, ...safe } = user;
    return safe;
  }

  private async withAccess(user: DbUser): Promise<UserWithAccess> {
    const rows = await this.db
      .select({
        roleName: schema.roles.name,
        permissionName: schema.permissions.name,
      })
      .from(schema.userRoles)
      .innerJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .leftJoin(
        schema.rolePermissions,
        eq(schema.rolePermissions.roleId, schema.roles.id),
      )
      .leftJoin(
        schema.permissions,
        eq(schema.rolePermissions.permissionId, schema.permissions.id),
      )
      .where(eq(schema.userRoles.userId, user.id));

    const roles = [...new Set(rows.map((r) => r.roleName))];
    const permissions = [
      ...new Set(
        rows
          .map((r) => r.permissionName)
          .filter((p): p is string => p !== null),
      ),
    ];

    return { ...user, roles, permissions };
  }
}