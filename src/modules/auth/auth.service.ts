import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { AuthRepository } from './auth.repository';
import { AuthTokens, UserDTO, GoogleAuthPayload } from './auth.types';
import { getJwtSecret } from '../../middleware/auth.middleware';
import { EmailService } from '../../services/email.service';
import { prisma } from '../../lib/prisma';

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

  private static getGoogleOAuthClient(): OAuth2Client {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      throw new Error('Chưa cấu hình GOOGLE_CLIENT_ID trên máy chủ.');
    }
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').replace(/^["']|["']$/g, '').trim();
    return new OAuth2Client(clientId, clientSecret || undefined);
  }

  static async generateTokens(
    user: { id: string; email: string; name?: string | null },
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthTokens> {
    const jwtSecret = getJwtSecret();

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const hashedRefreshToken = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày

    await AuthRepository.createTokensAndSession(
      user.id,
      hashedRefreshToken,
      expiresAt,
      meta?.userAgent,
      meta?.ipAddress
    ).catch(() => {});

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  static async register(name: string, email: string, password: string): Promise<{ user: UserDTO; tokens: AuthTokens }> {
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await AuthRepository.findUserByEmail(cleanEmail);
    if (existingUser) {
      throw new Error('Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
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
          userId: newUser.id,
        },
      });

      return newUser;
    });

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    };
  }

  static async login(email: string, password: string): Promise<{ user: UserDTO; tokens: AuthTokens }> {
    const cleanEmail = email.trim().toLowerCase();

    const user = await AuthRepository.findUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    if (!user.password) {
      throw new Error('Tài khoản này được đăng ký qua Google. Vui lòng bấm Đăng nhập bằng Google.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    };
  }

  static async googleAuth(payload: GoogleAuthPayload): Promise<{ user: UserDTO; tokens: AuthTokens }> {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      throw new Error('Lỗi cấu hình máy chủ: Chưa đặt biến môi trường GOOGLE_CLIENT_ID.');
    }

    const tokenToVerify = payload.credential || payload.idToken || payload.token;
    const rawAccessToken = payload.accessToken || payload.access_token;
    let email: string | undefined = payload.email;
    let name: string | undefined = payload.name;
    let avatar: string | undefined = payload.picture;

    const googleClient = this.getGoogleOAuthClient();

    if (tokenToVerify) {
      const ticket = await googleClient.verifyIdToken({
        idToken: tokenToVerify,
        audience: clientId,
      });

      const tokenPayload = ticket.getPayload();
      if (!tokenPayload) {
        throw new Error('Google ID Token không hợp lệ.');
      }

      if (tokenPayload.iss !== 'accounts.google.com' && tokenPayload.iss !== 'https://accounts.google.com') {
        throw new Error('Google ID Token issuer không hợp lệ.');
      }

      if (tokenPayload.email_verified === false) {
        throw new Error('Email Google chưa được xác thực.');
      }

      email = tokenPayload.email;
      name = tokenPayload.name;
      avatar = tokenPayload.picture;
    } else if (rawAccessToken) {
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${rawAccessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Google UserInfo API trả về HTTP ${response.status}`);
        }

        const userInfo = (await response.json()) as {
          email?: string;
          name?: string;
          picture?: string;
          email_verified?: boolean;
        };

        if (userInfo.email_verified === false) {
          throw new Error('Email Google chưa được xác thực.');
        }

        email = userInfo.email;
        name = userInfo.name;
        avatar = userInfo.picture;
      } catch (err: any) {
        console.error('Lỗi lấy thông tin Google UserInfo:', err);
        throw new Error(err.message || 'Không thể xác thực Google Access Token.');
      }
    }

    if (!email) {
      throw new Error('Không thể lấy thông tin Email từ Google.');
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = await AuthRepository.findUserByEmail(cleanEmail);

    if (!user) {
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
            userId: newUser.id,
          },
        });

        return newUser;
      });
    } else if (avatar && !user.avatar) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatar, name: name || user.name },
      });
    }

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    };
  }

  static async refreshTokens(rawRefreshToken: string): Promise<{ user: UserDTO; tokens: AuthTokens }> {
    if (!rawRefreshToken) {
      throw new Error('Thiếu Refresh Token.');
    }

    const hashedToken = this.hashToken(rawRefreshToken);
    const tokenRecord = await AuthRepository.findRefreshToken(hashedToken);

    if (!tokenRecord) {
      throw new Error('Refresh Token không hợp lệ hoặc không tồn tại.');
    }

    if (tokenRecord.revokedAt) {
      await AuthRepository.revokeAllUserTokensAndSessions(tokenRecord.userId);
      throw new Error('Cảnh báo bảo mật: Refresh token đã bị hủy trước đó. Vui lòng đăng nhập lại.');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new Error('Refresh Token đã hết hạn. Vui lòng đăng nhập lại.');
    }

    await AuthRepository.revokeRefreshToken(tokenRecord.id);

    const user = await AuthRepository.findUserById(tokenRecord.userId);
    if (!user) {
      throw new Error('Người dùng không tồn tại.');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    };
  }

  static async logout(rawRefreshToken?: string, userId?: string): Promise<void> {
    if (rawRefreshToken) {
      const hashedToken = this.hashToken(rawRefreshToken);
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
    const cleanEmail = email.trim().toLowerCase();
    const user = await AuthRepository.findUserByEmail(cleanEmail);

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

      await AuthRepository.createResetToken(user.id, hashedToken, expiresAt);
      await EmailService.sendPasswordResetEmail(user.email, rawToken, user.name);
    }

    return {
      success: true,
      message: 'Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hòm thư của bạn.',
    };
  }

  static async resetPassword(rawToken: string, newPass: string): Promise<void> {
    const hashedToken = this.hashToken(rawToken);
    const resetRecord = await AuthRepository.findValidResetToken(hashedToken);

    if (!resetRecord) {
      throw new Error('Mã đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);

    await prisma.$transaction(async () => {
      await AuthRepository.updateUserPassword(resetRecord.userId, hashedPassword);
      await AuthRepository.markResetTokenUsed(resetRecord.id);
      await AuthRepository.revokeAllUserTokensAndSessions(resetRecord.userId);
    });
  }

  static async getMe(userId: string) {
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản người dùng.');
    }
    return user;
  }
}
