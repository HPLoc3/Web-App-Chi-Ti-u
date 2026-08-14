export interface UserProfileDTO {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserProfileInput {
  name?: string;
  avatar?: string;
}

export interface ChangePasswordInput {
  currentPassword?: string;
  newPassword?: string;
}
