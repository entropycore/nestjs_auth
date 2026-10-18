import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_CONNECTION } from '../db/database.module';
import * as schema from '../db/schema';
import { UsersService } from '../users/users.service';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(DB_CONNECTION) private readonly db: NodePgDatabase<typeof schema>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    const tokens = await this.issueTokens(user.id, user.email);
    return { user: this.usersService.toSafeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user.id, user.email);
    return { user: this.usersService.toSafeUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const [stored] = await this.db
      .select({ token: schema.refreshTokens, user: schema.users })
      .from(schema.refreshTokens)
      .innerJoin(schema.users, eq(schema.refreshTokens.userId, schema.users.id))
      .where(eq(schema.refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!stored || stored.token.expiresAt < new Date()) {
      if (stored) {
        await this.db
          .delete(schema.refreshTokens)
          .where(eq(schema.refreshTokens.id, stored.token.id));
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.id, stored.token.id));

    return this.issueTokens(stored.user.id, stored.user.email);
  }

  async logout(refreshToken: string) {
    await this.db
      .delete(schema.refreshTokens)
      .where(eq(schema.refreshTokens.tokenHash, this.hashToken(refreshToken)));
    return { message: 'Logged out successfully' };
  }

  private async issueTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };
    const accessExpiresIn = this.configService.getOrThrow<string>(
      'JWT_ACCESS_EXPIRES_IN',
    );

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpiresIn = this.configService.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );

    await this.db.insert(schema.refreshTokens).values({
      tokenHash: this.hashToken(refreshToken),
      userId,
      expiresAt: new Date(Date.now() + this.parseDurationMs(refreshExpiresIn)),
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: accessExpiresIn,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDurationMs(duration: string): number {
    const match = /^(\d+)([smhd])$/.exec(duration);
    const week = 7 * 24 * 60 * 60 * 1000;
    if (!match) return week;

    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return week;
    }
  }
}