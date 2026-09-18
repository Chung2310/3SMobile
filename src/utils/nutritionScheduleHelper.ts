import type { DayMenuPlan, MealBlock, NutritionPlanData, WeekMenuPlan } from '@/types/nutrition';

export const DAYS_OF_WEEK_VI = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

export function normalizeDayOfWeek(str?: string): string {
  if (!str) return '';
  const s = str.trim().toLowerCase();
  if (s.includes('2') || s.includes('hai') || s.includes('mon')) return 'Thứ Hai';
  if (s.includes('3') || s.includes('ba') || s.includes('tue')) return 'Thứ Ba';
  if (s.includes('4') || s.includes('tư') || s.includes('tu') || s.includes('wed')) return 'Thứ Tư';
  if (s.includes('5') || s.includes('năm') || s.includes('nam') || s.includes('thu')) return 'Thứ Năm';
  if (s.includes('6') || s.includes('sáu') || s.includes('sau') || s.includes('fri')) return 'Thứ Sáu';
  if (s.includes('7') || s.includes('bảy') || s.includes('bay') || s.includes('sat')) return 'Thứ Bảy';
  if (s.includes('nhật') || s.includes('nhat') || s.includes('cn') || s.includes('sun')) return 'Chủ Nhật';
  return str;
}

export function formatYmdDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayYmd(): string {
  return formatYmdDate(new Date());
}

export function parseDateSafe(dStr?: string | null): Date {
  if (!dStr) return new Date();
  if (dStr.includes('T')) {
    const parsed = new Date(dStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  const parts = dStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  const fallback = new Date(dStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

export function computeEndDate(startDateStr: string, durationDays: number): string {
  const start = parseDateSafe(startDateStr);
  const end = new Date(start.getTime() + Math.max(0, durationDays - 1) * 86400000);
  return formatYmdDate(end);
}

export function formatDisplayDateVi(dStr?: string | null, includeYear = true): string {
  if (!dStr) return '';
  const date = parseDateSafe(dStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

export function formatShortDay(dayOfWeek: string): string {
  const normalized = normalizeDayOfWeek(dayOfWeek);
  switch (normalized) {
    case 'Thứ Hai': return 'T2';
    case 'Thứ Ba': return 'T3';
    case 'Thứ Tư': return 'T4';
    case 'Thứ Năm': return 'T5';
    case 'Thứ Sáu': return 'T6';
    case 'Thứ Bảy': return 'T7';
    case 'Chủ Nhật': return 'CN';
    default: return dayOfWeek.slice(0, 3);
  }
}

/**
 * Standardize meal item properties (handling both Web and Mobile naming conventions)
 */
export function normalizeMealBlock(rawMeal: any, fallbackIdx = 0): MealBlock {
  const id = rawMeal.id || `meal_${Date.now()}_${fallbackIdx}_${Math.random().toString(36).substring(2, 6)}`;
  const title = rawMeal.title || rawMeal.name || `Bữa ${fallbackIdx + 1}`;
  const timeHint = rawMeal.timeHint || rawMeal.timeSlot || '';
  const items = Array.isArray(rawMeal.items) ? rawMeal.items.map((it: any, itIdx: number) => ({
    id: it.id || `food_${itIdx}_${Math.random().toString(36).substring(2, 6)}`,
    name: it.name || 'Món ăn',
    grams: Number(it.grams) || 0,
    amount: it.amount || (it.grams ? `${it.grams}g` : ''),
    calories: Number(it.calories) || 0,
    protein: Number(it.protein) || 0,
    carbs: Number(it.carbs) || 0,
    fat: Number(it.fat) || 0,
    notes: it.notes || it.prepTip || '',
    prepTip: it.prepTip || it.notes || '',
  })) : [];

  const totalCalories = Number(rawMeal.totalCalories) || Number(rawMeal.calories) || Math.round(items.reduce((s: number, i: any) => s + (i.calories || 0), 0));
  const totalProtein = Number(rawMeal.totalProtein) || Math.round(items.reduce((s: number, i: any) => s + (i.protein || 0), 0) * 10) / 10;
  const totalCarbs = Number(rawMeal.totalCarbs) || Math.round(items.reduce((s: number, i: any) => s + (i.carbs || 0), 0) * 10) / 10;
  const totalFat = Number(rawMeal.totalFat) || Math.round(items.reduce((s: number, i: any) => s + (i.fat || 0), 0) * 10) / 10;

  return {
    id,
    type: rawMeal.type || 'LUNCH',
    title,
    name: title,
    timeHint,
    timeSlot: timeHint,
    items,
    totalCalories,
    calories: totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    imageUrl: rawMeal.imageUrl,
    isCompleted: Boolean(rawMeal.isCompleted),
  };
}

/**
 * Standard default meals for a day (Breakfast, Lunch, Snack, Dinner)
 */
export function createDefaultDayMeals(prefix = 'meal'): MealBlock[] {
  const timestamp = Date.now();
  return [
    {
      id: `${prefix}_bf_${timestamp}`,
      type: 'BREAKFAST',
      title: 'Bữa sáng',
      name: 'Bữa sáng',
      timeHint: '07:00 - 08:00',
      timeSlot: '07:00 - 08:00',
      items: [],
      totalCalories: 0,
      calories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    },
    {
      id: `${prefix}_lu_${timestamp}`,
      type: 'LUNCH',
      title: 'Bữa trưa',
      name: 'Bữa trưa',
      timeHint: '12:00 - 13:00',
      timeSlot: '12:00 - 13:00',
      items: [],
      totalCalories: 0,
      calories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    },
    {
      id: `${prefix}_sn_${timestamp}`,
      type: 'SNACK',
      title: 'Bữa xế',
      name: 'Bữa xế',
      timeHint: '15:30 - 16:30',
      timeSlot: '15:30 - 16:30',
      items: [],
      totalCalories: 0,
      calories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    },
    {
      id: `${prefix}_di_${timestamp}`,
      type: 'DINNER',
      title: 'Bữa tối',
      name: 'Bữa tối',
      timeHint: '18:30 - 19:30',
      timeSlot: '18:30 - 19:30',
      items: [],
      totalCalories: 0,
      calories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    },
  ];
}

/**
 * Builds schedule of weeks (matching Web MealPlannerBuilder logic)
 */
export function buildWeeksSchedule(
  startStr: string,
  totalDays: number,
  baseMeals: MealBlock[] = [],
  existingWeeks?: WeekMenuPlan[]
): WeekMenuPlan[] {
  const baseDate = parseDateSafe(startStr);
  const clampedDays = Math.max(1, Math.min(31, totalDays));
  const numWeeks = Math.max(1, Math.ceil(clampedDays / 7));
  const resultWeeks: WeekMenuPlan[] = [];

  for (let w = 0; w < numWeeks; w++) {
    const startDayIdx = w * 7;
    const endDayIdx = Math.min(clampedDays - 1, (w + 1) * 7 - 1);

    const wStartD = new Date(baseDate.getTime() + startDayIdx * 86400000);
    const wEndD = new Date(baseDate.getTime() + endDayIdx * 86400000);

    const days: DayMenuPlan[] = [];
    for (let dIdx = startDayIdx; dIdx <= endDayIdx; dIdx++) {
      const curD = new Date(baseDate.getTime() + dIdx * 86400000);
      const dateYmd = formatYmdDate(curD);
      const dayOfWeek = DAYS_OF_WEEK_VI[curD.getDay()];

      let dayMeals: MealBlock[] = [];
      const existingDay = existingWeeks?.[w]?.days?.find(
        (ed) => ed.dayNumber === dIdx + 1 || ed.date === dateYmd
      );

      if (existingDay && existingDay.meals && existingDay.meals.length > 0) {
        dayMeals = existingDay.meals.map((m, mIdx) => normalizeMealBlock(m, mIdx));
      } else if (baseMeals.length > 0) {
        dayMeals = baseMeals.map((m, mIdx) => ({
          ...normalizeMealBlock(m, mIdx),
          id: `meal_w${w + 1}_d${dIdx + 1}_${mIdx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          items: Array.isArray(m.items) ? m.items.map((it) => ({ ...it })) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeals(`meal_w${w + 1}_d${dIdx + 1}`);
      }

      days.push({
        dayNumber: dIdx + 1,
        date: dateYmd,
        dayOfWeek,
        meals: dayMeals,
      });
    }

    resultWeeks.push({
      weekNumber: w + 1,
      name: `Tuần ${w + 1}`,
      startDate: formatYmdDate(wStartD),
      endDate: formatYmdDate(wEndD),
      days,
    });
  }

  return resultWeeks;
}

/**
 * Normalizes any NutritionPlanData into a standard WeekMenuPlan[]
 * Handles:
 * 1. Web Hierarchical: plan.menu is WeekMenuPlan[]
 * 2. Mobile DailyPlans: plan.dailyPlans is DailyPlanItem[]
 * 3. Flat menu: plan.menu is MealBlock[]
 */
export function normalizePlanToWeeks(plan?: NutritionPlanData | null): WeekMenuPlan[] {
  if (!plan) return [];

  const rawMenu = plan.menu;
  const isHierarchical = Array.isArray(rawMenu) && rawMenu.length > 0 && Boolean((rawMenu[0] as any)?.days);

  // Determine durationDays: default to 30 days (1 month) matching Web behavior
  let effectiveDuration = 30;
  if (plan.durationDays && plan.durationDays > 0) {
    effectiveDuration = Math.max(1, Math.min(31, plan.durationDays));
  } else if (plan.startDate && plan.endDate) {
    const diff = Math.round((new Date(plan.endDate).getTime() - new Date(plan.startDate).getTime()) / 86400000) + 1;
    if (diff > 0) effectiveDuration = Math.max(1, Math.min(31, diff));
  }

  const startDate = plan.startDate ? formatYmdDate(parseDateSafe(plan.startDate)) : getTodayYmd();
  const baseDate = parseDateSafe(startDate);

  // Case 1: Web Hierarchical Menu (Weeks with Days)
  if (isHierarchical) {
    return (rawMenu as any[]).map((w: any, wIdx: number) => ({
      weekNumber: Number(w.weekNumber) || wIdx + 1,
      name: w.name || `Tuần ${wIdx + 1}`,
      startDate: w.startDate || '',
      endDate: w.endDate || '',
      days: Array.isArray(w.days)
        ? w.days.map((d: any, dIdx: number) => ({
            dayNumber: Number(d.dayNumber) || dIdx + 1,
            date: d.date || '',
            dayOfWeek: d.dayOfWeek || `Ngày ${dIdx + 1}`,
            meals:
              Array.isArray(d.meals) && d.meals.length > 0
                ? d.meals.map((m: any, mIdx: number) => normalizeMealBlock(m, mIdx))
                : createDefaultDayMeals(`meal_w${wIdx + 1}_d${dIdx + 1}`),
          }))
        : [],
    }));
  }

  // Case 2: DailyPlans list (loop across full month of weeks)
  if (Array.isArray(plan.dailyPlans) && plan.dailyPlans.length > 0) {
    const numWeeks = Math.max(1, Math.ceil(effectiveDuration / 7));
    const weeks: WeekMenuPlan[] = [];

    for (let w = 0; w < numWeeks; w++) {
      const startDayIdx = w * 7;
      const endDayIdx = Math.min(effectiveDuration - 1, (w + 1) * 7 - 1);
      const wStart = new Date(baseDate.getTime() + startDayIdx * 86400000);
      const wEnd = new Date(baseDate.getTime() + endDayIdx * 86400000);

      const days: DayMenuPlan[] = [];
      for (let dIdx = startDayIdx; dIdx <= endDayIdx; dIdx++) {
        const dp = plan.dailyPlans[dIdx % plan.dailyPlans.length];
        const curD = new Date(baseDate.getTime() + dIdx * 86400000);
        days.push({
          dayNumber: dIdx + 1,
          date: dp.date || formatYmdDate(curD),
          dayOfWeek: dp.dayOfWeek || DAYS_OF_WEEK_VI[curD.getDay()] || `Ngày ${dIdx + 1}`,
          meals:
            Array.isArray(dp.meals) && dp.meals.length > 0
              ? dp.meals.map((m: any, mIdx: number) => normalizeMealBlock(m, mIdx))
              : createDefaultDayMeals(`meal_w${w + 1}_d${dIdx + 1}`),
        });
      }

      weeks.push({
        weekNumber: w + 1,
        name: `Tuần ${w + 1}`,
        startDate: formatYmdDate(wStart),
        endDate: formatYmdDate(wEnd),
        days,
      });
    }

    return weeks;
  }

  // Case 3: Flat menu or fallback meals
  const flatMeals: MealBlock[] = Array.isArray(plan.menu)
    ? (plan.menu as any[]).map((m, idx) => normalizeMealBlock(m, idx))
    : Array.isArray(plan.meals)
    ? (plan.meals as any[]).map((m, idx) => normalizeMealBlock(m, idx))
    : [];

  return buildWeeksSchedule(startDate, effectiveDuration, flatMeals);
}

/**
 * Finds the week and day that matches today's date, or returns the first day
 */
export function findCurrentWeekAndDay(weeks: WeekMenuPlan[]): { weekIdx: number; dayIdx: number } {
  if (!weeks || weeks.length === 0) return { weekIdx: 0, dayIdx: 0 };
  const todayYmd = getTodayYmd();

  for (let wIdx = 0; wIdx < weeks.length; wIdx++) {
    const week = weeks[wIdx];
    const dayIdx = week.days.findIndex((d) => d.date === todayYmd);
    if (dayIdx !== -1) {
      return { weekIdx: wIdx, dayIdx };
    }
  }

  return { weekIdx: 0, dayIdx: 0 };
}
