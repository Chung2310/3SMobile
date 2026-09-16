import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LibraryIcon } from '@/components/LibraryIcon';
import { colors } from '@/theme';
import { Button, Sheet, ws } from './Controls';

interface TimePickerProps {
  label?: string;
  value: string; // "HH:mm"
  onChange: (time: string) => void;
  error?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

const QUICK_SLOTS = [
  { label: 'Sáng', times: ['06:00', '07:00', '08:00', '09:30'] },
  { label: 'Chiều', times: ['14:00', '15:30', '16:30', '17:30'] },
  { label: 'Tối', times: ['18:00', '19:00', '20:00', '21:00'] },
];

function getTimePeriod(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Buổi sáng';
  if (hour >= 12 && hour < 17) return 'Buổi chiều';
  if (hour >= 17 && hour < 22) return 'Buổi tối';
  return 'Đêm / Rạng sáng';
}

export function TimePicker({ label = 'Giờ bắt đầu tập', value, onChange, error }: TimePickerProps) {
  const [open, setOpen] = useState(false);

  // Parse current value
  const isValid = /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
  const [currentH, currentM] = isValid ? value.trim().split(':').map(Number) : [8, 0];

  const [selectedH, setSelectedH] = useState(currentH);
  const [selectedM, setSelectedM] = useState(currentM);

  const formattedH = String(selectedH).padStart(2, '0');
  const formattedM = String(selectedM).padStart(2, '0');
  const previewTime = `${formattedH}:${formattedM}`;

  function handleOpen() {
    if (isValid) {
      setSelectedH(currentH);
      setSelectedM(currentM);
    } else {
      setSelectedH(8);
      setSelectedM(0);
    }
    setOpen(true);
  }

  function handleConfirm() {
    onChange(previewTime);
    setOpen(false);
  }

  function selectQuick(t: string) {
    const [h, m] = t.split(':').map(Number);
    setSelectedH(h);
    setSelectedM(m);
  }

  return (
    <View style={{ gap: 6 }}>
      {!!label && <Text style={ws.muted}>{label}</Text>}

      {/* Trigger Button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${isValid ? value : 'Chưa chọn giờ'}`}
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.triggerBtn,
          error ? styles.triggerBtnError : null,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={styles.triggerLeft}>
          <View style={styles.triggerIconBox}>
            <LibraryIcon name="clock" size={20} color={colors.primary} />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={styles.timeDisplayText}>{isValid ? value : '08:00'}</Text>
            <Text style={[ws.muted, { fontSize: 12 }]}>
              {isValid ? getTimePeriod(currentH) : 'Nhấn để chọn giờ'}
            </Text>
          </View>
        </View>

        <View style={styles.changeBadge}>
          <Text style={styles.changeBadgeText}>Chọn giờ</Text>
          <LibraryIcon name="chevron-down" size={16} color={colors.primary} />
        </View>
      </Pressable>

      {!!error && (
        <Text accessibilityRole="alert" numberOfLines={2} ellipsizeMode="tail" style={styles.errorText}>
          {error}
        </Text>
      )}

      {/* Modal Sheet for Time Selection */}
      {open && (
        <Sheet
          title="Chọn giờ bắt đầu"
          onClose={() => setOpen(false)}
          footer={
            <Button
              icon="check"
              label={`Xác nhận giờ tập (${previewTime})`}
              onPress={handleConfirm}
            />
          }
        >
          {/* Big Time Preview Display */}
          <View style={styles.previewBox}>
            <Text style={styles.previewBoxTime}>{previewTime}</Text>
            <Text style={styles.previewBoxPeriod}>{getTimePeriod(selectedH)}</Text>
          </View>

          {/* Quick Presets */}
          <View style={{ gap: 8 }}>
            <Text style={[ws.muted, { fontWeight: '600' }]}>Khung giờ phổ biến</Text>
            <View style={{ gap: 8 }}>
              {QUICK_SLOTS.map((slot) => (
                <View key={slot.label} style={styles.quickSlotRow}>
                  <Text style={styles.quickSlotLabel}>{slot.label}:</Text>
                  <View style={styles.quickSlotChips}>
                    {slot.times.map((t) => {
                      const isSelected = previewTime === t;
                      return (
                        <Pressable
                          key={t}
                          accessibilityRole="button"
                          accessibilityLabel={t}
                          onPress={() => selectQuick(t)}
                          style={[
                            styles.quickChip,
                            isSelected && styles.quickChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.quickChipText,
                              isSelected && styles.quickChipTextSelected,
                            ]}
                          >
                            {t}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Hour Selector */}
          <View style={{ gap: 8 }}>
            <Text style={[ws.muted, { fontWeight: '600' }]}>Chọn giờ ({selectedH}:00)</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollChipsContainer}
            >
              {HOURS.map((h) => {
                const isSelected = selectedH === h;
                const hStr = String(h).padStart(2, '0');
                return (
                  <Pressable
                    key={h}
                    accessibilityRole="button"
                    accessibilityLabel={`${hStr} giờ`}
                    onPress={() => setSelectedH(h)}
                    style={({ pressed }) => [
                      styles.hourChip,
                      isSelected && styles.hourChipSelected,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.hourChipText,
                        isSelected && styles.hourChipTextSelected,
                      ]}
                    >
                      {hStr}h
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Minute Selector (15-minute intervals) */}
          <View style={{ gap: 8 }}>
            <Text style={[ws.muted, { fontWeight: '600' }]}>Chọn phút (bội số của 15)</Text>
            <View style={styles.minuteGrid}>
              {MINUTES.map((m) => {
                const isSelected = selectedM === m;
                const mStr = String(m).padStart(2, '0');
                return (
                  <Pressable
                    key={m}
                    accessibilityRole="button"
                    accessibilityLabel={`${mStr} phút`}
                    onPress={() => setSelectedM(m)}
                    style={({ pressed }) => [
                      styles.minuteChip,
                      isSelected && styles.minuteChipSelected,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.minuteChipText,
                        isSelected && styles.minuteChipTextSelected,
                      ]}
                    >
                      :{mStr}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Sheet>
      )}
    </View>
  );
}

interface DurationPickerProps {
  label?: string;
  value: number | string;
  onChange: (duration: number) => void;
}

const DURATION_OPTIONS = [15, 30, 45, 60, 75, 90, 120];

export function DurationPicker({
  label = 'Thời lượng tập',
  value,
  onChange,
}: DurationPickerProps) {
  const currentDur = Number(value) || 60;

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.durationHeaderRow}>
        <Text style={ws.muted}>{label}</Text>
        <Text style={styles.durationValueText}>{currentDur} phút</Text>
      </View>

      <View style={styles.durationChipsRow}>
        {DURATION_OPTIONS.map((dur) => {
          const isSelected = currentDur === dur;
          return (
            <Pressable
              key={dur}
              accessibilityRole="button"
              accessibilityLabel={`${dur} phút`}
              onPress={() => onChange(dur)}
              style={({ pressed }) => [
                styles.durationChip,
                isSelected && styles.durationChipSelected,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text
                style={[
                  styles.durationChipText,
                  isSelected && styles.durationChipTextSelected,
                ]}
              >
                {dur}p
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  triggerBtn: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  triggerBtnError: {
    borderColor: colors.danger,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  triggerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeDisplayText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: colors.text,
    letterSpacing: 0.5,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  changeBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.danger,
    marginTop: 2,
  },
  previewBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewBoxTime: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 36,
    color: colors.text,
    letterSpacing: 2,
  },
  previewBoxPeriod: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickSlotLabel: {
    width: 44,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.textMuted,
  },
  quickSlotChips: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  quickChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },
  quickChipTextSelected: {
    color: '#FFFFFF',
  },
  scrollChipsContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  hourChip: {
    minWidth: 48,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hourChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: colors.text,
  },
  hourChipTextSelected: {
    color: '#FFFFFF',
  },
  minuteGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  minuteChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minuteChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  minuteChipText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.text,
  },
  minuteChipTextSelected: {
    color: '#FFFFFF',
  },
  durationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationValueText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: colors.primary,
  },
  durationChipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  durationChip: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.textMuted,
  },
  durationChipTextSelected: {
    color: '#FFFFFF',
  },
});
