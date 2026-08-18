import { prisma } from '../../lib/prisma';
import { User, RefreshToken, Session, PasswordResetToken, Prisma } from '@prisma/client';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';

export class AuthRepository {
  static async findUserByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.findUserByEmail(email);
      }
      throw error;
    }
  }

  static async findUserById(id: string): Promise<User | null> {
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

  static async createUser(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await prisma.user.create({
        data,
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.createUser(data);
      }
      throw error;
    }
  }

  static async updateUserPassword(userId: string, passwordHash: string): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { password: passwordHash },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.updateUserPassword(userId, passwordHash);
      }
      throw error;
    }
  }

  static async createTokensAndSession(
    userId: string,
    hashedRefreshToken: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
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
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        devFallbackStore.createTokensAndSession(userId, hashedRefreshToken, expiresAt, userAgent, ipAddress);
        return;
      }
      throw error;
    }
  }

  static async findRefreshToken(hashedToken: string): Promise<RefreshToken | null> {
    try {
      return await prisma.refreshToken.findUnique({
        where: { token: hashedToken },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.findRefreshToken(hashedToken);
      }
      throw error;
    }
  }

  static async revokeRefreshToken(id: string): Promise<void> {
    try {
      await prisma.refreshToken.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        devFallbackStore.revokeRefreshToken(id);
        return;
      }
      throw error;
    }
  }

  static async revokeAllUserTokensAndSessions(userId: string): Promise<void> {
    try {
      await prisma.$transaction([
        prisma.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        prisma.session.deleteMany({
          where: { userId },
        }),
      ]);
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        devFallbackStore.revokeAllUserTokensAndSessions(userId);
        return;
      }
      throw error;
    }
  }

  static async deleteSessionByToken(hashedToken: string): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: { sessionToken: hashedToken },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return;
      }
      throw error;
    }
  }

  static async createResetToken(userId: string, hashedToken: string, expiresAt: Date): Promise<PasswordResetToken> {
    try {
      return await prisma.passwordResetToken.create({
        data: {
          token: hashedToken,
          userId,
          expiresAt,
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return {
          id: `dev-rst-${Date.now()}`,
          token: hashedToken,
          userId,
          expiresAt,
          usedAt: null,
          createdAt: new Date(),
        };
      }
      throw error;
    }
  }

  static async findValidResetToken(hashedToken: string): Promise<PasswordResetToken | null> {
    try {
      return await prisma.passwordResetToken.findFirst({
        where: {
          token: hashedToken,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return null;
      }
      throw error;
    }
  }

  static async markResetTokenUsed(tokenId: string): Promise<void> {
    try {
      await prisma.passwordResetToken.update({
        where: { id: tokenId },
        data: { usedAt: new Date() },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return;
      }
      throw error;
    }
  }

  static async invalidateAllUserResetTokens(userId: string): Promise<void> {
    try {
      await prisma.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return;
      }
      throw error;
    }
  }
}

