export interface MacroNutrients {
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroCalories {
  proteinKcal: number;
  carbsKcal: number;
  fatKcal: number;
}

export interface MacroPercentages {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export interface CalculatedNutrition {
  formula: string;
  bmr: number;
  tdee: number;
  targetCalories: number;
  deficitOrSurplus: number;
  goal: string;
  goalLabel: string;
  macros: MacroNutrients;
  macroCalories: MacroCalories;
  macroPercentages: MacroPercentages;
  waterLiters: number;
}

export type FoodCategory = 'protein' | 'carbs' | 'fat' | 'veggies' | 'soup' | 'snack' | 'drink';

export interface FoodItem {
  id: string;
  name: string;
  category: FoodCategory;
  categoryLabel?: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  unit: string;
  defaultServingGrams: number;
  servingLabel?: string;
  prepTip?: string;
  isCustom?: boolean;
}

export type CustomFoodItem = FoodItem & {
  isCustom?: boolean;
};

export interface MealFoodEntry {
  id: string;
  foodId?: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes?: string;
  amount?: string;
  prepTip?: string;
}

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface MealBlock {
  id: string;
  type?: MealType;
  title?: string;
  name?: string;
  timeHint?: string;
  timeSlot?: string;
  items: MealFoodEntry[];
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  calories?: number;
  imageUrl?: string;
  isCompleted?: boolean;
}

export interface DayMenuPlan {
  dayNumber: number;
  date: string;
  dayOfWeek: string;
  meals: MealBlock[];
}

export interface WeekMenuPlan {
  weekNumber: number;
  name: string;
  startDate: string;
  endDate: string;
  days: DayMenuPlan[];
}

export interface DailyPlanItem {
  dayOfWeek?: string;
  dayName?: string;
  dayNumber?: number;
  date?: string;
  meals: MealBlock[];
}

export interface NutritionPlanData {
  id?: string;
  _id?: string;
  customerId: string | { _id: string; fullName: string; phone?: string; avatar?: string };
  ptId?: string | { _id: string; fullName?: string };
  title: string;
  targetCalories: number;
  macros: MacroNutrients;
  bmr?: number | null;
  tdee?: number | null;
  status: 'DRAFT' | 'PUBLISHED';
  menu?: any[];
  meals?: MealBlock[];
  dailyPlans?: DailyPlanItem[];
  notes?: string;
  startDate?: string | null;
  endDate?: string | null;
  durationDays?: number | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface NutritionLogItem {
  id?: string;
  _id?: string;
  customerId?: string;
  ptId?: string;
  loggedAt?: string;
  time?: string;
  type: 'FOOD' | 'ACTIVITY';
  mealType?: MealType;
  name: string;
  calories: number;
  durationMinutes?: number;
  macros?: Partial<MacroNutrients>;
  notes?: string;
}

export interface NutritionDaySummary {
  consumedCalories: number;
  burnedCalories: number;
  netCalories: number;
  protein: number;
  carbs: number;
  fat: number;
}
