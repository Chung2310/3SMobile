import { api } from '@/services/api/client';
import type { JsonRecord } from '@/types/domain';

export interface WorkoutTemplateItem {
  _id: string;
  title: string;
  goal?: string;
  level?: string;
  durationDays?: number;
  muscleGroups?: string[];
  sessions?: Array<{ name: string; exercises?: unknown[] }>;
  scheduledExercises?: Array<{ name: string; dayNumber?: number; weekNumber?: number }>;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerWorkoutPlansState {
  active: JsonRecord | null;
  history: JsonRecord[];
}

/**
 * Lấy danh sách giáo án của khách hàng (gồm giáo án đang áp dụng và lịch sử)
 */
export async function fetchCustomerWorkoutPlans(customerId: string): Promise<CustomerWorkoutPlansState> {
  try {
    const result = await api.get<CustomerWorkoutPlansState>(
      `/api/customers/${encodeURIComponent(customerId)}/workout-plans`
    );
    return {
      active: result?.active || null,
      history: Array.isArray(result?.history) ? result.history : [],
    };
  } catch (error) {
    console.error('Error fetching customer workout plans:', error);
    throw error;
  }
}

/**
 * Gán giáo án mẫu cho khách hàng
 */
export async function assignCustomerWorkoutPlan(
  customerId: string,
  templateId: string
): Promise<JsonRecord> {
  return await api.post<JsonRecord>(
    `/api/customers/${encodeURIComponent(customerId)}/workout-plans/assign`,
    { templateId }
  );
}

/**
 * Lấy danh sách các giáo án mẫu của PT đang đăng nhập
 */
export async function fetchWorkoutTemplates(): Promise<WorkoutTemplateItem[]> {
  try {
    const result = await api.get<WorkoutTemplateItem[] | { data: WorkoutTemplateItem[] }>(
      '/api/workout-templates?page=1&limit=100'
    );
    if (Array.isArray(result)) return result;
    if (result && typeof result === 'object' && 'data' in result && Array.isArray((result as any).data)) {
      return (result as any).data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching workout templates:', error);
    return [];
  }
}

/**
 * Lấy chi tiết một giáo án cụ thể của khách hàng
 */
export async function fetchCustomerWorkoutPlanDetail(
  customerId: string,
  planId: string
): Promise<JsonRecord> {
  return await api.get<JsonRecord>(
    `/api/customers/${encodeURIComponent(customerId)}/workout-plans/${encodeURIComponent(planId)}`
  );
}
