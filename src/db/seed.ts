import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const PERMISSIONS = [
  { name: 'profile:read', description: 'Read own profile' },
  { name: 'users:read', description: 'Read users' },
  { name: 'users:write', description: 'Create and update users' },
];

const ROLES: Record<string, { description: string; permissions: string[] }> = {
  USER: { description: 'Default user role', permissions: ['profile:read'] },
  ADMIN: {
    description: 'Administrator',
    permissions: ['profile:read', 'users:read', 'users:write'],
  },
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  await db.transaction(async (tx) => {
    await tx.insert(schema.permissions).values(PERMISSIONS).onConflictDoNothing();
    await tx
      .insert(schema.roles)
      .values(Object.entries(ROLES).map(([name, r]) => ({ name, description: r.description })))
      .onConflictDoNothing();

    const permissionRows = await tx.select().from(schema.permissions);
    const roleRows = await tx.select().from(schema.roles);
    const permissionId = new Map(permissionRows.map((p) => [p.name, p.id]));
    const roleId = new Map(roleRows.map((r) => [r.name, r.id]));

    const links = Object.entries(ROLES).flatMap(([role, r]) =>
      r.permissions.map((permission) => ({
        roleId: roleId.get(role)!,
        permissionId: permissionId.get(permission)!,
      })),
    );
    await tx.insert(schema.rolePermissions).values(links).onConflictDoNothing();
  });

  await pool.end();
  console.log('Seed done');
}

void main();