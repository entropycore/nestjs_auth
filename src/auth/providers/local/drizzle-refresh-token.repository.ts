// drizzle-refresh-token.repository.ts   (ADAPTER)
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_CONNECTION, type Database } from '../../../db/database.module';
import * as schema from '../../../db/schema';
import { RefreshTokenRepository, type StoredRefreshToken } from './refresh-token.repository';

@Injectable()
export class DrizzleRefreshTokenRepository implements RefreshTokenRepository {
  constructor(@Inject(DB_CONNECTION) private readonly db: Database) {}

  async save(data: { tokenHash: string; userId: string; expiresAt: Date }): Promise<void> {
    await this.db.insert(schema.refreshTokens).values(data);
  }

  async consume(tokenHash: string): Promise<StoredRefreshToken | undefined> {
    const [row] = await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, tokenHash))
      .returning({
        userId: schema.refreshTokens.userId,
        expiresAt: schema.refreshTokens.expiresAt,
      });
    return row;
  }
}