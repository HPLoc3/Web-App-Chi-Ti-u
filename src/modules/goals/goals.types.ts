export interface GoalDTO {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline?: string;
  color: string;
  icon: string;
  createdAt: string;
}

export interface CreateGoalInput {
  name: string;
  target?: number;
  targetAmount?: number;
  current?: number;
  currentAmount?: number;
  deadline?: string;
  color?: string;
  icon?: string;
}

export interface UpdateGoalInput {
  name?: string;
  target?: number;
  targetAmount?: number;
  current?: number;
  currentAmount?: number;
  deadline?: string;
  color?: string;
  icon?: string;
}
