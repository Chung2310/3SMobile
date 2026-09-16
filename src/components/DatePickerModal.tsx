import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '@/theme';

interface DatePickerModalProps {
  visible: boolean;
  value?: string; // YYYY-MM-DD or DD/MM/YYYY
  title?: string;
  maxDate?: Date | null;
  defaultToToday?: boolean;
  onClose: () => void;
  onSelect: (isoDate: string, displayDate: string) => void;
}

const WEEKDAYS = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'];
const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

export function DatePickerModal({
  visible,
  value,
  title = 'Chọn ngày sinh',
  maxDate,
  defaultToToday,
  onClose,
  onSelect,
}: DatePickerModalProps) {
  const today = useMemo(() => new Date(), []);

  // Parse initial date
  const parsedInitialDate = useMemo(() => {
    if (!value) return null;
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return d;
    }
    const parts = trimmed.split(/[/.-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2].length === 2 ? `20${parts[2]}` : parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }, [value]);

  const isBirthday = useMemo(() => {
    const t = (title || '').toLowerCase();
    return t.includes('sinh') || t.includes('birth');
  }, [title]);

  const shouldUseToday = defaultToToday ?? !isBirthday;

  const [viewMode, setViewMode] = useState<'calendar' | 'year' | 'month'>('calendar');
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (parsedInitialDate) return parsedInitialDate;
    if (shouldUseToday) return today;
    return null;
  });

  // Mặc định năm hiển thị: Nếu là ngày đo / ngày chung thì mặc định năm hiện tại (now), chỉ ngày sinh mới mặc định 1998
  const [viewYear, setViewYear] = useState<number>(() => {
    if (parsedInitialDate) return parsedInitialDate.getFullYear();
    if (shouldUseToday) return today.getFullYear();
    return 1998;
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (parsedInitialDate) return parsedInitialDate.getMonth();
    if (shouldUseToday) return today.getMonth();
    return 0; // Tháng 1
  });

  useEffect(() => {
    if (visible) {
      if (parsedInitialDate) {
        setSelectedDate(parsedInitialDate);
        setViewYear(parsedInitialDate.getFullYear());
        setViewMonth(parsedInitialDate.getMonth());
      } else if (shouldUseToday) {
        setSelectedDate(today);
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
      } else {
        setSelectedDate(null);
        setViewYear(1998);
        setViewMonth(0);
      }
      setViewMode('calendar');
    }
  }, [visible, parsedInitialDate, shouldUseToday, today]);

  // Danh sách các năm (1940 -> maxDate year)
  const yearsList = useMemo(() => {
    const maxYear = maxDate ? maxDate.getFullYear() : new Date().getFullYear() + 10;
    const list: number[] = [];
    for (let y = maxYear; y >= 1940; y--) {
      list.push(y);
    }
    return list;
  }, [maxDate]);

  // Tính toán các ngày trong tháng
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = CN, 1 = Th 2,...
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      monthOffset: -1 | 0 | 1;
      date: Date;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    // Các ngày tháng trước để bù đầu tuần
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const dateObj = new Date(viewYear, viewMonth - 1, d);
      days.push({
        day: d,
        monthOffset: -1,
        date: dateObj,
        isCurrentMonth: false,
        isDisabled: true,
        isToday: false,
        isSelected: false,
      });
    }

    // Các ngày trong tháng hiện tại
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const dateObj = new Date(viewYear, viewMonth, d);
      const isFuture = maxDate ? dateObj > maxDate : false;
      const isToday =
        dateObj.getDate() === today.getDate() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getFullYear() === today.getFullYear();
      const isSelected =
        selectedDate !== null &&
        dateObj.getDate() === selectedDate.getDate() &&
        dateObj.getMonth() === selectedDate.getMonth() &&
        dateObj.getFullYear() === selectedDate.getFullYear();

      days.push({
        day: d,
        monthOffset: 0,
        date: dateObj,
        isCurrentMonth: true,
        isDisabled: isFuture,
        isToday,
        isSelected,
      });
    }

    // Các ngày tháng sau để bù đủ tuần
    const remainingSlots = 42 - days.length; // 6 hàng x 7 cột
    for (let d = 1; d <= remainingSlots; d++) {
      const dateObj = new Date(viewYear, viewMonth + 1, d);
      days.push({
        day: d,
        monthOffset: 1,
        date: dateObj,
        isCurrentMonth: false,
        isDisabled: true,
        isToday: false,
        isSelected: false,
      });
    }

    return days;
  }, [viewYear, viewMonth, selectedDate, maxDate, today]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  const handleConfirm = () => {
    if (!selectedDate) return;
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    const displayDate = `${dd}/${mm}/${yyyy}`;
    onSelect(isoDate, displayDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* 1. Handle bar theo mục 5B */}
          <View style={styles.handleBarWrap}>
            <View style={styles.handleBar} />
          </View>

          {/* 2. Header Sheet */}
          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.closeBtn}
            >
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* 3. Controls chuyển đổi Tháng/Năm */}
          <View style={styles.monthNavRow}>
            <Pressable
              onPress={handlePrevMonth}
              hitSlop={10}
              style={styles.navArrowBtn}
            >
              <Feather name="chevron-left" size={22} color={colors.text} />
            </Pressable>

            {/* Bấm vào để chọn nhanh Tháng hoặc Năm */}
            <View style={styles.monthYearButtonsWrap}>
              <Pressable
                onPress={() => setViewMode(viewMode === 'month' ? 'calendar' : 'month')}
                style={[
                  styles.selectorPill,
                  viewMode === 'month' && styles.selectorPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.selectorPillText,
                    viewMode === 'month' && styles.selectorPillTextActive,
                  ]}
                >
                  {MONTHS[viewMonth]}
                </Text>
                <Feather
                  name={viewMode === 'month' ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={viewMode === 'month' ? '#FFFFFF' : colors.text}
                />
              </Pressable>

              <Pressable
                onPress={() => setViewMode(viewMode === 'year' ? 'calendar' : 'year')}
                style={[
                  styles.selectorPill,
                  viewMode === 'year' && styles.selectorPillActive,
                ]}
              >
                <Text
                  style={[
                    styles.selectorPillText,
                    viewMode === 'year' && styles.selectorPillTextActive,
                  ]}
                >
                  {viewYear}
                </Text>
                <Feather
                  name={viewMode === 'year' ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={viewMode === 'year' ? '#FFFFFF' : colors.text}
                />
              </Pressable>
            </View>

            <Pressable
              onPress={handleNextMonth}
              hitSlop={10}
              style={styles.navArrowBtn}
            >
              <Feather name="chevron-right" size={22} color={colors.text} />
            </Pressable>
          </View>

          {/* 4. Nội dung theo viewMode */}
          {viewMode === 'year' ? (
            /* Lưới chọn nhanh Năm */
            <ScrollView
              style={styles.pickerScrollView}
              contentContainerStyle={styles.yearGrid}
              showsVerticalScrollIndicator={true}
            >
              {yearsList.map((y) => {
                const isCurrent = y === viewYear;
                return (
                  <Pressable
                    key={y}
                    onPress={() => {
                      setViewYear(y);
                      setViewMode('calendar');
                    }}
                    style={[styles.yearItem, isCurrent && styles.yearItemActive]}
                  >
                    <Text
                      style={[
                        styles.yearItemText,
                        isCurrent && styles.yearItemTextActive,
                      ]}
                    >
                      {y}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : viewMode === 'month' ? (
            /* Lưới 12 Tháng */
            <View style={styles.monthGrid}>
              {MONTHS.map((m, idx) => {
                const isCurrent = idx === viewMonth;
                return (
                  <Pressable
                    key={m}
                    onPress={() => {
                      setViewMonth(idx);
                      setViewMode('calendar');
                    }}
                    style={[styles.monthItem, isCurrent && styles.monthItemActive]}
                  >
                    <Text
                      style={[
                        styles.monthItemText,
                        isCurrent && styles.monthItemTextActive,
                      ]}
                    >
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            /* Bộ Calendar Grid 7 cột chuẩn 5C.2 và 5C.3 */
            <View style={styles.calendarCard}>
              {/* Hàng Thứ trong tuần (Weekdays Header) */}
              <View style={styles.weekdaysHeader}>
                {WEEKDAYS.map((wd, i) => {
                  const isTodayWeekday = today.getDay() === i;
                  return (
                    <Text
                      key={wd}
                      style={[
                        styles.weekdayText,
                        isTodayWeekday && styles.weekdayTextToday,
                      ]}
                    >
                      {wd}
                    </Text>
                  );
                })}
              </View>

              {/* Lưới Ngày 7 cột */}
              <View style={styles.daysGrid}>
                {calendarDays.slice(0, 35).map((item, idx) => {
                  return (
                    <Pressable
                      key={idx}
                      disabled={item.isDisabled || !item.isCurrentMonth}
                      onPress={() => {
                        if (item.isCurrentMonth && !item.isDisabled) {
                          setSelectedDate(item.date);
                        }
                      }}
                      style={[
                        styles.dayCell,
                        item.isSelected && styles.dayCellSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          !item.isCurrentMonth && styles.dayTextOtherMonth,
                          item.isDisabled && styles.dayTextDisabled,
                          item.isToday && !item.isSelected && styles.dayTextToday,
                          item.isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {item.day}
                      </Text>

                      {/* Chấm tròn Indicator Dot cho ngày hôm nay theo 5C.3 */}
                      {item.isToday && !item.isSelected ? (
                        <View style={styles.todayIndicatorDot} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* 5. Footer Buttons */}
          <View style={styles.footerRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.btnSecondary, pressed && styles.btnSecondaryPressed]}
            >
              <Text style={styles.btnSecondaryText}>Hủy</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={!selectedDate}
              style={({ pressed }) => [
                styles.btnPrimary,
                !selectedDate && styles.btnPrimaryDisabled,
                pressed && styles.btnPrimaryPressed,
              ]}
            >
              <Text style={styles.btnPrimaryText}>
                {selectedDate
                  ? `Xác nhận (${selectedDate.getDate()}/${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()})`
                  : 'Chọn ngày'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  handleBarWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navArrowBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearButtonsWrap: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  selectorPillActive: {
    backgroundColor: '#00C2FF',
  },
  selectorPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  selectorPillTextActive: {
    color: '#FFFFFF',
  },
  pickerScrollView: {
    maxHeight: 280,
    paddingHorizontal: 16,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  yearItem: {
    width: '23%',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  yearItemActive: {
    backgroundColor: '#00C2FF',
    borderColor: '#00C2FF',
  },
  yearItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  yearItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthItem: {
    width: '31%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthItemActive: {
    backgroundColor: '#00C2FF',
    borderColor: '#00C2FF',
  },
  monthItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  monthItemTextActive: {
    color: '#FFFFFF',
  },
  calendarCard: {
    paddingHorizontal: 16,
  },
  weekdaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 4,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  weekdayTextToday: {
    color: '#0088CC',
    fontWeight: '800',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 21,
  },
  dayCellSelected: {
    backgroundColor: '#00C2FF',
    shadowColor: '#00C2FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  dayTextOtherMonth: {
    color: '#D1D5DB',
  },
  dayTextDisabled: {
    color: '#E5E7EB',
  },
  dayTextToday: {
    color: colors.primary,
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  todayIndicatorDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00C2FF',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryPressed: {
    backgroundColor: '#E5E7EB',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  btnPrimary: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#00C2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  btnPrimaryDisabled: {
    opacity: 0.5,
  },
  btnPrimaryPressed: {
    backgroundColor: '#0098CC',
    transform: [{ scale: 0.98 }],
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
