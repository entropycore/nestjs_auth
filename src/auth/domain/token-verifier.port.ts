import type { AuthenticatedUser } from './authenticated-user';

export abstract class TokenVerifier {
  abstract verify(accessToken: string): Promise<AuthenticatedUser>;
}