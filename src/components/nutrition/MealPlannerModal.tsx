import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Calendar,
  Check,
  CheckCircle2,
  CircleAlert,
  Coffee,
  Copy,
  FileText,
  Info,
  Layers,
  Moon,
  PlusCircle,
  Send,
  Sparkles,
  Sun,
  SunMedium,
  Trash2,
  Utensils,
  X,
} from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import { AppAlertModal, useAppAlert } from '@/components/AppAlertModal';
import type { CustomerProfile } from '@/types/domain';
import type {
  CalculatedNutrition,
  DailyPlanItem,
  DayMenuPlan,
  MealBlock,
  MealFoodEntry,
  MealType,
  NutritionPlanData,
  WeekMenuPlan,
} from '@/types/nutrition';
import { nutritionService } from '@/services/nutritionService';
import {
  DAYS_OF_WEEK_VI,
  buildWeeksSchedule,
  computeEndDate,
  formatDisplayDateVi,
  formatShortDay,
  formatYmdDate,
  getTodayYmd,
  normalizePlanToWeeks,
} from '@/utils/nutritionScheduleHelper';
import { FoodLibrarySheet } from './FoodLibrarySheet';
import { NutritionMacroBar } from './NutritionMacroBar';

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
  const { alertConfig, showSuccess, showError, showWarning } = useAppAlert();

  // Sub-modal for selecting foods
  const [activeMealIndex, setActiveMealIndex] = useState<number | null>(null);

  // Active items helpers
  const activeWeek = weeks[selectedWeekIdx] || weeks[0];
  const activeDay = activeWeek?.days?.[selectedDayIdx] || activeWeek?.days?.[0];
  const activeMeals: MealBlock[] = activeDay?.meals || [];

  // Initialize or reset form state
  useEffect(() => {
    if (visible) {
      setSelectedWeekIdx(0);
      setSelectedDayIdx(0);

      if (editingPlan) {
        setTitle(editingPlan.title || '');
        setTargetCalories(String(editingPlan.targetCalories || 1800));
        setProteinG(String(editingPlan.macros?.protein || 140));
        setCarbsG(String(editingPlan.macros?.carbs || 180));
        setFatG(String(editingPlan.macros?.fat || 55));
        setStatus(editingPlan.status || 'DRAFT');
        setNotes(editingPlan.notes || '');

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
          customer
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
      }
    }
  }, [visible, editingPlan, customer, initialCalculated]);

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
      const curMeals = [...curDay.meals];
      const target = { ...curMeals[activeMealIndex] };
      const newItems = [...target.items, food];
      target.items = newItems;
      target.totalCalories = Math.round(newItems.reduce((s, i) => s + i.calories, 0));
      target.totalProtein = Math.round(newItems.reduce((s, i) => s + i.protein, 0) * 10) / 10;
      target.totalCarbs = Math.round(newItems.reduce((s, i) => s + i.carbs, 0) * 10) / 10;
      target.totalFat = Math.round(newItems.reduce((s, i) => s + i.fat, 0) * 10) / 10;
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
      const curMeals = [...curDay.meals];
      const target = { ...curMeals[mealIdx] };
      const newItems = target.items.filter((i) => i.id !== foodId);
      target.items = newItems;
      target.totalCalories = Math.round(newItems.reduce((s, i) => s + i.calories, 0));
      target.totalProtein = Math.round(newItems.reduce((s, i) => s + i.protein, 0) * 10) / 10;
      target.totalCarbs = Math.round(newItems.reduce((s, i) => s + i.carbs, 0) * 10) / 10;
      target.totalFat = Math.round(newItems.reduce((s, i) => s + i.fat, 0) * 10) / 10;
      curMeals[mealIdx] = target;
      curDay.meals = curMeals;
      curDays[selectedDayIdx] = curDay;
      curWeek.days = curDays;
      clone[selectedWeekIdx] = curWeek;
      return clone;
    });
  };

  // Copy active day meals to all days in current week
  const handleCopyDayToCurrentWeek = () => {
    if (!activeDay || activeMeals.length === 0 || activeMeals.every((m) => m.items.length === 0)) {
      showWarning('Vui lòng thêm món ăn vào ngày này trước khi sao chép.', 'Chưa có món');
      return;
    }
    setWeeks((prev) => {
      const clone = [...prev];
      const curWeek = { ...clone[selectedWeekIdx] };
      curWeek.days = curWeek.days.map((d, idx) => {
        if (idx === selectedDayIdx) return d;
        return {
          ...d,
          meals: activeMeals.map((m) => ({
            ...m,
            id: `meal_w${selectedWeekIdx + 1}_d${idx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            items: m.items.map((it) => ({ ...it })),
          })),
        };
      });
      clone[selectedWeekIdx] = curWeek;
      return clone;
    });
    showSuccess(
      `Đã áp dụng toàn bộ món ăn của ${activeDay.dayOfWeek} sang cả ${activeWeek?.name}!`,
      'Sao chép thành công'
    );
  };

  // Copy active day meals to ALL weeks (full duration)
  const handleCopyDayToAllWeeks = () => {
    if (!activeDay || activeMeals.length === 0 || activeMeals.every((m) => m.items.length === 0)) {
      showWarning('Vui lòng thêm món ăn vào ngày này trước khi sao chép.', 'Chưa có món');
      return;
    }
    setWeeks((prev) => {
      return prev.map((w, wIdx) => ({
        ...w,
        days: w.days.map((d, dIdx) => {
          if (wIdx === selectedWeekIdx && dIdx === selectedDayIdx) return d;
          return {
            ...d,
            meals: activeMeals.map((m) => ({
              ...m,
              id: `meal_w${wIdx + 1}_d${dIdx + 1}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              items: m.items.map((it) => ({ ...it })),
            })),
          };
        }),
      }));
    });
    showSuccess(
      `Đã áp dụng món ăn của ${activeDay.dayOfWeek} sang toàn bộ ${durationDays} ngày!`,
      'Sao chép thành công'
    );
  };

  // AI auto-generate
  const handleAiAutoFill = async () => {
    const cId = customer?._id || (customer as any)?.id;
    if (!cId) {
      showWarning('Vui lòng chọn học viên để AI phân tích thể trạng.', 'Chưa chọn học viên');
      return;
    }
    try {
      setGeneratingAi(true);
      const draft = await nutritionService.generateAiNutritionDraft(
        cId,
        `Thiết kế thực đơn ${durationDays} ngày cơm Việt cho học viên, calo mục tiêu ${targetCalories} kcal`
      );
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
    const cId = customer?._id || (customer as any)?.id;
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
        notes: notes.trim(),
        menu: menuPayload,
        dailyPlans: dailyPlansPayload,
      };

      let saved: NutritionPlanData;
      if (editingPlan?._id) {
        saved = await nutritionService.updatePlan(editingPlan._id, payload);
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
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Utensils size={18} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.title}>
                  {editingPlan ? 'Chỉnh sửa Thực Đơn' : 'Lập Thực Đơn Mới'}
                </Text>
                <Text style={styles.subtitle}>
                  {customer ? `Học viên: ${customer.fullName}` : 'Thiết kế mâm cơm 4 bữa'}
                </Text>
              </View>
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Calendar size={13} color={colors.primary} />
                  <Text style={styles.durationPresetTitle}>
                    THỜI HẠN ÁP DỤNG ({durationDays} NGÀY)
                  </Text>
                </View>
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
              {Math.abs(diffCal) <= 80 ? (
                <CheckCircle2 size={16} color="#16A34A" />
              ) : diffCal > 80 ? (
                <CircleAlert size={16} color="#DC2626" />
              ) : (
                <Info size={16} color="#0284C7" />
              )}
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
                <View style={styles.daysSelectorHeader}>
                  <View style={styles.daysSelectorHeaderLeft}>
                    <Calendar size={13} color={colors.primary} />
                    <Text style={styles.daysSelectorTitle}>
                      1. PHÂN CẤP THEO TUẦN ({weeks.length} TUẦN • {durationDays} NGÀY):
                    </Text>
                  </View>
                  <Pressable
                    style={styles.copyDayBtn}
                    onPress={handleCopyDayToAllWeeks}
                  >
                    <Copy size={11} color={colors.primary} />
                    <Text style={styles.copyDayBtnText}>Chép sang cả {durationDays}N</Text>
                  </Pressable>
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
                <View style={styles.daysSelectorHeaderLeft}>
                  <Layers size={13} color="#0284c7" />
                  <Text style={styles.daysSelectorTitle}>
                    {weeks.length > 1
                      ? `2. ${activeWeek?.name || 'Tuần'}: Chọn ngày (${activeWeek?.days.length || 0} ngày):`
                      : `Chọn ngày để thiết kế (${activeWeek?.days.length || 0} ngày):`}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    style={styles.aiFillBtn}
                    onPress={handleAiAutoFill}
                    disabled={generatingAi}
                  >
                    {generatingAi ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Sparkles size={11} color="#fff" />
                        <Text style={styles.aiFillBtnText}>AI sinh món</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable style={styles.copyDayBtn} onPress={handleCopyDayToCurrentWeek}>
                    <Copy size={11} color={colors.primary} />
                    <Text style={styles.copyDayBtnText}>Chép tuần</Text>
                  </Pressable>
                </View>
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
                  {/* Meal Header */}
                  <View style={styles.mealHeader}>
                    <View style={styles.mealHeaderLeft}>
                      {meal.type === 'BREAKFAST' ? (
                        <Sun size={18} color={colors.primary} />
                      ) : meal.type === 'LUNCH' ? (
                        <SunMedium size={18} color={colors.primary} />
                      ) : meal.type === 'DINNER' ? (
                        <Moon size={18} color={colors.primary} />
                      ) : (
                        <Coffee size={18} color={colors.primary} />
                      )}
                      <View>
                        <Text style={styles.mealTitle}>{meal.title}</Text>
                        <Text style={styles.mealTimeHint}>{meal.timeHint}</Text>
                      </View>
                    </View>

                    <View style={styles.mealTotalPill}>
                      <Text style={styles.mealTotalCalText}>
                        {meal.totalCalories} kcal
                      </Text>
                    </View>
                  </View>

                  {/* Food Items List */}
                  {meal.items.length > 0 ? (
                    <View style={styles.foodItemsList}>
                      {meal.items.map((item) => (
                        <View key={item.id} style={styles.foodItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.foodItemName} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={styles.foodItemSub}>
                              {item.grams}g • P:{item.protein}g • C:{item.carbs}g • F:{item.fat}g
                            </Text>
                          </View>
                          <Text style={styles.foodItemCal}>{item.calories} kcal</Text>
                          <Pressable
                            hitSlop={8}
                            onPress={() => handleRemoveFood(mealIdx, item.id)}
                            style={styles.foodDeleteBtn}
                          >
                            <Trash2 size={15} color="#EF4444" />
                          </Pressable>
                        </View>
                      ))}
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
                    <PlusCircle size={16} color={colors.primary} />
                    <Text style={styles.addFoodBtnText}>
                      + Thêm món vào {meal.title}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Status Selector */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>TRẠNG THÁI XUẤT BẢN</Text>
            <View style={styles.statusRow}>
              <Pressable
                style={[styles.statusBtn, status === 'DRAFT' && styles.statusBtnActiveDraft]}
                onPress={() => setStatus('DRAFT')}
              >
                <FileText
                  size={16}
                  color={status === 'DRAFT' ? '#D97706' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.statusBtnText,
                    status === 'DRAFT' && { color: '#B45309', fontWeight: '700' },
                  ]}
                >
                  Lưu nháp (Chưa gửi học viên)
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.statusBtn,
                  status === 'PUBLISHED' && styles.statusBtnActivePublish,
                ]}
                onPress={() => setStatus('PUBLISHED')}
              >
                <Send
                  size={16}
                  color={status === 'PUBLISHED' ? '#16A34A' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.statusBtnText,
                    status === 'PUBLISHED' && { color: '#15803D', fontWeight: '700' },
                  ]}
                >
                  Xuất bản ngay cho Học viên
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
                <>
                  <Check size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>
                    {status === 'PUBLISHED' ? 'Xuất bản Thực Đơn' : 'Lưu Thực Đơn'}
                  </Text>
                </>
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
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
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
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  daysSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  daysSelectorHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  daysSelectorTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
  },
  copyDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  copyDayBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  aiFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#4F46E5',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  aiFillBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  dayTabsScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  dayTabPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    minWidth: 70,
  },
  dayTabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTabPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
  },
  dayTabPillTextActive: {
    color: '#fff',
  },
  dayTabSubText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  dayTabSubTextActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  dayTabMetaText: {
    fontSize: 8.5,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
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
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBtnActiveDraft: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusBtnActivePublish: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  statusBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
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
});
