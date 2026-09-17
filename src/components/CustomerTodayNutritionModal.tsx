import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

export interface FoodItem {
  name: string;
  amount?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  prepTip?: string;
  imageUrl?: string;
}

export interface Meal {
  id?: string;
  name: string;
  timeSlot?: string;
  calories?: number;
  imageUrl?: string;
  items?: FoodItem[];
}

export interface DayPlan {
  dayNumber?: number;
  dayOfWeek?: string;
  date?: string;
  meals: Meal[];
}

export interface CustomerTodayNutritionModalProps {
  visible: boolean;
  plan: any | null;
  customerName?: string;
  onClose: () => void;
}

const VIETNAMESE_DAYS = [
  'Chủ Nhật',
  'Thứ Hai',
  'Thứ Ba',
  'Thứ Tư',
  'Thứ Năm',
  'Thứ Sáu',
  'Thứ Bảy',
];

const EMPTY_DAY_PLAN: DayPlan = { meals: [] };

export function CustomerTodayNutritionModal({
  visible,
  plan,
  customerName,
  onClose,
}: CustomerTodayNutritionModalProps) {
  // 1. Xác định thời gian thực hiện tại
  const now = useMemo(() => new Date(), []);
  const currentDayOfWeekName = VIETNAMESE_DAYS[now.getDay()];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeNumber = currentHour * 60 + currentMinute;
  const currentTimeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

  // 2. Trích xuất danh sách các ngày trong thực đơn (hỗ trợ nhiều cấu trúc khác nhau từ API)
  const normalizedDays: DayPlan[] = useMemo(() => {
    if (!plan) return [];

    // Cấu trúc 1: Hierarchical weeks (menu[].days[])
    if (Array.isArray(plan.menu) && plan.menu.length > 0 && plan.menu[0]?.days) {
      const allDays: DayPlan[] = [];
      plan.menu.forEach((week: any) => {
        if (Array.isArray(week.days)) {
          week.days.forEach((day: any) => {
            allDays.push({
              dayNumber: day.dayNumber,
              dayOfWeek: day.dayOfWeek || `Ngày ${day.dayNumber}`,
              date: day.date,
              meals: Array.isArray(day.meals) ? day.meals : [],
            });
          });
        }
      });
      if (allDays.length > 0) return allDays;
    }

    // Cấu trúc 2: dailyPlans array (7 ngày trong tuần)
    if (Array.isArray(plan.dailyPlans) && plan.dailyPlans.length > 0) {
      return plan.dailyPlans.map((d: any, idx: number) => ({
        dayNumber: idx + 1,
        dayOfWeek: d.dayOfWeek || VIETNAMESE_DAYS[(idx + 1) % 7],
        date: d.date,
        meals: Array.isArray(d.meals) ? d.meals : [],
      }));
    }

    // Cấu trúc 3: menu là mảng các ngày (menu[].meals)
    if (Array.isArray(plan.menu) && plan.menu.length > 0 && plan.menu[0]?.meals) {
      return plan.menu.map((d: any, idx: number) => ({
        dayNumber: idx + 1,
        dayOfWeek: d.dayOfWeek || `Ngày ${idx + 1}`,
        date: d.date,
        meals: Array.isArray(d.meals) ? d.meals : [],
      }));
    }

    // Cấu trúc 4: menu là danh sách bữa ăn áp dụng chung
    if (Array.isArray(plan.menu) && plan.menu.length > 0) {
      return [
        {
          dayNumber: 1,
          dayOfWeek: 'Hàng ngày',
          meals: plan.menu.map((m: any, idx: number) => ({
            id: m.id || m._id || String(idx),
            name: m.name || m.meal || `Bữa ${idx + 1}`,
            timeSlot: m.timeSlot || m.time || '',
            calories: m.calories || 0,
            imageUrl: m.imageUrl,
            items: Array.isArray(m.items) ? m.items : [],
          })),
        },
      ];
    }

    return [];
  }, [plan]);

  // 3. Tìm vị trí ngày hôm nay trong danh sách ngày
  const todayDayIndex = useMemo(() => {
    if (normalizedDays.length === 0) return 0;

    const indexByDayOfWeek = normalizedDays.findIndex((d) =>
      d.dayOfWeek?.toLowerCase().includes(currentDayOfWeekName.toLowerCase())
    );
    if (indexByDayOfWeek !== -1) return indexByDayOfWeek;

    const todayIso = now.toISOString().slice(0, 10);
    const indexByDate = normalizedDays.findIndex((d) => d.date?.startsWith(todayIso));
    if (indexByDate !== -1) return indexByDate;

    const dayMapIndex = now.getDay() === 0 ? 6 : now.getDay() - 1;
    if (normalizedDays[dayMapIndex]) return dayMapIndex;

    return 0;
  }, [normalizedDays, currentDayOfWeekName, now]);

  // Tab ngày đang được xem (mặc định mở ra là ngày HÔM NAY)
  const [userSelectedDayIdx, setUserSelectedDayIdx] = useState<number | null>(null);
  const selectedDayIdx = userSelectedDayIdx ?? todayDayIndex;

  const activeDay = useMemo(
    () => normalizedDays[selectedDayIdx] || normalizedDays[0] || EMPTY_DAY_PLAN,
    [normalizedDays, selectedDayIdx]
  );
  const isViewingToday = selectedDayIdx === todayDayIndex;

  // Chế độ xem: 'realtime' (chỉ bữa hiện tại - mặc định) | 'all' (tất cả bữa trong ngày)
  const [viewMode, setViewMode] = useState<'realtime' | 'all'>('realtime');
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Record<number, boolean>>({});

  // Phân tích khoảng thời gian (hh:mm - hh:mm)
  const parseTimeRange = (timeSlot?: string) => {
    if (!timeSlot) return null;
    const parts = timeSlot.split(/[-–]/).map((s) => s.trim());
    if (parts.length < 2) return null;

    const [startH, startM] = parts[0].split(':').map(Number);
    const [endH, endM] = parts[1].split(':').map(Number);
    if (isNaN(startH) || isNaN(endH)) return null;

    return {
      startMinutes: startH * 60 + (startM || 0),
      endMinutes: endH * 60 + (endM || 0),
    };
  };

  // Xác định bữa ăn phù hợp nhất với thời điểm hiện tại (Real-time active meal)
  const realtimeMealInfo = useMemo(() => {
    const meals = activeDay.meals || [];
    if (meals.length === 0) return null;

    if (!isViewingToday) {
      return {
        meal: meals[0],
        index: 0,
        status: 'SELECTED' as const,
        label: meals[0].name,
      };
    }

    // 1. Kiểm tra bữa nào đang trong khung giờ
    for (let i = 0; i < meals.length; i++) {
      const range = parseTimeRange(meals[i].timeSlot);
      if (range && currentTimeNumber >= range.startMinutes && currentTimeNumber <= range.endMinutes) {
        return {
          meal: meals[i],
          index: i,
          status: 'CURRENT' as const,
          label: 'Đang trong giờ ăn',
        };
      }
    }

    // 2. Tìm bữa tiếp theo sắp tới
    for (let i = 0; i < meals.length; i++) {
      const range = parseTimeRange(meals[i].timeSlot);
      if (range && range.startMinutes > currentTimeNumber) {
        return {
          meal: meals[i],
          index: i,
          status: 'UPCOMING' as const,
          label: 'Bữa ăn tiếp theo',
        };
      }
    }

    // 3. Fallback theo giờ nếu không có timeSlot
    let fallbackIdx = 0;
    if (currentHour < 10) fallbackIdx = 0;
    else if (currentHour < 14) fallbackIdx = Math.min(1, meals.length - 1);
    else if (currentHour < 17) fallbackIdx = Math.min(2, meals.length - 1);
    else fallbackIdx = Math.min(meals.length > 3 ? 3 : 2, meals.length - 1);

    const isAfterAll = currentHour >= 21;
    return {
      meal: meals[fallbackIdx],
      index: fallbackIdx,
      status: isAfterAll ? ('COMPLETED' as const) : ('CURRENT' as const),
      label: isAfterAll ? 'Bữa ăn cuối ngày hôm nay' : 'Bữa ăn hiện tại',
    };
  }, [activeDay, currentTimeNumber, currentHour, isViewingToday]);

  const toggleMeal = (mIdx: number) => {
    setExpandedMeals((prev) => ({
      ...prev,
      [mIdx]: !prev[mIdx],
    }));
  };

  // Tổng calo ngày đang xem
  const dayTotalCalories = useMemo(() => {
    return activeDay.meals.reduce((total, m) => {
      const mealKcal =
        m.calories ||
        m.items?.reduce((s, i) => s + (Number(i.calories) || 0), 0) ||
        0;
      return total + mealKcal;
    }, 0);
  }, [activeDay]);

  const currentMeal = realtimeMealInfo?.meal;

  if (!plan) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* ================= HEADER TỐI MÀU HIỆN ĐẠI ================= */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.metaRow}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>
                    Thời Gian Thực • {currentTimeString}
                  </Text>
                </View>
                <Text style={styles.dayOfWeekText}>{activeDay.dayOfWeek}</Text>
              </View>

              <View style={styles.titleRow}>
                <Ionicons name="restaurant-outline" size={17} color="#38BDF8" style={{ marginRight: 6 }} />
                <Text style={styles.headerTitle} numberOfLines={1}>
                  Hôm nay ăn gì: <Text style={styles.headerCustomerName}>{customerName || 'Học viên'}</Text>
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Đóng popup"
            >
              <Feather name="x" size={18} color="#94A3B8" />
            </Pressable>
          </View>

          {/* ================= THANH ĐIỀU HƯỚNG GỌN GÀNG ================= */}
          <View style={styles.navBar}>
            {/* Chuyển đổi chế độ: Bữa hiện tại / Cả ngày */}
            <View style={styles.modeSegment}>
              <Pressable
                style={[styles.modeBtn, viewMode === 'realtime' && styles.modeBtnActive]}
                onPress={() => setViewMode('realtime')}
              >
                <Ionicons
                  name="flash-outline"
                  size={13}
                  color={viewMode === 'realtime' ? '#0284C7' : '#64748B'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    viewMode === 'realtime' && styles.modeBtnTextActive,
                  ]}
                >
                  Bữa Hiện Tại
                </Text>
              </Pressable>

              <Pressable
                style={[styles.modeBtn, viewMode === 'all' && styles.modeBtnActive]}
                onPress={() => setViewMode('all')}
              >
                <Feather
                  name="file-text"
                  size={12}
                  color={viewMode === 'all' ? '#0284C7' : '#64748B'}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.modeBtnText,
                    viewMode === 'all' && styles.modeBtnTextActive,
                  ]}
                >
                  Cả Ngày ({activeDay.meals.length} bữa)
                </Text>
              </Pressable>
            </View>

            {/* Chọn ngày khác */}
            <View style={styles.daySelectorWrap}>
              <Pressable
                style={[styles.daySelectorBtn, showDaySelector && styles.daySelectorBtnActive]}
                onPress={() => setShowDaySelector((prev) => !prev)}
              >
                <Feather name="calendar" size={13} color={showDaySelector ? '#0284C7' : '#475569'} />
                <Text
                  style={[
                    styles.daySelectorBtnText,
                    showDaySelector && styles.daySelectorBtnTextActive,
                  ]}
                >
                  {isViewingToday ? 'Hôm nay' : activeDay.dayOfWeek}
                </Text>
                <Feather
                  name={showDaySelector ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={showDaySelector ? '#0284C7' : '#475569'}
                />
              </Pressable>

              {!isViewingToday && (
                <Pressable
                  style={styles.returnTodayBtn}
                  onPress={() => {
                    setUserSelectedDayIdx(null);
                    setShowDaySelector(false);
                  }}
                >
                  <Text style={styles.returnTodayText}>Về Hôm Nay</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* DANH SÁCH CÁC NGÀY TRONG TUẦN (MỞ KHI BẤM CHỌN NGÀY) */}
          {showDaySelector && (
            <View style={styles.dayListBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayListScroll}>
                {normalizedDays.map((d, idx) => {
                  const isToday = idx === todayDayIndex;
                  const isSelected = idx === selectedDayIdx;

                  return (
                    <Pressable
                      key={idx}
                      style={[
                        styles.dayPill,
                        isSelected && styles.dayPillSelected,
                        isToday && !isSelected && styles.dayPillToday,
                      ]}
                      onPress={() => {
                        setUserSelectedDayIdx(idx);
                        setShowDaySelector(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dayPillText,
                          isSelected && styles.dayPillTextSelected,
                          isToday && !isSelected && styles.dayPillTextToday,
                        ]}
                      >
                        {d.dayOfWeek}
                        {isToday ? ' (Hôm nay)' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ================= NỘI DUNG CHÍNH ================= */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* CHẾ ĐỘ 1: BỮA HIỆN TẠI (THỜI GIAN THỰC) */}
            {viewMode === 'realtime' && (
              <View>
                {currentMeal ? (
                  <View style={styles.realtimeBox}>
                    {/* Header bữa ăn hiện tại */}
                    <View style={styles.realtimeBoxHeader}>
                      <View style={styles.realtimeBoxHeaderLeft}>
                        <View style={styles.realtimeStatusBadge}>
                          <Ionicons name="sparkles" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                          <Text style={styles.realtimeStatusText}>
                            {realtimeMealInfo.label}
                          </Text>
                        </View>
                        <Text style={styles.realtimeMealName}>{currentMeal.name}</Text>
                      </View>

                      <View style={styles.realtimeBoxHeaderRight}>
                        {!!currentMeal.timeSlot && (
                          <View style={styles.timeSlotWrap}>
                            <Feather name="clock" size={12} color="#64748B" style={{ marginRight: 4 }} />
                            <Text style={styles.timeSlotText}>{currentMeal.timeSlot}</Text>
                          </View>
                        )}
                        {!!currentMeal.calories && (
                          <View style={styles.mealKcalPill}>
                            <Ionicons name="flame" size={12} color="#E11D48" style={{ marginRight: 3 }} />
                            <Text style={styles.mealKcalText}>{currentMeal.calories} kcal</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Danh sách món ăn trong bữa */}
                    <View style={styles.foodListWrap}>
                      <Text style={styles.foodSectionTitle}>
                        MÓN ĂN & ĐỊNH LƯỢNG ({currentMeal.items?.length || 0} MÓN):
                      </Text>

                      {Array.isArray(currentMeal.items) && currentMeal.items.length > 0 ? (
                        <View style={styles.foodItemsCol}>
                          {currentMeal.items.map((item, idx) => (
                            <View key={idx} style={styles.foodItemRow}>
                              <View style={styles.foodItemInfo}>
                                <Text style={styles.foodItemName}>{item.name}</Text>
                                {!!item.prepTip && (
                                  <View style={styles.prepTipRow}>
                                    <Ionicons name="bulb-outline" size={12} color="#64748B" style={{ marginRight: 4 }} />
                                    <Text style={styles.prepTipText}>{item.prepTip}</Text>
                                  </View>
                                )}
                              </View>

                              <View style={styles.foodItemMeta}>
                                {!!item.amount && (
                                  <View style={styles.amountPill}>
                                    <Text style={styles.amountPillText}>{item.amount}</Text>
                                  </View>
                                )}
                                {!!item.calories && (
                                  <Text style={styles.itemKcalText}>{item.calories} kcal</Text>
                                )}
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyFoodText}>
                          Chưa có chi tiết món ăn cụ thể cho bữa này.
                        </Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyNotice}>
                    <Text style={styles.emptyNoticeText}>
                      Không tìm thấy dữ liệu bữa ăn cho ngày hôm nay.
                    </Text>
                  </View>
                )}

                {/* Nút xem thêm các bữa khác */}
                {activeDay.meals.length > 1 && (
                  <Pressable
                    style={styles.viewMoreMealsBtn}
                    onPress={() => setViewMode('all')}
                  >
                    <Feather name="file-text" size={13} color="#0284C7" style={{ marginRight: 6 }} />
                    <Text style={styles.viewMoreMealsBtnText}>
                      Xem thêm {activeDay.meals.length - 1} bữa khác trong ngày hôm nay
                    </Text>
                    <Feather name="chevron-down" size={13} color="#0284C7" style={{ marginLeft: 4 }} />
                  </Pressable>
                )}
              </View>
            )}

            {/* CHẾ ĐỘ 2: TOÀN BỘ CÁC BỮA TRONG NGÀY (ACCORDION) */}
            {viewMode === 'all' && (
              <View style={styles.allMealsWrap}>
                <View style={styles.allMealsHeaderRow}>
                  <Text style={styles.allMealsHeaderTitle}>
                    Toàn bộ thực đơn {activeDay.dayOfWeek} ({activeDay.meals.length} bữa)
                  </Text>
                  <Pressable
                    style={styles.backToRealtimeBtn}
                    onPress={() => setViewMode('realtime')}
                  >
                    <Ionicons name="flash-outline" size={12} color="#0284C7" style={{ marginRight: 3 }} />
                    <Text style={styles.backToRealtimeText}>Quay lại bữa hiện tại</Text>
                  </Pressable>
                </View>

                {activeDay.meals.map((meal, mIdx) => {
                  const isCurrent = realtimeMealInfo?.index === mIdx && isViewingToday;
                  const isExpanded = Boolean(expandedMeals[mIdx]);

                  return (
                    <View
                      key={meal.id || mIdx}
                      style={[
                        styles.mealCard,
                        isCurrent && styles.mealCardCurrent,
                      ]}
                    >
                      {/* Tiêu đề bữa ăn */}
                      <Pressable
                        style={styles.mealCardHeader}
                        onPress={() => toggleMeal(mIdx)}
                      >
                        <View style={styles.mealCardHeaderLeft}>
                          <View
                            style={[
                              styles.mealNumberCircle,
                              isCurrent && styles.mealNumberCircleCurrent,
                            ]}
                          >
                            <Text style={styles.mealNumberText}>{mIdx + 1}</Text>
                          </View>

                          <View style={styles.mealTitleCol}>
                            <View style={styles.mealTitleRow}>
                              <Text style={styles.mealName}>{meal.name}</Text>
                              {isCurrent && (
                                <View style={styles.currentTag}>
                                  <View style={styles.currentDot} />
                                  <Text style={styles.currentTagText}>Giờ này</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.mealSubtitle}>
                              {meal.timeSlot ? `${meal.timeSlot} • ` : ''}
                              {meal.items?.length || 0} món
                            </Text>
                          </View>
                        </View>

                        <View style={styles.mealCardHeaderRight}>
                          {!!meal.calories && (
                            <Text style={styles.allMealKcalText}>{meal.calories} kcal</Text>
                          )}
                          <View style={styles.expandToggleBtn}>
                            <Text style={styles.expandToggleText}>
                              {isExpanded ? 'Thu gọn' : 'Xem món'}
                            </Text>
                            <Feather
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={12}
                              color="#0284C7"
                              style={{ marginLeft: 3 }}
                            />
                          </View>
                        </View>
                      </Pressable>

                      {/* Chi tiết danh sách món khi mở rộng */}
                      {isExpanded && (
                        <View style={styles.mealExpandedBody}>
                          {Array.isArray(meal.items) && meal.items.length > 0 ? (
                            <View style={styles.expandedItemsList}>
                              {meal.items.map((item, iIdx) => (
                                <View key={iIdx} style={styles.expandedItemRow}>
                                  <View style={styles.expandedItemInfo}>
                                    <Text style={styles.expandedItemName}>{item.name}</Text>
                                    {!!item.prepTip && (
                                      <View style={styles.prepTipRow}>
                                        <Ionicons name="bulb-outline" size={11} color="#64748B" style={{ marginRight: 4 }} />
                                        <Text style={styles.prepTipText}>{item.prepTip}</Text>
                                      </View>
                                    )}
                                  </View>

                                  <View style={styles.expandedItemMeta}>
                                    {!!item.amount && (
                                      <Text style={styles.expandedItemAmount}>{item.amount}</Text>
                                    )}
                                    {!!item.calories && (
                                      <Text style={styles.expandedItemKcal}>{item.calories} kcal</Text>
                                    )}
                                  </View>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text style={styles.emptyFoodText}>Chưa có chi tiết món ăn.</Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ACCORDION LƯU Ý TỪ HLV */}
            {!!plan.notes && (
              <View style={styles.notesBox}>
                <Pressable
                  style={styles.notesHeader}
                  onPress={() => setShowNotes((prev) => !prev)}
                >
                  <View style={styles.notesHeaderLeft}>
                    <Feather name="info" size={14} color="#0284C7" style={{ marginRight: 6 }} />
                    <Text style={styles.notesTitle}>Lưu ý từ Huấn Luyện Viên</Text>
                  </View>
                  <Feather
                    name={showNotes ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#475569"
                  />
                </Pressable>

                {showNotes && (
                  <View style={styles.notesBody}>
                    <Text style={styles.notesContent}>{plan.notes}</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* ================= FOOTER GỌN GÀNG ================= */}
          <View style={styles.footer}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerTotalLabel}>Tổng ngày: </Text>
              <Ionicons name="flame" size={14} color="#EA580C" style={{ marginHorizontal: 3 }} />
              <Text style={styles.footerTotalVal}>
                {dayTotalCalories > 0
                  ? dayTotalCalories.toLocaleString()
                  : plan.targetCalories?.toLocaleString() || '—'}{' '}
                kcal
              </Text>
            </View>

            <Pressable
              style={styles.closeActionBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
            >
              <Text style={styles.closeActionText}>Đóng</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ADE80',
  },
  dayOfWeekText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  headerCustomerName: {
    color: '#7DD3FC',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeSegment: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 2,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeBtnTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  daySelectorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daySelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  daySelectorBtnActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  daySelectorBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  daySelectorBtnTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  returnTodayBtn: {
    paddingVertical: 4,
  },
  returnTodayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  dayListBar: {
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  dayListScroll: {
    paddingHorizontal: 12,
    gap: 6,
  },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  dayPillSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  dayPillToday: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dayPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayPillTextToday: {
    color: '#166534',
    fontWeight: '700',
  },
  scrollArea: {
    flexGrow: 1,
  },
  scrollContent: {
    padding: 14,
    gap: 12,
  },
  realtimeBox: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#22C55E',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  realtimeBoxHeader: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  realtimeBoxHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  realtimeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  realtimeStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  realtimeMealName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  realtimeBoxHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeSlotWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  mealKcalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mealKcalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E11D48',
  },
  foodListWrap: {
    padding: 12,
  },
  foodSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  foodItemsCol: {
    gap: 8,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  foodItemInfo: {
    flex: 1,
    paddingRight: 10,
  },
  foodItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  prepTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  prepTipText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
  },
  foodItemMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amountPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  amountPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  itemKcalText: {
    fontSize: 11,
    color: '#64748B',
  },
  emptyFoodText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#64748B',
    paddingVertical: 8,
  },
  emptyNotice: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyNoticeText: {
    fontSize: 12,
    color: '#64748B',
  },
  viewMoreMealsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  viewMoreMealsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  allMealsWrap: {
    gap: 8,
  },
  allMealsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  allMealsHeaderTitle: {
    fontSize: 12,
    color: '#64748B',
  },
  backToRealtimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backToRealtimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  mealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  mealCardCurrent: {
    borderColor: '#22C55E',
    borderWidth: 1.5,
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  mealCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mealNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealNumberCircleCurrent: {
    backgroundColor: '#16A34A',
  },
  mealNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mealTitleCol: {
    flex: 1,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  mealName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  currentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  currentTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  mealSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  mealCardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allMealKcalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  expandToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  expandToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  mealExpandedBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
  },
  expandedItemsList: {
    gap: 6,
  },
  expandedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  expandedItemInfo: {
    flex: 1,
    paddingRight: 8,
  },
  expandedItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  expandedItemMeta: {
    alignItems: 'flex-end',
  },
  expandedItemAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  expandedItemKcal: {
    fontSize: 10,
    color: '#94A3B8',
  },
  notesBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  notesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  notesBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  notesContent: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginTop: 6,
  },
  footer: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerTotalLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  footerTotalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeActionBtn: {
    minHeight: 38,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
