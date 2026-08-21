import { prisma } from '../../lib/prisma';
import { User } from '@prisma/client';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';

export class UsersRepository {
  static async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.findUserById(id);
      }
      throw error;
    }
  }

  static async update(id: string, data: Partial<Pick<User, 'name' | 'avatar' | 'password'>>): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.updateUser(id, data);
      }
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        devFallbackStore.deleteUser(id);
        return;
      }
      throw error;
    }
  }
}
