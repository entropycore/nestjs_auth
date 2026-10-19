// jwt-token-verifier.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from '../../domain/authenticated-user';
import { TokenVerifier } from '../../domain/token-verifier.port';
import { UsersService } from '../../../users/users.service';
import type { JwtPayload } from './jwt-payload.type';

@Injectable()
export class JwtTokenVerifier implements TokenVerifier {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async verify(accessToken: string): Promise<AuthenticatedUser> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(accessToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
    };
  }
}