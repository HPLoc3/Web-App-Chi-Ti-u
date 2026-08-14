export interface CategoryDTO {
  id: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  isSystem: boolean;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryInput {
  name: string;
  type?: 'EXPENSE' | 'INCOME';
  icon?: string;
  color?: string;
}
