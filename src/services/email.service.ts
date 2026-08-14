import { Logger } from '../utils/logger';

/**
 * Abstraction EmailService cho việc gửi email thông báo, xác nhận, và đặt lại mật khẩu.
 * Đảm bảo che giấu thông tin nhạy cảm (sensitive data exposure protection).
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  /**
   * Gửi email chung
   */
  static async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const { to, subject } = options;

    if (process.env.NODE_ENV !== 'production') {
      Logger.info(`📧 [EMAIL SERVICE - OUTGOING] To: ${to} | Subject: ${subject}`);
    }

    return true;
  }

  /**
   * Gửi email liên kết đặt lại mật khẩu (Password Reset)
   */
  static async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userName?: string | null
  ): Promise<boolean> {
    const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${appUrl}/?action=reset-password&token=${resetToken}`;
    const displayName = userName || to.split('@')[0];

    const subject = '🔒 [Sổ Tay Chi Tiêu] Yêu cầu đặt lại mật khẩu';
    
    const text = `Xin chào ${displayName},\n\n` +
      `Bạn vừa gửi yêu cầu đặt lại mật khẩu cho tài khoản Sổ Tay Chi Tiêu.\n` +
      `Mã token đặt lại mật khẩu của bạn là: ${resetToken}\n\n` +
      `Hoặc truy cập đường dẫn sau để tạo mật khẩu mới (có hiệu lực trong 1 giờ):\n` +
      `${resetUrl}\n\n` +
      `Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Mật khẩu của bạn vẫn an toàn.\n\n` +
      `Trân trọng,\nĐội ngũ Sổ Tay Chi Tiêu Thông Minh`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #fcfbf9;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #064e3b; margin: 0;">SỔ TAY CHI TIÊU THÔNG MINH</h2>
          <p style="color: #666; font-size: 14px; margin-top: 4px;">Khôi phục quyền truy cập tài khoản</p>
        </div>
        <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #eee;">
          <p style="color: #333; font-size: 16px;">Xin chào <strong>${displayName}</strong>,</p>
          <p style="color: #555; font-size: 14px; line-height: 1.6;">
            Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng bấm vào nút bên dưới để tiến hành thiết lập mật khẩu mới (liên kết có hiệu lực trong 60 phút):
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="color: #888; font-size: 12px; margin-top: 24px; border-top: 1px dashed #eee; padding-top: 16px;">
            Nếu nút bấm trên không hoạt động, bạn có thể nhập thủ công mã Token sau vào ứng dụng:
            <br/><code style="background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace; display: inline-block; margin-top: 6px; color: #111;">${resetToken}</code>
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
          <p>Nếu bạn không yêu cầu hành động này, vui lòng bỏ qua email này.</p>
        </div>
      </div>
    `;

    // Gửi email
    await this.sendEmail({ to, subject, html, text });

    if (process.env.NODE_ENV !== 'production') {
      Logger.info(`[DEV ONLY] Link đặt lại mật khẩu cho ${to}: ${resetUrl}`);
    }

    return true;
  }
}
