import { Injectable, Inject } from '@nestjs/common';
import { DB_CONNECTION } from '../db/database.module';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  
  async findByPhone(phone: string) {
    const result = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, phone))
      .limit(1);
    
    return result[0]; 
  }

  
  async create(phone: string, pin: string) {
    const result = await this.db
      .insert(schema.users)
      .values({
        phone,
        pin, 
      })
      .returning(); 
      
    return result[0];
  }
}