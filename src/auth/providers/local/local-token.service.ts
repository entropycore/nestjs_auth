// local-token.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import type { AuthTokens } from '../../domain/credentials-auth.port';
import { parseDurationMs } from './duration.util';
import type { JwtPayload } from './jwt-payload.type';
import { RefreshTokenRepository } from './refresh-token.repository';

@Injectable()
export class LocalTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async issue(userId: string): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = randomBytes(48).toString('hex');
    const ttl = parseDurationMs(this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN'));

    await this.refreshTokens.save({
      tokenHash: this.hash(refreshToken),
      userId,
      expiresAt: new Date(Date.now() + ttl),
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN'),
    };
  }

  /** Consomme un refresh token. Retourne le userId s'il était valide, sinon undefined. */
  async consume(rawToken: string): Promise<string | undefined> {
    const stored = await this.refreshTokens.consume(this.hash(rawToken));
    if (!stored || stored.expiresAt < new Date()) return undefined;
    return stored.userId;
  }

  async revoke(rawToken: string): Promise<void> {
    await this.refreshTokens.consume(this.hash(rawToken));
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}