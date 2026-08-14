export interface UserDTO {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: UserDTO;
  tokens: AuthTokens;
}

export interface GoogleAuthPayload {
  credential?: string;
  idToken?: string;
  token?: string;
  accessToken?: string;
  access_token?: string;
  email?: string;
  name?: string;
  picture?: string;
  googleId?: string;
}
