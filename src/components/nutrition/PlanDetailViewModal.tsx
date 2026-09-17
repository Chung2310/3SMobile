import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Droplets,
  FileText,
  Flame,
  Info,
  Layers,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import type { MealBlock, NutritionPlanData } from '@/types/nutrition';
import {
  DAYS_OF_WEEK_VI,
  findCurrentWeekAndDay,
  formatDisplayDateVi,
  formatShortDay,
  getTodayYmd,
  normalizePlanToWeeks,
} from '@/utils/nutritionScheduleHelper';
import { NutritionMacroBar } from './NutritionMacroBar';

interface PlanDetailViewModalProps {
  visible: boolean;
  plan: NutritionPlanData | null;
  onClose: () => void;
  onEdit?: (plan: NutritionPlanData) => void;
}

function parseAdviceNotes(rawNotes: string) {
  const trimmed = (rawNotes || '').trim();
  if (!trimmed) return { title: 'Lời khuyên dinh dưỡng từ PT', body: '' };

  const lines = trimmed.split('\n');
  const firstLine = lines[0].trim();

  const isHeaderLike =
    firstLine.endsWith(':') ||
    firstLine.startsWith('Lời khuyên') ||
    firstLine.startsWith('Lưu ý') ||
    firstLine.startsWith('Hướng dẫn');

  if (isHeaderLike && lines.length > 1) {
    const cleanTitle = firstLine.replace(/^[💡ℹ️✨]\s*/, '').replace(/:$/, '');
    const restBody = lines.slice(1).join('\n').trim();
    return {
      title: cleanTitle || 'Lời khuyên dinh dưỡng từ PT',
      body: restBody,
    };
  }

  if (isHeaderLike && lines.length === 1) {
    const cleanTitle = firstLine.replace(/^[💡ℹ️✨]\s*/, '').replace(/:$/, '');
    return {
      title: cleanTitle || 'Lời khuyên dinh dưỡng từ PT',
      body: '',
    };
  }

  return {
    title: 'Lời khuyên dinh dưỡng từ PT',
    body: trimmed,
  };
}

/**
 * Collapsible Advice / Notes box that limits long lists to 2 lines by default
 */
function PlanDetailNotesCollapsible({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const { title, body } = useMemo(() => parseAdviceNotes(notes), [notes]);
  const displayText = body || title;
  const isLong = displayText.length > 55 || displayText.includes('\n');

  return (
    <Pressable
      style={[styles.notesBox, expanded && styles.notesBoxExpanded]}
      onPress={() => isLong && setExpanded((prev) => !prev)}
    >
      <View style={styles.notesHeader}>
        <View style={styles.notesTitleRow}>
          <Info size={14} color="#0284c7" />
          <Text style={styles.notesTitle} numberOfLines={expanded ? undefined : 1}>
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
              color={expanded ? '#0284c7' : '#0369a1'}
              style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
            />
          </View>
        )}
      </View>

      {body ? (
        <Text
          style={[styles.notesBody, expanded && styles.notesBodyExpanded]}
          numberOfLines={expanded ? undefined : 2}
        >
          {body}
        </Text>
      ) : null}

      {expanded && isLong && (
        <View style={styles.notesBottomAction}>
          <Text style={styles.notesBottomActionText}>Chạm để thu gọn ▴</Text>
        </View>
      )}
    </Pressable>
  );
}

export function PlanDetailViewModal({
  visible,
  plan,
  onClose,
  onEdit,
}: PlanDetailViewModalProps) {
  // Always call all hooks unconditionally at the top level
  const weeks = useMemo(() => (plan ? normalizePlanToWeeks(plan) : []), [plan]);
  const initialNav = useMemo(() => findCurrentWeekAndDay(weeks), [weeks]);

  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  useEffect(() => {
    setSelectedWeekIdx(initialNav.weekIdx);
    setSelectedDayIdx(initialNav.dayIdx);
  }, [initialNav]);

  if (!plan || !visible) {
    return null;
  }

  const isPublished = plan.status === 'PUBLISHED';
  const customerName =
    typeof plan.customerId === 'object' && plan.customerId !== null
      ? (plan.customerId as any).fullName
      : '';

  const now = new Date();
  const startDateObj = plan.startDate ? new Date(plan.startDate) : null;
  const endDateObj = plan.endDate
    ? new Date(plan.endDate)
    : startDateObj
    ? new Date(startDateObj.getTime() + ((plan.durationDays || 7) - 1) * 86400000)
    : null;
  if (endDateObj) endDateObj.setHours(23, 59, 59, 999);

  const isCurrentlyActive = Boolean(
    startDateObj && endDateObj && now >= startDateObj && now <= endDateObj
  );
  const isUpcoming = Boolean(startDateObj && now < startDateObj);

  const activeWeek = weeks[selectedWeekIdx] || weeks[0];
  const activeDay = activeWeek?.days?.[selectedDayIdx] || activeWeek?.days?.[0];
  const currentMeals: MealBlock[] = activeDay?.meals || [];

  const totalDays = weeks.reduce((sum, w) => sum + (w.days?.length || 0), 0);
  const totalMeals = currentMeals.length;
  const totalDishes = currentMeals.reduce(
    (acc, m) => acc + (m.items?.length || 0),
    0
  );
  const todayYmd = getTodayYmd();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerSubtitle}>CHI TIẾT THỰC ĐƠN</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {plan.title}
            </Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <X size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Status & Timing Banner */}
          <View style={styles.metaRow}>
            <View
              style={[
                styles.statusBadge,
                isPublished ? styles.statusBadgePub : styles.statusBadgeDraft,
              ]}
            >
              {isPublished ? (
                <CheckCircle2 size={12} color={colors.success} />
              ) : (
                <FileText size={12} color={colors.textMuted} />
              )}
              <Text
                style={[
                  styles.statusBadgeText,
                  isPublished
                    ? styles.statusBadgeTextPub
                    : styles.statusBadgeTextDraft,
                ]}
              >
                {isPublished ? 'ĐÃ CÔNG BỐ' : 'BẢN NHÁP'}
              </Text>
            </View>

            {isCurrentlyActive && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>🟢 Đang áp dụng kỳ này</Text>
              </View>
            )}
            {isUpcoming && (
              <View style={styles.upcomingPill}>
                <Text style={styles.upcomingPillText}>🔵 Sắp diễn ra</Text>
              </View>
            )}

            {customerName ? (
              <View style={styles.customerPill}>
                <Text style={styles.customerPillText}>Học viên: {customerName}</Text>
              </View>
            ) : null}
          </View>

          {/* Scheduled dates */}
          {startDateObj && endDateObj && (
            <View style={styles.scheduleBox}>
              <Calendar size={14} color={isCurrentlyActive ? colors.success : colors.primary} />
              <Text style={styles.scheduleText}>
                Lịch áp dụng: {startDateObj.toLocaleDateString('vi-VN')} – {endDateObj.toLocaleDateString('vi-VN')}
                {' '}({plan.durationDays || Math.round((endDateObj.getTime() - startDateObj.getTime()) / 86400000) + 1} ngày)
              </Text>
            </View>
          )}

          {/* LEVEL 1: Week Selector (Always visible so user can navigate weeks) */}
          <View style={styles.weeksSelectorSection}>
            <View style={styles.daysSelectorHeader}>
              <Calendar size={13} color={colors.primary} />
              <Text style={styles.daysSelectorTitle}>
                1. CHỌN TUẦN ÁP DỤNG ({weeks.length} TUẦN • {totalDays} NGÀY):
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayTabsScroll}
            >
              {weeks.map((week, wIdx) => {
                const isSel = selectedWeekIdx === wIdx;
                return (
                  <Pressable
                    key={`week-${week.weekNumber || wIdx}`}
                    style={[
                      styles.weekTabPill,
                      isSel && styles.weekTabPillActive,
                    ]}
                    onPress={() => {
                      setSelectedWeekIdx(wIdx);
                      setSelectedDayIdx(0);
                    }}
                  >
                    <View style={styles.dayTabPillRow}>
                      <Text
                        style={[
                          styles.weekTabPillText,
                          isSel && styles.weekTabPillTextActive,
                        ]}
                      >
                        {week.name}
                      </Text>
                      {isSel && <View style={styles.weekActiveDot} />}
                    </View>
                    <Text
                      style={[
                        styles.weekTabSubText,
                        isSel && styles.weekTabSubTextActive,
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

          {/* LEVEL 2: Day Selector within selected week */}
          {activeWeek && activeWeek.days.length > 0 && (
            <View style={styles.daysSelectorSection}>
              <View style={styles.daysSelectorHeader}>
                <Layers size={13} color="#0284c7" />
                <Text style={styles.daysSelectorTitle}>
                  {`2. ${activeWeek.name}: Chọn ngày để xem thực đơn (${activeWeek.days.length} ngày):`}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayTabsScroll}
              >
                {activeWeek.days.map((day, dIdx) => {
                  const isSel = selectedDayIdx === dIdx;
                  const isToday = day.date === todayYmd;
                  const dayKcal = day.meals.reduce(
                    (acc, m) =>
                      acc +
                      (m.totalCalories ||
                        (m.items || []).reduce((s: number, it: any) => s + (it.calories || 0), 0)),
                    0
                  );

                  return (
                    <Pressable
                      key={`day-${day.dayNumber || dIdx}`}
                      style={[
                        styles.dayTabPill,
                        isSel && styles.dayTabPillActive,
                        isToday && !isSel && styles.dayTabPillToday,
                      ]}
                      onPress={() => setSelectedDayIdx(dIdx)}
                    >
                      <View style={styles.dayTabPillRow}>
                        <Text
                          style={[
                            styles.dayTabPillText,
                            isSel && styles.dayTabPillTextActive,
                          ]}
                        >
                          {formatShortDay(day.dayOfWeek)}
                        </Text>
                        {isToday && (
                          <View
                            style={[
                              styles.todayBadge,
                              isSel && styles.todayBadgeActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.todayBadgeText,
                                isSel && styles.todayBadgeTextActive,
                              ]}
                            >
                              Hôm nay
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={[
                          styles.dayTabSubText,
                          isSel && styles.dayTabSubTextActive,
                        ]}
                      >
                        {day.date
                          ? formatDisplayDateVi(day.date, false)
                          : `Ngày ${day.dayNumber}`}
                      </Text>
                      <Text
                        style={[
                          styles.dayTabMetaText,
                          isSel && styles.dayTabMetaTextActive,
                        ]}
                      >
                        {day.meals.length} bữa{dayKcal > 0 ? ` • ${Math.round(dayKcal)}k` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Meals Section Heading */}
          <View style={styles.mealsHeaderRow}>
            <View style={styles.mealsTitleGroup}>
              <Layers size={16} color={colors.primary} />
              <Text style={styles.mealsTitle}>
                {activeDay
                  ? `Thực đơn ${activeDay.dayOfWeek}${
                      activeDay.date ? ` (${formatDisplayDateVi(activeDay.date, false)})` : ''
                    } • ${activeWeek.name} (${totalMeals} bữa • ${totalDishes} món)`
                  : `Thực Đơn Chi Tiết (${totalMeals} bữa • ${totalDishes} món)`}
              </Text>
            </View>
          </View>

          {currentMeals.length === 0 ? (
            <View style={styles.emptyMealsBox}>
              <Utensils size={32} color={colors.textMuted} />
              <Text style={styles.emptyMealsText}>
                Thực đơn này chưa được thêm danh sách món ăn chi tiết.
              </Text>
            </View>
          ) : (
            currentMeals.map((meal, mealIdx) => {
              const mealItems = meal.items || [];
              const mealCal =
                meal.totalCalories ||
                mealItems.reduce((s: number, i: any) => s + (i.calories || 0), 0);
              const mealP =
                meal.totalProtein ||
                mealItems.reduce((s: number, i: any) => s + (i.protein || 0), 0);
              const mealC =
                meal.totalCarbs ||
                mealItems.reduce((s: number, i: any) => s + (i.carbs || 0), 0);
              const mealF =
                meal.totalFat ||
                mealItems.reduce((s: number, i: any) => s + (i.fat || 0), 0);

              return (
                <View key={meal.id || `meal-${mealIdx}`} style={styles.mealBlock}>
                  {/* Meal Header */}
                  <View style={styles.mealBlockHeader}>
                    <View style={styles.mealTitleRow}>
                      <View style={styles.mealIndexCircle}>
                        <Text style={styles.mealIndexText}>{mealIdx + 1}</Text>
                      </View>
                      <View>
                        <Text style={styles.mealBlockTitle}>
                          {meal.title || `Bữa ăn ${mealIdx + 1}`}
                        </Text>
                        {meal.timeHint && (
                          <View style={styles.timeHintRow}>
                            <Clock size={11} color={colors.textMuted} />
                            <Text style={styles.timeHintText}>{meal.timeHint}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.mealCalBadge}>
                      <Text style={styles.mealCalBadgeText}>{Math.round(mealCal)} kcal</Text>
                    </View>
                  </View>

                  {/* Meal Macro Summary */}
                  <View style={styles.mealMacroPillRow}>
                    <Text style={[styles.mealMacroPill, { color: '#2563eb' }]}>
                      P: {Math.round(mealP)}g
                    </Text>
                    <Text style={styles.mealMacroDot}>•</Text>
                    <Text style={[styles.mealMacroPill, { color: '#059669' }]}>
                      C: {Math.round(mealC)}g
                    </Text>
                    <Text style={styles.mealMacroDot}>•</Text>
                    <Text style={[styles.mealMacroPill, { color: '#d97706' }]}>
                      F: {Math.round(mealF)}g
                    </Text>
                  </View>

                  {/* Dishes inside meal */}
                  <View style={styles.dishesList}>
                    {mealItems.length === 0 ? (
                      <Text style={styles.noDishText}>Chưa có món ăn trong bữa này</Text>
                    ) : (
                      mealItems.map((dish: any, dishIdx: number) => (
                        <View
                          key={dish.id || `dish-${dishIdx}`}
                          style={[
                            styles.dishCard,
                            dishIdx === mealItems.length - 1 && { borderBottomWidth: 0 },
                          ]}
                        >
                          <View style={styles.dishTopRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.dishName}>{dish.name}</Text>
                              <Text style={styles.dishGrams}>
                                Định lượng: {dish.grams || 100}g
                              </Text>
                            </View>
                            <View style={styles.dishCalRight}>
                              <Text style={styles.dishCalText}>{dish.calories} kcal</Text>
                              <Text style={styles.dishMacroText}>
                                P:{dish.protein}g · C:{dish.carbs}g · F:{dish.fat}g
                              </Text>
                            </View>
                          </View>

                          {dish.notes ? (
                            <Text style={styles.dishNotes}>💡 {dish.notes}</Text>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                </View>
              );
            })
          )}

          {/* Macro Overview Card */}
          <View style={styles.macroCard}>
            <View style={styles.macroCardHeader}>
              <View>
                <Text style={styles.macroLabel}>TỔNG NĂNG LƯỢNG MỤC TIÊU</Text>
                <View style={styles.calRow}>
                  <Flame size={20} color="#ea580c" />
                  <Text style={styles.targetCaloriesText}>{plan.targetCalories}</Text>
                  <Text style={styles.targetCaloriesUnit}>kcal / ngày</Text>
                </View>
              </View>
            </View>

            <View style={styles.macroDivider} />

            <NutritionMacroBar
              targetCalories={plan.targetCalories}
              macros={plan.macros}
            />

            <View style={styles.macroPillRow}>
              <View style={[styles.macroStatBox, { borderColor: '#93c5fd' }]}>
                <Text style={styles.macroStatLabel}>ĐẠM (PROTEIN)</Text>
                <Text style={[styles.macroStatValue, { color: '#2563eb' }]}>
                  {plan.macros?.protein || 0}g
                </Text>
                <Text style={styles.macroStatSub}>
                  {(plan.macros?.protein || 0) * 4} kcal
                </Text>
              </View>

              <View style={[styles.macroStatBox, { borderColor: '#86efac' }]}>
                <Text style={styles.macroStatLabel}>TINH BỘT (CARB)</Text>
                <Text style={[styles.macroStatValue, { color: '#059669' }]}>
                  {plan.macros?.carbs || 0}g
                </Text>
                <Text style={styles.macroStatSub}>
                  {(plan.macros?.carbs || 0) * 4} kcal
                </Text>
              </View>

              <View style={[styles.macroStatBox, { borderColor: '#fde047' }]}>
                <Text style={styles.macroStatLabel}>CHẤT BÉO (FAT)</Text>
                <Text style={[styles.macroStatValue, { color: '#d97706' }]}>
                  {plan.macros?.fat || 0}g
                </Text>
                <Text style={styles.macroStatSub}>
                  {(plan.macros?.fat || 0) * 9} kcal
                </Text>
              </View>
            </View>
          </View>

          {/* Notes / Advice (Collapsible) */}
          {plan.notes ? <PlanDetailNotesCollapsible notes={plan.notes} /> : null}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {onEdit && (
            <Pressable
              style={styles.editBtn}
              onPress={() => {
                onClose();
                onEdit(plan);
              }}
            >
              <Text style={styles.editBtnText}>Chỉnh Sửa Thực Đơn</Text>
            </Pressable>
          )}
          <Pressable style={styles.closeFooterBtn} onPress={onClose}>
            <Text style={styles.closeFooterBtnText}>Đóng</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 30,
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusBadgePub: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  statusBadgeDraft: {
    backgroundColor: 'rgba(156, 163, 175, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusBadgeTextPub: {
    color: colors.success,
  },
  statusBadgeTextDraft: {
    color: colors.textMuted,
  },
  activePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.success,
  },
  activePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.success,
  },
  upcomingPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  upcomingPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },
  customerPill: {
    backgroundColor: colors.card,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customerPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  scheduleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scheduleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  macroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  macroCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    marginTop: 2,
  },
  targetCaloriesText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.success,
  },
  targetCaloriesUnit: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  macroDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroStatBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  macroStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  macroStatValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  macroStatSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  notesBox: {
    backgroundColor: '#f0f9ff',
    borderRadius: radius.md,
    padding: 11,
    borderWidth: 1,
    borderColor: '#bae6fd',
    gap: 4,
  },
  notesBoxExpanded: {
    borderColor: '#7dd3fc',
    backgroundColor: '#f0f9ff',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  notesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369a1',
    flexShrink: 1,
  },
  expandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  expandPillExpanded: {
    backgroundColor: 'rgba(2, 132, 199, 0.18)',
  },
  expandPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284c7',
  },
  expandPillTextExpanded: {
    color: '#0369a1',
  },
  notesBody: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 17,
    marginTop: 2,
  },
  notesBodyExpanded: {
    lineHeight: 18.5,
  },
  notesBottomAction: {
    alignItems: 'center',
    paddingTop: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(2, 132, 199, 0.15)',
  },
  notesBottomActionText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#0284c7',
  },
  /* Week & Day Selector Styles */
  weeksSelectorSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 4,
  },
  weekTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    alignItems: 'flex-start',
    minWidth: 100,
  },
  weekTabPillActive: {
    backgroundColor: '#003B70',
    borderColor: '#003B70',
  },
  weekTabPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003B70',
  },
  weekTabPillTextActive: {
    color: '#fff',
  },
  weekActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  weekTabSubText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  weekTabSubTextActive: {
    color: '#BAE6FD',
  },
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
    gap: 5,
    marginBottom: 8,
  },
  daysSelectorTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
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
  dayTabPillToday: {
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  dayTabPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dayTabPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
  },
  dayTabPillTextActive: {
    color: '#fff',
  },
  todayBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  todayBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  todayBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: colors.primary,
  },
  todayBadgeTextActive: {
    color: '#fff',
  },
  dayTabSubText: {
    fontSize: 9.5,
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
    color: '#64748B',
    marginTop: 1,
  },
  dayTabMetaTextActive: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  mealsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  mealsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  emptyMealsBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  emptyMealsText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  mealBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  mealBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealIndexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  mealBlockTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.text,
  },
  timeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  timeHintText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  mealCalBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  mealCalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  mealMacroPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealMacroPill: {
    fontSize: 11,
    fontWeight: '600',
  },
  mealMacroDot: {
    fontSize: 10,
    color: colors.border,
  },
  dishesList: {
    paddingHorizontal: 12,
  },
  dishCard: {
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dishTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  dishName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  dishGrams: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  dishCalRight: {
    alignItems: 'flex-end',
  },
  dishCalText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },
  dishMacroText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  dishNotes: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  noDishText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  closeFooterBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    paddingVertical: 11,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeFooterBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
