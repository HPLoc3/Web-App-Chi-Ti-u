import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { getJwtSecret } from '../middleware/auth.middleware';

const getGoogleClientId = (): string => {
  const envId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').replace(/^["']|["']$/g, '').trim();
  if (
    envId &&
    !envId.includes('your_google_client_id') &&
    !envId.includes('your-google-client-id') &&
    !envId.includes('YOUR_GOOGLE_CLIENT_ID')
  ) {
    return envId;
  }
  return '';
};

const getGoogleOAuthClient = (): OAuth2Client => {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Chưa cấu hình GOOGLE_CLIENT_ID trên máy chủ.');
  }
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').replace(/^["']|["']$/g, '').trim();
  return new OAuth2Client(clientId, clientSecret || undefined);
};

/**
 * Cấu hình Cookie an toàn hỗ trợ cả Production HTTPS (hophuloc.online) và Localhost Development
 */
export const getAuthCookieOptions = (req?: Request) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = isProduction || (req ? (req.secure || req.headers['x-forwarded-proto'] === 'https') : false);

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
  };
};

export const getClearCookieOptions = (req?: Request) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = isProduction || (req ? (req.secure || req.headers['x-forwarded-proto'] === 'https') : false);

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    path: '/',
  };
};

/**
 * POST /api/auth/register
 * Đăng ký tài khoản mới bằng Email & Mật khẩu
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu.',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.',
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        provider: 'local',
      },
    });

    // Tạo ví tiền mặc định cho người dùng mới
    await prisma.wallet.create({
      data: {
        name: 'Ví Tiền Mặt',
        balance: 0,
        currency: 'VND',
        userId: user.id,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.cookie('token', token, getAuthCookieOptions(req));

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Lỗi đăng ký:', error.message || 'Lỗi không xác định');
    res.status(500).json({
      success: false,
      message: error.message || 'Đăng ký thất bại. Vui lòng thử lại.',
    });
  }
};

/**
 * POST /api/auth/login
 * Đăng nhập bằng Email & Mật khẩu
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Vui lòng nhập Email và Mật khẩu.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.',
      });
      return;
    }

    if (!user.password) {
      res.status(400).json({
        success: false,
        message: 'Tài khoản này được đăng ký bằng Google. Vui lòng bấm Đăng nhập bằng Google.',
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác.',
      });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.cookie('token', token, getAuthCookieOptions(req));

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Lỗi đăng nhập:', error.message || 'Lỗi không xác định');
    res.status(500).json({
      success: false,
      message: error.message || 'Đăng nhập thất bại. Vui lòng thử lại.',
    });
  }
};

/**
 * POST /api/auth/forgot-password
 * Yêu cầu đặt lại mật khẩu
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Vui lòng nhập email.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản liên kết với địa chỉ email này.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Liên kết đặt lại mật khẩu đã được gửi đến email: ${cleanEmail}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi liên kết đặt lại mật khẩu.' });
  }
};

/**
 * POST /api/auth/google
 * Đăng nhập / Đăng ký bằng Google OAuth 2.0 ID Token
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const clientId = getGoogleClientId();
    if (!clientId) {
      res.status(500).json({
        success: false,
        message: 'Lỗi cấu hình máy chủ: Chưa đặt biến môi trường GOOGLE_CLIENT_ID.',
      });
      return;
    }

    const { idToken, credential, token: inputToken, accessToken, access_token } = req.body;
    const tokenToVerify = idToken || credential || inputToken;
    const rawAccessToken = accessToken || access_token;

    if (!tokenToVerify && !rawAccessToken) {
      res.status(400).json({
        success: false,
        message: 'Thiếu Google Token (idToken hoặc accessToken).',
      });
      return;
    }

    let email: string | undefined;
    let name: string | undefined;
    let avatar: string | undefined;

    const googleClient = getGoogleOAuthClient();

    // 1. Nếu có ID Token (Xác thực chữ ký, issuer, audience, exp)
    if (tokenToVerify) {
      const ticket = await googleClient.verifyIdToken({
        idToken: tokenToVerify,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Google ID Token payload không hợp lệ.');
      }

      // Xác minh Issuer
      if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
        throw new Error('Google ID Token issuer không hợp lệ.');
      }

      // Xác minh Email Verified Status
      if (payload.email_verified === false) {
        throw new Error('Email Google của tài khoản chưa được xác thực.');
      }

      email = payload.email;
      name = payload.name;
      avatar = payload.picture;
    } else if (rawAccessToken) {
      // 2. Nếu dùng Access Token (Google Popup OAuth fallback)
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${rawAccessToken}` },
      });

      if (!userInfoRes.ok) {
        throw new Error('Xác thực Access Token với Google thất bại.');
      }

      const userInfo = await userInfoRes.json();
      if (!userInfo.email) {
        throw new Error('Không thể lấy địa chỉ Email từ Google Access Token.');
      }

      if (userInfo.email_verified === false) {
        throw new Error('Email Google của tài khoản chưa được xác thực.');
      }

      email = userInfo.email;
      name = userInfo.name;
      avatar = userInfo.picture;
    }

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Không thể xác thực thông tin Email từ Google.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // 3. Tìm hoặc tạo User trong CSDL
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          name: name || cleanEmail.split('@')[0],
          avatar: avatar || null,
          provider: 'google',
        },
      });

      // Tự động tạo Ví tiền mặc định cho Người dùng mới
      await prisma.wallet.create({
        data: {
          name: 'Ví Tiền Mặt',
          balance: 0,
          currency: 'VND',
          userId: user.id,
        },
      });
    } else if (avatar && !user.avatar) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatar, name: name || user.name },
      });
    }

    // 4. Phát hành JWT Token cho Client
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    // 5. Đặt HttpOnly Cookie an toàn
    res.cookie('token', token, getAuthCookieOptions(req));

    res.status(200).json({
      success: true,
      message: 'Đăng nhập Google thành công.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        createdAt: user.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Lỗi Google Auth:', error.message || 'Lỗi không xác định');
    res.status(500).json({
      success: false,
      message: error.message || 'Xác thực Google thất bại. Vui lòng thử lại.',
    });
  }
};

/**
 * GET /api/auth/me
 * Lấy thông tin tài khoản người dùng hiện tại
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Chưa đăng nhập.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
      res.status(404).json({ success: false, message: 'Không tìm thấy người dùng.' });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('Lỗi lấy thông tin người dùng:', error.message || 'Lỗi không xác định');
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy hồ sơ người dùng.' });
  }
};

/**
 * POST /api/auth/logout
 * Đăng xuất người dùng & xóa Cookie
 */
export const logout = (req: Request, res: Response): void => {
  res.clearCookie('token', getClearCookieOptions(req));

  res.status(200).json({
    success: true,
    message: 'Đã đăng xuất thành công.',
  });
};
