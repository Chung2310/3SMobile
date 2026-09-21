import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import {
  Camera,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import { AppAlertModal, useAppAlert } from '@/components/AppAlertModal';
import type { CustomerProfile } from '@/types/domain';
import type {
  CalculatedNutrition,
  MealBlock,
  MealFoodEntry,
  NutritionPlanData,
  WeekMenuPlan,
} from '@/types/nutrition';
import { ALLERGY_CHIPS } from '@/types/nutrition';
import { nutritionService } from '@/services/nutritionService';
import { api } from '@/services/api/client';
import { resolveImageUrl } from '@/services/imageUtils';
import {
  buildWeeksSchedule,
  computeEndDate,
  createDefaultDayMeals,
  formatDisplayDateVi,
  formatShortDay,
  formatYmdDate,
  getTodayYmd,
  normalizePlanToWeeks,
} from '@/utils/nutritionScheduleHelper';
import { FoodLibrarySheet } from './FoodLibrarySheet';
import { NutritionMacroBar } from './NutritionMacroBar';
import { DishImageActionSheet } from './DishImageActionSheet';
import { fetchCustomerDetail } from '@/services/customerService';

interface MealPlannerModalProps {
  visible: boolean;
  editingPlan?: NutritionPlanData | null;
  customer?: CustomerProfile | null;
  initialCalculated?: CalculatedNutrition | null;
  onClose: () => void;
  onSaved: (savedPlan: NutritionPlanData) => void;
}

export function MealPlannerModal({
  visible,
  editingPlan,
  customer,
  initialCalculated,
  onClose,
  onSaved,
}: MealPlannerModalProps) {
  // Plan metadata
  const [title, setTitle] = useState('');
  const [targetCalories, setTargetCalories] = useState('1800');
  const [proteinG, setProteinG] = useState('140');
  const [carbsG, setCarbsG] = useState('180');
  const [fatG, setFatG] = useState('55');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');
  const [notes, setNotes] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');

  // Schedule Duration & Date Range (up to 31 days)
  const [startDate, setStartDate] = useState(getTodayYmd());
  const [durationDays, setDurationDays] = useState(7);
  const [endDate, setEndDate] = useState(() => computeEndDate(getTodayYmd(), 7));

  // Hierarchical Week & Day State
  const [weeks, setWeeks] = useState<WeekMenuPlan[]>(() => buildWeeksSchedule(getTodayYmd(), 7));
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [generatedPlanId, setGeneratedPlanId] = useState<string>();
  const { alertConfig, showSuccess, showError, showWarning } = useAppAlert();

  // Sub-modal for selecting foods
  const [activeMealIndex, setActiveMealIndex] = useState<number | null>(null);

  // Target for Dish Image Action Sheet
  const [activeDishImageTarget, setActiveDishImageTarget] = useState<{
    mealIdx: number;
    itemId?: string;
    dishName: string;
    imageUrl?: string;
  } | null>(null);

  // Active Customer Resolution
  const planCustomerDerived = useMemo<CustomerProfile | null>(() => {
    if (customer && (customer._id || (customer as any).id)) {
      return customer;
    }
    if (editingPlan?.customerId) {
      if (typeof editingPlan.customerId === 'object' && editingPlan.customerId !== null) {
        const cObj = editingPlan.customerId as any;
        return {
          _id: cObj._id || cObj.id || '',
          fullName: cObj.fullName || 'Học viên',
          phone: cObj.phone || '',
          avatar: cObj.avatar,
          status: 'ACTIVE',
        } as CustomerProfile;
      }
      return {
        _id: String(editingPlan.customerId),
        fullName: 'Học viên',
        phone: '',
        status: 'ACTIVE',
      } as CustomerProfile;
    }
    return null;
  }, [customer, editingPlan]);

  const [fetchedCustomer, setFetchedCustomer] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    if (!visible) return;
    const rawId = typeof editingPlan?.customerId === 'string' ? editingPlan.customerId : null;
    if (rawId && (!customer || !(customer._id || (customer as any).id))) {
      let active = true;
      fetchCustomerDetail(rawId)
        .then((res) => {
          if (active && res) {
            setFetchedCustomer(res);
          }
        })
        .catch(() => {});
      return () => {
        active = false;
      };
    }
  }, [visible, editingPlan?.customerId, customer]);

  const effectiveCustomerId = useMemo(() => {
    return (
      customer?._id ||
      (customer as any)?.id ||
      fetchedCustomer?._id ||
      (fetchedCustomer as any)?.id ||
      planCustomerDerived?._id ||
      (planCustomerDerived as any)?.id ||
      ''
    );
  }, [customer, fetchedCustomer, planCustomerDerived]);

  const effectiveCustomerName = useMemo(() => {
    if (customer?.fullName) return customer.fullName;
    if (fetchedCustomer?.fullName && fetchedCustomer.fullName !== 'Học viên') {
      return fetchedCustomer.fullName;
    }
    if (planCustomerDerived?.fullName && planCustomerDerived.fullName !== 'Học viên') {
      return planCustomerDerived.fullName;
    }
    return customer?.fullName || fetchedCustomer?.fullName || planCustomerDerived?.fullName || '';
  }, [customer, fetchedCustomer, planCustomerDerived]);

  // Loading state per item when calling AI generator: `${mealIdx}-${itemId}`
  const [generatingItemKey, setGeneratingItemKey] = useState<string | null>(null);

  // Active items helpers
  const activeWeek = weeks[selectedWeekIdx] || weeks[0];
  const activeDay = activeWeek?.days?.[selectedDayIdx] || activeWeek?.days?.[0];
  const activeMeals: MealBlock[] = useMemo(() => activeDay?.meals || [], [activeDay]);

  // Initialize or reset form state
  useEffect(() => {
    if (visible) {
      // Hydrate the persistent native modal from the selected record on opening.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedWeekIdx(0);
      setGeneratedPlanId(undefined);
      setSelectedDayIdx(0);

      if (editingPlan) {
        setTitle(editingPlan.title || '');
        setTargetCalories(String(editingPlan.targetCalories || 1800));
        setProteinG(String(editingPlan.macros?.protein || 140));
        setCarbsG(String(editingPlan.macros?.carbs || 180));
        setFatG(String(editingPlan.macros?.fat || 55));
        setStatus(editingPlan.status || 'DRAFT');
        setNotes(editingPlan.notes || '');

        const existingNotes = editingPlan.notes || '';
        const foundAllergies = ALLERGY_CHIPS.filter((chip) => existingNotes.includes(chip));
        setSelectedAllergies(foundAllergies);

        const initialWeeks = normalizePlanToWeeks(editingPlan);
        const sDate = editingPlan.startDate ? formatYmdDate(new Date(editingPlan.startDate)) : getTodayYmd();
        const totalPlanDays =
          editingPlan.durationDays ||
          initialWeeks.reduce((acc, w) => acc + (w.days?.length || 0), 0) ||
          7;
        const clampedDays = Math.max(1, Math.min(31, totalPlanDays));
        const eDate = editingPlan.endDate
          ? formatYmdDate(new Date(editingPlan.endDate))
          : computeEndDate(sDate, clampedDays);

        setStartDate(sDate);
        setDurationDays(clampedDays);
        setEndDate(eDate);
        setWeeks(initialWeeks.length > 0 ? initialWeeks : buildWeeksSchedule(sDate, clampedDays));
      } else {
        // Create new plan
        const initialCal = initialCalculated?.targetCalories || 1800;
        const initP = initialCalculated?.macros?.protein || 140;
        const initC = initialCalculated?.macros?.carbs || 180;
        const initF = initialCalculated?.macros?.fat || 55;
        const today = getTodayYmd();
        const defDays = 7;
        const computedEnd = computeEndDate(today, defDays);

        setTitle(
          effectiveCustomerName
            ? `Thực đơn ${effectiveCustomerName} (${initialCal} kcal)`
            : customer
              ? `Thực đơn ${customer.fullName} (${initialCal} kcal)`
              : `Kế hoạch dinh dưỡng ${initialCal} kcal`
        );
        setTargetCalories(String(initialCal));
        setProteinG(String(initP));
        setCarbsG(String(initC));
        setFatG(String(initF));
        setStatus('DRAFT');
        setNotes(initialCalculated?.goalLabel || '');
        setStartDate(today);
        setDurationDays(defDays);
        setEndDate(computedEnd);
        setWeeks(buildWeeksSchedule(today, defDays));
        setSelectedAllergies([]);
        setCustomAllergy('');
      }
    }
  }, [visible, editingPlan, customer, initialCalculated, effectiveCustomerName]);

  const toggleAllergy = (chip: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  // Duration Presets (7, 14, 21, 28, 30 days)
  const handleDurationPreset = (days: number) => {
    const clamped = Math.max(1, Math.min(31, days));
    setDurationDays(clamped);
    const newEnd = computeEndDate(startDate, clamped);
    setEndDate(newEnd);
    setWeeks((prev) => buildWeeksSchedule(startDate, clamped, [], prev));
    setSelectedWeekIdx(0);
    setSelectedDayIdx(0);
  };

  // Add food to meal
  const handleSelectFood = (food: MealFoodEntry) => {
    if (activeMealIndex === null) return;
    setWeeks((prev) => {
      const clone = [...prev];
      if (!clone[selectedWeekIdx]) return prev;
      const curWeek = { ...clone[selectedWeekIdx] };
      const curDays = [...curWeek.days];
      if (!curDays[selectedDayIdx]) return prev;
      const curDay = { ...curDays[selectedDayIdx] };
      const curMeals =
        Array.isArray(curDay.meals) && curDay.meals.length > 0
          ? [...curDay.meals]
          : createDefaultDayMeals();

      let target: MealBlock;
      if (curMeals[activeMealIndex]) {
        target = { ...curMeals[activeMealIndex] };
      } else {
        const defaultMeals = createDefaultDayMeals();
        target = defaultMeals[activeMealIndex] || {
          id: `meal_${Date.now()}_${activeMealIndex}`,
          type: 'LUNCH',
          title: `Bữa ${activeMealIndex + 1}`,
          name: `Bữa ${activeMealIndex + 1}`,
          timeHint: '',
          timeSlot: '',
          items: [],
          totalCalories: 0,
          calories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
        };
      }

      const existingItems = Array.isArray(target.items) ? target.items : [];
      const newItems = [...existingItems, food];
      target.items = newItems;
      target.totalCalories = Math.round(newItems.reduce((s, i) => s + (i.calories || 0), 0));
      target.calories = target.totalCalories;
      target.totalProtein = Math.round(newItems.reduce((s, i) => s + (i.protein || 0), 0) * 10) / 10;
      target.totalCarbs = Math.round(newItems.reduce((s, i) => s + (i.carbs || 0), 0) * 10) / 10;
      target.totalFat = Math.round(newItems.reduce((s, i) => s + (i.fat || 0), 0) * 10) / 10;
      curMeals[activeMealIndex] = target;
      curDay.meals = curMeals;
      curDays[selectedDayIdx] = curDay;
      curWeek.days = curDays;
      clone[selectedWeekIdx] = curWeek;
      return clone;
    });
  };

  // Remove food from meal
  const handleRemoveFood = (mealIdx: number, foodId: string) => {
    setWeeks((prev) => {
      const clone = [...prev];
      if (!clone[selectedWeekIdx]) return prev;
      const curWeek = { ...clone[selectedWeekIdx] };
      const curDays = [...curWeek.days];
      if (!curDays[selectedDayIdx]) return prev;
      const curDay = { ...curDays[selectedDayIdx] };
      const curMeals = Array.isArray(curDay.meals) ? [...curDay.meals] : [];
      if (!curMeals[mealIdx]) return prev;
      const target = { ...curMeals[mealIdx] };
      const existingItems = Array.isArray(target.items) ? target.items : [];
      const newItems = existingItems.filter((i) => i.id !== foodId);
      target.items = newItems;
      target.totalCalories = Math.round(newItems.reduce((s, i) => s + (i.calories || 0), 0));
      target.calories = target.totalCalories;
      target.totalProtein = Math.round(newItems.reduce((s, i) => s + (i.protein || 0), 0) * 10) / 10;
      target.totalCarbs = Math.round(newItems.reduce((s, i) => s + (i.carbs || 0), 0) * 10) / 10;
      target.totalFat = Math.round(newItems.reduce((s, i) => s + (i.fat || 0), 0) * 10) / 10;
      curMeals[mealIdx] = target;
      curDay.meals = curMeals;
      curDays[selectedDayIdx] = curDay;
      curWeek.days = curDays;
      clone[selectedWeekIdx] = curWeek;
      return clone;
    });
  };

  // Cập nhật thông tin món ăn (vd: imageUrl)
  const handleUpdateFoodItem = (mealIdx: number, itemId: string, updates: Partial<MealFoodEntry>) => {
    setWeeks((prev) => {
      const clone = [...prev];
      if (!clone[selectedWeekIdx]) return prev;
      const curWeek = { ...clone[selectedWeekIdx] };
      const curDays = [...curWeek.days];
      if (!curDays[selectedDayIdx]) return prev;
      const curDay = { ...curDays[selectedDayIdx] };
      const curMeals = Array.isArray(curDay.meals) ? [...curDay.meals] : [];
      if (!curMeals[mealIdx]) return prev;
      const target = { ...curMeals[mealIdx] };
      const existingItems = Array.isArray(target.items) ? target.items : [];
      target.items = existingItems.map((i) => (i.id === itemId ? { ...i, ...updates } : i));
      curMeals[mealIdx] = target;
      curDay.meals = curMeals;
      curDays[selectedDayIdx] = curDay;
      curWeek.days = curDays;
      clone[selectedWeekIdx] = curWeek;
      return clone;
    });
  };

  // Cập nhật thông tin bữa ăn (vd: imageUrl)
  const handleUpdateMeal = (mealIdx: number, updates: Partial<MealBlock>) => {
    setWeeks((prev) => {
      const clone = [...prev];
      if (!clone[selectedWeekIdx]) return prev;
      const curWeek = { ...clone[selectedWeekIdx] };
      const curDays = [...curWeek.days];
      if (!curDays[selectedDayIdx]) return prev;
      const curDay = { ...curDays[selectedDayIdx] };
      const curMeals = Array.isArray(curDay.meals) ? [...curDay.meals] : [];
      if (!curMeals[mealIdx]) return prev;
      curMeals[mealIdx] = { ...curMeals[mealIdx], ...updates };
      curDay.meals = curMeals;
      curDays[selectedDayIdx] = curDay;
      curWeek.days = curDays;
      clone[selectedWeekIdx] = curWeek;
      return clone;
    });
  };

  // Tạo nhanh ảnh AI cho món ăn (chuẩn hóa tên món và gọi API như Web)
  const handleQuickGenerateAiItem = async (mealIdx: number, item: MealFoodEntry) => {
    const cleanName = item.name.replace(/\([^)]*\)/g, '').trim() || item.name.trim();
    const itemKey = `${mealIdx}-${item.id}`;
    setGeneratingItemKey(itemKey);
    try {
      const res = await api.post<any>('/api/images/meal-image', {
        mealName: cleanName,
        items: [cleanName],
        aspectRatio: '4:3',
        forceRegenerate: Boolean(item.imageUrl),
      });
      const url = res?.imageUrl || res?.data?.imageUrl;
      if (url && typeof url === 'string') {
        handleUpdateFoodItem(mealIdx, item.id, { imageUrl: url });
        showSuccess(`Đã tạo ảnh món "${cleanName}" thành công!`, 'Thành công');
      }
    } catch (err: any) {
      showError(err?.message || 'Không thể tạo ảnh bằng AI.', 'Lỗi tạo ảnh');
    } finally {
      setGeneratingItemKey(null);
    }
  };



  // AI auto-generate
  const handleAiAutoFill = async () => {
    const cId = effectiveCustomerId;
    if (!cId) {
      showWarning('Vui lòng chọn học viên để AI phân tích thể trạng.', 'Chưa chọn học viên');
      return;
    }
    try {
      setGeneratingAi(true);
      const allRestrictions = [...selectedAllergies];
      if (customAllergy.trim()) {
        allRestrictions.push(customAllergy.trim());
      }
      const allergyClause =
        allRestrictions.length > 0
          ? `, kiêng kỵ & dị ứng: ${allRestrictions.join(', ')}`
          : '';
      const draft = await nutritionService.generateAiNutritionDraft(
        cId,
        `Thiết kế thực đơn ${durationDays} ngày cơm Việt cho học viên, calo mục tiêu ${targetCalories} kcal${allergyClause}`, undefined, durationDays
      );
      setGeneratedPlanId(draft._id || draft.id);
      if (draft.menu && Array.isArray(draft.menu) && draft.menu.length > 0 && draft.menu[0]?.days) {
        setWeeks(normalizePlanToWeeks(draft));
      } else if (draft.dailyPlans && draft.dailyPlans.length > 0) {
        setWeeks(normalizePlanToWeeks(draft));
      } else if (draft.menu && draft.menu.length > 0) {
        setWeeks(buildWeeksSchedule(startDate, durationDays, draft.menu));
      }
      if (draft.title) setTitle(draft.title);
      if (draft.notes) setNotes(draft.notes);
      showSuccess(`AI đã tự động sinh thực đơn chi tiết cho ${durationDays} ngày!`, 'Hoàn thành');
    } catch (err: any) {
      showError(err?.message || 'Không thể tạo bằng AI.', 'Lỗi');
    } finally {
      setGeneratingAi(false);
    }
  };

  // Compute total planned calories and macros for current active day
  const totals = useMemo(() => {
    const totalCal = activeMeals.reduce((s, m) => s + (m.totalCalories || 0), 0);
    const totalP = Math.round(activeMeals.reduce((s, m) => s + (m.totalProtein || 0), 0) * 10) / 10;
    const totalC = Math.round(activeMeals.reduce((s, m) => s + (m.totalCarbs || 0), 0) * 10) / 10;
    const totalF = Math.round(activeMeals.reduce((s, m) => s + (m.totalFat || 0), 0) * 10) / 10;
    return { totalCal, totalP, totalC, totalF };
  }, [activeMeals]);

  const targetCalNum = parseFloat(targetCalories) || 1800;
  const pNum = parseFloat(proteinG) || 140;
  const cNum = parseFloat(carbsG) || 180;
  const fNum = parseFloat(fatG) || 55;

  const diffCal = totals.totalCal - targetCalNum;

  const handleSave = async () => {
    if (!title.trim()) {
      showWarning('Vui lòng nhập tên thực đơn.', 'Thiếu thông tin');
      return;
    }
    const cId = effectiveCustomerId;
    if (!cId) {
      showWarning('Vui lòng chọn học viên trước khi lưu thực đơn.', 'Chưa chọn học viên');
      return;
    }

    try {
      setSubmitting(true);

      const menuPayload = weeks.map((w) => ({
        weekNumber: w.weekNumber,
        name: w.name,
        startDate: w.startDate,
        endDate: w.endDate,
        days: w.days.map((d) => ({
          dayNumber: d.dayNumber,
          date: d.date,
          dayOfWeek: d.dayOfWeek,
          meals: d.meals.map((m) => ({
            id: m.id,
            name: m.title || m.name,
            timeSlot: m.timeHint || m.timeSlot,
            calories: m.totalCalories || m.calories || 0,
            items: m.items.map((i) => ({
              name: i.name,
              amount: i.amount || `${i.grams}g`,
              calories: i.calories,
              protein: i.protein,
              carbs: i.carbs,
              fat: i.fat,
              prepTip: i.prepTip || i.notes,
              imageUrl: i.imageUrl,
            })),
            imageUrl: m.imageUrl,
          })),
        })),
      }));

      const dailyPlansPayload = weeks.flatMap((w) =>
        w.days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          dayNumber: d.dayNumber,
          date: d.date,
          meals: d.meals,
        }))
      );

      const allRestrictions = [...selectedAllergies];
      if (customAllergy.trim()) {
        allRestrictions.push(customAllergy.trim());
      }
      const allergyNote =
        allRestrictions.length > 0
          ? `Kiêng kỵ & dị ứng: ${allRestrictions.join(', ')}`
          : '';
      const combinedNotes = [notes.trim(), allergyNote].filter(Boolean).join('\n');

      const payload: Partial<NutritionPlanData> = {
        customerId: cId,
        title: title.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        durationDays,
        targetCalories: targetCalNum,
        macros: {
          protein: pNum,
          carbs: cNum,
          fat: fNum,
        },
        status,
        notes: combinedNotes,
        menu: menuPayload,
        dailyPlans: dailyPlansPayload,
      };

      let saved: NutritionPlanData;
      const savedId = generatedPlanId || editingPlan?._id || editingPlan?.id;
      if (savedId) {
        saved = await nutritionService.updatePlan(savedId, payload);
      } else {
        saved = await nutritionService.createPlan(payload);
      }

      onSaved(saved);
      onClose();
    } catch (err: any) {
      showError(err?.message || 'Không thể lưu thực đơn. Vui lòng thử lại.', 'Lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  const activeMealTitle =
    activeMealIndex !== null && activeMeals[activeMealIndex]
      ? (activeMeals[activeMealIndex].title || activeMeals[activeMealIndex].name || 'bữa ăn')
      : 'bữa ăn';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {editingPlan ? 'Chỉnh sửa thực đơn' : 'Lập thực đơn mới'}
              </Text>
              <Text style={styles.subtitle}>
                {effectiveCustomerName
                  ? `Học viên: ${effectiveCustomerName}`
                  : 'Thiết kế mâm cơm 4 bữa'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title & Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tên thực đơn *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="VD: Thực đơn giảm mỡ 1.800 kcal (Cơm Việt)"
                style={styles.inputField}
              />
            </View>

            {/* Schedule Duration Preset Selection */}
            <View style={styles.durationPresetSection}>
              <View style={styles.durationPresetHeader}>
                <Text style={styles.durationPresetTitle}>
                  THỜI HẠN ÁP DỤNG ({durationDays} NGÀY)
                </Text>
                <Text style={styles.durationDatesText}>
                  {formatDisplayDateVi(startDate, false)} – {formatDisplayDateVi(endDate, false)}
                </Text>
              </View>
              <View style={styles.presetPillsRow}>
                {[7, 14, 21, 28, 30].map((days) => (
                  <Pressable
                    key={days}
                    style={[
                      styles.presetPill,
                      durationDays === days && styles.presetPillActive,
                    ]}
                    onPress={() => handleDurationPreset(days)}
                  >
                    <Text
                      style={[
                        styles.presetPillText,
                        durationDays === days && styles.presetPillTextActive,
                      ]}
                    >
                      {days === 30 ? '1 Tháng' : `${days}N`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* KIÊNG KỴ & DỊ ỨNG */}
            <View style={styles.allergyCard}>
              <View style={styles.allergyCardHeader}>
                <Text style={styles.allergySectionTitle}>KIÊNG KỴ & DỊ ỨNG</Text>
                {selectedAllergies.length > 0 && (
                  <Pressable onPress={() => setSelectedAllergies([])} hitSlop={6}>
                    <Text style={styles.allergyClearText}>Bỏ chọn tất cả</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.allergyChipsWrap}>
                {ALLERGY_CHIPS.map((chip) => {
                  const active = selectedAllergies.includes(chip);
                  return (
                    <Pressable
                      key={chip}
                      style={[
                        styles.allergyChip,
                        active && styles.allergyChipActive,
                      ]}
                      onPress={() => toggleAllergy(chip)}
                    >
                      <Text
                        style={[
                          styles.allergyChipText,
                          active && styles.allergyChipTextActive,
                        ]}
                      >
                        {active ? '✓ ' : '+ '}
                        {chip}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Input nhập thêm phần kiêng khác */}
              <View style={styles.customAllergyWrap}>
                <TextInput
                  value={customAllergy}
                  onChangeText={setCustomAllergy}
                  placeholder="Nhập thêm đồ kiêng khác (VD: kiêng đậu phộng, đồ ngọt, dầu mỡ...)"
                  placeholderTextColor={colors.textMuted}
                  style={styles.customAllergyInput}
                />
              </View>
            </View>

            {/* Target Calories & Macros Row */}
            <Text style={styles.sectionLabel}>MỤC TIÊU DINH DƯỠNG TRONG NGÀY</Text>
            <View style={styles.macroTargetGrid}>
              <View style={styles.macroTargetCol}>
                <Text style={styles.macroTargetLabel}>Calo (kcal)</Text>
                <TextInput
                  value={targetCalories}
                  onChangeText={setTargetCalories}
                  keyboardType="numeric"
                  style={[styles.macroTargetInput, { color: '#EA580C' }]}
                />
              </View>

              <View style={styles.macroTargetCol}>
                <Text style={[styles.macroTargetLabel, { color: '#1D4ED8' }]}>Đạm P (g)</Text>
                <TextInput
                  value={proteinG}
                  onChangeText={setProteinG}
                  keyboardType="numeric"
                  style={styles.macroTargetInput}
                />
              </View>

              <View style={styles.macroTargetCol}>
                <Text style={[styles.macroTargetLabel, { color: '#B45309' }]}>Carb C (g)</Text>
                <TextInput
                  value={carbsG}
                  onChangeText={setCarbsG}
                  keyboardType="numeric"
                  style={styles.macroTargetInput}
                />
              </View>

              <View style={styles.macroTargetCol}>
                <Text style={[styles.macroTargetLabel, { color: '#B91C1C' }]}>Béo F (g)</Text>
                <TextInput
                  value={fatG}
                  onChangeText={setFatG}
                  keyboardType="numeric"
                  style={styles.macroTargetInput}
                />
              </View>
            </View>

            {/* Live Progress Bar comparing Real vs Target */}
            <NutritionMacroBar
              targetCalories={targetCalNum}
              consumedCalories={totals.totalCal}
              macros={{ protein: pNum, carbs: cNum, fat: fNum }}
              consumedMacros={{
                protein: totals.totalP,
                carbs: totals.totalC,
                fat: totals.totalF,
              }}
              title="Tổng calo 4 bữa so với mục tiêu"
            />

            {/* Difference notice badge */}
            <View
              style={[
                styles.diffBanner,
                diffCal > 80 && styles.diffBannerOver,
                diffCal < -150 && styles.diffBannerUnder,
              ]}
            >
              <Text
                style={[
                  styles.diffText,
                  diffCal > 80 && { color: '#B91C1C' },
                  diffCal < -150 && { color: '#0369A1' },
                ]}
              >
                {Math.abs(diffCal) <= 80
                  ? 'Tổng năng lượng các bữa khớp hoàn hảo với mục tiêu!'
                  : diffCal > 0
                  ? `Đang dư +${diffCal} kcal so với mục tiêu kế hoạch.`
                  : `Đang thiếu ${Math.abs(diffCal)} kcal. Hãy bổ sung thêm món ăn.`}
              </Text>
            </View>

            {/* LEVEL 1: Week Selector when plan has multiple weeks */}
            {weeks.length > 1 && (
              <View style={styles.weeksSelectorSection}>
                <View style={styles.weeksSelectorHeader}>
                  <Text style={styles.weeksSelectorTitle}>Phân cấp tuần</Text>
                  <View style={styles.weeksCountBadge}>
                    <Text style={styles.weeksCountBadgeText}>
                      {weeks.length} tuần • {durationDays} ngày
                    </Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dayTabsScroll}
                >
                  {weeks.map((w, wIdx) => {
                    const isSel = selectedWeekIdx === wIdx;
                    return (
                      <Pressable
                        key={`week-${w.weekNumber || wIdx}`}
                        style={[
                          styles.weekTabPill,
                          isSel && styles.weekTabPillActive,
                        ]}
                        onPress={() => {
                          setSelectedWeekIdx(wIdx);
                          setSelectedDayIdx(0);
                        }}
                      >
                        <Text
                          style={[
                            styles.weekTabPillText,
                            isSel && styles.weekTabPillTextActive,
                          ]}
                        >
                          {w.name}
                        </Text>
                        <Text
                          style={[
                            styles.weekTabSubText,
                            isSel && styles.weekTabSubTextActive,
                          ]}
                        >
                          {w.startDate && w.endDate
                            ? `${formatDisplayDateVi(w.startDate, false)} - ${formatDisplayDateVi(w.endDate, false)}`
                            : `${w.days.length} ngày`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* LEVEL 2: Day Selector */}
            <View style={styles.daysSelectorSection}>
              <View style={styles.daysSelectorHeader}>
                <Text style={styles.daysSelectorTitle} numberOfLines={1}>
                  {weeks.length > 1
                    ? `${activeWeek?.name || 'Tuần'}: Chọn ngày`
                    : 'Chọn ngày thiết kế'}
                </Text>
                <View style={styles.daysCountBadge}>
                  <Text style={styles.daysCountBadgeText}>
                    {activeWeek?.days.length || 0} ngày
                  </Text>
                </View>
              </View>

              {/* Hàng nút thao tác rộng rãi, thoáng đãng 50/50 */}
              <View style={styles.daysActionToolbar}>
                <Pressable
                  style={styles.aiFillBtn}
                  onPress={handleAiAutoFill}
                  disabled={generatingAi}
                >
                  {generatingAi ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.aiFillBtnText}>AI sinh món</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.manualAddBtn}
                  onPress={() => setActiveMealIndex(0)}
                >
                  <Text style={styles.manualAddBtnText}>Tạo món thủ công</Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayTabsScroll}
              >
                {activeWeek?.days.map((day, idx) => {
                  const isSel = selectedDayIdx === idx;
                  const dayCal = day.meals.reduce((s, m) => s + (m.totalCalories || 0), 0);
                  const dayDishes = day.meals.reduce((s, m) => s + (m.items || []).length, 0);

                  return (
                    <Pressable
                      key={`day-${day.dayNumber || idx}`}
                      style={[styles.dayTabPill, isSel && styles.dayTabPillActive]}
                      onPress={() => setSelectedDayIdx(idx)}
                    >
                      <Text style={[styles.dayTabPillText, isSel && styles.dayTabPillTextActive]}>
                        {formatShortDay(day.dayOfWeek)}
                      </Text>
                      <Text style={[styles.dayTabSubText, isSel && styles.dayTabSubTextActive]}>
                        {day.date ? formatDisplayDateVi(day.date, false) : `N${day.dayNumber}`}
                      </Text>
                      <Text style={[styles.dayTabMetaText, isSel && styles.dayTabMetaTextActive]}>
                        {dayDishes > 0 ? `${Math.round(dayCal)}k • ${dayDishes}m` : '0 món'}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* 4 MEALS CARDS */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
              {activeDay
                ? `BỮA ĂN ${activeDay.dayOfWeek.toUpperCase()}${
                    activeDay.date ? ` (${formatDisplayDateVi(activeDay.date, false)})` : ''
                  }${weeks.length > 1 ? ` • ${activeWeek?.name || ''}` : ''} (${activeMeals.length} BỮA)`
                : `BỮA ĂN (${activeMeals.length} BỮA)`}
            </Text>

            <View style={styles.mealsList}>
              {activeMeals.map((meal, mealIdx) => (
                <View key={meal.id || `meal-${mealIdx}`} style={styles.mealCard}>
                  {/* Meal Cover Banner (nếu đã có ảnh) */}
                  {meal.imageUrl ? (
                    <View style={styles.mealCoverBanner}>
                      <Image
                        source={{ uri: resolveImageUrl(meal.imageUrl) || meal.imageUrl }}
                        style={styles.mealCoverImg}
                        resizeMode="cover"
                      />
                      <View style={styles.mealCoverActions}>
                        <Pressable
                          style={styles.mealCoverActionBtn}
                          onPress={() =>
                            setActiveDishImageTarget({
                              mealIdx,
                              dishName: meal.title || `Bữa ${mealIdx + 1}`,
                              imageUrl: meal.imageUrl,
                            })
                          }
                        >
                          <Camera size={13} color="#FFFFFF" />
                        </Pressable>
                        <Pressable
                          style={[styles.mealCoverActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.85)' }]}
                          onPress={() => handleUpdateMeal(mealIdx, { imageUrl: undefined })}
                        >
                          <Trash2 size={13} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  {/* Meal Header */}
                  <View style={styles.mealHeader}>
                    <View>
                      <Text style={styles.mealTitle}>{meal.title}</Text>
                      <Text style={styles.mealTimeHint}>{meal.timeHint}</Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {!meal.imageUrl && (
                        <Pressable
                          style={styles.mealCoverEmptyBtn}
                          onPress={() =>
                            setActiveDishImageTarget({
                              mealIdx,
                              dishName: meal.title || `Bữa ${mealIdx + 1}`,
                              imageUrl: undefined,
                            })
                          }
                        >
                          <ImageIcon size={11} color="#16A34A" />
                          <Text style={styles.mealCoverEmptyBtnText}>Ảnh bữa</Text>
                        </Pressable>
                      )}

                      <View style={styles.mealTotalPill}>
                        <Text style={styles.mealTotalCalText}>
                          {meal.totalCalories} kcal
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Food Items List */}
                  {meal.items.length > 0 ? (
                    <View style={styles.foodItemsList}>
                      {meal.items.map((item) => {
                        const itemKey = `${mealIdx}-${item.id}`;
                        const isGenerating = generatingItemKey === itemKey;
                        return (
                          <View key={item.id} style={styles.foodItemRow}>
                            {/* Thumbnail Image Container */}
                            <Pressable
                              style={styles.foodThumbBtn}
                              disabled={isGenerating}
                              onPress={() =>
                                setActiveDishImageTarget({
                                  mealIdx,
                                  itemId: item.id,
                                  dishName: item.name,
                                  imageUrl: item.imageUrl,
                                })
                              }
                            >
                              {isGenerating ? (
                                <View style={styles.foodThumbLoading}>
                                  <ActivityIndicator size="small" color={colors.primary} />
                                </View>
                              ) : item.imageUrl ? (
                                <View style={styles.foodThumbWrap}>
                                  <Image
                                    source={{ uri: resolveImageUrl(item.imageUrl) || item.imageUrl }}
                                    style={styles.foodThumbImg}
                                    resizeMode="cover"
                                  />
                                </View>
                              ) : (
                                <View style={styles.foodThumbPlaceholder}>
                                  <Camera size={13} color="#0284C7" />
                                  <Text style={styles.foodThumbPlaceholderText}>+ Ảnh</Text>
                                </View>
                              )}
                            </Pressable>

                            {/* Food Details */}
                            <View style={{ flex: 1 }}>
                              <Text style={styles.foodItemName} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <Text style={styles.foodItemSub}>
                                {item.grams}g • P:{item.protein}g • C:{item.carbs}g • F:{item.fat}g
                              </Text>
                            </View>

                            {/* Quick AI button if item has no image yet */}
                            {!item.imageUrl && (
                              <Pressable
                                hitSlop={6}
                                style={styles.quickAiBtn}
                                disabled={isGenerating}
                                onPress={() => handleQuickGenerateAiItem(mealIdx, item)}
                              >
                                <Sparkles size={11} color="#16A34A" />
                                <Text style={styles.quickAiBtnText}>AI</Text>
                              </Pressable>
                            )}

                            <Text style={styles.foodItemCal}>{item.calories} kcal</Text>
                            <Pressable
                              hitSlop={8}
                              onPress={() => handleRemoveFood(mealIdx, item.id)}
                              style={styles.foodDeleteBtn}
                            >
                              <Trash2 size={15} color="#EF4444" />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.mealEmptyText}>
                      Chưa có món ăn nào trong bữa này.
                    </Text>
                  )}

                  {/* Add Food Button */}
                  <Pressable
                    style={styles.addFoodBtn}
                    onPress={() => setActiveMealIndex(mealIdx)}
                  >
                    <Text style={styles.addFoodBtnText}>
                      Thêm món vào {meal.title}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Status Selector - Segmented Control tinh tế, nhỏ gọn */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>TRẠNG THÁI XUẤT BẢN</Text>
            <View style={styles.statusSegmentWrap}>
              <Pressable
                style={[
                  styles.statusSegmentBtn,
                  status === 'DRAFT' && styles.statusSegmentBtnActiveDraft,
                ]}
                onPress={() => setStatus('DRAFT')}
              >
                <Text
                  style={[
                    styles.statusSegmentText,
                    status === 'DRAFT' && styles.statusSegmentTextActiveDraft,
                  ]}
                >
                  Lưu nháp
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.statusSegmentBtn,
                  status === 'PUBLISHED' && styles.statusSegmentBtnActivePublish,
                ]}
                onPress={() => setStatus('PUBLISHED')}
              >
                <Text
                  style={[
                    styles.statusSegmentText,
                    status === 'PUBLISHED' && styles.statusSegmentTextActivePublish,
                  ]}
                >
                  Xuất bản
                </Text>
              </Pressable>
            </View>

            {/* Notes Field */}
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={styles.label}>Lời dặn / Ghi chú của PT</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="VD: Uống đủ 2.5L nước, tránh ăn mặn sau 20h..."
                multiline
                numberOfLines={2}
                style={[styles.inputField, { height: 60, textAlignVertical: 'top' }]}
              />
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View style={styles.footerRow}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Đóng</Text>
            </Pressable>

            <Pressable
              style={[styles.saveBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {status === 'PUBLISHED' ? 'Xuất bản Thực Đơn' : 'Lưu Thực Đơn'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Sub-modal: Food Library Picker */}
      <FoodLibrarySheet
        visible={activeMealIndex !== null}
        targetMealTitle={activeMealTitle}
        onClose={() => setActiveMealIndex(null)}
        onSelectFood={handleSelectFood}
      />

      {/* Sub-modal: Dish / Meal Image Action Sheet */}
      {activeDishImageTarget && (
        <DishImageActionSheet
          visible={true}
          dishName={activeDishImageTarget.dishName}
          currentImageUrl={activeDishImageTarget.imageUrl}
          onClose={() => setActiveDishImageTarget(null)}
          onSelectImage={(newUrl) => {
            if (activeDishImageTarget.itemId) {
              handleUpdateFoodItem(activeDishImageTarget.mealIdx, activeDishImageTarget.itemId, { imageUrl: newUrl });
            } else {
              handleUpdateMeal(activeDishImageTarget.mealIdx, { imageUrl: newUrl });
            }
          }}
          onRemoveImage={() => {
            if (activeDishImageTarget.itemId) {
              handleUpdateFoodItem(activeDishImageTarget.mealIdx, activeDishImageTarget.itemId, { imageUrl: undefined });
            } else {
              handleUpdateMeal(activeDishImageTarget.mealIdx, { imageUrl: undefined });
            }
          }}
        />
      )}

      <AppAlertModal {...alertConfig} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '94%',
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
    overflow: 'hidden',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  subtitle: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  scroll: {
    flexGrow: 0,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    width: '100%',
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13.5,
    color: colors.text,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  macroTargetGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  macroTargetCol: {
    flex: 1,
  },
  macroTargetLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  macroTargetInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  diffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
  },
  diffBannerOver: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  diffBannerUnder: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  diffText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#15803D',
    flex: 1,
  },
  /* Duration Preset Section */
  durationPresetSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  durationPresetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  durationPresetTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
  },
  durationDatesText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  presetPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  presetPillTextActive: {
    color: '#FFFFFF',
  },
  /* Week Selector Styles */
  weeksSelectorSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  weeksSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weeksSelectorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  weeksSelectorTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  weekTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    marginRight: 6,
  },
  weekTabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekTabPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  weekTabPillTextActive: {
    color: '#FFFFFF',
  },
  weekTabSubText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  weekTabSubTextActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  /* 7-Day Selector Styles */
  daysSelectorSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 6,
    overflow: 'hidden',
  },
  daysSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  daysSelectorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  daysSelectorTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  daysCountBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
  },
  daysCountBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  daysActionToolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  aiFillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  aiFillBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#fff',
  },
  weeksCountBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
  },
  weeksCountBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0369A1',
  },
  manualAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  manualAddBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  dayTabsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 12,
    paddingVertical: 2,
  },
  dayTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    minWidth: 72,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  dayTabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowOpacity: 0.15,
  },
  dayTabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  dayTabPillTextActive: {
    color: '#fff',
  },
  dayTabSubText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  dayTabSubTextActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  dayTabMetaText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 3,
  },
  dayTabMetaTextActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  mealsList: {
    gap: 10,
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mealHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  mealTimeHint: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  mealTotalPill: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mealTotalCalText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  foodItemsList: {
    gap: 6,
    marginBottom: 8,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 8,
  },
  foodThumbBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  foodThumbWrap: {
    width: '100%',
    height: '100%',
  },
  foodThumbImg: {
    width: '100%',
    height: '100%',
  },
  foodThumbLoading: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
  },
  foodThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  foodThumbPlaceholderText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#0284C7',
  },
  quickAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  quickAiBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  mealCoverBanner: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  mealCoverImg: {
    width: '100%',
    height: '100%',
  },
  mealCoverActions: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    gap: 6,
  },
  mealCoverActionBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    padding: 5,
  },
  mealCoverEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  mealCoverEmptyBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  foodItemName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
  foodItemSub: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  foodItemCal: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  foodDeleteBtn: {
    padding: 4,
  },
  mealEmptyText: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  addFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
  },
  addFoodBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  statusSegmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 6,
  },
  statusSegmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  statusSegmentBtnActiveDraft: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  statusSegmentBtnActivePublish: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  statusSegmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusSegmentTextActiveDraft: {
    color: '#B45309',
    fontWeight: '700',
  },
  statusSegmentTextActivePublish: {
    color: '#15803D',
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  cancelBtn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: '#16A34A',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  allergyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginBottom: spacing.sm,
  },
  allergyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allergyClearText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  allergySectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003B70',
    letterSpacing: 0.5,
  },
  allergyChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  allergyChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
  },
  allergyChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
  },
  allergyChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  allergyChipTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  customAllergyWrap: {
    marginTop: 4,
  },
  customAllergyInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.text,
  },
});
