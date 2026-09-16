import { api } from '@/services/api/client';

export type GoalType =
  | 'WEIGHT_LOSS'
  | 'FAT_LOSS'
  | 'WEIGHT_GAIN'
  | 'MUSCLE_GAIN'
  | 'RECOMPOSITION'
  | 'FITNESS';

export type GoalStatus = 'DRAFT' | 'PUBLISHED';

export interface GoalItem {
  _id: string;
  id?: string;
  customerId: string;
  ptId?: string;
  type: GoalType;
  title: string;
  targetValue?: number | null;
  targetUnit?: string;
  deadline: string;
  sessionsPerWeek: number;
  cardioNotes?: string;
  evaluationNotes?: string;
  status: GoalStatus;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGoalPayload {
  customerId: string;
  type: GoalType;
  title: string;
  targetValue?: number | null;
  targetUnit?: string;
  deadline: string;
  sessionsPerWeek?: number;
  cardioNotes?: string;
  evaluationNotes?: string;
  status?: GoalStatus;
}

export const GOAL_TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'FAT_LOSS', label: 'Giảm mỡ' },
  { value: 'WEIGHT_LOSS', label: 'Giảm cân' },
  { value: 'WEIGHT_GAIN', label: 'Tăng cân' },
  { value: 'MUSCLE_GAIN', label: 'Tăng cơ' },
  { value: 'RECOMPOSITION', label: 'Tái cấu trúc cơ thể' },
  { value: 'FITNESS', label: 'Thể lực' },
];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  FAT_LOSS: 'Giảm mỡ',
  WEIGHT_LOSS: 'Giảm cân',
  WEIGHT_GAIN: 'Tăng cân',
  MUSCLE_GAIN: 'Tăng cơ',
  RECOMPOSITION: 'Tái cấu trúc cơ thể',
  FITNESS: 'Thể lực',
};

export async function fetchCustomerGoals(customerId: string): Promise<GoalItem[]> {
  try {
    const res = await api.get<any>(`/api/goals?customerId=${customerId}`);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.items)) return res.items;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
  } catch {
    return [];
  }
}

export async function createGoal(payload: CreateGoalPayload): Promise<GoalItem> {
  const res = await api.post<any>('/api/goals', payload);
  return (res && res.data) ? res.data : res;
}

export async function updateGoal(id: string, payload: Partial<CreateGoalPayload>): Promise<GoalItem> {
  const res = await api.patch<any>(`/api/goals/${id}`, payload);
  return (res && res.data) ? res.data : res;
}

export async function deleteGoal(id: string): Promise<void> {
  await api.delete(`/api/goals/${id}`);
}

export async function publishGoal(id: string): Promise<GoalItem> {
  const res = await api.patch<any>(`/api/goals/${id}/publish`, {});
  return (res && res.data) ? res.data : res;
}

export async function unpublishGoal(id: string): Promise<GoalItem> {
  const res = await api.patch<any>(`/api/goals/${id}/unpublish`, {});
  return (res && res.data) ? res.data : res;
}
