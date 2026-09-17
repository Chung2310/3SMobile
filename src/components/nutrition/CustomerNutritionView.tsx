import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Circle,
  Droplets,
  Flame,
  Layers,
  Lightbulb,
  PlusCircle,
  Search,
  Utensils,
} from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import type { MealBlock, NutritionDaySummary, NutritionLogItem, NutritionPlanData } from '@/types/nutrition';
import { api } from '@/services/api/client';
import { useAuth } from '@/context/AuthContext';
import { asRecords, readNumber, readText } from '@/services/journey';
import {
  findCurrentWeekAndDay,
  formatDisplayDateVi,
  formatShortDay,
  getTodayYmd,
  normalizePlanToWeeks,
} from '@/utils/nutritionScheduleHelper';
import { FoodLibrarySheet } from './FoodLibrarySheet';
import { NutritionLogModal } from './NutritionLogModal';
import { NutritionMacroBar } from './NutritionMacroBar';

function CustomerCoachNotes({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = useMemo(() => {
    const trimmed = (notes || '').trim();
    if (!trimmed) return { title: 'Lời dặn từ Huấn luyện viên:', body: '' };
    const lines = trimmed.split('\n');
    const firstLine = lines[0].trim();
    const isHeaderLike =
      firstLine.endsWith(':') ||
      firstLine.startsWith('Lời khuyên') ||
      firstLine.startsWith('Lưu ý') ||
      firstLine.startsWith('Hướng dẫn');

    if (isHeaderLike && lines.length > 1) {
      const cleanTitle = firstLine.replace(/^[💡ℹ️✨]\s*/, '').replace(/:$/, '');
      return {
        title: cleanTitle ? `${cleanTitle}:` : 'Lời dặn từ Huấn luyện viên:',
        body: lines.slice(1).join('\n').trim(),
      };
    }
    return {
      title: 'Lời dặn từ Huấn luyện viên:',
      body: trimmed,
    };
  }, [notes]);

  const isLong = (parsed.body || parsed.title).length > 55 || parsed.body.includes('\n');

  return (
    <Pressable
      style={[styles.coachNotesBox, expanded && styles.coachNotesBoxExpanded]}
      onPress={() => isLong && setExpanded((prev) => !prev)}
    >
      <Lightbulb size={18} color={colors.warning} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <View style={styles.coachNotesHeaderRow}>
          <Text style={styles.coachNotesTitle}>{parsed.title}</Text>
          {isLong && (
            <View style={styles.coachNotesPill}>
              <Text style={styles.coachNotesPillText}>{expanded ? 'Thu gọn' : 'Xem thêm'}</Text>
              <ChevronDown
                size={11}
                color={colors.warning}
                style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
              />
            </View>
          )}
        </View>
        {parsed.body ? (
          <Text
            style={[styles.coachNotesText, expanded && styles.coachNotesTextExpanded]}
            numberOfLines={expanded ? undefined : 2}
          >
            {parsed.body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function CustomerNutritionView() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activePlan, setActivePlan] = useState<NutritionPlanData | null>(null);
  const [completedMealIds, setCompletedMealIds] = useState<Record<string, boolean>>({});

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
  const [libraryModalVisible, setLibraryModalVisible] = useState(false);

  // Fetch Customer Journey (which contains published nutritionPlans) & logs
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch Journey
      const journeyRes = await api.get<any>('/api/me/journey');
      const rawPlans = asRecords(journeyRes?.nutritionPlans || journeyRes?.data?.nutritionPlans);

      // Find published plan
      const published = rawPlans.find((p) => p.status === 'PUBLISHED') || rawPlans[0];
      if (published) {
        const mappedPlan: NutritionPlanData = {
          id: readText(published, ['_id', 'id']),
          customerId: readText(published, ['customerId']),
          title: readText(published, ['title', 'name'], 'Thực đơn Dinh dưỡng'),
          targetCalories: readNumber(published, ['targetCalories', 'calories']) || 1800,
          macros: {
            protein: readNumber((published as any)?.macros, ['protein']) || 130,
            carbs: readNumber((published as any)?.macros, ['carbs']) || 180,
            fat: readNumber((published as any)?.macros, ['fat']) || 55,
          },
          status: 'PUBLISHED',
          notes: readText(published, ['notes', 'description']),
          menu: Array.isArray(published.menu) ? (published.menu as any[]) : [],
          dailyPlans: Array.isArray(published.dailyPlans) ? (published.dailyPlans as any[]) : undefined,
          startDate: readText(published, ['startDate']),
          endDate: readText(published, ['endDate']),
          durationDays: readNumber(published, ['durationDays']),
          createdAt: readText(published, ['createdAt']),
          updatedAt: readText(published, ['updatedAt']),
        };
        setActivePlan(mappedPlan);
      } else {
        setActivePlan(null);
      }

      // 2. Fetch or compute today's logs from journey or fallback
      const rawLogs = asRecords(journeyRes?.nutritionLogs || journeyRes?.data?.nutritionLogs);
      const mappedLogs: NutritionLogItem[] = rawLogs.map((l, idx) => ({
        id: readText(l, ['_id', 'id'], `log-${idx}`),
        type: readText(l, ['type']) === 'ACTIVITY' ? 'ACTIVITY' : 'FOOD',
        name: readText(l, ['name', 'title', 'mealName'], 'Bữa ăn'),
        calories: readNumber(l, ['calories', 'totalCalories']) || 0,
        time: readText(l, ['time', 'createdAt']),
        mealType: (readText(l, ['mealType']) as any) || undefined,
        notes: readText(l, ['notes', 'description']),
        macros: (l as any).macros,
      }));

      let consumed = 0;
      let burned = 0;
      let p = 0;
      let c = 0;
      let f = 0;

      mappedLogs.forEach((item) => {
        if (item.type === 'FOOD') {
          consumed += item.calories;
          p += item.macros?.protein || 0;
          c += item.macros?.carbs || 0;
          f += item.macros?.fat || 0;
        } else {
          burned += item.calories;
        }
      });

      setLogs(mappedLogs);
      setSummary({
        consumedCalories: consumed,
        burnedCalories: burned,
        netCalories: consumed - burned,
        protein: Math.round(p),
        carbs: Math.round(c),
        fat: Math.round(f),
      });
    } catch (err) {
      console.error('Lỗi tải thực đơn:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Toggle meal completion
  const handleToggleMeal = (mealKey: string) => {
    setCompletedMealIds((prev) => ({
      ...prev,
      [mealKey]: !prev[mealKey],
    }));
  };

  const weeks = useMemo(() => normalizePlanToWeeks(activePlan), [activePlan]);
  const initialNav = useMemo(() => findCurrentWeekAndDay(weeks), [weeks]);

  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  useEffect(() => {
    setSelectedWeekIdx(initialNav.weekIdx);
    setSelectedDayIdx(initialNav.dayIdx);
  }, [initialNav]);

  const activeWeek = weeks[selectedWeekIdx] || weeks[0];
  const activeDay = activeWeek?.days?.[selectedDayIdx] || activeWeek?.days?.[0];
  const mealsList: MealBlock[] = activeDay?.meals || [];
  const todayYmd = getTodayYmd();
  const totalDays = weeks.reduce((sum, w) => sum + (w.days?.length || 0), 0);

  const isSelectedToday = activeDay?.date === todayYmd;

  const completedMealsCount = useMemo(() => {
    return mealsList.filter(
      (m) =>
        !!completedMealIds[`${selectedWeekIdx}_${selectedDayIdx}_${m.id || m.type}`] ||
        !!completedMealIds[m.type || ''] ||
        !!completedMealIds[m.id]
    ).length;
  }, [mealsList, completedMealIds, selectedWeekIdx, selectedDayIdx]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Banner Quick Actions */}
        <View style={styles.topActionsRow}>
          <Pressable
            style={styles.topActionBtn}
            onPress={() => setLogModalVisible(true)}
          >
            <PlusCircle size={18} color={colors.primary} />
            <Text style={styles.topActionText}>Ghi nhật ký ăn / tập</Text>
          </Pressable>

          <Pressable
            style={[styles.topActionBtn, { borderColor: colors.border }]}
            onPress={() => setLibraryModalVisible(true)}
          >
            <Search size={16} color={colors.warning} />
            <Text style={[styles.topActionText, { color: colors.textMuted }]}>Tra cứu món Việt</Text>
          </Pressable>
        </View>

        {/* Active Plan Card or Empty State */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Đang tải thực đơn dinh dưỡng...</Text>
          </View>
        ) : !activePlan ? (
          <View style={styles.noPlanCard}>
            <View style={styles.noPlanIconCircle}>
              <Utensils size={40} color={colors.primary} />
            </View>
            <Text style={styles.noPlanTitle}>Chưa có thực đơn được giao</Text>
            <Text style={styles.noPlanDesc}>
              Huấn luyện viên của bạn đang xây dựng chế độ dinh dưỡng tối ưu theo thể trạng cá nhân.
              Trong lúc chờ, bạn có thể tự ghi nhật ký ăn uống hằng ngày bằng nút "Ghi nhật ký" bên trên.
            </Text>
          </View>
        ) : (
          <View style={styles.activePlanCard}>
            <View style={styles.planHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.planBadgeRow}>
                  <View style={styles.publishedBadge}>
                    <Text style={styles.publishedBadgeText}>ĐANG ÁP DỤNG</Text>
                  </View>
                  <Text style={styles.planDate}>
                    Cập nhật {new Date(activePlan.updatedAt || Date.now()).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <Text style={styles.planTitle}>{activePlan.title}</Text>
              </View>
            </View>

            {/* Macro Bar */}
            <View style={styles.macroContainer}>
              <NutritionMacroBar
                targetCalories={activePlan.targetCalories}
                macros={activePlan.macros}
              />
            </View>

            {/* Coach's Advice / Notes */}
            {activePlan.notes ? (
              <CustomerCoachNotes notes={activePlan.notes} />
            ) : null}

            {/* Water Reminder Pill */}
            <View style={styles.waterBox}>
              <Droplets size={16} color="#38bdf8" />
              <Text style={styles.waterText}>
                Mục tiêu nước: Hãy uống tối thiểu 2.2L - 2.8L nước mỗi ngày để hỗ trợ trao đổi chất.
              </Text>
            </View>
          </View>
        )}

        {/* Daily Calorie Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryTitleRow}>
              <Flame size={18} color={colors.primary} />
              <Text style={styles.summaryTitle}>Cân Bằng Hôm Nay</Text>
            </View>
            {activePlan && (
              <Text style={styles.summarySub}>Mục tiêu: {activePlan.targetCalories} kcal</Text>
            )}
          </View>

          <View style={styles.calRow}>
            <View style={styles.calCol}>
              <Text style={styles.calLabel}>Nạp vào</Text>
              <Text style={[styles.calValue, { color: colors.primary }]}>
                {summary.consumedCalories}
              </Text>
              <Text style={styles.calUnit}>kcal</Text>
            </View>
            <View style={styles.calDivider} />
            <View style={styles.calCol}>
              <Text style={styles.calLabel}>Tiêu hao</Text>
              <Text style={[styles.calValue, { color: colors.danger }]}>
                -{summary.burnedCalories}
              </Text>
              <Text style={styles.calUnit}>kcal</Text>
            </View>
            <View style={styles.calDivider} />
            <View style={styles.calCol}>
              <Text style={styles.calLabel}>Thực tế</Text>
              <Text style={[styles.calValue, { color: colors.success }]}>
                {summary.netCalories}
              </Text>
              <Text style={styles.calUnit}>kcal</Text>
            </View>
          </View>
        </View>

        {/* LEVEL 1: Week Selector for customer plan (up to 31 days) */}
        {weeks.length > 0 && (
          <View style={styles.customerWeeksSection}>
            <View style={styles.customerDaysHeader}>
              <View style={styles.customerDaysHeaderLeft}>
                <Calendar size={13} color={colors.primary} />
                <Text style={styles.customerDaysTitle}>
                  1. Chọn tuần ({weeks.length} tuần • {totalDays} ngày):
                </Text>
              </View>
              {!isSelectedToday && (
                <Pressable
                  onPress={() => {
                    setSelectedWeekIdx(initialNav.weekIdx);
                    setSelectedDayIdx(initialNav.dayIdx);
                  }}
                  style={styles.backToTodayBtn}
                >
                  <Text style={styles.backToTodayText}>↩ Về hôm nay</Text>
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.customerDaysScroll}
            >
              {weeks.map((week, wIdx) => {
                const isSel = selectedWeekIdx === wIdx;
                return (
                  <Pressable
                    key={`week-${week.weekNumber || wIdx}`}
                    style={[
                      styles.customerWeekTab,
                      isSel && styles.customerWeekTabActive,
                    ]}
                    onPress={() => {
                      setSelectedWeekIdx(wIdx);
                      setSelectedDayIdx(0);
                    }}
                  >
                    <View style={styles.customerDayTabTopRow}>
                      <Text
                        style={[
                          styles.customerWeekTabText,
                          isSel && styles.customerWeekTabTextActive,
                        ]}
                      >
                        {week.name}
                      </Text>
                      {isSel && <View style={styles.weekActiveDot} />}
                    </View>
                    <Text
                      style={[
                        styles.customerWeekTabSub,
                        isSel && styles.customerWeekTabSubActive,
                      ]}
                    >
                      {week.startDate && week.endDate
                        ? `${formatDisplayDateVi(week.startDate, false)} - ${formatDisplayDateVi(week.endDate, false)}`
                        : `${week.days.length} ngày`}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* LEVEL 2: Day Selector for active week */}
        {activeWeek && activeWeek.days.length > 0 && (
          <View style={styles.customerDaysSection}>
            <View style={styles.customerDaysHeader}>
              <View style={styles.customerDaysHeaderLeft}>
                <Layers size={13} color="#0284c7" />
                <Text style={styles.customerDaysTitle}>
                  {weeks.length > 1
                    ? `2. ${activeWeek.name}: Chọn ngày (${activeWeek.days.length} ngày):`
                    : `Lịch thực đơn (${activeWeek.days.length} ngày):`}
                </Text>
              </View>
              {weeks.length <= 1 && !isSelectedToday && (
                <Pressable
                  onPress={() => {
                    setSelectedWeekIdx(initialNav.weekIdx);
                    setSelectedDayIdx(initialNav.dayIdx);
                  }}
                  style={styles.backToTodayBtn}
                >
                  <Text style={styles.backToTodayText}>↩ Về hôm nay</Text>
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.customerDaysScroll}
            >
              {activeWeek.days.map((day, dIdx) => {
                const isSel = selectedDayIdx === dIdx;
                const isToday = day.date === todayYmd;
                return (
                  <Pressable
                    key={`day-${day.dayNumber || dIdx}`}
                    style={[
                      styles.customerDayTab,
                      isSel && styles.customerDayTabActive,
                      isToday && !isSel && styles.customerDayTabToday,
                    ]}
                    onPress={() => setSelectedDayIdx(dIdx)}
                  >
                    <View style={styles.customerDayTabTopRow}>
                      <Text
                        style={[
                          styles.customerDayTabText,
                          isSel && styles.customerDayTabTextActive,
                        ]}
                      >
                        {formatShortDay(day.dayOfWeek)}
                      </Text>
                      {isToday && (
                        <View
                          style={[
                            styles.customerTodayBadge,
                            isSel && styles.customerTodayBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.customerTodayBadgeText,
                              isSel && styles.customerTodayBadgeTextActive,
                            ]}
                          >
                            Hôm nay
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.customerDayTabSub,
                        isSel && styles.customerDayTabSubActive,
                      ]}
                    >
                      {day.date ? formatDisplayDateVi(day.date, false) : `Ngày ${day.dayNumber}`}
                    </Text>
                    <Text
                      style={[
                        styles.customerDayTabMealCount,
                        isSel && styles.customerDayTabMealCountActive,
                      ]}
                    >
                      {day.meals.length} bữa
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 4 Meals Timeline */}
        {mealsList.length > 0 && (
          <View style={styles.mealsSection}>
            <View style={styles.mealsSectionHeader}>
              <Text style={styles.mealsSectionTitle}>
                {activeDay
                  ? `Thực Đơn ${activeDay.dayOfWeek}${
                      activeDay.date ? ` (${formatDisplayDateVi(activeDay.date, false)})` : ''
                    }${weeks.length > 1 ? ` • ${activeWeek?.name || ''}` : ''} (${mealsList.length} bữa)`
                  : `Thực Đơn Chi Tiết (${mealsList.length} bữa)`}
              </Text>
              <Text style={styles.mealsProgressText}>
                Đã ăn: {completedMealsCount}/{mealsList.length} bữa
              </Text>
            </View>

            {mealsList.map((meal, mIdx) => {
              const mealKey = `${selectedWeekIdx}_${selectedDayIdx}_${meal.id || meal.type || mIdx}`;
              const isChecked = !!completedMealIds[mealKey] || (meal.type ? !!completedMealIds[meal.type] : false);
              const items = meal.items || [];

              return (
                <View
                  key={meal.id || `meal-${mIdx}`}
                  style={[
                    styles.mealCard,
                    isChecked && styles.mealCardCompleted,
                  ]}
                >
                  {/* Meal Header */}
                  <View style={styles.mealHeader}>
                    <View style={styles.mealTitleCol}>
                      <View style={styles.mealBadge}>
                        <Text style={styles.mealBadgeText}>{meal.title || meal.name || `Bữa ${mIdx + 1}`}</Text>
                      </View>
                      {meal.timeHint || meal.timeSlot ? (
                        <Text style={styles.mealTimeHint}>{meal.timeHint || meal.timeSlot}</Text>
                      ) : null}
                    </View>

                    <Pressable
                      style={[
                        styles.checkBtn,
                        isChecked && styles.checkBtnActive,
                      ]}
                      onPress={() => handleToggleMeal(mealKey)}
                    >
                      {isChecked ? (
                        <CheckCircle2 size={20} color={colors.success} />
                      ) : (
                        <Circle size={20} color={colors.textMuted} />
                      )}
                      <Text
                        style={[
                          styles.checkBtnText,
                          isChecked && styles.checkBtnTextActive,
                        ]}
                      >
                        {isChecked ? 'Đã ăn' : 'Đánh dấu'}
                      </Text>
                    </Pressable>
                  </View>

                  {/* Food Items List */}
                  {items.length === 0 ? (
                    <Text style={styles.emptyMealText}>Chưa có món ăn trong bữa này.</Text>
                  ) : (
                    <View style={styles.foodItemsList}>
                      {items.map((food) => (
                        <View key={food.id} style={styles.foodItemRow}>
                          <View style={styles.foodBullet} />
                          <View style={styles.foodNameCol}>
                            <Text
                              style={[
                                styles.foodName,
                                isChecked && styles.foodNameCompleted,
                              ]}
                            >
                              {food.name}
                            </Text>
                            <Text style={styles.foodGrams}>{food.grams}g</Text>
                          </View>
                          <View style={styles.foodMacroCol}>
                            <Text style={styles.foodCalories}>{food.calories} kcal</Text>
                            <Text style={styles.foodMacros}>
                              P: {food.protein}g • C: {food.carbs}g • F: {food.fat}g
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Meal Subtotal */}
                  <View style={styles.mealSubtotalRow}>
                    <Text style={styles.mealSubtotalLabel}>Tổng bữa ăn:</Text>
                    <Text style={styles.mealSubtotalValue}>
                      {meal.totalCalories} kcal • P: {meal.totalProtein}g • C: {meal.totalCarbs}g • F: {meal.totalFat}g
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Logs of Today */}
        <View style={styles.logsSection}>
          <Text style={styles.logsSectionTitle}>Nhật Ký Đã Ghi Nhận Hôm Nay</Text>
          {logs.length === 0 ? (
            <View style={styles.emptyLogsCard}>
              <Text style={styles.emptyLogsText}>
                Bạn chưa ghi nhận món ăn hoặc buổi tập ngoài thực đơn hôm nay.
              </Text>
            </View>
          ) : (
            <View style={styles.logsList}>
              {logs.map((log) => {
                const isFood = log.type === 'FOOD';
                return (
                  <View key={log.id} style={styles.logItem}>
                    {isFood ? (
                      <Utensils size={16} color={colors.primary} />
                    ) : (
                      <Flame size={16} color={colors.danger} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logItemName}>{log.name}</Text>
                      {log.notes ? (
                        <Text style={styles.logItemNotes}>{log.notes}</Text>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.logItemCal,
                        { color: isFood ? colors.primary : colors.danger },
                      ]}
                    >
                      {isFood ? `+${log.calories}` : `-${log.calories}`} kcal
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Food Library Bottom Sheet */}
      <FoodLibrarySheet
        visible={libraryModalVisible}
        title="Kho Dinh Dưỡng Món Việt Chuẩn"
        onClose={() => setLibraryModalVisible(false)}
      />

      {/* Quick Nutrition Log Modal */}
      <NutritionLogModal
        visible={logModalVisible}
        customerId={activePlan?.customerId || session?.user?.id || (session?.user as any)?._id}
        onClose={() => setLogModalVisible(false)}
        onSaved={() => {
          loadData();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: spacing.xxl + 40,
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  topActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: radius.sm,
    paddingVertical: 7,
    gap: 4,
  },
  topActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  loadingBox: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  noPlanCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  noPlanIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPlanTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  noPlanDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  activePlanCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  planBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  publishedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  publishedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  planDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  macroContainer: {
    marginVertical: spacing.xs,
  },
  coachNotesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  coachNotesBoxExpanded: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  coachNotesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  coachNotesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.warning,
    flex: 1,
  },
  coachNotesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  coachNotesPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
  },
  coachNotesText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  coachNotesTextExpanded: {
    color: colors.text,
    lineHeight: 19,
  },
  waterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  waterText: {
    fontSize: 12,
    color: '#38bdf8',
    flex: 1,
    lineHeight: 17,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  summarySub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  calCol: {
    alignItems: 'center',
    flex: 1,
  },
  calLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 1,
  },
  calValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  calUnit: {
    fontSize: 9,
    color: colors.textMuted,
  },
  calDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
  },
  /* Customer Week & Day Selector Styles */
  customerWeeksSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 10,
  },
  customerWeekTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    alignItems: 'flex-start',
    minWidth: 95,
  },
  customerWeekTabActive: {
    backgroundColor: '#003B70',
    borderColor: '#003B70',
  },
  customerWeekTabText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003B70',
  },
  customerWeekTabTextActive: {
    color: '#fff',
  },
  weekActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginLeft: 4,
  },
  customerWeekTabSub: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  customerWeekTabSubActive: {
    color: '#BAE6FD',
  },
  customerDaysSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  customerDaysHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerDaysHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  customerDaysTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  backToTodayBtn: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  backToTodayText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },
  customerDaysScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  customerDayTab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minWidth: 70,
  },
  customerDayTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  customerDayTabToday: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  customerDayTabTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerDayTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
  },
  customerDayTabTextActive: {
    color: '#fff',
  },
  customerTodayBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  customerTodayBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  customerTodayBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: colors.primary,
  },
  customerTodayBadgeTextActive: {
    color: '#fff',
  },
  customerDayTabSub: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  customerDayTabSubActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  customerDayTabMealCount: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 1,
  },
  customerDayTabMealCountActive: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  mealsSection: {
    marginBottom: 8,
  },
  mealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mealsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  mealsProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  mealCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  mealCardCompleted: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.03)',
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mealTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mealBadge: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mealBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  mealTimeHint: {
    fontSize: 11,
    color: colors.textMuted,
  },
  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  checkBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  checkBtnTextActive: {
    color: colors.success,
    fontWeight: '700',
  },
  emptyMealText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginVertical: spacing.xs,
  },
  foodItemsList: {
    gap: 6,
    marginBottom: spacing.sm,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 4,
  },
  foodBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  foodNameCol: {
    flex: 1,
  },
  foodName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  foodNameCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  foodGrams: {
    fontSize: 11,
    color: colors.textMuted,
  },
  foodMacroCol: {
    alignItems: 'flex-end',
  },
  foodCalories: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  foodMacros: {
    fontSize: 10,
    color: colors.textMuted,
  },
  mealSubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mealSubtotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  mealSubtotalValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  logsSection: {
    marginBottom: spacing.md,
  },
  logsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyLogsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyLogsText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  logsList: {
    gap: 6,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  logItemNotes: {
    fontSize: 10,
    color: colors.textMuted,
  },
  logItemCal: {
    fontSize: 12,
    fontWeight: '700',
  },
});
