import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api/client';

const MASCOT_CHEF = require('../../assets/public/3s-chef.png');
const DEFAULT_FOOD_IMAGE = require('../../assets/public/anh-minh-hoa-mon-an.png');

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

  // 2. Trích xuất danh sách các ngày trong thực đơn
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

  // Tab ngày đang được xem (mặc định là ngày hôm nay)
  const [userSelectedDayIdx, setUserSelectedDayIdx] = useState<number | null>(null);
  const selectedDayIdx = userSelectedDayIdx ?? todayDayIndex;

  const activeDay = useMemo(
    () => normalizedDays[selectedDayIdx] || normalizedDays[0] || EMPTY_DAY_PLAN,
    [normalizedDays, selectedDayIdx]
  );
  const isViewingToday = selectedDayIdx === todayDayIndex;

  // Chế độ xem: 'realtime' (mặc định) | 'all' (tất cả bữa trong ngày)
  const [viewMode, setViewMode] = useState<'realtime' | 'all'>('realtime');
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [expandedMeals, setExpandedMeals] = useState<Record<number, boolean>>({});

  // Ảnh món ăn động tải từ API
  const [dynamicImages, setDynamicImages] = useState<Record<string, string>>({});
  const fetchedKeysRef = useRef<Set<string>>(new Set());

  // Lưu trữ danh sách ảnh bị lỗi (404/network error) để fallback sang ảnh minh họa
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Modal xem ảnh phóng to
  const [previewImage, setPreviewImage] = useState<{
    url: any;
    title: string;
    isStatic?: boolean;
  } | null>(null);

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

  const currentMeal = realtimeMealInfo?.meal;

  // Tự động tìm nạp ảnh món ăn qua API backend /api/images/meal-image (nếu chưa có sẵn ảnh trong payload)
  useEffect(() => {
    if (!visible || !plan) return;

    const toFetch: { name: string; items?: string[] }[] = [];

    // Kiểm tra từng món ăn trong các bữa ăn của ngày đang xem
    activeDay.meals.forEach((m) => {
      m.items?.forEach((it) => {
        if (
          !it.imageUrl &&
          !dynamicImages[it.name] &&
          !fetchedKeysRef.current.has(it.name)
        ) {
          toFetch.push({ name: it.name, items: [it.name] });
        }
      });
    });

    if (toFetch.length === 0) return;

    // Giới hạn số lượng truy vấn nền
    const batch = toFetch.slice(0, 6);
    batch.forEach((target) => {
      fetchedKeysRef.current.add(target.name);
      api
        .post<any>('/api/images/meal-image', {
          mealName: target.name,
          items: target.items || [target.name],
          aspectRatio: '1:1',
          forceRegenerate: false,
        })
        .then((res) => {
          const url = res?.imageUrl || res?.data?.imageUrl;
          if (url && typeof url === 'string') {
            setDynamicImages((prev) => ({ ...prev, [target.name]: url }));
          }
        })
        .catch(() => {
          // Bỏ qua lỗi, fallback sang ảnh minh họa mặc định
        });
    });
  }, [visible, plan, activeDay, dynamicImages]);

  // Hàm resolve ảnh chuẩn xác: nếu không có hoặc link lỗi -> luôn trả về DEFAULT_FOOD_IMAGE
  const resolveItemImage = (item: FoodItem) => {
    const rawUrl = item.imageUrl || dynamicImages[item.name];
    const isBroken = Boolean(
      brokenImages[item.name] || (rawUrl && brokenImages[rawUrl])
    );

    if (!rawUrl || typeof rawUrl !== 'string' || isBroken) {
      return DEFAULT_FOOD_IMAGE;
    }

    const trimmed = rawUrl.trim();
    if (
      trimmed.length === 0 ||
      trimmed === 'null' ||
      trimmed === 'undefined' ||
      !(
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('data:')
      )
    ) {
      return DEFAULT_FOOD_IMAGE;
    }

    return { uri: trimmed };
  };

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

  if (!plan) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        {/* Backdrop bấm ra ngoài để đóng */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Đóng modal"
        />

        {/* Khung modal dạng View độc lập để không chặn gesture vuốt cuộn của ScrollView */}
        <View style={styles.card}>
          {/* ================= HEADER TRẮNG HIỆN ĐẠI CÙNG 3S CHEF ================= */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Minh họa 3S Chef mascot */}
              <View style={styles.mascotBadge}>
                <Image
                  source={MASCOT_CHEF}
                  style={styles.mascotImage}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.headerTitleWrap}>
                <View style={styles.metaRow}>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>
                      Thời Gian Thực • {currentTimeString}
                    </Text>
                  </View>
                  <View style={styles.dayTag}>
                    <Text style={styles.dayTagText}>{activeDay.dayOfWeek}</Text>
                  </View>
                </View>

                <Text style={styles.headerTitle} numberOfLines={1}>
                  Hôm nay ăn gì: <Text style={styles.headerCustomerName}>{customerName || 'Học viên'}</Text>
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  Gợi ý thực đơn chuẩn hóa từ HLV cá nhân
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Đóng popup"
            >
              <Feather name="x" size={18} color="#64748B" />
            </Pressable>
          </View>

          {/* ================= THANH ĐIỀU HƯỚNG GỌN GÀNG ================= */}
          <View style={styles.navBar}>
            {/* Chuyển đổi chế độ xem: Bữa Hiện Tại / Cả Ngày */}
            <View style={styles.modeSegment}>
              <Pressable
                style={[styles.modeBtn, viewMode === 'realtime' && styles.modeBtnActive]}
                onPress={() => setViewMode('realtime')}
              >
                <Ionicons
                  name="flash"
                  size={13}
                  color={viewMode === 'realtime' ? '#0284C7' : '#64748B'}
                  style={{ marginRight: 5 }}
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
                  name="calendar"
                  size={12}
                  color={viewMode === 'all' ? '#0284C7' : '#64748B'}
                  style={{ marginRight: 5 }}
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

            {/* Bộ chọn ngày trong tuần */}
            <View style={styles.daySelectorWrap}>
              <Pressable
                style={[styles.daySelectorBtn, showDaySelector && styles.daySelectorBtnActive]}
                onPress={() => setShowDaySelector((prev) => !prev)}
              >
                <Feather name="clock" size={12} color={showDaySelector ? '#0284C7' : '#64748B'} />
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
                  color={showDaySelector ? '#0284C7' : '#64748B'}
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

          {/* DANH SÁCH NGÀY TRONG TUẦN MỞ RỘNG */}
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

          {/* ================= NỘI DUNG CUỘN (SCROLL KHÔNG BỊ KHÓA) ================= */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {/* CHẾ ĐỘ 1: BỮA HIỆN TẠI (THỜI GIAN THỰC) */}
            {viewMode === 'realtime' && (
              <View>
                {currentMeal ? (
                  <View style={styles.realtimeCard}>
                    {/* Thanh trạng thái bữa ăn */}
                    <View style={styles.realtimeCardHeader}>
                      <View style={styles.realtimeHeaderLeft}>
                        <View style={styles.realtimeStatusBadge}>
                          <Ionicons name="sparkles" size={11} color="#15803D" style={{ marginRight: 4 }} />
                          <Text style={styles.realtimeStatusText}>
                            {realtimeMealInfo.label}
                          </Text>
                        </View>
                        <Text style={styles.realtimeMealName}>{currentMeal.name}</Text>
                      </View>

                      <View style={styles.realtimeHeaderRight}>
                        {!!currentMeal.timeSlot && (
                          <View style={styles.timeSlotBadge}>
                            <Feather name="clock" size={12} color="#0284C7" style={{ marginRight: 4 }} />
                            <Text style={styles.timeSlotText}>{currentMeal.timeSlot}</Text>
                          </View>
                        )}
                        {!!currentMeal.calories && (
                          <View style={styles.mealKcalBadge}>
                            <Ionicons name="flame" size={12} color="#EA580C" style={{ marginRight: 3 }} />
                            <Text style={styles.mealKcalText}>{currentMeal.calories} kcal</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Danh sách món ăn trong bữa */}
                    <View style={styles.foodListContainer}>
                      <View style={styles.foodListHeaderRow}>
                        <Text style={styles.foodSectionTitle}>
                          DANH SÁCH MÓN ĂN & ĐỊNH LƯỢNG
                        </Text>
                        <View style={styles.itemCountPill}>
                          <Text style={styles.itemCountText}>
                            {currentMeal.items?.length || 0} món
                          </Text>
                        </View>
                      </View>

                      {Array.isArray(currentMeal.items) && currentMeal.items.length > 0 ? (
                        <View style={styles.foodItemsCol}>
                          {currentMeal.items.map((item, idx) => {
                            const itemImgSource = resolveItemImage(item);
                            const isStaticImg = itemImgSource === DEFAULT_FOOD_IMAGE;

                            return (
                              <View key={idx} style={styles.foodItemCard}>
                                {/* Thumbnail ảnh món ăn (luôn có ảnh, không bao giờ bị trắng) */}
                                <Pressable
                                  style={styles.foodThumbWrap}
                                  onPress={() =>
                                    setPreviewImage({
                                      url: isStaticImg
                                        ? DEFAULT_FOOD_IMAGE
                                        : (itemImgSource as any).uri,
                                      title: item.name,
                                      isStatic: isStaticImg,
                                    })
                                  }
                                >
                                  <Image
                                    source={itemImgSource}
                                    style={styles.foodThumbImage}
                                    resizeMode="cover"
                                    onError={() => {
                                      const rawUrl =
                                        item.imageUrl || dynamicImages[item.name];
                                      setBrokenImages((prev) => ({
                                        ...prev,
                                        [item.name]: true,
                                        ...(rawUrl ? { [rawUrl]: true } : {}),
                                      }));
                                    }}
                                  />
                                </Pressable>

                                <View style={styles.foodItemMain}>
                                  <View style={styles.foodItemTitleRow}>
                                    <View style={styles.foodIndexBadge}>
                                      <Text style={styles.foodIndexText}>{idx + 1}</Text>
                                    </View>
                                    <Text style={styles.foodItemName} numberOfLines={2}>
                                      {item.name}
                                    </Text>
                                  </View>

                                  {!!item.prepTip && (
                                    <View style={styles.prepTipWrap}>
                                      <Ionicons name="bulb-outline" size={12} color="#0284C7" style={{ marginRight: 4 }} />
                                      <Text style={styles.prepTipText}>{item.prepTip}</Text>
                                    </View>
                                  )}

                                  {/* Macros chi tiết nếu có */}
                                  {(!!item.protein || !!item.carbs || !!item.fat) && (
                                    <View style={styles.macrosRow}>
                                      {!!item.protein && (
                                        <View style={[styles.macroPill, { backgroundColor: '#F0FDF4' }]}>
                                          <Text style={[styles.macroPillText, { color: '#16A34A' }]}>
                                            P: {item.protein}g
                                          </Text>
                                        </View>
                                      )}
                                      {!!item.carbs && (
                                        <View style={[styles.macroPill, { backgroundColor: '#EFF6FF' }]}>
                                          <Text style={[styles.macroPillText, { color: '#2563EB' }]}>
                                            C: {item.carbs}g
                                          </Text>
                                        </View>
                                      )}
                                      {!!item.fat && (
                                        <View style={[styles.macroPill, { backgroundColor: '#FFF7ED' }]}>
                                          <Text style={[styles.macroPillText, { color: '#EA580C' }]}>
                                            F: {item.fat}g
                                          </Text>
                                        </View>
                                      )}
                                    </View>
                                  )}
                                </View>

                                <View style={styles.foodItemRightMeta}>
                                  {!!item.amount && (
                                    <View style={styles.portionPill}>
                                      <Text style={styles.portionPillText}>{item.amount}</Text>
                                    </View>
                                  )}
                                  {!!item.calories && (
                                    <Text style={styles.itemCaloriesText}>{item.calories} kcal</Text>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={styles.emptyItemsBox}>
                          <Feather name="info" size={15} color="#94A3B8" style={{ marginBottom: 4 }} />
                          <Text style={styles.emptyFoodText}>
                            Chưa có danh sách món ăn chi tiết cho bữa này.
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyCard}>
                    <Image
                      source={MASCOT_CHEF}
                      style={styles.emptyCardMascot}
                      resizeMode="contain"
                    />
                    <Text style={styles.emptyCardTitle}>Chưa có thực đơn cho hôm nay</Text>
                    <Text style={styles.emptyCardSubtitle}>
                      HLV chưa thiết lập các bữa ăn trong ngày hoặc ngày này đang trong giai đoạn nghỉ.
                    </Text>
                  </View>
                )}

                {/* Nút xem nhanh tất cả các bữa khác */}
                {activeDay.meals.length > 1 && (
                  <Pressable
                    style={styles.viewOtherMealsBtn}
                    onPress={() => setViewMode('all')}
                  >
                    <Feather name="list" size={14} color="#0284C7" style={{ marginRight: 6 }} />
                    <Text style={styles.viewOtherMealsBtnText}>
                      Xem toàn bộ {activeDay.meals.length} bữa trong ngày hôm nay
                    </Text>
                    <Feather name="chevron-right" size={14} color="#0284C7" style={{ marginLeft: 4 }} />
                  </Pressable>
                )}
              </View>
            )}

            {/* CHẾ ĐỘ 2: TOÀN BỘ CÁC BỮA TRONG NGÀY (ACCORDION CARD) */}
            {viewMode === 'all' && (
              <View style={styles.allMealsContainer}>
                <View style={styles.allMealsTopBar}>
                  <Text style={styles.allMealsTopTitle}>
                    Thực đơn {activeDay.dayOfWeek} ({activeDay.meals.length} bữa ăn)
                  </Text>
                  <Pressable
                    style={styles.switchRealtimeBtn}
                    onPress={() => setViewMode('realtime')}
                  >
                    <Ionicons name="flash" size={12} color="#0284C7" style={{ marginRight: 3 }} />
                    <Text style={styles.switchRealtimeText}>Bữa hiện tại</Text>
                  </Pressable>
                </View>

                {activeDay.meals.map((meal, mIdx) => {
                  const isCurrent = realtimeMealInfo?.index === mIdx && isViewingToday;
                  const isExpanded = Boolean(expandedMeals[mIdx]);

                  return (
                    <View
                      key={meal.id || mIdx}
                      style={[
                        styles.accordionMealCard,
                        isCurrent && styles.accordionMealCardCurrent,
                      ]}
                    >
                      {/* Tiêu đề thanh Accordion */}
                      <Pressable
                        style={styles.accordionMealHeader}
                        onPress={() => toggleMeal(mIdx)}
                      >
                        <View style={styles.accordionLeft}>
                          <View
                            style={[
                              styles.mealNumberCircle,
                              isCurrent && styles.mealNumberCircleCurrent,
                            ]}
                          >
                            <Text
                              style={[
                                styles.mealNumberText,
                                isCurrent && styles.mealNumberTextCurrent,
                              ]}
                            >
                              {mIdx + 1}
                            </Text>
                          </View>

                          <View style={styles.mealMetaCol}>
                            <View style={styles.mealTitleRow}>
                              <Text style={styles.accordionMealName}>{meal.name}</Text>
                              {isCurrent && (
                                <View style={styles.liveTag}>
                                  <View style={styles.liveTagDot} />
                                  <Text style={styles.liveTagText}>Giờ này</Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.accordionMealSub}>
                              {meal.timeSlot ? `${meal.timeSlot} • ` : ''}
                              {meal.items?.length || 0} món
                            </Text>
                          </View>
                        </View>

                        <View style={styles.accordionRight}>
                          {!!meal.calories && (
                            <Text style={styles.accordionKcalText}>{meal.calories} kcal</Text>
                          )}
                          <View
                            style={[
                              styles.accordionChevronWrap,
                              isExpanded && styles.accordionChevronWrapExpanded,
                            ]}
                          >
                            <Feather
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={14}
                              color="#0284C7"
                            />
                          </View>
                        </View>
                      </Pressable>

                      {/* Chi tiết danh sách món khi mở rộng */}
                      {isExpanded && (
                        <View style={styles.accordionBody}>
                          {Array.isArray(meal.items) && meal.items.length > 0 ? (
                            <View style={styles.expandedItemsCol}>
                              {meal.items.map((item, iIdx) => {
                                const itemImgSource = resolveItemImage(item);
                                const isStaticImg = itemImgSource === DEFAULT_FOOD_IMAGE;

                                return (
                                  <View key={iIdx} style={styles.expandedItemCard}>
                                    <Pressable
                                      style={styles.accordionItemThumbWrap}
                                      onPress={() =>
                                        setPreviewImage({
                                          url: isStaticImg
                                            ? DEFAULT_FOOD_IMAGE
                                            : (itemImgSource as any).uri,
                                          title: item.name,
                                          isStatic: isStaticImg,
                                        })
                                      }
                                    >
                                      <Image
                                        source={itemImgSource}
                                        style={styles.accordionItemThumb}
                                        resizeMode="cover"
                                        onError={() => {
                                          const rawUrl =
                                            item.imageUrl || dynamicImages[item.name];
                                          setBrokenImages((prev) => ({
                                            ...prev,
                                            [item.name]: true,
                                            ...(rawUrl ? { [rawUrl]: true } : {}),
                                          }));
                                        }}
                                      />
                                    </Pressable>

                                    <View style={styles.expandedItemInfo}>
                                      <Text style={styles.expandedItemName}>{item.name}</Text>
                                      {!!item.prepTip && (
                                        <View style={styles.prepTipWrap}>
                                          <Ionicons name="bulb-outline" size={11} color="#0284C7" style={{ marginRight: 4 }} />
                                          <Text style={styles.prepTipText}>{item.prepTip}</Text>
                                        </View>
                                      )}
                                    </View>

                                    <View style={styles.expandedItemRight}>
                                      {!!item.amount && (
                                        <View style={styles.portionPill}>
                                          <Text style={styles.portionPillText}>{item.amount}</Text>
                                        </View>
                                      )}
                                      {!!item.calories && (
                                        <Text style={styles.itemCaloriesText}>{item.calories} kcal</Text>
                                      )}
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          ) : (
                            <Text style={styles.emptyFoodText}>Chưa có danh sách món ăn cụ thể.</Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ACCORDION LƯU Ý TỪ HUẤN LUYỆN VIÊN */}
            {!!plan.notes && (
              <View style={styles.coachNotesCard}>
                <Pressable
                  style={styles.coachNotesHeader}
                  onPress={() => setShowNotes((prev) => !prev)}
                >
                  <View style={styles.coachNotesHeaderLeft}>
                    <View style={styles.coachNotesIconWrap}>
                      <Feather name="message-square" size={14} color="#0284C7" />
                    </View>
                    <Text style={styles.coachNotesTitle}>Lưu ý từ Huấn Luyện Viên</Text>
                  </View>
                  <Feather
                    name={showNotes ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#64748B"
                  />
                </Pressable>

                {showNotes && (
                  <View style={styles.coachNotesBody}>
                    <Text style={styles.coachNotesContent}>{plan.notes}</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* ================= FOOTER TRẮNG HIỆN ĐẠI ================= */}
          <View style={styles.footer}>
            <View style={styles.footerSummary}>
              <Text style={styles.footerSummaryLabel}>Tổng calo ngày:</Text>
              <View style={styles.footerKcalBadge}>
                <Ionicons name="flame" size={14} color="#EA580C" style={{ marginRight: 3 }} />
                <Text style={styles.footerSummaryVal}>
                  {dayTotalCalories > 0
                    ? dayTotalCalories.toLocaleString()
                    : plan.targetCalories?.toLocaleString() || '—'}{' '}
                  kcal
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.closeFooterBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
            >
              <Text style={styles.closeFooterText}>Đóng</Text>
            </Pressable>
          </View>
        </View>

        {/* ================= MODAL PHÓNG TO ẢNH MÓN ĂN ================= */}
        {previewImage && (
          <Modal
            visible={true}
            transparent
            animationType="fade"
            onRequestClose={() => setPreviewImage(null)}
          >
            <View style={styles.previewBackdrop}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setPreviewImage(null)}
              />
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {previewImage.title}
                  </Text>
                  <Pressable
                    style={styles.previewCloseBtn}
                    onPress={() => setPreviewImage(null)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Đóng ảnh phóng to"
                  >
                    <Feather name="x" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View style={styles.previewImageContainer}>
                  <Image
                    source={previewImage.isStatic ? previewImage.url : { uri: previewImage.url }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    height: '88%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    display: 'flex',
    flexDirection: 'column',
  },

  /* HEADER TRẮNG CÙNG 3S CHEF */
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
    gap: 12,
  },
  mascotBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mascotImage: {
    width: 42,
    height: 42,
  },
  headerTitleWrap: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 5,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  dayTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerCustomerName: {
    color: '#0284C7',
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* THANH ĐIỀU HƯỚNG */
  navBar: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
  },
  modeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeBtnTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  daySelectorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daySelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  daySelectorBtnActive: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  daySelectorBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  daySelectorBtnTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  returnTodayBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  returnTodayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  dayListBar: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 8,
  },
  dayListScroll: {
    paddingHorizontal: 14,
    gap: 6,
  },
  dayPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  dayPillSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  dayPillToday: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dayPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayPillTextToday: {
    color: '#15803D',
    fontWeight: '800',
  },

  /* KHU VỰC CUỘN NỘI DUNG */
  scrollArea: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
    gap: 12,
    backgroundColor: '#FAFAFA',
  },

  /* REALTIME CARD */
  realtimeCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  realtimeCardHeader: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  realtimeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  realtimeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  realtimeStatusText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  realtimeMealName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  realtimeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSlotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeSlotText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  mealKcalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mealKcalText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  foodListContainer: {
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  foodListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  foodSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  itemCountPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  itemCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  foodItemsCol: {
    gap: 8,
  },
  foodItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  foodThumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  foodThumbImage: {
    width: '100%',
    height: '100%',
  },
  foodItemMain: {
    flex: 1,
  },
  foodItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  foodIndexBadge: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodIndexText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  foodItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  prepTipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  prepTipText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748B',
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  macroPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  macroPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  foodItemRightMeta: {
    alignItems: 'flex-end',
    gap: 3,
  },
  portionPill: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  portionPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  itemCaloriesText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  emptyItemsBox: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyFoodText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  viewOtherMealsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingVertical: 11,
    marginTop: 10,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  viewOtherMealsBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },

  /* EMPTY CARD */
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardMascot: {
    width: 64,
    height: 64,
    marginBottom: 10,
  },
  emptyCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptyCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  /* ALL MEALS ACCORDION */
  allMealsContainer: {
    gap: 8,
  },
  allMealsTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  allMealsTopTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  switchRealtimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  switchRealtimeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },
  accordionMealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  accordionMealCardCurrent: {
    borderColor: '#22C55E',
    borderWidth: 1.5,
  },
  accordionMealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  mealNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealNumberCircleCurrent: {
    backgroundColor: '#22C55E',
    borderColor: '#16A34A',
  },
  mealNumberText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  mealNumberTextCurrent: {
    color: '#FFFFFF',
  },
  mealMetaCol: {
    flex: 1,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  accordionMealName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  liveTagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  accordionMealSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  accordionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionKcalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  accordionChevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionChevronWrapExpanded: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  accordionBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  expandedItemsCol: {
    gap: 6,
  },
  expandedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 8,
    gap: 8,
  },
  accordionItemThumbWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  accordionItemThumb: {
    width: '100%',
    height: '100%',
  },
  expandedItemInfo: {
    flex: 1,
    paddingRight: 6,
  },
  expandedItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  expandedItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },

  /* LƯU Ý TỪ HLV */
  coachNotesCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  coachNotesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  coachNotesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coachNotesIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachNotesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  coachNotesBody: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  coachNotesContent: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginTop: 6,
  },

  /* FOOTER TRẮNG */
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerSummaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  footerKcalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  footerSummaryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA580C',
  },
  closeFooterBtn: {
    minHeight: 44,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  closeFooterText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* PREVIEW ẢNH PHÓNG TO */
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  previewCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    paddingRight: 10,
  },
  previewCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#0F172A',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});
