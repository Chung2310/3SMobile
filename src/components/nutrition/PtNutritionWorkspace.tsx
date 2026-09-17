import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Activity,
  ArrowLeftRight,
  Calculator,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  Flame,
  Lightbulb,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
  Users,
  Utensils,
  X,
} from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import type { CustomerProfile } from '@/types/domain';
import type {
  CalculatedNutrition,
  FoodCategory,
  FoodItem,
  MacroNutrients,
  MealBlock,
  NutritionDaySummary,
  NutritionLogItem,
  NutritionPlanData,
} from '@/types/nutrition';
import { fetchCustomersList } from '@/services/customerService';
import { nutritionService } from '@/services/nutritionService';
import {
  FOOD_CATEGORY_LABELS,
  VIETNAMESE_FOOD_DATABASE,
  getAllCombinedFoods,
  deleteCustomFood,
  resetCustomFoods,
  subscribeToFoodDatabaseUpdates,
} from '@/services/foodDatabase';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import { AppAlertModal, useAppAlert } from '../AppAlertModal';
import { CustomerSelectModal } from '../CustomerSelectModal';
import { PaginationBar } from '../PaginationBar';
import { MealPlannerModal } from './MealPlannerModal';
import { NutritionLogModal } from './NutritionLogModal';
import { PlanDetailViewModal } from './PlanDetailViewModal';
import { AiNutritionDraftModal } from './AiNutritionDraftModal';
import { FoodItemEditorModal } from './FoodItemEditorModal';
import { ActivityEditorModal } from './ActivityEditorModal';
import {
  ACTIVITY_CATEGORY_COLORS,
  ACTIVITY_CATEGORY_LABELS,
  DEFAULT_ACTIVITIES,
  deleteCustomActivity,
  getAllCombinedActivities,
  resetCustomActivities,
  subscribeToActivityDatabaseUpdates,
  type ActivityCategory,
  type ActivityItem,
} from '@/services/activityDatabase';

export type NutritionWorkspaceTab =
  | 'macro_calculator'
  | 'meal_swapper'
  | 'meal_manager'
  | 'activity_library'
  | 'logs_balance';

const WORKSPACE_TABS: { id: NutritionWorkspaceTab; label: string; icon: any }[] = [
  { id: 'macro_calculator', label: 'Tính Macro', icon: Calculator },
  { id: 'meal_swapper', label: 'Thực đơn', icon: Sparkles },
  { id: 'meal_manager', label: 'Kho món', icon: Utensils },
  { id: 'activity_library', label: 'Vận động', icon: Activity },
  { id: 'logs_balance', label: 'Calo In/Out', icon: TrendingUp },
];

const MACRO_COLORS = {
  protein: '#2563EB',
  carbs: '#059669',
  fat: '#D97706',
};

const STATUS_FILTERS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'PUBLISHED', label: 'Đang dùng' },
  { id: 'DRAFT', label: 'Bản nháp' },
] as const;

const ACTIVITY_CATEGORIES: { id: string; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'custom', label: 'Tự thêm' },
  { id: 'STRENGTH', label: 'Tập tạ / Gym' },
  { id: 'CARDIO', label: 'Cardio / Chạy / Bơi' },
  { id: 'MARTIAL_ARTS', label: 'Võ thuật' },
  { id: 'SPORTS', label: 'Thể thao' },
  { id: 'RECOVERY', label: 'Phục hồi' },
];


/**
 * Clean, lightweight Macro Summary Panel for a meal plan or macro calculator
 * Replaces heavy nested cards with a sleek, unified, readable design
 */
function PlanMacroPanel({
  targetCalories,
  macros,
  totalMeals,
  totalDishes,
}: {
  targetCalories: number;
  macros: MacroNutrients;
  totalMeals?: number;
  totalDishes?: number;
}) {
  const pG = macros?.protein || 0;
  const cG = macros?.carbs || 0;
  const fG = macros?.fat || 0;

  const pKcal = Math.round(pG * 4);
  const cKcal = Math.round(cG * 4);
  const fKcal = Math.round(fG * 9);
  const totalKcal = pKcal + cKcal + fKcal || targetCalories || 2000;

  const proteinPct = Math.round((pKcal / totalKcal) * 100);
  const carbsPct = Math.round((cKcal / totalKcal) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  return (
    <View style={styles.planNutriBox}>
      {/* Top row: Target Calories & Meals count */}
      <View style={styles.planNutriHeaderRow}>
        <View style={styles.planNutriCalWrap}>
          <Flame size={16} color="#EA580C" />
          <Text style={styles.planNutriCalValue}>{targetCalories}</Text>
          <Text style={styles.planNutriCalUnit}>kcal / ngày</Text>
        </View>

        {totalMeals != null && (
          <View style={styles.planNutriMealChip}>
            <Utensils size={11} color={colors.primary} />
            <Text style={styles.planNutriMealChipText}>
              {totalMeals} bữa ăn{totalDishes != null && totalDishes > 0 ? ` • ${totalDishes} món` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Modern 3-Segment Continuous Macro Bar */}
      <View style={styles.planSegmentBar}>
        <View style={[styles.planSegmentBarItem, { width: `${proteinPct}%`, backgroundColor: '#2563EB' }]} />
        <View style={[styles.planSegmentBarItem, { width: `${carbsPct}%`, backgroundColor: '#F59E0B' }]} />
        <View style={[styles.planSegmentBarItem, { width: `${fatPct}%`, backgroundColor: '#EF4444' }]} />
      </View>

      {/* 3 Macro Columns: Clean, airy, zero text collision */}
      <View style={styles.planMacroColRow}>
        {/* Đạm */}
        <View style={styles.planMacroCol}>
          <View style={styles.planMacroLabelRow}>
            <View style={[styles.planMacroDot, { backgroundColor: '#2563EB' }]} />
            <Text style={styles.planMacroLabel}>ĐẠM (P)</Text>
          </View>
          <Text style={[styles.planMacroVal, { color: '#1E40AF' }]}>
            {pG}<Text style={styles.planMacroUnit}>g</Text>
          </Text>
          <Text style={styles.planMacroSub}>{pKcal} kcal • {proteinPct}%</Text>
        </View>

        <View style={styles.planMacroDivider} />

        {/* Carb */}
        <View style={styles.planMacroCol}>
          <View style={styles.planMacroLabelRow}>
            <View style={[styles.planMacroDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.planMacroLabel}>CARB (C)</Text>
          </View>
          <Text style={[styles.planMacroVal, { color: '#B45309' }]}>
            {cG}<Text style={styles.planMacroUnit}>g</Text>
          </Text>
          <Text style={styles.planMacroSub}>{cKcal} kcal • {carbsPct}%</Text>
        </View>

        <View style={styles.planMacroDivider} />

        {/* Béo */}
        <View style={styles.planMacroCol}>
          <View style={styles.planMacroLabelRow}>
            <View style={[styles.planMacroDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.planMacroLabel}>BÉO (F)</Text>
          </View>
          <Text style={[styles.planMacroVal, { color: '#DC2626' }]}>
            {fG}<Text style={styles.planMacroUnit}>g</Text>
          </Text>
          <Text style={styles.planMacroSub}>{fKcal} kcal • {fatPct}%</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Helper to separate title from body if notes starts with a header line (e.g. "Lời khuyên dinh dưỡng, chế biến và thời điểm uống nước:")
 */
function parseAdviceNotes(rawNotes: string) {
  const trimmed = (rawNotes || '').trim();
  if (!trimmed) return { title: 'Lời khuyên dinh dưỡng từ PT', body: '' };

  const lines = trimmed.split('\n');
  const firstLine = lines[0].trim();

  // If first line acts as a header (ends with ':' or starts with common advice prefixes)
  const isHeaderLike =
    firstLine.endsWith(':') ||
    firstLine.startsWith('Lời khuyên') ||
    firstLine.startsWith('Lưu ý') ||
    firstLine.startsWith('Hướng dẫn');

  if (isHeaderLike && lines.length > 1) {
    const cleanTitle = firstLine.replace(/^[💡ℹ️✨]\s*/, '').replace(/:$/, '');
    const restBody = lines.slice(1).join('\n').trim();
    return {
      title: cleanTitle || 'Lời khuyên dinh dưỡng',
      body: restBody,
    };
  }

  if (isHeaderLike && lines.length === 1) {
    const cleanTitle = firstLine.replace(/^[💡ℹ️✨]\s*/, '').replace(/:$/, '');
    return {
      title: cleanTitle || 'Lời khuyên dinh dưỡng',
      body: '',
    };
  }

  return {
    title: 'Lời khuyên & Lưu ý dinh dưỡng',
    body: trimmed,
  };
}

/**
 * Collapsible Advice / Notes box that can expand / collapse smoothly on tap
 */
function PlanNotesCollapsible({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const { title, body } = useMemo(() => parseAdviceNotes(notes), [notes]);
  const displayText = body || title;
  const isLong = displayText.length > 55 || displayText.includes('\n');

  return (
    <Pressable
      style={[styles.planNotesBox, expanded && styles.planNotesBoxExpanded]}
      onPress={() => isLong && setExpanded((prev) => !prev)}
      android_ripple={{ color: 'rgba(59, 130, 246, 0.08)' }}
    >
      <View style={styles.planNotesHeader}>
        <View style={styles.planNotesTitleRow}>
          <Lightbulb size={13} color="#d97706" />
          <Text style={styles.planNotesTitle} numberOfLines={expanded ? undefined : 1}>
            {title}
          </Text>
        </View>

        {isLong && (
          <View style={[styles.expandPill, expanded && styles.expandPillExpanded]}>
            <Text style={[styles.expandPillText, expanded && styles.expandPillTextExpanded]}>
              {expanded ? 'Thu gọn' : 'Xem thêm'}
            </Text>
            <ChevronDown
              size={12}
              color={expanded ? '#2563EB' : colors.primary}
              style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
            />
          </View>
        )}
      </View>

      {body ? (
        <Text
          style={[styles.planNotesText, expanded && styles.planNotesTextExpanded]}
          numberOfLines={expanded ? undefined : 2}
        >
          {body}
        </Text>
      ) : null}

      {expanded && isLong && (
        <View style={styles.planNotesBottomAction}>
          <Text style={styles.planNotesBottomActionText}>Chạm để thu gọn ▴</Text>
        </View>
      )}
    </Pressable>
  );
}

export function PtNutritionWorkspace() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { alertConfig, showAlert, showSuccess, showError, showConfirm } = useAppAlert();

  // Active Tab
  const [activeTab, setActiveTab] = useState<NutritionWorkspaceTab>('macro_calculator');

  // Customer State
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerModalVisible, setCustomerModalVisible] = useState(false);

  // Plans State (Domain: Tab 2)
  const [plans, setPlans] = useState<NutritionPlanData[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [selectedPlanForDetail, setSelectedPlanForDetail] = useState<NutritionPlanData | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [plannerModalVisible, setPlannerModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<NutritionPlanData | null>(null);
  const [initialCalculated, setInitialCalculated] = useState<CalculatedNutrition | null>(null);
  const [aiDraftModalVisible, setAiDraftModalVisible] = useState(false);

  // Delete Plan State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<NutritionPlanData | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Logs & Balance State (Domain: Tab 5)
  const [logs, setLogs] = useState<NutritionLogItem[]>([]);
  const [summary, setSummary] = useState<NutritionDaySummary>({
    consumedCalories: 0,
    burnedCalories: 0,
    netCalories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [logModalVisible, setLogModalVisible] = useState(false);

  // Macro Calculator Form State (Domain: Tab 1)
  const [macroGender, setMacroGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [macroAge, setMacroAge] = useState<string>('25');
  const [macroWeight, setMacroWeight] = useState<string>('70');
  const [macroHeight, setMacroHeight] = useState<string>('172');
  const [macroActivity, setMacroActivity] = useState<number>(1.375);
  const [macroGoal, setMacroGoal] = useState<
    'FAT_LOSS_FAST' | 'FAT_LOSS_STANDARD' | 'MAINTAIN' | 'LEAN_BULK' | 'BULK'
  >('FAT_LOSS_STANDARD');

  // Food Library State & Detail Modal (Domain: Tab 3)
  const [foodSearch, setFoodSearch] = useState('');
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<FoodCategory | 'all' | 'custom'>('all');
  const [foodSortBy, setFoodSortBy] = useState<'name' | 'calories_desc' | 'calories_asc' | 'protein_desc'>('name');
  const [inspectedFood, setInspectedFood] = useState<FoodItem | null>(null);
  const [foodEditorVisible, setFoodEditorVisible] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [foodDbVersion, setFoodDbVersion] = useState(0);

  // Đăng ký lắng nghe các thay đổi trong kho món (thêm / sửa / xóa / reset)
  useEffect(() => {
    const unsub = subscribeToFoodDatabaseUpdates(() => {
      setFoodDbVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  // Activity Library State (Domain: Tab 4)
  const [allActivities, setAllActivities] = useState<ActivityItem[]>(DEFAULT_ACTIVITIES);
  const [activityDbVersion, setActivityDbVersion] = useState(0);
  const [activitySearch, setActivitySearch] = useState('');
  const [selectedActivityCategory, setSelectedActivityCategory] = useState<string>('ALL');
  const [activitySortBy, setActivitySortBy] = useState<'name' | 'met_desc' | 'met_asc' | 'duration_desc'>('name');
  const [focusedActivity, setFocusedActivity] = useState<ActivityItem | null>(null);
  const [activityEditorVisible, setActivityEditorVisible] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [activityWeight, setActivityWeight] = useState<string>('70');
  const [activityDuration, setActivityDuration] = useState<string>('45');
  const [savingActivityId, setSavingActivityId] = useState<string | null>(null);

  // Tab 5: Nhật ký Calo In / Out State
  const [editingLog, setEditingLog] = useState<NutritionLogItem | null>(null);
  const [logFilterType, setLogFilterType] = useState<'ALL' | 'FOOD' | 'ACTIVITY'>('ALL');

  // Đăng ký lắng nghe các thay đổi trong kho vận động
  useEffect(() => {
    const unsub = subscribeToActivityDatabaseUpdates(() => {
      setActivityDbVersion((v) => v + 1);
    });
    return unsub;
  }, []);

  // Tải danh sách hoạt động khi version thay đổi
  useEffect(() => {
    getAllCombinedActivities().then((acts) => {
      setAllActivities(acts);
      if (acts.length > 0) {
        setFocusedActivity((prev) => {
          if (!prev) return acts[0];
          const found = acts.find((a) => a.id === prev.id);
          return found || acts[0];
        });
      }
    });
  }, [activityDbVersion]);


  const selectedCustomer = useMemo(
    () => customers.find((c) => (c._id || (c as any).id) === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  // Auto-fill macro and activity inputs when selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer) {
      if (selectedCustomer.gender) {
        setMacroGender(selectedCustomer.gender === 'FEMALE' ? 'FEMALE' : 'MALE');
      }
      if (selectedCustomer.initialWeight) {
        setMacroWeight(String(selectedCustomer.initialWeight));
        setActivityWeight(String(selectedCustomer.initialWeight));
      }
      if (selectedCustomer.height) {
        setMacroHeight(String(selectedCustomer.height));
      }
      if (selectedCustomer.initialGoal) {
        const g = selectedCustomer.initialGoal.toLowerCase();
        if (g.includes('giảm')) setMacroGoal('FAT_LOSS_STANDARD');
        else if (g.includes('tăng')) setMacroGoal('LEAN_BULK');
        else setMacroGoal('MAINTAIN');
      }
    }
  }, [selectedCustomer]);

  // Load Customers
  const loadCustomers = useCallback(async () => {
    try {
      const list = await fetchCustomersList({ limit: 100 });
      setCustomers(list);
    } catch {
      // ignore
    }
  }, []);

  // Load Plans & Logs for selected customer
  const loadCustomerNutrition = useCallback(async (customerId?: string) => {
    try {
      setLoading(true);
      const [plansData, logsData] = await Promise.all([
        nutritionService.getPlans(customerId || undefined),
        customerId
          ? nutritionService.getLogs(customerId)
          : Promise.resolve({
              logs: [],
              summary: {
                consumedCalories: 0,
                burnedCalories: 0,
                netCalories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
              },
            }),
      ]);
      setPlans(plansData);
      setLogs(logsData.logs);
      setSummary(logsData.summary);
    } catch (err) {
      console.error('Lỗi tải dữ liệu dinh dưỡng:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadCustomerNutrition(selectedCustomerId);
  }, [selectedCustomerId, loadCustomerNutrition]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      loadCustomers(),
      loadCustomerNutrition(selectedCustomerId),
    ]).finally(() => setRefreshing(false));
  }, [selectedCustomerId, loadCustomerNutrition, loadCustomers]);

  // Pagination constants & states
  const PLANS_PER_PAGE = 4;
  const FOODS_PER_PAGE = 8;
  const [planPage, setPlanPage] = useState(1);
  const [foodPage, setFoodPage] = useState(1);

  // Auto-reset pagination when filters or customer selection change
  useEffect(() => {
    setPlanPage(1);
  }, [statusFilter, selectedCustomerId]);

  useEffect(() => {
    setFoodPage(1);
  }, [foodSearch, selectedFoodCategory]);

  // Filtered & Paginated Plans (Tab 2)
  const filteredPlans = useMemo(() => {
    if (statusFilter === 'ALL') return plans;
    return plans.filter((p) => p.status === statusFilter);
  }, [plans, statusFilter]);

  const totalPlanPages = Math.ceil(filteredPlans.length / PLANS_PER_PAGE) || 1;
  const safePlanPage = Math.min(Math.max(1, planPage), totalPlanPages);
  const paginatedPlans = useMemo(() => {
    const start = (safePlanPage - 1) * PLANS_PER_PAGE;
    return filteredPlans.slice(start, start + PLANS_PER_PAGE);
  }, [filteredPlans, safePlanPage]);

  // Compute BMR & Macro live (Tab 1)
  const calculatedNutrition: CalculatedNutrition = useMemo(() => {
    const weight = parseFloat(macroWeight) || 70;
    const height = parseFloat(macroHeight) || 170;
    const age = parseFloat(macroAge) || 25;
    const factor = macroActivity || 1.375;

    // 1. BMR Mifflin-St Jeor
    const bmr = Math.round(
      10 * weight + 6.25 * height - 5 * age + (macroGender === 'MALE' ? 5 : -161)
    );

    // 2. TDEE
    const tdee = Math.round(bmr * factor);

    // 3. Goal Adjustment
    let targetCalories = tdee;
    let deficitOrSurplus = 0;
    let goalLabel = 'Duy trì vóc dáng';

    if (macroGoal === 'FAT_LOSS_FAST') {
      deficitOrSurplus = Math.round(-tdee * 0.2);
      targetCalories = Math.max(1200, tdee + deficitOrSurplus);
      goalLabel = 'Giảm mỡ nhanh (-20%)';
    } else if (macroGoal === 'FAT_LOSS_STANDARD') {
      deficitOrSurplus = Math.round(-tdee * 0.15);
      targetCalories = Math.max(1200, tdee + deficitOrSurplus);
      goalLabel = 'Giảm mỡ chuẩn (-15%)';
    } else if (macroGoal === 'LEAN_BULK') {
      deficitOrSurplus = Math.round(tdee * 0.1);
      targetCalories = tdee + deficitOrSurplus;
      goalLabel = 'Tăng cơ nạc (+10%)';
    } else if (macroGoal === 'BULK') {
      deficitOrSurplus = Math.round(tdee * 0.15);
      targetCalories = tdee + deficitOrSurplus;
      goalLabel = 'Xả cơ tăng cân (+15%)';
    }

    // 4. Protein: 2.0 - 2.2g/kg
    const proteinG = Math.round(weight * (macroGoal.startsWith('FAT_LOSS') ? 2.2 : 2.0));
    const proteinKcal = proteinG * 4;

    // Fat: 25% target calories
    const fatKcal = Math.round(targetCalories * 0.25);
    const fatG = Math.round(fatKcal / 9);

    // Carbs: remaining
    const carbsKcal = Math.max(0, targetCalories - proteinKcal - fatKcal);
    const carbsG = Math.round(carbsKcal / 4);

    const totalCal = proteinKcal + carbsKcal + fatKcal || targetCalories;

    return {
      formula: 'Mifflin-St Jeor',
      bmr,
      tdee,
      targetCalories,
      deficitOrSurplus,
      goal: macroGoal,
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
      waterLiters: Math.round(weight * 0.04 * 10) / 10,
    };
  }, [macroWeight, macroHeight, macroAge, macroGender, macroActivity, macroGoal]);

  // Tab 1 Action: Handoff calculated macro to Tab 2 Plan Builder
  const handleApplyMacroToPlan = () => {
    setInitialCalculated(calculatedNutrition);
    setEditingPlan(null);
    setActiveTab('meal_swapper');
    setPlannerModalVisible(true);
  };

  // Tab 2 Actions: Plan Management
  const handleOpenNewPlan = () => {
    if (!selectedCustomer) {
      showAlert({
        type: 'info',
        title: 'Chọn học viên',
        message: 'Vui lòng chọn học viên trước khi lập thực đơn.',
        confirmLabel: 'Chọn học viên',
        cancelLabel: 'Đóng',
        onConfirm: () => setCustomerModalVisible(true),
      });
      return;
    }
    setEditingPlan(null);
    setInitialCalculated(null);
    setPlannerModalVisible(true);
  };

  const handleEditPlan = (plan: NutritionPlanData) => {
    setEditingPlan(plan);
    setInitialCalculated(null);
    setPlannerModalVisible(true);
  };

  const handleViewDetailPlan = (plan: NutritionPlanData) => {
    setSelectedPlanForDetail(plan);
    setDetailModalVisible(true);
  };

  const handleTogglePlanStatus = async (plan: NutritionPlanData) => {
    const planId = plan._id || plan.id;
    if (!planId) return;
    const newStatus = plan.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      const updated = await nutritionService.updatePlan(planId, { status: newStatus });
      setPlans((prev) => prev.map((p) => ((p._id || p.id) === planId ? updated : p)));
    } catch {
      showError('Không thể cập nhật trạng thái thực đơn.', 'Lỗi');
    }
  };

  const handlePromptDelete = (plan: NutritionPlanData) => {
    setDeletingPlan(plan);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingPlan) return;
    const planId = deletingPlan._id || deletingPlan.id;
    if (!planId) return;
    try {
      setDeleting(true);
      await nutritionService.deletePlan(planId);
      setPlans((prev) => prev.filter((p) => (p._id || p.id) !== planId));
      setDeleteModalVisible(false);
      setDeletingPlan(null);
    } catch {
      showError('Không thể xóa thực đơn này.', 'Lỗi');
    } finally {
      setDeleting(false);
    }
  };

  // Tab 3 Action: Quản lý kho món ăn (Thêm / Sửa / Xóa / Khôi phục)
  const handleOpenCreateFood = () => {
    setEditingFood(null);
    setFoodEditorVisible(true);
  };

  const handleOpenEditFood = (food: FoodItem) => {
    setEditingFood(food);
    setFoodEditorVisible(true);
  };

  const handleDeleteFood = (food: FoodItem) => {
    showConfirm(
      'Xác nhận xóa món',
      `Bạn có chắc chắn muốn xóa món "${food.name}" khỏi kho dữ liệu?`,
      async () => {
        await deleteCustomFood(food.id);
        if (inspectedFood?.id === food.id) {
          setInspectedFood(null);
        }
      },
      { confirmLabel: 'Xóa', cancelLabel: 'Hủy', type: 'error' }
    );
  };

  const handleResetFoods = () => {
    showConfirm(
      'Khôi phục kho món ăn',
      'Bạn có chắc muốn khôi phục kho món ăn về danh sách chuẩn ban đầu của 3S Gym?',
      async () => {
        await resetCustomFoods();
        setInspectedFood(null);
      },
      { confirmLabel: 'Khôi phục', cancelLabel: 'Hủy', type: 'warning' }
    );
  };

  // Tab 4 Action: Activity Logging
  const handleLogActivity = async (activity: ActivityItem) => {
    if (!selectedCustomerId) {
      showAlert({
        type: 'info',
        title: 'Chọn học viên',
        message: 'Vui lòng chọn học viên trước khi ghi nhật ký vận động.',
        confirmLabel: 'Chọn học viên',
        cancelLabel: 'Đóng',
        onConfirm: () => setCustomerModalVisible(true),
      });
      return;
    }

    const weight = parseFloat(activityWeight) || 70;
    const duration = parseFloat(activityDuration) || activity.defaultDurationMinutes;
    const burned = Math.round(((activity.met * 3.5 * weight) / 200) * duration);

    try {
      setSavingActivityId(activity.id);
      await nutritionService.createLog({
        customerId: selectedCustomerId,
        type: 'ACTIVITY',
        name: activity.name,
        calories: burned,
        durationMinutes: duration,
        notes: `MET ${activity.met} • ${duration}p (${weight}kg)`,
      });
      await loadCustomerNutrition(selectedCustomerId);
      showSuccess(`-${burned} kcal cho ${activity.name}`, 'Đã ghi nhận');
    } catch {
      showError('Không thể ghi nhận nhật ký vận động.', 'Lỗi');
    } finally {
      setSavingActivityId(null);
    }
  };

  // Tab 4 Actions: CRUD Activities
  const handleOpenCreateActivity = () => {
    setEditingActivity(null);
    setActivityEditorVisible(true);
  };

  const handleOpenEditActivity = (activity: ActivityItem) => {
    setEditingActivity(activity);
    setActivityEditorVisible(true);
  };

  const handleDeleteActivity = (activity: ActivityItem) => {
    showConfirm(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa bộ môn "${activity.name}" khỏi kho vận động?`,
      async () => {
        await deleteCustomActivity(activity.id);
        if (focusedActivity?.id === activity.id) {
          setFocusedActivity(null);
        }
      },
      { confirmLabel: 'Xóa', cancelLabel: 'Hủy', type: 'error' }
    );
  };

  const handleResetActivities = () => {
    showConfirm(
      'Khôi phục danh mục chuẩn',
      'Bạn có muốn khôi phục toàn bộ danh sách bộ môn vận động chuẩn của 3S Gym?',
      async () => {
        await resetCustomActivities();
      },
      { confirmLabel: 'Khôi phục', cancelLabel: 'Hủy', type: 'warning' }
    );
  };

  // Tab 5 Actions: Daily Log Management (CRUD Logs)
  const handleOpenCreateLog = () => {
    if (!selectedCustomer) {
      showAlert({
        type: 'info',
        title: 'Chọn học viên',
        message: 'Vui lòng chọn học viên trước khi ghi nhật ký.',
        confirmLabel: 'Chọn học viên',
        cancelLabel: 'Đóng',
        onConfirm: () => setCustomerModalVisible(true),
      });
      return;
    }
    setEditingLog(null);
    setLogModalVisible(true);
  };

  const handleOpenEditLog = (log: NutritionLogItem) => {
    setEditingLog(log);
    setLogModalVisible(true);
  };

  const handleDeleteLog = async (logId: string) => {
    showConfirm(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa bản ghi này?',
      async () => {
        try {
          await nutritionService.deleteLog(logId);
          if (selectedCustomerId) {
            loadCustomerNutrition(selectedCustomerId);
          }
        } catch {
          showError('Không thể xóa nhật ký.', 'Lỗi');
        }
      },
      { confirmLabel: 'Xóa', cancelLabel: 'Hủy', type: 'error' }
    );
  };

  // Food Library Quick Metrics (Tab 3)
  const allFoodsList = useMemo(() => getAllCombinedFoods(), [foodDbVersion]);
  const countAll = allFoodsList.length;
  const countCustom = allFoodsList.filter((f) => f.isCustom).length;
  const countProtein = allFoodsList.filter((f) => f.category === 'protein').length;
  const countCarbs = allFoodsList.filter((f) => f.category === 'carbs').length;
  const countVeggies = allFoodsList.filter((f) => f.category === 'veggies').length;
  const countFat = allFoodsList.filter((f) => f.category === 'fat').length;

  // Filtered Food Library (Tab 3)
  const filteredFoods = useMemo(() => {
    let result = getAllCombinedFoods();
    if (selectedFoodCategory === 'custom') {
      result = result.filter((f) => f.isCustom);
    } else if (selectedFoodCategory !== 'all') {
      result = result.filter((f) => f.category === selectedFoodCategory);
    }
    if (foodSearch.trim()) {
      const q = foodSearch.trim().toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.categoryLabel && f.categoryLabel.toLowerCase().includes(q)) ||
          (f.prepTip && f.prepTip.toLowerCase().includes(q))
      );
    }

    // Sắp xếp
    result = [...result].sort((a, b) => {
      if (foodSortBy === 'calories_desc') return b.caloriesPer100g - a.caloriesPer100g;
      if (foodSortBy === 'calories_asc') return a.caloriesPer100g - b.caloriesPer100g;
      if (foodSortBy === 'protein_desc') return b.proteinPer100g - a.proteinPer100g;
      return a.name.localeCompare(b.name, 'vi');
    });

    return result;
  }, [foodSearch, selectedFoodCategory, foodSortBy, foodDbVersion]);

  const totalFoodPages = Math.ceil(filteredFoods.length / FOODS_PER_PAGE) || 1;
  const safeFoodPage = Math.min(Math.max(1, foodPage), totalFoodPages);
  const paginatedFoods = useMemo(() => {
    const start = (safeFoodPage - 1) * FOODS_PER_PAGE;
    return filteredFoods.slice(start, start + FOODS_PER_PAGE);
  }, [filteredFoods, safeFoodPage]);

  // Activity Library Quick Metrics (Tab 4)
  const countAllAct = allActivities.length;
  const countCustomAct = allActivities.filter((a) => a.isCustom).length;
  const countStrength = allActivities.filter((a) => a.category === 'STRENGTH').length;
  const countCardio = allActivities.filter((a) => a.category === 'CARDIO').length;
  const countMartial = allActivities.filter((a) => a.category === 'MARTIAL_ARTS').length;
  const countSports = allActivities.filter((a) => a.category === 'SPORTS').length;
  const countRecovery = allActivities.filter((a) => a.category === 'RECOVERY').length;

  // Filtered Activities (Tab 4)
  const filteredActivities = useMemo(() => {
    let result = allActivities;
    if (selectedActivityCategory === 'custom') {
      result = result.filter((a) => a.isCustom);
    } else if (selectedActivityCategory !== 'ALL') {
      result = result.filter((a) => a.category === selectedActivityCategory);
    }
    if (activitySearch.trim()) {
      const q = activitySearch.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.categoryLabel.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      if (activitySortBy === 'met_desc') return b.met - a.met;
      if (activitySortBy === 'met_asc') return a.met - b.met;
      if (activitySortBy === 'duration_desc') return b.defaultDurationMinutes - a.defaultDurationMinutes;
      return a.name.localeCompare(b.name, 'vi');
    });

    return result;
  }, [allActivities, selectedActivityCategory, activitySearch, activitySortBy]);

  // Filtered Logs for Tab 5
  const filteredLogs = useMemo(() => {
    if (logFilterType === 'FOOD') return logs.filter((l) => l.type === 'FOOD');
    if (logFilterType === 'ACTIVITY') return logs.filter((l) => l.type === 'ACTIVITY');
    return logs;
  }, [logs, logFilterType]);

  const inLogsCount = useMemo(() => logs.filter((l) => l.type === 'FOOD').length, [logs]);
  const outLogsCount = useMemo(() => logs.filter((l) => l.type === 'ACTIVITY').length, [logs]);


  return (
    <View style={styles.container}>
      {/* 1. TOP CUSTOMER HEADER */}
      <View style={styles.topCustomerBar}>
        <Pressable
          style={styles.customerBriefRow}
          onPress={() => setCustomerModalVisible(true)}
        >
          <View style={styles.avatarMini}>
            {selectedCustomer ? (
              <Text style={styles.avatarMiniText}>
                {selectedCustomer.fullName?.charAt(0).toUpperCase() || 'H'}
              </Text>
            ) : (
              <Users size={14} color={colors.primary} />
            )}
          </View>

          <View style={styles.customerBriefInfo}>
            <View style={styles.nameLine}>
              <Text style={styles.customerBriefName} numberOfLines={1}>
                {selectedCustomer ? selectedCustomer.fullName : 'Tất cả học viên'}
              </Text>
              {selectedCustomer && (
                <View style={styles.miniDotBadge}>
                  <Text style={styles.miniDotBadgeText}>
                    {selectedCustomer.gender === 'FEMALE' ? 'Nữ' : 'Nam'}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.customerBriefMeta} numberOfLines={1}>
              {selectedCustomer
                ? `${selectedCustomer.initialWeight ? `${selectedCustomer.initialWeight}kg` : ''}${
                    selectedCustomer.height ? ` • ${selectedCustomer.height}cm` : ''
                  }${selectedCustomer.initialGoal ? ` • ${selectedCustomer.initialGoal}` : ''}`
                : `Toàn bộ ${plans.length} thực đơn • ${customers.length} học viên`}
            </Text>
          </View>

          <View style={styles.customerBarActions}>
            <View style={styles.switchPillBtn}>
              <ArrowLeftRight size={12} color={colors.primary} />
              <Text style={styles.switchPillBtnText}>
                {selectedCustomer ? 'Đổi' : 'Chọn'}
              </Text>
            </View>
            {selectedCustomer && (
              <Pressable
                style={styles.clearMiniBtn}
                hitSlop={8}
                onPress={() => setSelectedCustomerId('')}
              >
                <X size={13} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </Pressable>
      </View>

      {/* 2. 5-TAB BAR */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {WORKSPACE_TABS.map((tab) => {
            const active = activeTab === tab.id;
            const IconComponent = tab.icon;
            return (
              <Pressable
                key={tab.id}
                style={[styles.tabPill, active && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <IconComponent
                  size={14}
                  color={active ? '#fff' : colors.textMuted}
                  strokeWidth={active ? 2.5 : 2}
                />
                <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ============================================================ */}
        {/* TAB 1: CHUYÊN BIỆT TÍNH TOÁN BMR & MACRO                     */}
        {/* ============================================================ */}
        {activeTab === 'macro_calculator' && (
          <View style={styles.tabSection}>
            <View style={styles.cleanCard}>
              {/* Gender Segmented Bar */}
              <View style={styles.segmentedControl}>
                <Pressable
                  style={[styles.segmentBtn, macroGender === 'MALE' && styles.segmentBtnActive]}
                  onPress={() => setMacroGender('MALE')}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      macroGender === 'MALE' && styles.segmentBtnTextActive,
                    ]}
                  >
                    Nam
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentBtn, macroGender === 'FEMALE' && styles.segmentBtnActive]}
                  onPress={() => setMacroGender('FEMALE')}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      macroGender === 'FEMALE' && styles.segmentBtnTextActive,
                    ]}
                  >
                    Nữ
                  </Text>
                </Pressable>
              </View>

              {/* 3 Metric Inputs in 1 Row */}
              <View style={styles.tripleInputRow}>
                <View style={styles.tripleInputBox}>
                  <Text style={styles.tripleInputLabel}>Cân nặng</Text>
                  <View style={styles.tripleInputValWrap}>
                    <TextInput
                      style={styles.tripleInput}
                      keyboardType="numeric"
                      value={macroWeight}
                      onChangeText={setMacroWeight}
                      placeholder="70"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.tripleInputUnit}>kg</Text>
                  </View>
                </View>

                <View style={styles.tripleInputBox}>
                  <Text style={styles.tripleInputLabel}>Chiều cao</Text>
                  <View style={styles.tripleInputValWrap}>
                    <TextInput
                      style={styles.tripleInput}
                      keyboardType="numeric"
                      value={macroHeight}
                      onChangeText={setMacroHeight}
                      placeholder="170"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.tripleInputUnit}>cm</Text>
                  </View>
                </View>

                <View style={styles.tripleInputBox}>
                  <Text style={styles.tripleInputLabel}>Tuổi</Text>
                  <View style={styles.tripleInputValWrap}>
                    <TextInput
                      style={styles.tripleInput}
                      keyboardType="numeric"
                      value={macroAge}
                      onChangeText={setMacroAge}
                      placeholder="25"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.tripleInputUnit}>tuổi</Text>
                  </View>
                </View>
              </View>

              {/* Activity Level Scroll */}
              <View style={styles.miniSectionGroup}>
                <Text style={styles.miniSectionLabel}>Cường độ vận động (PAL)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
                  {[
                    { factor: 1.2, label: 'Ít vận động (x1.2)' },
                    { factor: 1.375, label: 'Nhẹ 1-3 buổi (x1.375)' },
                    { factor: 1.55, label: 'Vừa 3-5 buổi (x1.55)' },
                    { factor: 1.725, label: 'Năng động 6-7 buổi (x1.725)' },
                    { factor: 1.9, label: 'Cường độ cao (x1.9)' },
                  ].map((lvl) => {
                    const sel = macroActivity === lvl.factor;
                    return (
                      <Pressable
                        key={lvl.factor}
                        style={[styles.compactPill, sel && styles.compactPillActive]}
                        onPress={() => setMacroActivity(lvl.factor)}
                      >
                        <Text style={[styles.compactPillText, sel && styles.compactPillTextActive]}>
                          {lvl.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Goal Presets Scroll */}
              <View style={styles.miniSectionGroup}>
                <Text style={styles.miniSectionLabel}>Mục tiêu thể hình</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
                  {[
                    { id: 'FAT_LOSS_FAST', label: 'Giảm mỡ nhanh (-20%)', color: colors.warning },
                    { id: 'FAT_LOSS_STANDARD', label: 'Giảm mỡ chuẩn (-15%)', color: colors.success },
                    { id: 'MAINTAIN', label: 'Duy trì vóc dáng', color: colors.primary },
                    { id: 'LEAN_BULK', label: 'Tăng cơ nạc (+10%)', color: '#8b5cf6' },
                    { id: 'BULK', label: 'Xả cơ tăng cân (+15%)', color: '#ec4899' },
                  ].map((g) => {
                    const sel = macroGoal === g.id;
                    return (
                      <Pressable
                        key={g.id}
                        style={[
                          styles.compactPill,
                          sel && {
                            backgroundColor: `${g.color}15`,
                            borderColor: g.color,
                          },
                        ]}
                        onPress={() => setMacroGoal(g.id as any)}
                      >
                        <Text
                          style={[
                            styles.compactPillText,
                            sel && { color: g.color, fontWeight: '700' },
                          ]}
                        >
                          {g.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Calculated Hero Card with Clean Macro Panel */}
            <View style={styles.cleanPlanCard}>
              <View style={styles.macroHeroHeader}>
                <View style={styles.macroHeroTopRow}>
                  <Text style={styles.macroHeroSubtitle}>KẾT QUẢ THEO THỂ TRẠNG</Text>
                  <View style={styles.macroHeroGoalBadge}>
                    <Text style={styles.macroHeroGoalText} numberOfLines={1}>
                      {calculatedNutrition.goalLabel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.macroHeroSubline}>
                  BMR: {calculatedNutrition.bmr} kcal • TDEE: {calculatedNutrition.tdee} kcal • Nước: ~{calculatedNutrition.waterLiters}L/ngày
                </Text>
              </View>

              {/* Clean Macro Panel */}
              <PlanMacroPanel
                targetCalories={calculatedNutrition.targetCalories}
                macros={calculatedNutrition.macros}
              />

              {/* CTA: Áp dụng mục tiêu macro sang Tab Thực Đơn */}
              <Pressable
                style={styles.cleanPrimaryBtn}
                onPress={handleApplyMacroToPlan}
              >
                <Sparkles size={16} color="#fff" />
                <Text style={styles.cleanPrimaryBtnText}>
                  Áp Dụng Vào Thực Đơn & Lên Món
                </Text>
              </Pressable>

              <Pressable
                style={styles.cleanAiBtn}
                onPress={() => {
                  if (!selectedCustomer) {
                    showAlert({
                      type: 'info',
                      title: 'Chọn học viên',
                      message: 'Vui lòng chọn học viên trước khi tạo thực đơn AI.',
                      confirmLabel: 'Chọn học viên',
                      cancelLabel: 'Đóng',
                      onConfirm: () => setCustomerModalVisible(true),
                    });
                    return;
                  }
                  setAiDraftModalVisible(true);
                }}
              >
                <Sparkles size={15} color="#4F46E5" />
                <Text style={styles.cleanAiBtnText}>
                  Dùng AI Lên Món Tự Động Theo Thể Trạng
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 2: CHUYÊN BIỆT QUẢN LÝ THỰC ĐƠN                          */}
        {/* ============================================================ */}
        {activeTab === 'meal_swapper' && (
          <View style={styles.tabSection}>
            {/* 1. Hàng Thao Tác Tạo Thực Đơn (Tách biệt hoàn toàn, thoáng đãng 50/50) */}
            <View style={styles.planActionsRow}>
              <Pressable
                style={styles.aiActionBtn}
                onPress={() => {
                  if (!selectedCustomer) {
                    showAlert({
                      type: 'info',
                      title: 'Chọn học viên',
                      message: 'Vui lòng chọn học viên trước khi tạo thực đơn AI.',
                      confirmLabel: 'Chọn học viên',
                      cancelLabel: 'Đóng',
                      onConfirm: () => setCustomerModalVisible(true),
                    });
                    return;
                  }
                  setAiDraftModalVisible(true);
                }}
              >
                <Sparkles size={14} color="#fff" />
                <Text style={styles.aiActionBtnText}>Tạo bằng AI</Text>
              </Pressable>

              <Pressable style={styles.manualActionBtn} onPress={handleOpenNewPlan}>
                <Plus size={14} color={colors.primary} />
                <Text style={styles.manualActionBtnText}>Lập thủ công</Text>
              </Pressable>
            </View>

            {/* 2. Thanh Bộ Lọc Trạng Thái (Độc lập 100% không gian, không bị chèn ép nút) */}
            <View style={styles.statusFilterBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterPillsRow}
              >
                {STATUS_FILTERS.map((f) => {
                  const active = statusFilter === f.id;
                  const count =
                    f.id === 'ALL'
                      ? plans.length
                      : plans.filter((p) => p.status === f.id).length;
                  return (
                    <Pressable
                      key={f.id}
                      style={[styles.statusFilterPill, active && styles.statusFilterPillActive]}
                      onPress={() => setStatusFilter(f.id)}
                    >
                      <Text
                        style={[
                          styles.statusFilterPillText,
                          active && styles.statusFilterPillTextActive,
                        ]}
                      >
                        {f.label} ({count})
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.centerLoadingText}>Đang tải danh sách thực đơn...</Text>
              </View>
            ) : filteredPlans.length === 0 ? (
              <View style={styles.cleanEmptyBox}>
                <FileText size={32} color={colors.textMuted} />
                <Text style={styles.cleanEmptyTitle}>Chưa có thực đơn nào</Text>
                <Text style={styles.cleanEmptySub}>
                  {selectedCustomer
                    ? `Chưa có thực đơn cho ${selectedCustomer.fullName}. Bấm "Lập mới" để tạo.`
                    : 'Không tìm thấy thực đơn phù hợp bộ lọc.'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.plansListClean}>
                  {paginatedPlans.map((plan) => {
                  const isPublished = plan.status === 'PUBLISHED';
                  const menuItems: MealBlock[] = plan.menu || plan.meals || [];
                  const totalMeals = menuItems.length;
                  const totalDishes = menuItems.reduce(
                    (acc: number, m: MealBlock) => acc + (m.items?.length || 0),
                    0
                  );
                  const planKey = plan._id || plan.id || `plan-${Math.random()}`;
                  const customerObj =
                    typeof plan.customerId === 'object' && plan.customerId !== null
                      ? plan.customerId
                      : customers.find((c) => (c._id || (c as any).id) === plan.customerId);
                  const customerName = (customerObj as any)?.fullName;

                  return (
                    <View key={planKey} style={styles.cleanPlanCard}>
                      {/* 1. Header Phiếu: Tiêu đề & Trạng thái */}
                      <View style={styles.cleanPlanCardTop}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.cleanPlanTitle} numberOfLines={1}>
                            {plan.title}
                          </Text>
                          <View style={styles.cleanPlanMetaRow}>
                            {customerName ? (
                              <View style={styles.cleanPlanCustPill}>
                                <User size={11} color={colors.primary} />
                                <Text style={styles.cleanPlanCustName} numberOfLines={1}>
                                  {customerName}
                                </Text>
                              </View>
                            ) : null}
                            <Text style={styles.cleanPlanDate}>
                              {new Date(
                                plan.updatedAt || plan.createdAt || Date.now()
                              ).toLocaleDateString('vi-VN')}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.cleanStatusDot,
                            isPublished
                              ? styles.cleanStatusDotPub
                              : styles.cleanStatusDotDraft,
                          ]}
                        >
                          <View
                            style={[
                              styles.statusMiniCircle,
                              { backgroundColor: isPublished ? colors.success : '#94A3B8' },
                            ]}
                          />
                          <Text
                            style={[
                              styles.cleanStatusDotText,
                              isPublished ? { color: colors.success } : { color: colors.textMuted },
                            ]}
                          >
                            {isPublished ? 'Đang áp dụng' : 'Bản nháp'}
                          </Text>
                        </View>
                      </View>

                      {/* 2. Unified Nutrition Panel (Sạch sẽ, không bị lồng card trong card) */}
                      <PlanMacroPanel
                        targetCalories={plan.targetCalories}
                        macros={plan.macros}
                        totalMeals={totalMeals}
                        totalDishes={totalDishes}
                      />

                      {/* 3. Lời khuyên / Ghi chú (Mở rộng / Thu gọn được trên mobile) */}
                      {plan.notes ? (
                        <PlanNotesCollapsible notes={plan.notes} />
                      ) : null}

                      {/* 4. Action Row: Nút Xem chi tiết nổi bật + Cụm Icon Thao tác */}
                      <View style={styles.cleanActionRow}>
                        <Pressable
                          style={styles.cleanDetailBtn}
                          onPress={() => handleViewDetailPlan(plan)}
                        >
                          <Eye size={14} color={colors.primary} />
                          <Text style={styles.cleanDetailBtnText}>Xem chi tiết món</Text>
                        </Pressable>

                        <View style={styles.cleanActionIcons}>
                          <Pressable
                            style={[
                              styles.iconCircleBtn,
                              isPublished
                                ? { backgroundColor: 'rgba(217, 119, 6, 0.08)', borderColor: 'rgba(217, 119, 6, 0.25)' }
                                : { backgroundColor: 'rgba(22, 163, 74, 0.08)', borderColor: 'rgba(22, 163, 74, 0.25)' },
                            ]}
                            hitSlop={6}
                            onPress={() => handleTogglePlanStatus(plan)}
                          >
                            {isPublished ? (
                              <RotateCcw size={14} color={colors.warning} />
                            ) : (
                              <CheckCheck size={14} color={colors.success} />
                            )}
                          </Pressable>

                          <Pressable
                            style={styles.iconCircleBtn}
                            hitSlop={6}
                            onPress={() => handleEditPlan(plan)}
                          >
                            <Pencil size={14} color={colors.text} />
                          </Pressable>

                          <Pressable
                            style={[
                              styles.iconCircleBtn,
                              { backgroundColor: 'rgba(239, 68, 68, 0.06)', borderColor: 'rgba(239, 68, 68, 0.2)' },
                            ]}
                            hitSlop={6}
                            onPress={() => handlePromptDelete(plan)}
                          >
                            <Trash2 size={14} color={colors.danger} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Shared Pagination Bar for Plans */}
              <PaginationBar
                page={safePlanPage}
                totalPages={totalPlanPages}
                totalItems={filteredPlans.length}
                pageSize={PLANS_PER_PAGE}
                itemLabel="thực đơn"
                onPageChange={setPlanPage}
              />
            </>
          )}
        </View>
        )}

        {/* ============================================================ */}
        {/* TAB 3: CHUYÊN BIỆT TRA CỨU & QUẢN LÝ KHO MÓN ĂN VIỆT         */}
        {/* ============================================================ */}
        {activeTab === 'meal_manager' && (
          <View style={styles.tabSection}>
            {/* Tab 3 Top Action Header: Tiêu đề + Nút Thêm Món + Khôi phục */}
            <View style={styles.mealManagerTopBar}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={styles.tabHeadingTitle} numberOfLines={1} ellipsizeMode="tail">KHO MÓN ĂN & DINH DƯỠNG</Text>
                <Text style={styles.tabHeadingSub} numberOfLines={1} ellipsizeMode="tail">
                  {filteredFoods.length} món • Chuẩn dinh dưỡng thể hình 3S Gym
                </Text>
              </View>

              <View style={styles.mealManagerTopActions}>
                <Pressable
                  style={styles.resetFoodsBtn}
                  onPress={handleResetFoods}
                  hitSlop={8}
                >
                  <RotateCcw size={14} color={colors.textMuted} />
                </Pressable>

                <Pressable
                  style={styles.addFoodPrimaryBtn}
                  onPress={handleOpenCreateFood}
                >
                  <Plus size={15} color="#ffffff" />
                  <Text style={styles.addFoodPrimaryBtnText}>Thêm món</Text>
                </Pressable>
              </View>
            </View>

            {/* Quick Metrics Bar (Thống kê số lượng từng nhóm món - Bấm để lọc) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.metricsRowScroll}
            >
              <Pressable
                style={[
                  styles.metricCard,
                  selectedFoodCategory === 'all' && styles.metricCardActive,
                ]}
                onPress={() => {
                  setSelectedFoodCategory('all');
                  setFoodPage(1);
                }}
              >
                <Text style={styles.metricCardLabel}>TẤT CẢ MÓN</Text>
                <Text style={styles.metricCardVal}>{countAll}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.metricCard,
                  styles.metricCardCustom,
                  selectedFoodCategory === 'custom' && styles.metricCardCustomActive,
                ]}
                onPress={() => {
                  setSelectedFoodCategory('custom');
                  setFoodPage(1);
                }}
              >
                <Text style={[styles.metricCardLabel, { color: '#b45309' }]}>MÓN TỰ THÊM</Text>
                <Text style={[styles.metricCardVal, { color: '#d97706' }]}>{countCustom}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.metricCard,
                  selectedFoodCategory === 'protein' && styles.metricCardActive,
                ]}
                onPress={() => {
                  setSelectedFoodCategory('protein');
                  setFoodPage(1);
                }}
              >
                <Text style={[styles.metricCardLabel, { color: '#2563eb' }]}>NHÓM ĐẠM</Text>
                <Text style={[styles.metricCardVal, { color: '#1d4ed8' }]}>{countProtein}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.metricCard,
                  selectedFoodCategory === 'carbs' && styles.metricCardActive,
                ]}
                onPress={() => {
                  setSelectedFoodCategory('carbs');
                  setFoodPage(1);
                }}
              >
                <Text style={[styles.metricCardLabel, { color: '#b45309' }]}>TINH BỘT</Text>
                <Text style={[styles.metricCardVal, { color: '#92400e' }]}>{countCarbs}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.metricCard,
                  selectedFoodCategory === 'veggies' && styles.metricCardActive,
                ]}
                onPress={() => {
                  setSelectedFoodCategory('veggies');
                  setFoodPage(1);
                }}
              >
                <Text style={[styles.metricCardLabel, { color: '#059669' }]}>RAU CỦ</Text>
                <Text style={[styles.metricCardVal, { color: '#047857' }]}>{countVeggies}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.metricCard,
                  selectedFoodCategory === 'fat' && styles.metricCardActive,
                ]}
                onPress={() => {
                  setSelectedFoodCategory('fat');
                  setFoodPage(1);
                }}
              >
                <Text style={[styles.metricCardLabel, { color: '#db2777' }]}>CHẤT BÉO</Text>
                <Text style={[styles.metricCardVal, { color: '#be185d' }]}>{countFat}</Text>
              </Pressable>
            </ScrollView>

            {/* Search Input */}
            <View style={styles.cleanSearchBox}>
              <Search size={15} color={colors.textMuted} />
              <TextInput
                style={styles.cleanSearchInput}
                value={foodSearch}
                onChangeText={setFoodSearch}
                placeholder="Tìm món ăn: ức gà, bò bít tết, cá hồi, canh cải..."
                placeholderTextColor={colors.textMuted}
              />
              {foodSearch ? (
                <Pressable onPress={() => setFoodSearch('')}>
                  <X size={15} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* Category Filter Pills (includes 'all', 'custom', 'protein', ...) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillScroll}
            >
              {(
                [
                  'all',
                  'custom',
                  'protein',
                  'carbs',
                  'veggies',
                  'soup',
                  'fat',
                  'snack',
                  'drink',
                ] as (FoodCategory | 'all' | 'custom')[]
              ).map((cat) => {
                const active = selectedFoodCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.compactPill, active && styles.compactPillActive]}
                    onPress={() => {
                      setSelectedFoodCategory(cat);
                      setFoodPage(1);
                    }}
                  >
                    <Text
                      style={[styles.compactPillText, active && styles.compactPillTextActive]}
                    >
                      {FOOD_CATEGORY_LABELS[cat] || cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Sort Filter Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sortBarScroll}
            >
              <Text style={styles.sortBarLabel}>Sắp xếp:</Text>
              {[
                { id: 'name', label: 'Tên A-Z' },
                { id: 'calories_desc', label: 'Calo cao' },
                { id: 'calories_asc', label: 'Calo thấp' },
                { id: 'protein_desc', label: 'Nhiều đạm' },
              ].map((s) => {
                const isSel = foodSortBy === s.id;
                return (
                  <Pressable
                    key={s.id}
                    style={[styles.sortPill, isSel && styles.sortPillActive]}
                    onPress={() => setFoodSortBy(s.id as any)}
                  >
                    <Text style={[styles.sortPillText, isSel && styles.sortPillTextActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Foods List */}
            <View style={styles.foodsCleanList}>
              {paginatedFoods.length === 0 ? (
                <View style={styles.emptyFoodsCard}>
                  <Utensils size={32} color={colors.textMuted} />
                  <Text style={styles.emptyFoodsTitle}>Không tìm thấy món ăn nào</Text>
                  <Text style={styles.emptyFoodsDesc}>
                    {selectedFoodCategory === 'custom'
                      ? 'Bạn chưa tạo món ăn tùy biến nào. Hãy bấm "Thêm món" để thêm công thức mới vào kho!'
                      : 'Thử tìm kiếm với từ khóa khác hoặc bấm khôi phục danh mục.'}
                  </Text>
                  <Pressable
                    style={[styles.addFoodPrimaryBtn, { alignSelf: 'center', marginTop: 12 }]}
                    onPress={handleOpenCreateFood}
                  >
                    <Plus size={15} color="#ffffff" />
                    <Text style={styles.addFoodPrimaryBtnText}>Thêm món mới ngay</Text>
                  </Pressable>
                </View>
              ) : (
                paginatedFoods.map((food) => (
                  <View key={food.id} style={styles.dishCardContainer}>
                    {/* Header tags: Category + isCustom badge + Calorie */}
                    <View style={styles.dishCardTopRow}>
                      <View style={styles.dishBadgeGroup}>
                        <View
                          style={[
                            styles.dishCategoryBadge,
                            {
                              backgroundColor:
                                food.category === 'protein'
                                  ? '#eff6ff'
                                  : food.category === 'carbs'
                                  ? '#fef3c7'
                                  : food.category === 'veggies'
                                  ? '#ecfdf5'
                                  : '#fdf2f8',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dishCategoryBadgeText,
                              {
                                color:
                                  food.category === 'protein'
                                    ? '#1d4ed8'
                                    : food.category === 'carbs'
                                    ? '#b45309'
                                    : food.category === 'veggies'
                                    ? '#047857'
                                    : '#be185d',
                              },
                            ]}
                          >
                            {food.categoryLabel || FOOD_CATEGORY_LABELS[food.category]}
                          </Text>
                        </View>

                        {food.isCustom ? (
                          <View style={styles.customFoodBadge}>
                            <Text style={styles.customFoodBadgeText}>Món tự thêm</Text>
                          </View>
                        ) : (
                          <View style={styles.defaultFoodBadge}>
                            <Text style={styles.defaultFoodBadgeText}>Chuẩn 3S</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.miniCalorieChip}>
                        <Flame size={11} color="#ea580c" />
                        <Text style={styles.miniCalorieChipText}>
                          {food.caloriesPer100g} kcal / 100g
                        </Text>
                      </View>
                    </View>

                    {/* Dish Name */}
                    <Text style={styles.dishCardTitle}>{food.name}</Text>

                    {/* Serving & Macros */}
                    <Text style={styles.dishCardServing}>
                      Khẩu phần: <Text style={{ fontWeight: '700', color: colors.text }}>{food.servingLabel || `${food.defaultServingGrams}g`}</Text>
                    </Text>

                    <View style={styles.dishCardMacroRow}>
                      <View style={[styles.macroPillBox, { backgroundColor: '#eff6ff' }]}>
                        <Text style={[styles.macroPillText, { color: '#1d4ed8' }]}>
                          P: {food.proteinPer100g}g
                        </Text>
                      </View>
                      <View style={[styles.macroPillBox, { backgroundColor: '#fef3c7' }]}>
                        <Text style={[styles.macroPillText, { color: '#b45309' }]}>
                          C: {food.carbsPer100g}g
                        </Text>
                      </View>
                      <View style={[styles.macroPillBox, { backgroundColor: '#fdf2f8' }]}>
                        <Text style={[styles.macroPillText, { color: '#be185d' }]}>
                          F: {food.fatPer100g}g
                        </Text>
                      </View>
                    </View>

                    {food.prepTip ? (
                      <Text style={styles.dishCardPrepTip} numberOfLines={2}>
                        Mẹo: {food.prepTip}
                      </Text>
                    ) : null}

                    {/* CRUD ACTION ROW: [ SỬA ] [ XÓA ] [ CHI TIẾT ] */}
                    <View style={styles.dishCardCrudRow}>
                      <Pressable
                        style={styles.dishCrudEditBtn}
                        onPress={() => handleOpenEditFood(food)}
                      >
                        <Pencil size={13} color="#1d4ed8" />
                        <Text style={styles.dishCrudEditText}>Sửa</Text>
                      </Pressable>

                      <Pressable
                        style={styles.dishCrudDeleteBtn}
                        onPress={() => handleDeleteFood(food)}
                      >
                        <Trash2 size={13} color="#ef4444" />
                        <Text style={styles.dishCrudDeleteText}>Xóa</Text>
                      </Pressable>

                      <Pressable
                        style={styles.dishCrudDetailBtn}
                        onPress={() => setInspectedFood(food)}
                      >
                        <Eye size={13} color="#475569" />
                        <Text style={styles.dishCrudDetailText}>Chi tiết</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Shared Pagination Bar for Food Library */}
            <PaginationBar
              page={safeFoodPage}
              totalPages={totalFoodPages}
              totalItems={filteredFoods.length}
              pageSize={FOODS_PER_PAGE}
              itemLabel="món ăn"
              onPageChange={setFoodPage}
            />
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 4: CHUYÊN BIỆT TIÊU HAO VẬN ĐỘNG (ACSM MET)              */}
        {/* ============================================================ */}
        {activeTab === 'activity_library' && (
          <View style={styles.tabSection}>
            {/* 1. Top Banner với Quick Presets giống Web */}
            <View style={styles.activityTopBanner}>
              <View>
                <Text style={styles.activityBannerTitle}>
                  Ước Tính Tiêu Hao Calo Hoạt Động Thể Thao
                </Text>
                <Text style={styles.activityBannerSub}>
                  Hệ số trao đổi chất (METs) theo cân nặng & thời gian vận động
                </Text>
              </View>

              {/* Quick Presets Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activityPresetsScroll}
              >
                {[
                  { label: 'Gym 1h', id: 'gym_hiit', duration: '60' },
                  { label: 'Chạy 5km', id: 'running_5k', duration: '30' },
                  { label: 'Bơi 1km', id: 'swimming_1k', duration: '40' },
                  { label: 'Cycling 20km', id: 'cycling_20k', duration: '50' },
                  { label: 'Tabata 30p', id: 'tabata_hiit', duration: '30' },
                ].map((preset) => {
                  const targetAct = allActivities.find((a) => a.id === preset.id);
                  const isSel = focusedActivity?.id === preset.id;
                  return (
                    <Pressable
                      key={preset.id}
                      style={[
                        styles.activityPresetBtn,
                        isSel && styles.activityPresetBtnActive,
                      ]}
                      onPress={() => {
                        if (targetAct) {
                          setFocusedActivity(targetAct);
                          setActivityDuration(preset.duration);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.activityPresetBtnText,
                          isSel && styles.activityPresetBtnTextActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 2. Thẻ tính toán chi tiết bài tập đang chọn (Focused Activity Calculator) */}
            {focusedActivity && (() => {
              const weight = parseFloat(activityWeight) || 70;
              const duration = parseFloat(activityDuration) || focusedActivity.defaultDurationMinutes;
              const burned = Math.round(((focusedActivity.met * 3.5 * weight) / 200) * duration);
              const calPerMin = parseFloat(((focusedActivity.met * 3.5 * weight) / 200).toFixed(1));
              const isSaving = savingActivityId === focusedActivity.id;

              return (
                <View style={styles.focusedCalcCard}>
                  <View style={styles.focusedCalcHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.focusedCalcTitle}>{focusedActivity.name}</Text>
                      <Text style={styles.focusedCalcCategory}>
                        Nhóm: {focusedActivity.categoryLabel}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.actMetBadge,
                        { backgroundColor: `${focusedActivity.badgeColor}15` },
                      ]}
                    >
                      <Text style={[styles.actMetText, { color: focusedActivity.badgeColor }]}>
                        MET {focusedActivity.met}
                      </Text>
                    </View>
                  </View>

                  {/* 2 Inputs in 1 row: Weight & Duration */}
                  <View style={styles.activityInputsRow}>
                    <View style={styles.activityInputCol}>
                      <Text style={styles.activityInputLabel}>Cân nặng học viên (kg)</Text>
                      <TextInput
                        style={styles.cleanNumInput}
                        keyboardType="numeric"
                        value={activityWeight}
                        onChangeText={setActivityWeight}
                        placeholder="70"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>

                    <View style={styles.activityInputCol}>
                      <Text style={styles.activityInputLabel}>Thời lượng tập (phút)</Text>
                      <TextInput
                        style={styles.cleanNumInput}
                        keyboardType="numeric"
                        value={activityDuration}
                        onChangeText={setActivityDuration}
                        placeholder="45"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>

                  {/* Calculated Burn Result Row */}
                  <View style={styles.focusedCalcResultBox}>
                    <View style={styles.focusedCalcResultLeft}>
                      <Flame size={20} color="#ea580c" />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.focusedCalcBurnedVal} numberOfLines={1}>
                          -{burned} <Text style={{ fontSize: 13, fontWeight: '700' }}>kcal</Text>
                        </Text>
                        <Text style={styles.focusedCalcBurnedSub} numberOfLines={1}>
                          Tốc độ: ~{calPerMin} kcal / phút
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      style={[styles.focusedRecordBtn, isSaving && { opacity: 0.6 }]}
                      disabled={isSaving}
                      onPress={() => handleLogActivity(focusedActivity)}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Plus size={15} color="#ffffff" />
                          <Text style={styles.focusedRecordBtnText} numberOfLines={1}>
                            {selectedCustomer
                              ? `Lưu cho ${selectedCustomer.fullName?.split(' ').pop()}`
                              : 'Lưu vào nhật ký'}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })()}

            {/* 3. Thanh Công Cụ & Thống Kê Kho Hoạt Động (CRUD HEADER) */}
            <View style={styles.mealManagerTopBar}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={styles.tabHeadingTitle} numberOfLines={1} ellipsizeMode="tail">DANH MỤC BỘ MÔN VẬN ĐỘNG</Text>
                <Text style={styles.tabHeadingSub} numberOfLines={1} ellipsizeMode="tail">
                  {filteredActivities.length} / {allActivities.length} hoạt động trong hệ thống
                </Text>
              </View>

              <View style={styles.mealManagerTopActions}>
                <Pressable
                  style={styles.resetFoodsBtn}
                  onPress={handleResetActivities}
                  hitSlop={8}
                >
                  <RotateCcw size={15} color="#64748b" />
                </Pressable>

                <Pressable
                  style={styles.addFoodPrimaryBtn}
                  onPress={handleOpenCreateActivity}
                >
                  <Plus size={14} color="#ffffff" />
                  <Text style={styles.addFoodPrimaryBtnText}>Thêm hoạt động</Text>
                </Pressable>
              </View>
            </View>

            {/* 4. Quick Metrics Bar: Thống kê số lượng theo nhóm bộ môn */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.metricsRowScroll}
            >
              {[
                { id: 'ALL', label: 'TẤT CẢ', count: countAllAct },
                { id: 'custom', label: 'TỰ THÊM', count: countCustomAct, custom: true },
                { id: 'STRENGTH', label: 'TẬP TẠ', count: countStrength },
                { id: 'CARDIO', label: 'CARDIO', count: countCardio },
                { id: 'MARTIAL_ARTS', label: 'VÕ THUẬT', count: countMartial },
                { id: 'SPORTS', label: 'THỂ THAO', count: countSports },
                { id: 'RECOVERY', label: 'PHỤC HỒI', count: countRecovery },
              ].map((m) => {
                const isSel = selectedActivityCategory === m.id;
                return (
                  <Pressable
                    key={m.id}
                    style={[
                      styles.metricCard,
                      m.custom && styles.metricCardCustom,
                      isSel && (m.custom ? styles.metricCardCustomActive : styles.metricCardActive),
                    ]}
                    onPress={() => setSelectedActivityCategory(m.id)}
                  >
                    <Text
                      style={[
                        styles.metricCardLabel,
                        isSel && { color: m.custom ? '#b45309' : '#0284c7' },
                      ]}
                    >
                      {m.label}
                    </Text>
                    <Text
                      style={[
                        styles.metricCardVal,
                        isSel && { color: m.custom ? '#b45309' : '#0284c7' },
                      ]}
                    >
                      {m.count}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 5. Search Bar & Sort Pills */}
            <View style={styles.cleanSearchBox}>
              <Search size={14} color={colors.textMuted} />
              <TextInput
                style={styles.cleanSearchInput}
                placeholder="Tìm bộ môn, bài tập, kỹ thuật..."
                placeholderTextColor={colors.textMuted}
                value={activitySearch}
                onChangeText={setActivitySearch}
              />
              {activitySearch ? (
                <Pressable onPress={() => setActivitySearch('')} hitSlop={8}>
                  <X size={14} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sortBarScroll}
            >
              <Text style={styles.sortBarLabel}>Sắp xếp:</Text>
              {[
                { id: 'name', label: 'Tên A-Z' },
                { id: 'met_desc', label: 'MET cao nhất' },
                { id: 'met_asc', label: 'MET thấp nhất' },
                { id: 'duration_desc', label: 'Thời gian tập' },
              ].map((s) => {
                const isSel = activitySortBy === s.id;
                return (
                  <Pressable
                    key={s.id}
                    style={[styles.sortPill, isSel && styles.sortPillActive]}
                    onPress={() => setActivitySortBy(s.id as any)}
                  >
                    <Text style={[styles.sortPillText, isSel && styles.sortPillTextActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 6. Danh sách các bài tập / hoạt động vận động (Card CRUD) */}
            <View style={styles.activityCleanList}>
              {filteredActivities.length === 0 ? (
                <View style={styles.emptyFoodsCard}>
                  <Activity size={32} color={colors.textMuted} />
                  <Text style={styles.emptyFoodsTitle}>Không tìm thấy hoạt động nào</Text>
                  <Text style={styles.emptyFoodsDesc}>
                    {selectedActivityCategory === 'custom'
                      ? 'Bạn chưa tạo bài tập tùy biến nào. Hãy bấm "Thêm hoạt động" để tạo bài tập!'
                      : 'Thử tìm với từ khóa khác hoặc bấm khôi phục danh mục.'}
                  </Text>
                  <Pressable
                    style={[styles.addFoodPrimaryBtn, { alignSelf: 'center', marginTop: 12 }]}
                    onPress={handleOpenCreateActivity}
                  >
                    <Plus size={15} color="#ffffff" />
                    <Text style={styles.addFoodPrimaryBtnText}>Thêm hoạt động mới ngay</Text>
                  </Pressable>
                </View>
              ) : (
                filteredActivities.map((act) => {
                  const weight = parseFloat(activityWeight) || 70;
                  const duration = parseFloat(activityDuration) || act.defaultDurationMinutes;
                  const burned = Math.round(((act.met * 3.5 * weight) / 200) * duration);
                  const isFocused = focusedActivity?.id === act.id;

                  return (
                    <View
                      key={act.id}
                      style={[
                        styles.dishCardContainer,
                        isFocused && { borderColor: '#0284c7', borderWidth: 1.5 },
                      ]}
                    >
                      {/* Top Row: Category + Custom Badge + MET Chip */}
                      <View style={styles.dishCardTopRow}>
                        <View style={styles.dishBadgeGroup}>
                          <View
                            style={[
                              styles.dishCategoryBadge,
                              { backgroundColor: `${act.badgeColor}15` },
                            ]}
                          >
                            <Text style={[styles.dishCategoryBadgeText, { color: act.badgeColor }]}>
                              {act.categoryLabel}
                            </Text>
                          </View>

                          {act.isCustom ? (
                            <View style={styles.customFoodBadge}>
                              <Text style={styles.customFoodBadgeText}>Tự thêm</Text>
                            </View>
                          ) : (
                            <View style={styles.defaultFoodBadge}>
                              <Text style={styles.defaultFoodBadgeText}>Chuẩn 3S</Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.miniCalorieChip}>
                          <Flame size={11} color="#ea580c" />
                          <Text style={styles.miniCalorieChipText}>
                            MET {act.met}
                          </Text>
                        </View>
                      </View>

                      {/* Name */}
                      <Text style={styles.dishCardTitle}>{act.name}</Text>

                      {/* Benchmark & Description */}
                      <Text style={styles.dishCardServing}>
                        Tiêu hao mẫu:{' '}
                        <Text style={{ fontWeight: '700', color: '#ea580c' }}>
                          {act.benchmarkText}
                        </Text>
                      </Text>

                      {act.description ? (
                        <Text style={styles.dishCardPrepTip} numberOfLines={2}>
                          {act.description}
                        </Text>
                      ) : null}

                      {/* CRUD ACTION ROW: [ SỬA ] [ XÓA ] [ CHỌN TÍNH TOÁN ] */}
                      <View style={styles.dishCardCrudRow}>
                        <Pressable
                          style={styles.dishCrudEditBtn}
                          onPress={() => handleOpenEditActivity(act)}
                        >
                          <Pencil size={13} color="#1d4ed8" />
                          <Text style={styles.dishCrudEditText}>Sửa</Text>
                        </Pressable>

                        <Pressable
                          style={styles.dishCrudDeleteBtn}
                          onPress={() => handleDeleteActivity(act)}
                        >
                          <Trash2 size={13} color="#ef4444" />
                          <Text style={styles.dishCrudDeleteText}>Xóa</Text>
                        </Pressable>

                        <Pressable
                          style={[
                            styles.dishCrudDetailBtn,
                            isFocused && { backgroundColor: '#e0f2fe', borderColor: '#0284c7' },
                          ]}
                          onPress={() => {
                            setFocusedActivity(act);
                            setActivityDuration(String(act.defaultDurationMinutes));
                          }}
                        >
                          <Flame size={13} color={isFocused ? '#0284c7' : '#ea580c'} />
                          <Text
                            style={[
                              styles.dishCrudDetailText,
                              isFocused && { color: '#0284c7', fontWeight: '800' },
                            ]}
                          >
                            {isFocused ? 'Đang chọn' : `Tính -${burned} kcal`}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* TAB 5: CHUYÊN BIỆT CALO IN/OUT & CÂN BẰNG NĂNG LƯỢNG        */}
        {/* ============================================================ */}
        {activeTab === 'logs_balance' && (
          <View style={styles.tabSection}>
            {/* 4 Thẻ Summary Cards Giống 100% Web */}
            <View style={styles.webSummaryCardsGrid}>
              {/* Card 1: CALO NẠP VÀO (IN) */}
              <View style={styles.webSummaryCard}>
                <Text style={styles.webSummaryLabel}>CALO NẠP VÀO (IN)</Text>
                <Text style={[styles.webSummaryValue, { color: '#003b70' }]}>
                  {summary.consumedCalories || 0}{' '}
                  <Text style={styles.webSummaryUnit}>kcal</Text>
                </Text>
                <Text style={styles.webSummarySub}>Từ các bữa ăn trong ngày</Text>
              </View>

              {/* Card 2: CALO TIÊU HAO (OUT) */}
              <View style={styles.webSummaryCard}>
                <Text style={styles.webSummaryLabel}>CALO TIÊU HAO (OUT)</Text>
                <Text style={[styles.webSummaryValue, { color: '#ea580c' }]}>
                  {summary.burnedCalories || 0}{' '}
                  <Text style={styles.webSummaryUnit}>kcal</Text>
                </Text>
                <Text style={styles.webSummarySub}>Từ tập luyện & vận động</Text>
              </View>

              {/* Card 3: CALO RÒNG (NET) */}
              <View style={styles.webSummaryCard}>
                <Text style={styles.webSummaryLabel}>CALO RÒNG (NET)</Text>
                <Text
                  style={[
                    styles.webSummaryValue,
                    {
                      color:
                        (summary.netCalories || 0) < 0 ? '#16a34a' : '#003b70',
                    },
                  ]}
                >
                  {summary.netCalories || 0}{' '}
                  <Text style={styles.webSummaryUnit}>kcal</Text>
                </Text>
                <Text style={styles.webSummarySub}>Calo Nạp - Calo Tiêu Hao</Text>
              </View>

              {/* Card 4: TỔNG PROTEIN NẠP */}
              <View style={styles.webSummaryCard}>
                <Text style={styles.webSummaryLabel}>TỔNG PROTEIN NẠP</Text>
                <Text style={[styles.webSummaryValue, { color: '#1d4ed8' }]}>
                  {summary.protein || 0}{' '}
                  <Text style={styles.webSummaryUnit}>g</Text>
                </Text>
                <Text style={styles.webSummarySub}>Đã ghi nhận trong ngày</Text>
              </View>
            </View>

            {/* Daily Logs Header Row & Add Log Button */}
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={styles.sectionTitleClean} numberOfLines={1} ellipsizeMode="tail">
                  Nhật Ký Dinh Dưỡng & Vận Động
                </Text>
                <Text style={styles.tabHeadingSub} numberOfLines={1} ellipsizeMode="tail">
                  {selectedCustomer
                    ? `Hồ sơ học viên: ${selectedCustomer.fullName} (${logs.length} bản ghi)`
                    : 'Toàn bộ bản ghi'}
                </Text>
              </View>

              <Pressable
                style={styles.addFoodPrimaryBtn}
                onPress={handleOpenCreateLog}
              >
                <Plus size={14} color="#ffffff" />
                <Text style={styles.addFoodPrimaryBtnText}>Ghi nhật ký</Text>
              </Pressable>
            </View>

            {/* Filter Tabs: Tất cả / Ăn uống / Vận động */}
            <View style={styles.logFilterRow}>
              {[
                { id: 'ALL', label: `Tất cả (${logs.length})` },
                { id: 'FOOD', label: `Ăn uống - IN (${inLogsCount})` },
                { id: 'ACTIVITY', label: `Vận động - OUT (${outLogsCount})` },
              ].map((tab) => {
                const isSel = logFilterType === tab.id;
                return (
                  <Pressable
                    key={tab.id}
                    style={[styles.logFilterTab, isSel && styles.logFilterTabActive]}
                    onPress={() => setLogFilterType(tab.id as any)}
                  >
                    <Text
                      style={[
                        styles.logFilterTabText,
                        isSel && styles.logFilterTabTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Logs List */}
            {!selectedCustomer ? (
              <View style={styles.cleanEmptyBox}>
                <Users size={30} color={colors.textMuted} />
                <Text style={styles.cleanEmptyTitle}>Chọn học viên cụ thể</Text>
                <Text style={styles.cleanEmptySub}>
                  Vui lòng chọn học viên ở thanh phía trên để ghi và xem nhật ký ăn uống / vận động.
                </Text>
                <Pressable
                  style={[styles.addFoodPrimaryBtn, { marginTop: 10 }]}
                  onPress={() => setCustomerModalVisible(true)}
                >
                  <Text style={styles.addFoodPrimaryBtnText}>Chọn học viên ngay</Text>
                </Pressable>
              </View>
            ) : filteredLogs.length === 0 ? (
              <View style={styles.cleanEmptyBox}>
                <ClipboardList size={30} color={colors.textMuted} />
                <Text style={styles.cleanEmptyTitle}>Chưa có bản ghi nào</Text>
                <Text style={styles.cleanEmptySub}>
                  Bấm "+ Ghi nhật ký mới" hoặc chuyển sang tab "Vận động" để ghi nhận ngay.
                </Text>
                <Pressable
                  style={[styles.addFoodPrimaryBtn, { marginTop: 10 }]}
                  onPress={handleOpenCreateLog}
                >
                  <Plus size={14} color="#ffffff" />
                  <Text style={styles.addFoodPrimaryBtnText}>Ghi nhật ký ngay</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.cleanLogsList}>
                {filteredLogs.map((item) => {
                  const isFood = item.type === 'FOOD';
                  const logKey = item._id || item.id || `log-${Math.random()}`;
                  return (
                    <View key={logKey} style={styles.logCardContainer}>
                      <View style={styles.logCardMainRow}>
                        <View
                          style={[
                            styles.cleanLogIconCircle,
                            {
                              backgroundColor: isFood
                                ? 'rgba(59, 130, 246, 0.12)'
                                : 'rgba(239, 68, 68, 0.12)',
                            },
                          ]}
                        >
                          {isFood ? (
                            <Utensils size={15} color={colors.primary} />
                          ) : (
                            <Flame size={15} color={colors.danger} />
                          )}
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.cleanLogName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text style={styles.cleanLogSub}>
                            {item.mealType
                              ? `${
                                  item.mealType === 'BREAKFAST'
                                    ? 'Bữa Sáng'
                                    : item.mealType === 'LUNCH'
                                    ? 'Bữa Trưa'
                                    : item.mealType === 'DINNER'
                                    ? 'Bữa Tối'
                                    : 'Bữa Phụ'
                                } • `
                              : ''}
                            {item.time || item.loggedAt
                              ? new Date(item.time || item.loggedAt || '').toLocaleTimeString(
                                  'vi-VN',
                                  { hour: '2-digit', minute: '2-digit' }
                                )
                              : 'Hôm nay'}
                            {(item as any).durationMinutes
                              ? ` • ${(item as any).durationMinutes} phút`
                              : ''}
                            {item.notes ? ` • ${item.notes}` : ''}
                          </Text>
                        </View>

                        <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                          <Text
                            style={[
                              styles.cleanLogCal,
                              { color: isFood ? '#1d4ed8' : '#ea580c' },
                            ]}
                          >
                            {isFood ? `+${item.calories}` : `-${item.calories}`} kcal
                          </Text>
                          {isFood && item.macros?.protein ? (
                            <Text style={styles.cleanLogProtein}>
                              P: {item.macros.protein}g
                              {item.macros.carbs ? ` • C: ${item.macros.carbs}g` : ''}
                              {item.macros.fat ? ` • F: ${item.macros.fat}g` : ''}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {/* CRUD ACTION ROW: [ SỬA ] [ XÓA ] */}
                      <View style={styles.logCardActionRow}>
                        <Pressable
                          style={styles.logActionBtn}
                          onPress={() => handleOpenEditLog(item)}
                        >
                          <Pencil size={13} color="#1d4ed8" />
                          <Text style={[styles.logActionBtnText, { color: '#1d4ed8' }]}>
                            Sửa
                          </Text>
                        </Pressable>

                        <Pressable
                          style={[styles.logActionBtn, styles.logActionDeleteBtn]}
                          onPress={() => handleDeleteLog(item._id || item.id || '')}
                        >
                          <Trash2 size={13} color="#ef4444" />
                          <Text style={[styles.logActionBtnText, { color: '#ef4444' }]}>
                            Xóa
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

      </ScrollView>

      {/* ============================================================ */}
      {/* CÁC MODAL ĐỘC LẬP                                            */}
      {/* ============================================================ */}

      {/* 1. Modal Tra cứu chi tiết món ăn (Tab 3: Kho Món) */}
      {inspectedFood && (
        <Modal
          visible={!!inspectedFood}
          transparent
          animationType="fade"
          onRequestClose={() => setInspectedFood(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.foodDetailCard}>
              <View style={styles.foodDetailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodDetailTitle}>{inspectedFood.name}</Text>
                  <Text style={styles.foodDetailCategory}>
                    Nhóm: {inspectedFood.categoryLabel || FOOD_CATEGORY_LABELS[inspectedFood.category]}
                  </Text>
                </View>
                <Pressable
                  style={styles.foodDetailCloseBtn}
                  onPress={() => setInspectedFood(null)}
                >
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.foodDetailCalorieRow}>
                <View style={styles.foodDetailCalorieBox}>
                  <Flame size={16} color="#ea580c" />
                  <Text style={styles.foodDetailCalorieVal}>
                    {inspectedFood.caloriesPer100g} kcal
                  </Text>
                  <Text style={styles.foodDetailCalorieUnit}>/ 100g</Text>
                </View>

                <View style={styles.foodDetailServingBox}>
                  <Text style={styles.foodDetailServingLabel}>Khẩu phần chuẩn</Text>
                  <Text style={styles.foodDetailServingVal}>
                    {inspectedFood.servingLabel || `${inspectedFood.defaultServingGrams}g`}
                  </Text>
                </View>
              </View>

              {/* Macro Pills */}
              <View style={styles.foodDetailMacroGrid}>
                <View style={[styles.foodDetailMacroItem, { borderColor: MACRO_COLORS.protein }]}>
                  <Text style={styles.foodDetailMacroLabel}>Chất đạm (Protein)</Text>
                  <Text style={[styles.foodDetailMacroVal, { color: MACRO_COLORS.protein }]}>
                    {inspectedFood.proteinPer100g}g
                  </Text>
                </View>

                <View style={[styles.foodDetailMacroItem, { borderColor: MACRO_COLORS.carbs }]}>
                  <Text style={styles.foodDetailMacroLabel}>Tinh bột (Carbs)</Text>
                  <Text style={[styles.foodDetailMacroVal, { color: MACRO_COLORS.carbs }]}>
                    {inspectedFood.carbsPer100g}g
                  </Text>
                </View>

                <View style={[styles.foodDetailMacroItem, { borderColor: MACRO_COLORS.fat }]}>
                  <Text style={styles.foodDetailMacroLabel}>Chất béo (Fat)</Text>
                  <Text style={[styles.foodDetailMacroVal, { color: MACRO_COLORS.fat }]}>
                    {inspectedFood.fatPer100g}g
                  </Text>
                </View>
              </View>

              {/* Prep Tip */}
              {inspectedFood.prepTip ? (
                <View style={styles.foodDetailTipBox}>
                  <Text style={styles.foodDetailTipTitle}>Mẹo chế biến lành mạnh:</Text>
                  <Text style={styles.foodDetailTipDesc}>{inspectedFood.prepTip}</Text>
                </View>
              ) : null}

              <View style={styles.foodDetailActionRow}>
                <Pressable
                  style={styles.foodDetailEditBtn}
                  onPress={() => {
                    const target = inspectedFood;
                    setInspectedFood(null);
                    handleOpenEditFood(target);
                  }}
                >
                  <Pencil size={14} color="#0284c7" />
                  <Text style={styles.foodDetailEditBtnText}>Chỉnh sửa</Text>
                </Pressable>

                {inspectedFood.isCustom && (
                  <Pressable
                    style={styles.foodDetailDeleteBtn}
                    onPress={() => {
                      const target = inspectedFood;
                      handleDeleteFood(target);
                    }}
                  >
                    <Trash2 size={14} color="#ef4444" />
                    <Text style={styles.foodDetailDeleteBtnText}>Xóa món</Text>
                  </Pressable>
                )}

                <Pressable
                  style={styles.foodDetailDismissBtn}
                  onPress={() => setInspectedFood(null)}
                >
                  <Text style={styles.foodDetailDismissBtnText}>Đóng</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* 2. Modal Chọn Học Viên */}
      <CustomerSelectModal
        visible={customerModalVisible}
        customers={customers}
        selectedId={selectedCustomerId}
        title="Chọn Học Viên"
        allowClear={true}
        clearLabel="Tất cả học viên (Xem toàn bộ thực đơn)"
        onClose={() => setCustomerModalVisible(false)}
        onSelect={(id) => {
          setSelectedCustomerId(id);
          setCustomerModalVisible(false);
        }}
      />

      {/* 3. Modal Lập & Chỉnh Sửa Thực Đơn (Tab 2: Thực Đơn) */}
      <MealPlannerModal
        visible={plannerModalVisible}
        editingPlan={editingPlan}
        customer={selectedCustomer}
        initialCalculated={initialCalculated}
        onClose={() => {
          setPlannerModalVisible(false);
          setEditingPlan(null);
          setInitialCalculated(null);
        }}
        onSaved={(savedPlan) => {
          setPlans((prev) => {
            const planKey = savedPlan._id || savedPlan.id;
            const idx = prev.findIndex((p) => (p._id || p.id) === planKey);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = savedPlan;
              return updated;
            }
            return [savedPlan, ...prev];
          });
          if (selectedCustomerId) {
            loadCustomerNutrition(selectedCustomerId);
          }
        }}
      />

      {/* 4. Modal Xem Chi Tiết Thực Đơn (Tab 2: Thực Đơn) */}
      <PlanDetailViewModal
        visible={detailModalVisible}
        plan={selectedPlanForDetail}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedPlanForDetail(null);
        }}
        onEdit={(p) => {
          setDetailModalVisible(false);
          setSelectedPlanForDetail(null);
          handleEditPlan(p);
        }}
      />

      {/* 5. Modal Ghi / Sửa Nhật Ký (Tab 5: Calo In/Out) */}
      <NutritionLogModal
        visible={logModalVisible}
        customerId={selectedCustomerId}
        editingLog={editingLog}
        onClose={() => {
          setLogModalVisible(false);
          setEditingLog(null);
        }}
        onSaved={() => {
          setLogModalVisible(false);
          setEditingLog(null);
          if (selectedCustomerId) {
            loadCustomerNutrition(selectedCustomerId);
          }
        }}
      />

      {/* 6. Modal Xác Nhận Xóa Thực Đơn (Tab 2: Thực Đơn) */}
      <ConfirmDeleteModal
        visible={deleteModalVisible}
        title="Xác nhận xóa thực đơn"
        message={`Bạn có chắc muốn xóa thực đơn "${deletingPlan?.title}"?`}
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingPlan(null);
        }}
      />

      {/* 7. Modal Lên Thực Đơn Bằng AI (Tab 2: Thực Đơn) */}
      <AiNutritionDraftModal
        visible={aiDraftModalVisible}
        customer={selectedCustomer}
        onClose={() => setAiDraftModalVisible(false)}
        onPlanCreated={(plan) => {
          setPlans((prev) => [plan, ...prev]);
          if (selectedCustomerId) {
            loadCustomerNutrition(selectedCustomerId);
          }
        }}
        onOpenManualEditor={(draftPlan) => {
          setEditingPlan(draftPlan);
          setPlannerModalVisible(true);
        }}
      />

      {/* 8. Modal Tạo & Chỉnh Sửa Món Ăn (Tab 3: Kho Món) */}
      <FoodItemEditorModal
        visible={foodEditorVisible}
        editingFood={editingFood}
        onClose={() => {
          setFoodEditorVisible(false);
          setEditingFood(null);
        }}
        onSaved={(saved) => {
          setFoodEditorVisible(false);
          setEditingFood(null);
          if (inspectedFood && inspectedFood.id === saved.id) {
            setInspectedFood(saved);
          }
        }}
      />

      {/* 9. Modal Tạo & Chỉnh Sửa Bộ Môn Vận Động (Tab 4: Tiêu Hao Vận Động) */}
      <ActivityEditorModal
        visible={activityEditorVisible}
        activityToEdit={editingActivity}
        onClose={() => {
          setActivityEditorVisible(false);
          setEditingActivity(null);
        }}
        onSaved={(saved) => {
          setActivityEditorVisible(false);
          setEditingActivity(null);
          if (focusedActivity && focusedActivity.id === saved.id) {
            setFocusedActivity(saved);
          }
        }}
      />

      <AppAlertModal {...alertConfig} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  /* Top Customer Bar */
  topCustomerBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  customerBriefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarMini: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  customerBriefInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerBriefName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  miniDotBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  miniDotBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
  },
  customerBriefMeta: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  customerBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  switchPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  switchPillBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  clearMiniBtn: {
    padding: 5,
    borderRadius: radius.pill,
  },

  /* Tab Bar */
  tabBarWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabPillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  /* Scroll Content */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
    paddingBottom: spacing.xxl + 20,
  },
  tabSection: {
    gap: 10,
  },

  /* Clean Card */
  cleanCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },

  /* Segmented Control */
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: 2,
    marginBottom: 10,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm - 2,
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  /* Triple Metric Inputs in 1 row */
  tripleInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tripleInputBox: {
    flex: 1,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 6,
  },
  tripleInputLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  tripleInputValWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripleInput: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    padding: 0,
    flex: 1,
  },
  tripleInputUnit: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },

  /* Mini Pill Group */
  miniSectionGroup: {
    marginTop: 4,
  },
  miniSectionLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  pillScroll: {
    flexDirection: 'row',
    paddingRight: 12,
  },
  compactPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  compactPillActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: colors.primary,
  },
  compactPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
  },
  compactPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  /* Macro Hero Card (Tab 1) */
  macroHeroHeader: {
    marginBottom: 6,
  },
  macroHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  macroHeroSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  macroHeroSubline: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 3,
  },
  macroHeroGoalBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  macroHeroGoalText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },
  cleanPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 9,
    marginTop: 6,
  },
  cleanPrimaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#fff',
  },

  /* ============================================================ */
  /* PLAN TICKET & UNIFIED NUTRITION PANEL STYLING (TAB 2)        */
  /* ============================================================ */
  /* Plan Action Buttons Row (Tab 2) */
  planActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  aiActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    borderRadius: radius.md,
    paddingVertical: 9,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  aiActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#fff',
  },
  manualActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.md,
    paddingVertical: 9,
  },
  manualActionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniAddPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  miniAddPlanBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  /* Dedicated Status Filter Bar */
  statusFilterBar: {
    marginBottom: 10,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  statusFilterPill: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusFilterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusFilterPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusFilterPillTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  cleanAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: radius.md,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  cleanAiBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  plansListClean: {
    gap: 10,
  },
  cleanPlanCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cleanPlanCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cleanPlanTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.text,
  },
  cleanPlanMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  cleanPlanCustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cleanPlanCustName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    maxWidth: 140,
  },
  cleanPlanDate: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  cleanStatusDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cleanStatusDotPub: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  cleanStatusDotDraft: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  statusMiniCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cleanStatusDotText: {
    fontSize: 10,
    fontWeight: '700',
  },

  /* Modern Plan Nutrition Panel */
  planNutriBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  planNutriHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planNutriCalWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  planNutriCalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  planNutriCalUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  planNutriMealChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  planNutriMealChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },
  planSegmentBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    marginBottom: 8,
  },
  planSegmentBarItem: {
    height: 6,
  },
  planMacroColRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planMacroCol: {
    flex: 1,
    alignItems: 'center',
  },
  planMacroDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  planMacroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
  },
  planMacroDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  planMacroLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  planMacroVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  planMacroUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
  planMacroSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    marginTop: 1,
  },

  /* Collapsible Plan Notes Box (Expand / Collapse) */
  planNotesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  planNotesBoxExpanded: {
    backgroundColor: '#F0F7FD',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  planNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  planNotesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  planNotesIcon: {
    fontSize: 12,
  },
  planNotesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    flex: 1,
  },
  expandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  expandPillExpanded: {
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
  },
  expandPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },
  expandPillTextExpanded: {
    color: '#2563EB',
  },
  planNotesText: {
    fontSize: 11.5,
    color: '#475569',
    lineHeight: 17,
  },
  planNotesTextExpanded: {
    color: '#1E293B',
    lineHeight: 19,
  },
  planNotesBottomAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 130, 246, 0.12)',
  },
  planNotesBottomActionText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.primary,
  },

  /* Action Buttons */
  cleanActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cleanDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.22)',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cleanDetailBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  cleanActionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Tab 3: Food Library Clean */
  cleanSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cleanSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: colors.text,
    padding: 0,
  },
  foodsCleanList: {
    gap: 6,
  },
  cleanFoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  cleanFoodNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  cleanFoodName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    paddingRight: 6,
  },
  miniCalorieChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  miniCalorieChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },
  cleanFoodMeta: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  cleanFoodTip: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  inspectIconWrap: {
    paddingLeft: 4,
  },

  /* Food Detail Modal (Tab 3) */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  foodDetailCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  foodDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  foodDetailTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  foodDetailCategory: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  foodDetailCloseBtn: {
    padding: 4,
  },
  foodDetailCalorieRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  foodDetailCalorieBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  foodDetailCalorieVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ea580c',
  },
  foodDetailCalorieUnit: {
    fontSize: 11,
    color: '#ea580c',
    fontWeight: '600',
  },
  foodDetailServingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  foodDetailServingLabel: {
    fontSize: 9.5,
    color: colors.textMuted,
  },
  foodDetailServingVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  foodDetailMacroGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  foodDetailMacroItem: {
    flex: 1,
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 6,
    alignItems: 'center',
  },
  foodDetailMacroLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
  },
  foodDetailMacroVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  foodDetailTipBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    marginBottom: 12,
  },
  foodDetailTipTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  foodDetailTipDesc: {
    fontSize: 11.5,
    color: colors.text,
    lineHeight: 16,
  },
  foodDetailDismissBtn: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: 8,
    alignItems: 'center',
  },
  foodDetailDismissBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },

  /* Tab 4: Activity Library Clean */
  activityInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  activityInputCol: {
    flex: 1,
  },
  activityInputLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 3,
  },
  cleanNumInput: {
    backgroundColor: colors.cardSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  activityCleanList: {
    gap: 6,
  },
  cleanActRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  actMetBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  actMetText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  actBenchmark: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
    marginTop: 2,
  },
  actDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  actRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  actRecordBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  /* Tab 5: Balance Hero Widget */
  balanceHeroWidget: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceHeroMain: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  balanceHeroLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  balanceHeroValue: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 1,
  },
  balanceHeroUnit: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  balancePillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  balanceStatChip: {
    flex: 1,
    backgroundColor: colors.cardSecondary,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceStatChipLabel: {
    fontSize: 9.5,
    color: colors.textMuted,
  },
  balanceStatChipVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  sectionTitleClean: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  cleanLogsList: {
    gap: 6,
  },
  cleanLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cleanLogIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanLogName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
  cleanLogSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  cleanLogCal: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  cleanLogProtein: {
    fontSize: 9.5,
    color: colors.textMuted,
  },

  /* Tab 3: Meal Manager Top Bar & Actions */
  mealManagerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  tabHeadingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },
  tabHeadingSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  mealManagerTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  resetFoodsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexShrink: 0,
  },
  addFoodPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.md,
    flexShrink: 0,
  },
  addFoodPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  sortBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    marginBottom: 8,
  },
  sortBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginRight: 2,
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sortPillActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  sortPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  sortPillTextActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  customFoodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#e0f2fe',
    marginRight: 6,
  },
  customFoodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284c7',
  },
  foodRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
  },
  foodRowIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  foodRowDeleteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  emptyFoodsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
    marginTop: 10,
  },
  emptyFoodsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  emptyFoodsDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  foodDetailActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  foodDetailEditBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  foodDetailEditBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  foodDetailDeleteBtn: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  foodDetailDeleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },

  /* Tab 3 Metrics & Dish CRUD Cards */
  metricsRowScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  metricCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 95,
  },
  metricCardActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  metricCardCustom: {
    borderColor: '#fef3c7',
  },
  metricCardCustomActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#d97706',
  },
  metricCardLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  metricCardVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  dishCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  dishCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dishBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dishCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dishCategoryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  defaultFoodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },
  defaultFoodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  dishCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  dishCardServing: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  dishCardMacroRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  macroPillBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  macroPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  dishCardPrepTip: {
    fontSize: 11,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    padding: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  dishCardCrudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    gap: 8,
  },
  dishCrudEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: radius.md,
    paddingVertical: 7,
  },
  dishCrudEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  dishCrudDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: radius.md,
    paddingVertical: 7,
  },
  dishCrudDeleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  dishCrudDetailBtn: {
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: radius.md,
    paddingVertical: 7,
  },
  dishCrudDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },

  /* Empty State */
  cleanEmptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  cleanEmptyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  cleanEmptySub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  centerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 6,
  },
  centerLoadingText: {
    fontSize: 11.5,
    color: colors.textMuted,
  },

  /* Tab 4: Activity Library Styles */
  activityTopBanner: {
    backgroundColor: '#0f172a',
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
  },
  activityBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  activityBannerSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  activityPresetsScroll: {
    flexDirection: 'row',
    marginTop: 4,
  },
  activityPresetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 6,
  },
  activityPresetBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  activityPresetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  activityPresetBtnTextActive: {
    color: '#ffffff',
  },
  focusedCalcCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#0284c7',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  focusedCalcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focusedCalcTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  focusedCalcCategory: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  focusedCalcResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  focusedCalcResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  focusedCalcBurnedVal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#ea580c',
  },
  focusedCalcBurnedSub: {
    fontSize: 10.5,
    color: '#9a3412',
    fontWeight: '600',
  },
  focusedRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ea580c',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexShrink: 0,
  },
  focusedRecordBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* Tab 5: Web-like 4 Summary Cards & Logs Styles */
  webSummaryCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  webSummaryCard: {
    flexGrow: 1,
    flexBasis: '47%',
    maxWidth: '50%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'center',
  },
  webSummaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.4,
  },
  webSummaryValue: {
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 3,
  },
  webSummaryUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  webSummarySub: {
    fontSize: 9.5,
    color: '#64748b',
    textAlign: 'center',
  },
  logFilterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  logFilterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logFilterTabActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  logFilterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  logFilterTabTextActive: {
    color: '#0284c7',
    fontWeight: '700',
  },
  logCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  logCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logCardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
  },
  logActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  logActionDeleteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  logActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});

