// src/auth/auth.module.ts   ← le SEUL endroit où on choisit le provider
import { DynamicModule, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { LocalAuthModule } from './providers/local/local-auth.module';

const AUTH_PROVIDERS = {
  local: { module: LocalAuthModule, controllers: [AuthController] },
  // auth0: { module: Auth0Module, controllers: [] },   ← plus tard
} as const;

export type AuthProviderName = keyof typeof AUTH_PROVIDERS;

@Module({})
export class AuthModule {
  static register(provider: AuthProviderName): DynamicModule {
    const { module, controllers } = AUTH_PROVIDERS[provider];
    return {
      module: AuthModule,
      imports: [module],
      controllers: [...controllers],
      exports: [module], // expose CredentialsAuth / TokenVerifier à AppModule (pour AuthGuard)
    };
  }
}