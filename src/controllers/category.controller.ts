import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler.middleware';
import { ensureSystemCategoriesExist } from '../services/category.helper';

/**
 * GET /api/categories
 * Lấy danh sách danh mục (Hệ thống + Danh mục tùy chỉnh của user)
 */
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;

  await ensureSystemCategoriesExist();

  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { isSystem: true },
        { userId: userId || null },
      ],
    },
    orderBy: [
      { isSystem: 'desc' },
      { name: 'asc' },
    ],
  });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
};

/**
 * POST /api/categories
 * Tạo danh mục tùy chỉnh cho người dùng
 */
export const createCategory = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const { name, type = 'EXPENSE', icon = 'Tag', color = '#0F766E' } = req.body;

  if (!name || String(name).trim() === '') {
    throw new AppError('Tên danh mục không được để trống.', 400, 'INVALID_CATEGORY_NAME');
  }

  const cleanName = String(name).trim();

  // Kiểm tra trùng tên danh mục
  const existing = await prisma.category.findFirst({
    where: {
      userId,
      name: cleanName,
      type,
    },
  });

  if (existing) {
    throw new AppError('Danh mục này đã tồn tại trong tài khoản của bạn.', 400, 'CATEGORY_ALREADY_EXISTS');
  }

  const newCategory = await prisma.category.create({
    data: {
      name: cleanName,
      type,
      icon,
      color,
      isSystem: false,
      userId,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Tạo danh mục mới thành công.',
    data: newCategory,
  });
};

/**
 * DELETE /api/categories/:id
 * Xóa danh mục tùy chỉnh (không được xóa danh mục hệ thống hoặc của user khác)
 */
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const categoryId = req.params.id;

  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!category) {
    throw new AppError('Danh mục không tồn tại hoặc bạn không có quyền xóa.', 404, 'CATEGORY_NOT_FOUND');
  }

  if (category.isSystem) {
    throw new AppError('Không thể xóa danh mục mặc định của hệ thống.', 400, 'CANNOT_DELETE_SYSTEM_CATEGORY');
  }

  // Chuyển các giao dịch thuộc danh mục này sang 'khac'
  await prisma.transaction.updateMany({
    where: { categoryId, userId },
    data: { categoryId: 'khac' },
  });

  await prisma.category.delete({
    where: { id: categoryId },
  });

  res.status(200).json({
    success: true,
    message: 'Đã xóa danh mục thành công.',
  });
};
