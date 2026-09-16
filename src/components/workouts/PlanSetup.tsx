import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LibraryIcon } from '@/components/LibraryIcon';
import { LEVELS } from '@/services/workouts';
import { colors } from '@/theme';
import { Button, Field, Notice, Sheet, ws } from './Controls';

export interface PlanSetupValues {
  title: string;
  goal: string;
  durationDays: string;
  level: string;
}

export function validPlanSetup(value: PlanSetupValues) {
  const days = Number(value.durationDays);
  return Boolean(
    value.title.trim() &&
      value.goal.trim() &&
      /^\d+$/.test(value.durationDays.trim()) &&
      Number.isInteger(days) &&
      days >= 1 &&
      days <= 365 &&
      Object.hasOwn(LEVELS, value.level)
  );
}

const DURATION_PRESETS = ['7', '14', '28', '30'];

export function PlanSetup({ onNext, onClose }: { onNext: (value: PlanSetupValues) => void; onClose: () => void }) {
  const [value, setValue] = useState<PlanSetupValues>({ title: '', goal: '', durationDays: '7', level: 'BEGINNER' });
  const [attempted, setAttempted] = useState(false);
  const lock = useRef(false);
  const valid = validPlanSetup(value);

  function next() {
    if (lock.current) return;
    setAttempted(true);
    if (!valid) return;
    lock.current = true;
    onNext({
      ...value,
      title: value.title.trim(),
      goal: value.goal.trim(),
      durationDays: String(Number(value.durationDays)),
    });
  }

  return (
    <Sheet
      title="Tạo giáo án · Bước 1"
      onClose={onClose}
      footer={<Button icon="arrow-right" label="Tiếp tục vào Studio" onPress={next} />}
    >
      <Field
        label="Tên giáo án *"
        placeholder="Ví dụ: Tăng cơ bắp toàn thân 4 tuần"
        value={value.title}
        onChange={(title) => setValue((old) => ({ ...old, title }))}
        error={attempted && !value.title.trim() ? 'Vui lòng nhập tên giáo án.' : undefined}
      />

      <Field
        label="Mục tiêu *"
        placeholder="Ví dụ: Tăng cơ giảm mỡ, cải thiện sức bền"
        value={value.goal}
        onChange={(goal) => setValue((old) => ({ ...old, goal }))}
        error={attempted && !value.goal.trim() ? 'Vui lòng nhập mục tiêu.' : undefined}
      />

      {/* Level Selection - Direct Chips */}
      <View style={{ gap: 8 }}>
        <Text style={ws.muted}>Cấp độ *</Text>
        <View style={setupStyles.chipRow}>
          {Object.entries(LEVELS).map(([key, label]) => {
            const isSelected = value.level === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={label}
                onPress={() => setValue((old) => ({ ...old, level: key }))}
                style={({ pressed }) => [
                  setupStyles.levelChip,
                  isSelected && setupStyles.levelChipSelected,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <LibraryIcon
                  name={isSelected ? 'check-circle' : 'circle'}
                  size={16}
                  color={isSelected ? '#fff' : colors.textMuted}
                />
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[setupStyles.levelChipText, isSelected && setupStyles.levelChipTextSelected]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {attempted && !Object.hasOwn(LEVELS, value.level) && <Notice error text="Vui lòng chọn cấp độ." />}
      </View>

      {/* Duration Selection with Quick Presets */}
      <View style={{ gap: 8 }}>
        <Field
          label="Số ngày lộ trình (1–365) *"
          numeric
          value={value.durationDays}
          onChange={(durationDays) => setValue((old) => ({ ...old, durationDays }))}
          error={
            attempted &&
            (!/^\d+$/.test(value.durationDays.trim()) ||
              Number(value.durationDays) < 1 ||
              Number(value.durationDays) > 365)
              ? 'Nhập số nguyên từ 1 đến 365.'
              : undefined
          }
        />
        <View style={setupStyles.durationPresetsRow}>
          <Text style={[ws.muted, { fontSize: 12 }]}>Gợi ý nhanh:</Text>
          {DURATION_PRESETS.map((days) => {
            const isSelected = value.durationDays === days;
            return (
              <Pressable
                key={days}
                accessibilityRole="button"
                accessibilityLabel={`${days} ngày`}
                onPress={() => setValue((old) => ({ ...old, durationDays: days }))}
                style={({ pressed }) => [
                  setupStyles.durationChip,
                  isSelected && setupStyles.durationChipSelected,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text
                  style={[
                    setupStyles.durationChipText,
                    isSelected && setupStyles.durationChipTextSelected,
                  ]}
                >
                  {days} ngày
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Sheet>
  );
}

const setupStyles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  levelChip: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.text,
  },
  levelChipTextSelected: {
    color: '#FFFFFF',
  },
  durationPresetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  durationChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.textMuted,
  },
  durationChipTextSelected: {
    color: '#FFFFFF',
  },
});
