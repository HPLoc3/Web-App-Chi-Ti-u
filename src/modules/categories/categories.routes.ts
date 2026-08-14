import { Router } from 'express';
import { CategoriesController } from './categories.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createCategorySchema } from './categories.schema';

const router = Router();

// GET /api/v1/categories (Optional auth to get user categories as well)
router.get('/', authMiddleware, CategoriesController.getCategories);

// POST /api/v1/categories
router.post(
  '/',
  authMiddleware,
  validateRequest(createCategorySchema, 'body'),
  CategoriesController.createCategory
);

// DELETE /api/v1/categories/:id
router.delete('/:id', authMiddleware, CategoriesController.deleteCategory);

export default router;
