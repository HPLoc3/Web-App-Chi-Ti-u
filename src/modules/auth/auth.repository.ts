import { prisma } from '../../lib/prisma';
import { User, RefreshToken, Session, PasswordResetToken, Prisma } from '@prisma/client';

export class AuthRepository {
  static async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  static async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  static async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  static async updateUserPassword(userId: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });
  }

  static async createTokensAndSession(
    userId: string,
    hashedRefreshToken: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          token: hashedRefreshToken,
          userId,
          expiresAt,
        },
      }),
      prisma.session.create({
        data: {
          sessionToken: hashedRefreshToken,
          userId,
          userAgent: userAgent || null,
          ipAddress: ipAddress || null,
          expiresAt,
        },
      }),
    ]);
  }

  static async findRefreshToken(hashedToken: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({
      where: { token: hashedToken },
    });
  }

  static async revokeRefreshToken(id: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  static async revokeAllUserTokensAndSessions(userId: string): Promise<void> {
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

  static async deleteSessionByToken(hashedToken: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { sessionToken: hashedToken },
    });
  }

  static async createResetToken(userId: string, hashedToken: string, expiresAt: Date): Promise<PasswordResetToken> {
    return prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt,
      },
    });
  }

  static async findValidResetToken(hashedToken: string): Promise<PasswordResetToken | null> {
    return prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  static async markResetTokenUsed(tokenId: string): Promise<void> {
    await prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  static async invalidateAllUserResetTokens(userId: string): Promise<void> {
    await prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }
}
