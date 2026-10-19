export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}


export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUserView {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
}

export interface AuthResult extends AuthTokens {
  user: AuthUserView;
}

export abstract class CredentialsAuth {
  abstract register(input: RegisterInput): Promise<AuthResult>;
  abstract login(input: LoginInput): Promise<AuthResult>;
  abstract refresh(refreshToken: string): Promise<AuthTokens>;
  abstract logout(refreshToken: string): Promise<void>;
}