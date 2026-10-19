// src/db/rls.ts
import 'dotenv/config';
import { Pool } from 'pg';

const TABLES = [
  'users',
  'roles',
  'permissions',
  'user_roles',
  'role_permissions',
  'refresh_tokens',
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  for (const table of TABLES) {
    await pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
  }
  await pool.end();
  console.log('RLS enabled on all tables');
}

void main();