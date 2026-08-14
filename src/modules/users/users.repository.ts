import { prisma } from '../../lib/prisma';
import { User } from '@prisma/client';

export class UsersRepository {
  static async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  static async update(id: string, data: Partial<Pick<User, 'name' | 'avatar' | 'password'>>): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }
}
