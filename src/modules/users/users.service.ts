import bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository';
import { UserProfileDTO, UpdateUserProfileInput, ChangePasswordInput } from './users.types';
import { AppError } from '../../middleware/errorHandler.middleware';

export class UsersService {
  static async getProfile(userId: string): Promise<UserProfileDTO> {
    const user = await UsersRepository.findById(userId);
    if (!user) {
      throw new AppError('Người dùng không tồn tại.', 404, 'USER_NOT_FOUND');
    }
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

  static async updateProfile(userId: string, input: UpdateUserProfileInput): Promise<UserProfileDTO> {
    const user = await UsersRepository.findById(userId);
    if (!user) {
      throw new AppError('Người dùng không tồn tại.', 404, 'USER_NOT_FOUND');
    }

    const updated = await UsersRepository.update(userId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatar: updated.avatar,
      provider: updated.provider,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  static async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await UsersRepository.findById(userId);
    if (!user) {
      throw new AppError('Người dùng không tồn tại.', 404, 'USER_NOT_FOUND');
    }

    if (!user.password) {
      throw new AppError('Tài khoản này được tạo bằng Google, không có mật khẩu.', 400, 'SOCIAL_ACCOUNT');
    }

    if (!input.currentPassword || !input.newPassword) {
      throw new AppError('Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.', 400, 'INVALID_INPUT');
    }

    const isMatch = await bcrypt.compare(input.currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Mật khẩu hiện tại không chính xác.', 400, 'INVALID_PASSWORD');
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);
    await UsersRepository.update(userId, { password: newHash });
  }

  static async deleteAccount(userId: string): Promise<void> {
    const user = await UsersRepository.findById(userId);
    if (!user) {
      throw new AppError('Người dùng không tồn tại.', 404, 'USER_NOT_FOUND');
    }

    await UsersRepository.delete(userId);
  }
}
