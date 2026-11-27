// Quy tắc mật khẩu dùng chung cho server và client (hàm thuần, không phụ thuộc thư viện).
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Trả về null nếu mật khẩu hợp lệ, ngược lại trả thông báo lỗi tiếng Việt. */
export function validatePassword(pw: string): string | null {
  if (pw.length < PASSWORD_MIN_LENGTH) {
    return 'Mật khẩu phải có ít nhất 8 ký tự';
  }
  if (pw.length > PASSWORD_MAX_LENGTH) {
    return 'Mật khẩu không được vượt quá 128 ký tự';
  }
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    return 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số';
  }
  return null;
}
