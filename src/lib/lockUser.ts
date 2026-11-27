import { Prisma } from '@prisma/client';

/**
 * Khóa dòng User đến hết transaction để tuần tự hóa các thao tác của cùng một người dùng
 * (xoay refresh token với đổi mật khẩu/đăng xuất mọi nơi; xóa/đổi ví mặc định).
 * NO KEY UPDATE không chặn việc thêm bản ghi con (khóa ngoại chỉ cần KEY SHARE).
 */
export async function lockUserRow(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR NO KEY UPDATE`;
}
