// refresh-token.repository.ts   (PORT)
export interface StoredRefreshToken {
  userId: string;
  expiresAt: Date;
}

export abstract class RefreshTokenRepository {
  abstract save(data: {
    tokenHash: string;
    userId: string;
    expiresAt: Date;
  }): Promise<void>;

  /** Supprime ET retourne le token en une opération atomique (usage unique). */
  abstract consume(tokenHash: string): Promise<StoredRefreshToken | undefined>;
}