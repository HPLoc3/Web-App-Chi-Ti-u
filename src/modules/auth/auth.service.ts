import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { AuthRepository } from './auth.repository';
import { AuthTokens, UserDTO, GoogleAuthPayload } from './auth.types';
import { getJwtSecret } from '../../middleware/auth.middleware';
import { EmailService } from '../../services/email.service';
import { prisma } from '../../lib/prisma';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';
import { Logger } from '../../utils/logger';
import { AppError } from '../../middleware/errorHandler.middleware';

export const FORGOT_PASSWORD_MIN_RESPONSE_MS = 1500;

/** Token vừa bị thu hồi trong khoảng này được coi là request refresh chạy song song, không phải bị đánh cắp */
export const REFRESH_REUSE_GRACE_MS = 20_000;

const refreshInProgress = () =>
  new AppError('Phiên đăng nhập đang được làm mới. Vui lòng thử lại.', 409, 'REFRESH_IN_PROGRESS');

const invalidRefresh = (message: string) => new AppError(message, 401, 'INVALID_REFRESH_TOKEN');

const googleFailed = (message = 'Xác thực Google không thành công. Vui lòng thử lại.') =>
  new AppError(message, 400, 'GOOGLE_AUTH_FAILED');

const invalidCredentials = (message = 'Email hoặc mật khẩu không chính xác.') =>
  new AppError(message, 401, 'INVALID_CREDENTIALS');

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

const waitUntilElapsed = (startMs: number, minMs: number): Promise<void> =>
  sleep(minMs - (Date.now() - startMs));

export class AuthService {
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private static getGoogleClientId(): string {
    const envId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '')
      .replace(/^["']|["']$/g, '')
      .trim();
    if (
      envId &&
      !envId.includes('your_google_client_id') &&
      !envId.includes('your-google-client-id') &&
      !envId.includes('YOUR_GOOGLE_CLIENT_ID')
    ) {
      return envId;
    }
    return '';
  }

  /** Xác minh danh tính hoàn toàn từ Google; không tin bất kỳ email/tên nào do client gửi */
  private static async verifyGoogleIdentity(
    payload: GoogleAuthPayload
  ): Promise<{ email: string; name?: string; avatar?: string }> {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      throw new AppError('Đăng nhập Google chưa được cấu hình trên máy chủ.', 503, 'GOOGLE_NOT_CONFIGURED');
    }
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').replace(/^["']|["']$/g, '').trim();
    const googleClient = new OAuth2Client(clientId, clientSecret || undefined);

    const idToken = payload.credential || payload.idToken || payload.token;
    const accessToken = payload.accessToken || payload.access_token;

    if (idToken) {
      let claims;
      try {
        const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });
        claims = ticket.getPayload();
      } catch (error: any) {
        Logger.warn(`Google verifyIdToken thất bại: ${error?.name || 'Error'}`);
        throw googleFailed();
      }
      if (!claims?.email) throw googleFailed();
      if (claims.email_verified !== true) throw googleFailed('Email Google chưa được xác thực.');
      return { email: claims.email, name: claims.name, avatar: claims.picture };
    }

    if (!accessToken) {
      throw googleFailed('Không nhận được mã xác thực hoặc Access Token từ Google.');
    }

    let info: Awaited<ReturnType<OAuth2Client['getTokenInfo']>>;
    try {
      info = await googleClient.getTokenInfo(accessToken);
    } catch (error: any) {
      Logger.warn(`Google getTokenInfo thất bại: ${error?.name || 'Error'}`);
      throw googleFailed();
    }

    // Access token phải được cấp cho chính ứng dụng này
    if (info.aud !== clientId) throw googleFailed();
    if (info.azp !== undefined && info.azp !== clientId) throw googleFailed();
    // Endpoint tokeninfo trả chuỗi "true", trong khi kiểu của thư viện khai báo boolean
    if (String(info.email_verified) !== 'true') throw googleFailed('Email Google chưa được xác thực.');
    if (!info.email) throw googleFailed();

    let userInfo: { email?: string; name?: string; picture?: string };
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      userInfo = (await response.json()) as typeof userInfo;
    } catch (error: any) {
      Logger.warn(`Google UserInfo thất bại: ${error?.name || 'Error'}`);
      throw googleFailed();
    }

    if (userInfo.email?.toLowerCase() !== info.email.toLowerCase()) throw googleFailed();

    return { email: info.email, name: userInfo.name, avatar: userInfo.picture };
  }

  private static toUserDTO(user: UserDTO): UserDTO {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private static createTokenSet(user: { id: string; email: string; name?: string | null }) {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      getJwtSecret(),
      { expiresIn: '15m' }
    );
    const refreshToken = crypto.randomBytes(40).toString('hex');
    return {
      tokens: { accessToken, refreshToken } as AuthTokens,
      hashedRefreshToken: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
    };
  }

  static async generateTokens(
    user: { id: string; email: string; name?: string | null },
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthTokens> {
    const { tokens, hashedRefreshToken, expiresAt } = this.createTokenSet(user);

    // Không nuốt lỗi: refresh token không lưu được thì phiên này không hợp lệ
    await AuthRepository.createTokensAndSession(
      user.id,
      hashedRefreshToken,
      expiresAt,
      meta?.userAgent,
      meta?.ipAddress
    );

    return tokens;
  }

  static async register(name: string, email: string, password: string): Promise<{ user: UserDTO; tokens: AuthTokens }> {
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await AuthRepository.findUserByEmail(cleanEmail);
    if (existingUser) {
      throw new AppError(
        'Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.',
        400,
        'REGISTER_FAILED'
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let user: any;
    try {
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            name: name.trim(),
            email: cleanEmail,
            password: hashedPassword,
            provider: 'local',
          },
        });

        await tx.wallet.create({
          data: {
            name: 'Ví Tiền Mặt',
            balance: 0,
            currency: 'VND',
            type: 'cash',
            isDefault: true,
            userId: newUser.id,
          },
        });

        return newUser;
      });
    } catch (error: any) {
      if (DevFallbackStore.shouldFallback(error)) {
        user = devFallbackStore.createUser({
          name: name.trim(),
          email: cleanEmail,
          password: hashedPassword,
          provider: 'local',
        });
      } else {
        throw error;
      }
    }

    const tokens = await this.generateTokens(user);

    return { user: this.toUserDTO(user), tokens };
  }

  static async login(email: string, password: string): Promise<{ user: UserDTO; tokens: AuthTokens }> {
    const cleanEmail = email.trim().toLowerCase();

    const user = await AuthRepository.findUserByEmail(cleanEmail);
    if (!user) {
      throw invalidCredentials();
    }

    if (!user.password) {
      throw invalidCredentials('Tài khoản này được đăng ký qua Google. Vui lòng bấm Đăng nhập bằng Google.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw invalidCredentials();
    }

    const tokens = await this.generateTokens(user);

    return { user: this.toUserDTO(user), tokens };
  }

  static async googleAuth(payload: GoogleAuthPayload): Promise<{ user: UserDTO; tokens: AuthTokens }> {
    const { email, name, avatar } = await this.verifyGoogleIdentity(payload);

    const cleanEmail = email.trim().toLowerCase();
    let user = await AuthRepository.findUserByEmail(cleanEmail);

    if (!user) {
      try {
        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email: cleanEmail,
              name: name || cleanEmail.split('@')[0],
              avatar: avatar || null,
              provider: 'google',
            },
          });

          await tx.wallet.create({
            data: {
              name: 'Ví Tiền Mặt',
              balance: 0,
              currency: 'VND',
              type: 'cash',
              isDefault: true,
              userId: newUser.id,
            },
          });

          return newUser;
        });
      } catch (error: any) {
        if (DevFallbackStore.shouldFallback(error)) {
          user = devFallbackStore.createUser({
            email: cleanEmail,
            name: name || cleanEmail.split('@')[0],
            avatar: avatar || null,
            provider: 'google',
          });
        } else {
          throw error;
        }
      }
    } else {
      // User exists: update missing avatar/name and link if appropriate
      const updateData: { avatar?: string; name?: string } = {};
      if (avatar && (!user.avatar || user.avatar.includes('googleusercontent.com'))) {
        updateData.avatar = avatar;
      }
      if (!user.name && name) {
        updateData.name = name;
      }
      if (Object.keys(updateData).length > 0) {
        try {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
        } catch (error: any) {
          if (DevFallbackStore.shouldFallback(error)) {
            user = devFallbackStore.updateUser(user.id, updateData);
          }
        }
      }
    }

    const tokens = await this.generateTokens(user);

    return { user: this.toUserDTO(user), tokens };
  }

  static async refreshTokens(rawRefreshToken: string): Promise<{ user: UserDTO; tokens: AuthTokens }> {
    if (!rawRefreshToken) {
      throw invalidRefresh('Thiếu Refresh Token.');
    }

    const hashedToken = this.hashToken(rawRefreshToken);
    const tokenRecord = await AuthRepository.findRefreshToken(hashedToken);

    if (!tokenRecord) {
      throw invalidRefresh('Refresh Token không hợp lệ hoặc không tồn tại.');
    }

    if (tokenRecord.revokedAt) {
      if (Date.now() - tokenRecord.revokedAt.getTime() <= REFRESH_REUSE_GRACE_MS) {
        throw refreshInProgress();
      }
      await AuthRepository.revokeAllUserTokensAndSessions(tokenRecord.userId);
      throw invalidRefresh('Cảnh báo bảo mật: Refresh token đã bị hủy trước đó. Vui lòng đăng nhập lại.');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw invalidRefresh('Refresh Token đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const user = await AuthRepository.findUserById(tokenRecord.userId);
    if (!user) {
      throw invalidRefresh('Người dùng không tồn tại.');
    }

    const { tokens, hashedRefreshToken, expiresAt } = this.createTokenSet(user);
    const rotated = await AuthRepository.rotateRefreshToken({
      oldTokenId: tokenRecord.id,
      userId: user.id,
      newHashedToken: hashedRefreshToken,
      expiresAt,
    });
    if (!rotated) {
      throw refreshInProgress();
    }

    return { user: this.toUserDTO(user), tokens };
  }

  static async logout(rawRefreshToken?: string, userId?: string): Promise<void> {
    if (rawRefreshToken) {
      const hashedToken = this.hashToken(rawRefreshToken);
      await AuthRepository.revokeRefreshTokenByHash(hashedToken);
      await AuthRepository.deleteSessionByToken(hashedToken);
    } else if (userId) {
      await this.logoutAllDevices(userId);
    }
  }

  static async logoutAllDevices(userId: string): Promise<void> {
    if (!userId) return;
    await AuthRepository.revokeAllUserTokensAndSessions(userId);
  }

  static async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const startMs = Date.now();
    const minMs = FORGOT_PASSWORD_MIN_RESPONSE_MS;

    // Toàn bộ việc tra user, ghi token và gửi mail chạy trong một promise nền
    // (không bao giờ reject); phản hồi không chờ quá mốc ngân sách.
    const work = (async (): Promise<void> => {
      try {
        const cleanEmail = email.trim().toLowerCase();
        const user = await AuthRepository.findUserByEmail(cleanEmail);

        if (user) {
          const rawToken = crypto.randomBytes(32).toString('hex');
          const hashedToken = this.hashToken(rawToken);
          const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

          await AuthRepository.createResetToken(user.id, hashedToken, expiresAt);
          await EmailService.sendPasswordResetEmail(user.email, rawToken, user.name);
        }
      } catch (err: any) {
        // Chỉ log tên/mã lỗi; không log message gốc, email hay token.
        Logger.error('forgotPassword: xử lý nội bộ thất bại', undefined, undefined, {
          errorName: typeof err?.name === 'string' ? err.name : 'Error',
          ...(err?.code !== undefined ? { errorCode: String(err.code) } : {}),
        });
      }
    })();

    await Promise.race([work, waitUntilElapsed(startMs, minMs)]);

    await waitUntilElapsed(startMs, minMs);

    return {
      success: true,
      message: 'Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hòm thư của bạn.',
    };
  }

  static async resetPassword(rawToken: string, newPass: string): Promise<void> {
    const invalidToken = () =>
      new AppError('Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.', 400, 'RESET_PASSWORD_FAILED');

    const hashedToken = this.hashToken(rawToken);
    const resetRecord = await AuthRepository.findValidResetToken(hashedToken);

    if (!resetRecord) {
      throw invalidToken();
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    const done = await AuthRepository.resetPasswordWithToken(resetRecord.id, resetRecord.userId, hashedPassword);
    if (!done) {
      throw invalidToken();
    }
  }

  static async getMe(userId: string): Promise<UserDTO> {
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw new AppError('Không tìm thấy tài khoản người dùng.', 404, 'USER_NOT_FOUND');
    }
    return this.toUserDTO(user);
  }
}
