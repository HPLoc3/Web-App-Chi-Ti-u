import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { getJwtSecret } from '../middleware/auth.middleware';
import { EmailService } from './email.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserSummary {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider: string;
  createdAt: Date;
}

export class AuthService {
  /**
   * Helper băm token bằng SHA-256 để lưu trữ an toàn trong Database
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Helper lấy Google Client ID
   */
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

  /**
   * Helper lấy Google OAuth Client
   */
  private static getGoogleOAuthClient(): OAuth2Client {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      throw new Error('Chưa cấu hình GOOGLE_CLIENT_ID trên máy chủ.');
    }
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').replace(/^["']|["']$/g, '').trim();
    return new OAuth2Client(clientId, clientSecret || undefined);
  }

  /**
   * Sinh cặp token: Access Token (15 phút) & Refresh Token (30 ngày)
   * Lưu HASH của Refresh Token vào database
   */
  static async generateTokens(
    user: { id: string; email: string; name?: string | null },
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthTokens> {
    const jwtSecret = getJwtSecret();

    // 1. Tạo Access Token (short-lived: 15 phút)
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      jwtSecret,
      { expiresIn: '15m' }
    );

    // 2. Tạo Refresh Token ngẫu nhiên chuẩn mật mã (30 ngày)
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const hashedRefreshToken = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 ngày

    // 3. Lưu hashed refresh token và session vào CSDL
    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          token: hashedRefreshToken,
          userId: user.id,
          expiresAt,
        },
      }),
      prisma.session.create({
        data: {
          sessionToken: hashedRefreshToken,
          userId: user.id,
          userAgent: meta?.userAgent || null,
          ipAddress: meta?.ipAddress || null,
          expiresAt,
        },
      }),
    ]).catch(() => {});

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Đăng ký tài khoản mới bằng Email & Mật khẩu
   */
  static async register(name: string, email: string, password: string): Promise<{ user: UserSummary; tokens: AuthTokens }> {
    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

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

      // Tạo ví tiền mặc định
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
      },
      tokens,
    };
  }

  /**
   * Đăng nhập bằng Email & Mật khẩu
   */
  static async login(email: string, password: string): Promise<{ user: UserSummary; tokens: AuthTokens }> {
    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

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
      },
      tokens,
    };
  }

  /**
   * Đăng nhập bằng Google OAuth 2.0 (ID Token hoặc Access Token)
   */
  static async googleAuth(payload: {
    idToken?: string;
    credential?: string;
    token?: string;
    accessToken?: string;
    access_token?: string;
  }): Promise<{ user: UserSummary; tokens: AuthTokens }> {
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      throw new Error('Lỗi cấu hình máy chủ: Chưa đặt biến môi trường GOOGLE_CLIENT_ID.');
    }

    const tokenToVerify = payload.idToken || payload.credential || payload.token;
    const rawAccessToken = payload.accessToken || payload.access_token;

    let email: string | undefined;
    let name: string | undefined;
    let avatar: string | undefined;

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
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${rawAccessToken}` },
      });

      if (!userInfoRes.ok) {
        throw new Error('Xác thực Access Token với Google thất bại.');
      }

      const userInfo = await userInfoRes.json();
      if (!userInfo.email || userInfo.email_verified === false) {
        throw new Error('Email Google không hợp lệ hoặc chưa được xác thực.');
      }

      email = userInfo.email;
      name = userInfo.name;
      avatar = userInfo.picture;
    }

    if (!email) {
      throw new Error('Không thể lấy thông tin Email từ Google.');
    }

    const cleanEmail = email.trim().toLowerCase();

    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

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
      },
      tokens,
    };
  }

  /**
   * Làm mới Access Token bằng Refresh Token (Có Token Rotation)
   */
  static async refreshTokens(rawRefreshToken: string): Promise<{ user: UserSummary; tokens: AuthTokens }> {
    if (!rawRefreshToken) {
      throw new Error('Thiếu Refresh Token.');
    }

    const hashedToken = this.hashToken(rawRefreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    // Phát hiện tái sử dụng Token đã bị thu hồi (Token Theft / Reuse Detection)
    if (!tokenRecord) {
      throw new Error('Refresh Token không hợp lệ hoặc không tồn tại.');
    }

    if (tokenRecord.revokedAt) {
      // Bảo mật nâng cao: Thu hồi toàn bộ Refresh Token của user vì nghi ngờ bị rò rỉ token
      await prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new Error('Cảnh báo bảo mật: Refresh token đã bị hủy trước đó. Vui lòng đăng nhập lại.');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new Error('Refresh Token đã hết hạn. Vui lòng đăng nhập lại.');
    }

    // Thu hồi refresh token cũ (Token Rotation)
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    // Cấp cặp token mới
    const tokens = await this.generateTokens(tokenRecord.user);

    return {
      user: {
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        name: tokenRecord.user.name,
        avatar: tokenRecord.user.avatar,
        provider: tokenRecord.user.provider,
        createdAt: tokenRecord.user.createdAt,
      },
      tokens,
    };
  }

  /**
   * Đăng xuất & Thu hồi Refresh Token & Session
   */
  static async logout(rawRefreshToken?: string, userId?: string): Promise<void> {
    if (rawRefreshToken) {
      const hashedToken = this.hashToken(rawRefreshToken);
      await prisma.$transaction([
        prisma.refreshToken.updateMany({
          where: { token: hashedToken, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        prisma.session.deleteMany({
          where: { sessionToken: hashedToken },
        }),
      ]).catch(() => {});
    } else if (userId) {
      await this.logoutAllDevices(userId);
    }
  }

  /**
   * Đăng xuất khỏi tất cả các thiết bị (Revoke toàn bộ session và refresh token)
   */
  static async logoutAllDevices(userId: string): Promise<void> {
    if (!userId) return;

    await prisma.$transaction([
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.session.deleteMany({
        where: { userId },
      }),
    ]);
  }

  /**
   * Quên mật khẩu: Tạo token ngẫu nhiên, băm lưu DB, gửi email qua EmailService
   * Bảo mật: Không tiết lộ email có tồn tại hay không
   */
  static async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (user) {
      // 1. Tạo raw token ngẫu nhiên chuẩn mật mã
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = this.hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 giờ

      // 2. Lưu vào bảng PasswordResetToken
      await prisma.passwordResetToken.create({
        data: {
          token: hashedToken,
          userId: user.id,
          expiresAt,
        },
      });

      // 3. Gửi email với raw token
      await EmailService.sendPasswordResetEmail(user.email, rawToken, user.name);
    }

    // Luôn trả về thông báo chung để chống rò rỉ dữ liệu tài khoản (User Enumeration Protection)
    return {
      success: true,
      message: 'Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hòm thư của bạn.',
    };
  }

  /**
   * Đặt lại mật khẩu mới bằng Token đã nhận
   */
  static async resetPassword(rawToken: string, newPass: string): Promise<void> {
    const hashedToken = this.hashToken(rawToken);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new Error('Mã đặt lại mật khẩu không hợp lệ.');
    }

    if (resetRecord.usedAt) {
      throw new Error('Mã đặt lại mật khẩu này đã được sử dụng.');
    }

    if (new Date() > resetRecord.expiresAt) {
      throw new Error('Mã đặt lại mật khẩu đã hết hạn.');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);

    // Thực thi trong Transaction: Cập nhật mật khẩu, đánh dấu token đã dùng, thu hồi các refresh token cũ
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword },
      });

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // Thu hồi toàn bộ phiên đăng nhập cũ để đảm bảo an toàn sau khi đổi mật khẩu
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
  }

  /**
   * Lấy hồ sơ tài khoản chi tiết
   */
  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        provider: true,
        createdAt: true,
        wallets: {
          select: { id: true, name: true, balance: true, currency: true },
        },
      },
    });

    if (!user) {
      throw new Error('Không tìm thấy tài khoản người dùng.');
    }

    return user;
  }
}
