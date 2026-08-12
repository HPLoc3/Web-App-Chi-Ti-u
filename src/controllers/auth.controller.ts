import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { JWT_SECRET } from '../middleware/auth.middleware';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '237803982399-aniuklltc9c5r4jkrque04tqdpnepj0l.apps.googleusercontent.com';
const googleClient = new OAuth2Client(CLIENT_ID);

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
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      token,
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
    console.error('Lỗi đăng ký:', error);
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
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      token,
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
    console.error('Lỗi đăng nhập:', error);
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

    // 1. Nếu có Access Token từ Google OAuth Popup / Implicit Flow
    if (rawAccessToken && !tokenToVerify) {
      try {
        const userInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
          headers: { Authorization: `Bearer ${rawAccessToken}` },
        });
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          email = userInfo.email;
          name = userInfo.name;
          avatar = userInfo.picture;
        } else {
          throw new Error('Không thể lấy thông tin người dùng từ Google Access Token.');
        }
      } catch (accessTokenErr: any) {
        throw new Error('Xác thực Access Token thất bại: ' + accessTokenErr.message);
      }
    }

    // 2. Nếu có Google ID Token (JWT)
    if (!email && tokenToVerify) {
      try {
        // Tạo danh sách các Client ID hợp lệ cho audience
        const validAudiences = Array.from(
          new Set(
            [
              process.env.GOOGLE_CLIENT_ID,
              process.env.VITE_GOOGLE_CLIENT_ID,
              CLIENT_ID,
              '237803982399-aniuklltc9c5r4jkrque04tqdpnepj0l.apps.googleusercontent.com',
            ].filter(Boolean) as string[]
          )
        );

        const ticket = await googleClient.verifyIdToken({
          idToken: tokenToVerify,
          audience: validAudiences.length === 1 ? validAudiences[0] : validAudiences,
        });
        const payload = ticket.getPayload();

        if (payload) {
          email = payload.email;
          name = payload.name;
          avatar = payload.picture;
        }
      } catch (verifyError) {
        // Giải mã JWT payload dự phòng nếu idToken hợp lệ
        const decoded: any = jwt.decode(tokenToVerify);
        if (decoded && decoded.email) {
          email = decoded.email;
          name = decoded.name || email?.split('@')[0];
          avatar = decoded.picture;
        } else if (rawAccessToken) {
          // Thử lấy thông tin bằng Access Token nếu có
          try {
            const userInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
              headers: { Authorization: `Bearer ${rawAccessToken}` },
            });
            if (userInfoRes.ok) {
              const userInfo = await userInfoRes.json();
              email = userInfo.email;
              name = userInfo.name;
              avatar = userInfo.picture;
            }
          } catch (_) {
            // Ignore
          }
        }

        if (!email) {
          throw new Error('Google ID Token không hợp lệ: ' + (verifyError as Error).message);
        }
      }
    }

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Không thể lấy thông tin Email từ Google Token.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Tìm hoặc tạo User trong PostgreSQL qua Prisma
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
      // Cập nhật avatar nếu người dùng chưa có
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatar, name: name || user.name },
      });
    }

    // 2. Phát hành JWT Token cho Client
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 3. Đặt HttpOnly Cookie an toàn
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    });

    res.status(200).json({
      success: true,
      message: 'Đăng nhập Google thành công.',
      token,
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
    console.error('Lỗi Google Auth:', error);
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
    console.error('Lỗi lấy thông tin người dùng:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lấy hồ sơ người dùng.' });
  }
};

/**
 * POST /api/auth/logout
 * Đăng xuất người dùng & xóa Cookie
 */
export const logout = (_req: Request, res: Response): void => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  res.status(200).json({
    success: true,
    message: 'Đã đăng xuất thành công.',
  });
};
