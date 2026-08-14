import { Router } from 'express';
import { UsersController } from './users.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { updateProfileSchema, changePasswordSchema } from './users.schema';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/users/profile
router.get('/profile', UsersController.getProfile);

// PUT /api/v1/users/profile
router.put(
  '/profile',
  validateRequest(updateProfileSchema, 'body'),
  UsersController.updateProfile
);

// POST /api/v1/users/change-password
router.post(
  '/change-password',
  validateRequest(changePasswordSchema, 'body'),
  UsersController.changePassword
);

// DELETE /api/v1/users/account
router.delete('/account', UsersController.deleteAccount);

export default router;
