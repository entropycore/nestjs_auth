// local-auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions, type JwtSignOptions } from '@nestjs/jwt';
import { UsersModule } from '../../../users/users.module';
import { CredentialsAuth } from '../../domain/credentials-auth.port';
import { PasswordHasher } from '../../domain/password-hasher.port';
import { TokenVerifier } from '../../domain/token-verifier.port';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { DrizzleRefreshTokenRepository } from './drizzle-refresh-token.repository';
import { JwtTokenVerifier } from './jwt-token-verifier';
import { LocalAuthService } from './local-auth.service';
import { LocalTokenService } from './local-token.service';
import { RefreshTokenRepository } from './refresh-token.repository';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.getOrThrow<string>(
            'JWT_ACCESS_EXPIRES_IN',
          ) as JwtSignOptions['expiresIn'],
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  providers: [
    LocalTokenService,
    { provide: CredentialsAuth, useClass: LocalAuthService },
    { provide: TokenVerifier, useClass: JwtTokenVerifier },
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
    { provide: RefreshTokenRepository, useClass: DrizzleRefreshTokenRepository },
  ],
  exports: [CredentialsAuth, TokenVerifier],
})
export class LocalAuthModule {}