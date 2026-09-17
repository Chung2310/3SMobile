import { api } from './api/client';
import type {
  CalculatedNutrition,
  NutritionDaySummary,
  NutritionLogItem,
  NutritionPlanData,
} from '@/types/nutrition';

export interface CalculateMacroParams {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: 'MALE' | 'FEMALE';
  activityFactor: number; // 1.2 (ít), 1.375 (nhẹ), 1.55 (vừa), 1.725 (nặng)
  goal: 'FAT_LOSS' | 'MAINTAIN' | 'MUSCLE_GAIN';
}

/**
 * Thuật toán tính BMR & TDEE theo công thức Mifflin-St Jeor chuẩn quốc tế
 */
export function computeBmrAndMacros({
  weightKg,
  heightCm,
  age,
  sex,
  activityFactor,
  goal,
}: CalculateMacroParams): CalculatedNutrition {
  // 1. Mifflin-St Jeor BMR
  const baseBmr =
    10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'MALE' ? 5 : -161);
  const bmr = Math.round(baseBmr);

  // 2. TDEE
  const tdee = Math.round(bmr * activityFactor);

  // 3. Điều chỉnh Calo theo mục tiêu
  let targetCalories = tdee;
  let deficitOrSurplus = 0;
  let goalLabel = 'Duy trì cân nặng & Tái tạo vóc dáng';

  if (goal === 'FAT_LOSS') {
    deficitOrSurplus = -450;
    targetCalories = Math.max(1200, tdee - 450);
    goalLabel = 'Giảm mỡ thâm hụt an toàn (-450 kcal)';
  } else if (goal === 'MUSCLE_GAIN') {
    deficitOrSurplus = 350;
    targetCalories = tdee + 350;
    goalLabel = 'Tăng cơ nạc thặng dư (+350 kcal)';
  }

  // 4. Phân bổ Macro tỉ lệ chuẩn thể hình
  // Protein: 2.0g - 2.2g / kg trọng lượng
  const proteinG = Math.round(weightKg * (goal === 'FAT_LOSS' ? 2.2 : 2.0));
  const proteinKcal = proteinG * 4;

  // Fat: 22-25% tổng calories nạp
  const fatKcal = Math.round(targetCalories * 0.25);
  const fatG = Math.round(fatKcal / 9);

  // Carbs: Lượng calo còn lại chia 4
  const carbsKcal = Math.max(0, targetCalories - proteinKcal - fatKcal);
  const carbsG = Math.round(carbsKcal / 4);

  const totalCal = proteinKcal + carbsKcal + fatKcal || targetCalories;

  return {
    formula: 'Mifflin-St Jeor',
    bmr,
    tdee,
    targetCalories,
    deficitOrSurplus,
    goal,
    goalLabel,
    macros: {
      protein: proteinG,
      carbs: carbsG,
      fat: fatG,
    },
    macroCalories: {
      proteinKcal,
      carbsKcal,
      fatKcal,
    },
    macroPercentages: {
      proteinPct: Math.round((proteinKcal / totalCal) * 100),
      carbsPct: Math.round((carbsKcal / totalCal) * 100),
      fatPct: Math.round((fatKcal / totalCal) * 100),
    },
    waterLiters: Math.round((weightKg * 0.04) * 10) / 10,
  };
}

export const nutritionService = {
  /**
   * Lấy danh sách thực đơn (có thể lọc theo customerId, hỗ trợ phân trang/limit)
   */
  async getPlans(customerId?: string, limit: number = 100): Promise<NutritionPlanData[]> {
    const params = new URLSearchParams();
    if (customerId) params.set('customerId', customerId);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await api.get<any>(`/api/nutrition-plans${qs}`);
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.data?.items)) return res.data.items;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  },

  /**
   * Lấy chi tiết một thực đơn
   */
  async getPlanById(id: string): Promise<NutritionPlanData> {
    const res = await api.get<any>(`/api/nutrition-plans/${id}`);
    return res?.data || res;
  },

  /**
   * Công bố thực đơn cho học viên (PUBLISHED)
   */
  async publishPlan(id: string): Promise<NutritionPlanData> {
    const res = await api.patch<any>(`/api/nutrition-plans/${id}/publish`);
    return res?.data || res;
  },

  /**
   * Thu hồi thực đơn về bản nháp (DRAFT)
   */
  async unpublishPlan(id: string): Promise<NutritionPlanData> {
    const res = await api.patch<any>(`/api/nutrition-plans/${id}/unpublish`);
    return res?.data || res;
  },

  /**
   * Tạo đề xuất thực đơn dinh dưỡng tự động bằng AI (Gemini / DeepSeek)
   */
  async generateAiNutritionDraft(
    customerId: string,
    request: string,
    planId?: string
  ): Promise<NutritionPlanData> {
    const res = await api.post<any>('/api/content-drafts/nutrition', {
      customerId,
      request,
      planId,
    });
    const data = res?.data || res;
    const rawDailyPlans = Array.isArray(data.dailyPlans) ? data.dailyPlans : [];
    const normalizedDailyPlans = rawDailyPlans.map((dp: any, dpIdx: number) => {
      const dayMeals = Array.isArray(dp.meals) ? dp.meals : [];
      return {
        dayOfWeek: dp.dayOfWeek || dp.dayName || `Ngày ${dpIdx + 1}`,
        dayNumber: dpIdx + 1,
        meals: dayMeals.map((m: any, idx: number) => {
          const mItems = Array.isArray(m.items) ? m.items : [];
          const mCal =
            Number(m.calories) ||
            mItems.reduce((s: number, i: any) => s + (Number(i.calories) || 0), 0) ||
            0;
          const mP =
            Number(m.protein) ||
            mItems.reduce((s: number, i: any) => s + (Number(i.protein) || 0), 0) ||
            0;
          const mC =
            Number(m.carbs) ||
            mItems.reduce((s: number, i: any) => s + (Number(i.carbs) || 0), 0) ||
            0;
          const mF =
            Number(m.fat) ||
            mItems.reduce((s: number, i: any) => s + (Number(i.fat) || 0), 0) ||
            0;

          return {
            id: m.id || `meal_${dpIdx}_${idx}`,
            type: (m.type || ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'][idx] || 'SNACK') as any,
            title: m.name || m.title || `Bữa ${idx + 1}`,
            timeHint: m.timeSlot || m.timeHint || '',
            calories: mCal,
            totalCalories: mCal,
            totalProtein: mP,
            totalCarbs: mC,
            totalFat: mF,
            items: mItems.map((it: any, itIdx: number) => ({
              id: it.id || `dish-${dpIdx}-${idx}-${itIdx}`,
              name: typeof it === 'string' ? it : it.name || 'Món ăn',
              amount: it.amount || '100g',
              grams: Number(it.grams) || 100,
              calories: Number(it.calories) || 0,
              protein: Number(it.protein) || 0,
              carbs: Number(it.carbs) || 0,
              fat: Number(it.fat) || 0,
              prepTip: it.prepTip || '',
              notes: it.notes || it.prepTip || '',
            })),
          };
        }),
      };
    });

    const menu: any[] =
      normalizedDailyPlans[0]?.meals ||
      (Array.isArray(data.menu) ? data.menu : []);

    return {
      id: data._id || data.id,
      customerId,
      title: data.title || 'Thực Đơn Dinh Dưỡng AI',
      targetCalories: Number(data.targetCalories) || 1800,
      macros: {
        protein: Number(data.macros?.protein) || 130,
        carbs: Number(data.macros?.carbs) || 180,
        fat: Number(data.macros?.fat) || 50,
      },
      status: 'DRAFT',
      notes: data.notes || data.advice || '',
      menu,
      dailyPlans: normalizedDailyPlans.length > 0 ? normalizedDailyPlans : undefined,
    };
  },

  /**
   * Tạo thực đơn dinh dưỡng mới
   */
  async createPlan(payload: Partial<NutritionPlanData>): Promise<NutritionPlanData> {
    const { status, ...body } = payload;
    const res = await api.post<any>('/api/nutrition-plans', body);
    const created: NutritionPlanData = res?.data || res;
    const createdId = created?._id || created?.id;
    if (status === 'PUBLISHED' && createdId) {
      try {
        return await this.publishPlan(createdId);
      } catch {
        return created;
      }
    }
    return created;
  },

  /**
   * Cập nhật thực đơn
   */
  async updatePlan(
    id: string,
    payload: Partial<NutritionPlanData>
  ): Promise<NutritionPlanData> {
    const { status, ...body } = payload;
    let result: NutritionPlanData;
    if (Object.keys(body).length > 0) {
      const res = await api.patch<any>(`/api/nutrition-plans/${id}`, body);
      result = res?.data || res;
    } else {
      result = await this.getPlanById(id);
    }

    if (status === 'PUBLISHED') {
      result = await this.publishPlan(id);
    } else if (status === 'DRAFT') {
      result = await this.unpublishPlan(id);
    }

    return result;
  },

  /**
   * Xóa thực đơn
   */
  async deletePlan(id: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/api/nutrition-plans/${id}`);
  },

  /**
   * Lấy nhật ký ăn uống & vận động của học viên
   */
  async getLogs(customerId: string, date?: string): Promise<{ logs: NutritionLogItem[]; summary: NutritionDaySummary }> {
    const qs = `?customerId=${encodeURIComponent(customerId)}${date ? `&from=${date}&to=${date}` : ''}&limit=50`;
    try {
      const res = await api.get<any>(`/api/nutrition/logs${qs}`);
      const rawLogs: NutritionLogItem[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.items)
        ? res.items
        : [];
      const summary: NutritionDaySummary = res?.summary || {
        consumedCalories: 0,
        burnedCalories: 0,
        netCalories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };

      // Tự tính tổng nếu backend không trả summary
      if (!res?.summary && rawLogs.length > 0) {
        let consumed = 0;
        let burned = 0;
        let p = 0;
        let c = 0;
        let f = 0;
        rawLogs.forEach((l) => {
          if (l.type === 'FOOD') {
            consumed += l.calories || 0;
            p += l.macros?.protein || 0;
            c += l.macros?.carbs || 0;
            f += l.macros?.fat || 0;
          } else if (l.type === 'ACTIVITY') {
            burned += l.calories || 0;
          }
        });
        summary.consumedCalories = consumed;
        summary.burnedCalories = burned;
        summary.netCalories = consumed - burned;
        summary.protein = Math.round(p);
        summary.carbs = Math.round(c);
        summary.fat = Math.round(f);
      }

      return { logs: rawLogs, summary };
    } catch {
      return {
        logs: [],
        summary: {
          consumedCalories: 0,
          burnedCalories: 0,
          netCalories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      };
    }
  },

  /**
   * Tạo nhật ký ăn uống hoặc vận động
   */
  async createLog(payload: Partial<NutritionLogItem>): Promise<NutritionLogItem> {
    const body: Record<string, any> = {
      customerId: payload.customerId,
      loggedAt: (payload as any).loggedAt || payload.time || new Date().toISOString(),
      type: payload.type || 'FOOD',
      name: payload.name,
      calories: payload.calories,
      notes: payload.notes || '',
    };
    if (payload.macros) {
      body.macros = payload.macros;
    }
    if (payload.type === 'ACTIVITY') {
      body.durationMinutes = (payload as any).durationMinutes || 30;
    }
    const res = await api.post<any>('/api/nutrition/logs', body);
    return res?.data || res;
  },

  /**
   * Cập nhật nhật ký ăn uống hoặc vận động (Update)
   */
  async updateLog(id: string, payload: Partial<NutritionLogItem>): Promise<NutritionLogItem> {
    const body: Record<string, any> = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.calories !== undefined) body.calories = payload.calories;
    if (payload.notes !== undefined) body.notes = payload.notes;
    if (payload.macros !== undefined) body.macros = payload.macros;
    if (payload.time !== undefined) body.loggedAt = payload.time;
    if ((payload as any).loggedAt !== undefined) body.loggedAt = (payload as any).loggedAt;
    if (payload.type !== undefined) body.type = payload.type;
    if ((payload as any).durationMinutes !== undefined) body.durationMinutes = (payload as any).durationMinutes;
    const res = await api.patch<any>(`/api/nutrition/logs/${id}`, body);
    return res?.data || res;
  },

  /**
   * Xóa nhật ký
   */
  async deleteLog(id: string): Promise<void> {
    return api.delete<void>(`/api/nutrition/logs/${id}`);
  },
};

