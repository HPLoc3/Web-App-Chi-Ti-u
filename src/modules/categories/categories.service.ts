import { CategoriesRepository } from './categories.repository';
import { CategoryDTO, CreateCategoryInput } from './categories.types';
import { ensureSystemCategoriesExist } from '../../services/category.helper';
import { AppError } from '../../middleware/errorHandler.middleware';

export class CategoriesService {
  private static formatCategory(c: any): CategoryDTO {
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      icon: c.icon,
      color: c.color,
      isSystem: c.isSystem,
      userId: c.userId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  static async getCategories(userId?: string): Promise<CategoryDTO[]> {
    await ensureSystemCategoriesExist();
    const categories = await CategoriesRepository.findAccessibleCategories(userId);
    return categories.map(this.formatCategory);
  }

  static async createCategory(userId: string, input: CreateCategoryInput): Promise<CategoryDTO> {
    const cleanName = input.name.trim();
    const type = input.type || 'EXPENSE';

    const existing = await CategoriesRepository.findUserCategoryByName(userId, cleanName, type);
    if (existing) {
      throw new AppError('Danh mục này đã tồn tại trong tài khoản của bạn.', 400, 'CATEGORY_ALREADY_EXISTS');
    }

    const category = await CategoriesRepository.create({
      name: cleanName,
      type,
      icon: input.icon || 'Tag',
      color: input.color || '#0F766E',
      isSystem: false,
      user: { connect: { id: userId } },
    });

    return this.formatCategory(category);
  }

  static async deleteCategory(id: string, userId: string): Promise<void> {
    const category = await CategoriesRepository.findByIdAndUserId(id, userId);
    if (!category) {
      throw new AppError('Danh mục không tồn tại hoặc bạn không có quyền xóa.', 404, 'CATEGORY_NOT_FOUND');
    }

    if (category.isSystem) {
      throw new AppError('Không thể xóa danh mục mặc định của hệ thống.', 400, 'CANNOT_DELETE_SYSTEM_CATEGORY');
    }

    await CategoriesRepository.delete(id, userId);
  }
}
