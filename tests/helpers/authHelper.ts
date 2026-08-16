import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../src/middleware/auth.middleware';

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

export const USER_A: TestUser = {
  id: 'user_a_11111111-1111-1111-1111-111111111111',
  email: 'user_a@test.com',
  name: 'User A',
};

export const USER_B: TestUser = {
  id: 'user_b_22222222-2222-2222-2222-222222222222',
  email: 'user_b@test.com',
  name: 'User B',
};

export function generateTestToken(user: TestUser, expiresIn: string = '1h'): string {
  const secret = process.env.JWT_SECRET || getJwtSecret();
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    secret,
    { expiresIn: expiresIn as any }
  );
}

export function generateExpiredToken(user: TestUser): string {
  const secret = process.env.JWT_SECRET || getJwtSecret();
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    secret,
    { expiresIn: -10 as any }
  );
}
