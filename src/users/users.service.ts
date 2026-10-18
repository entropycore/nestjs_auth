import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { DB_CONNECTION } from '../db/database.module';
import * as schema from '../db/schema';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findByPhone(phone: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, phone))
      .limit(1);
    return user;
  }

  async create(phone: string, pin: string) {
    const existing = await this.findByPhone(phone);
    if (existing) {
      throw new ConflictException('Phone already registered');
    }

    const hashedPin = await bcrypt.hash(pin, 12);
    const [user] = await this.db
      .insert(schema.users)
      .values({ phone, pin: hashedPin })
      .returning();
    return user;
  }

  toSafeUser(user: typeof schema.users.$inferSelect) {
    const { pin: _pin, ...safe } = user;
    return safe;
  }
}