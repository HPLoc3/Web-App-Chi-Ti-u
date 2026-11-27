import { Request, Response } from 'express';
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions,
} from '../../middleware/auth.middleware';
import { AuthTokens } from './auth.types';

export const setAuthCookies = (res: Response, req: Request, tokens: AuthTokens): void => {
  res.cookie('accessToken', tokens.accessToken, getAccessTokenCookieOptions(req));
  res.cookie('token', tokens.accessToken, getAccessTokenCookieOptions(req));
  res.cookie('refreshToken', tokens.refreshToken, getRefreshTokenCookieOptions(req));
};

export const clearAuthCookies = (res: Response, req: Request): void => {
  const clearOpts = getClearCookieOptions(req);
  res.clearCookie('accessToken', clearOpts);
  res.clearCookie('refreshToken', clearOpts);
  res.clearCookie('token', clearOpts);
};
