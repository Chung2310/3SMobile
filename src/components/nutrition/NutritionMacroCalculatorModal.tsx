import React, { useEffect, useState } from 'react';
import {
  Alert,
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
  ArrowLeftRight,
  Calculator,
  CheckCircle2,
  Circle,
  CircleDot,
  Droplets,
  Mars,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Venus,
  X,
} from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import type { CustomerProfile } from '@/types/domain';
import type { CalculatedNutrition } from '@/types/nutrition';
import { computeBmrAndMacros } from '@/services/nutritionService';
import { NutritionMacroBar } from './NutritionMacroBar';

interface NutritionMacroCalculatorModalProps {
  visible: boolean;
  customer?: CustomerProfile | null;
  onClose: () => void;
  onApplyPlan?: (calculated: CalculatedNutrition) => void;
}

const ACTIVITY_OPTIONS = [
  { factor: 1.2, label: 'Ít vận động', desc: 'Làm việc bàn giấy, ít đi lại' },
  { factor: 1.375, label: 'Vận động nhẹ', desc: 'Tập 1 - 3 buổi/tuần' },
  { factor: 1.55, label: 'Vận động vừa', desc: 'Tập 3 - 5 buổi/tuần (Khuyên dùng)' },
  { factor: 1.725, label: 'Vận động nặng', desc: 'Tập 6 - 7 buổi/tuần cường độ cao' },
];

const GOAL_OPTIONS = [
  {
    key: 'FAT_LOSS' as const,
    label: 'Giảm mỡ thâm hụt',
    badge: '-450 kcal',
    Icon: TrendingDown,
    color: '#0284C7',
  },
  {
    key: 'MAINTAIN' as const,
    label: 'Duy trì vóc dáng',
    badge: 'TDEE chuẩn',
    Icon: ArrowLeftRight,
    color: '#16A34A',
  },
  {
    key: 'MUSCLE_GAIN' as const,
    label: 'Tăng cơ nạc',
    badge: '+350 kcal',
    Icon: TrendingUp,
    color: '#7C3AED',
  },
];

export function NutritionMacroCalculatorModal({
  visible,
  customer,
  onClose,
  onApplyPlan,
}: NutritionMacroCalculatorModalProps) {
  const [sex, setSex] = useState<'MALE' | 'FEMALE'>('MALE');
  const [weight, setWeight] = useState('70');
  const [height, setHeight] = useState('170');
  const [age, setAge] = useState('25');
  const [activityFactor, setActivityFactor] = useState(1.55);
  const [goal, setGoal] = useState<'FAT_LOSS' | 'MAINTAIN' | 'MUSCLE_GAIN'>('FAT_LOSS');

  // Pre-fill from customer data if available
  useEffect(() => {
    if (visible && customer) {
      if (customer.gender === 'FEMALE') setSex('FEMALE');
      else setSex('MALE');
      if (customer.initialWeight) setWeight(String(customer.initialWeight));
      if (customer.height) setHeight(String(customer.height));
    }
  }, [visible, customer]);

  // Compute live calculation
  const weightNum = parseFloat(weight) || 70;
  const heightNum = parseFloat(height) || 170;
  const ageNum = parseInt(age, 10) || 25;

  const result = computeBmrAndMacros({
    weightKg: weightNum,
    heightCm: heightNum,
    age: ageNum,
    sex,
    activityFactor,
    goal,
  });

  const handleApply = () => {
    onApplyPlan?.(result);
    onClose();
  };

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
                <Calculator size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Tính BMR & Macro Cá Nhân</Text>
                <Text style={styles.subtitle}>
                  {customer ? `Học viên: ${customer.fullName}` : 'Công thức chuẩn Mifflin-St Jeor'}
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
            {/* 1. Basic Stats Row (Gender, Weight, Height, Age) */}
            <Text style={styles.sectionLabel}>1. THÔNG SỐ CƠ THỂ</Text>

            {/* Gender Toggle */}
            <View style={styles.genderRow}>
              <Pressable
                style={[styles.genderBtn, sex === 'MALE' && styles.genderBtnActive]}
                onPress={() => setSex('MALE')}
              >
                <Mars
                  size={16}
                  color={sex === 'MALE' ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.genderText, sex === 'MALE' && styles.genderTextActive]}>
                  Nam
                </Text>
              </Pressable>

              <Pressable
                style={[styles.genderBtn, sex === 'FEMALE' && styles.genderBtnActiveFemale]}
                onPress={() => setSex('FEMALE')}
              >
                <Venus
                  size={16}
                  color={sex === 'FEMALE' ? '#EC4899' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.genderText,
                    sex === 'FEMALE' && { color: '#EC4899', fontWeight: '700' },
                  ]}
                >
                  Nữ
                </Text>
              </Pressable>
            </View>

            {/* 3 Inputs Grid */}
            <View style={styles.inputsGrid}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Cân nặng (kg)</Text>
                <TextInput
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  style={styles.inputField}
                  placeholder="70"
                />
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Chiều cao (cm)</Text>
                <TextInput
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  style={styles.inputField}
                  placeholder="170"
                />
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Tuổi</Text>
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  style={styles.inputField}
                  placeholder="25"
                />
              </View>
            </View>

            {/* 2. Goal Selection */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>2. MỤC TIÊU LUYỆN TẬP</Text>
            <View style={styles.goalsList}>
              {GOAL_OPTIONS.map((g) => {
                const isSelected = goal === g.key;
                const GoalIcon = g.Icon;
                return (
                  <Pressable
                    key={g.key}
                    style={[
                      styles.goalOption,
                      isSelected && { borderColor: g.color, backgroundColor: `${g.color}0D` },
                    ]}
                    onPress={() => setGoal(g.key)}
                  >
                    <View style={styles.goalLeft}>
                      <View
                        style={[
                          styles.goalIconBox,
                          { backgroundColor: `${g.color}1A` },
                        ]}
                      >
                        <GoalIcon size={18} color={g.color} />
                      </View>
                      <View>
                        <Text style={[styles.goalTitle, isSelected && { color: g.color }]}>
                          {g.label}
                        </Text>
                        <Text style={styles.goalSub}>{g.badge}</Text>
                      </View>
                    </View>
                    {isSelected ? (
                      <CheckCircle2 size={20} color={g.color} />
                    ) : (
                      <Circle size={20} color="#CBD5E1" />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* 3. Activity Level */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>3. MỨC ĐỘ VẬN ĐỘNG</Text>
            <View style={styles.activityList}>
              {ACTIVITY_OPTIONS.map((act) => {
                const isSelected = activityFactor === act.factor;
                return (
                  <Pressable
                    key={act.factor}
                    style={[
                      styles.activityItem,
                      isSelected && styles.activityItemActive,
                    ]}
                    onPress={() => setActivityFactor(act.factor)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.activityName,
                          isSelected && styles.activityNameActive,
                        ]}
                      >
                        {act.label} ({act.factor}x)
                      </Text>
                      <Text style={styles.activityDesc}>{act.desc}</Text>
                    </View>
                    {isSelected ? (
                      <CircleDot size={18} color={colors.primary} />
                    ) : (
                      <Circle size={18} color={colors.textMuted} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* 4. Live Results Box */}
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>4. KẾT QUẢ TÍNH TOÁN</Text>

            {/* BMR & TDEE 2-Col Box */}
            <View style={styles.energyRow}>
              <View style={styles.energyBox}>
                <Text style={styles.energyLabel}>BMR (Chuyển hóa cơ bản)</Text>
                <Text style={styles.energyVal}>
                  {result.bmr} <Text style={styles.energyUnit}>kcal</Text>
                </Text>
                <Text style={styles.energySub}>Calo tối thiểu khi nằm nghỉ</Text>
              </View>

              <View style={styles.energyBox}>
                <Text style={styles.energyLabel}>TDEE (Tổng tiêu hao/ngày)</Text>
                <Text style={styles.energyVal}>
                  {result.tdee} <Text style={styles.energyUnit}>kcal</Text>
                </Text>
                <Text style={styles.energySub}>Bao gồm sinh hoạt & thể thao</Text>
              </View>
            </View>

            {/* Macro & Target Card */}
            <NutritionMacroBar
              targetCalories={result.targetCalories}
              macros={result.macros}
              title={result.goalLabel}
              showSubtitle={false}
            />

            {/* Water Recommendation */}
            <View style={styles.waterBox}>
              <Droplets size={16} color="#0284C7" />
              <Text style={styles.waterText}>
                Lượng nước uống khuyến nghị:{' '}
                <Text style={{ fontWeight: '700', color: '#0369A1' }}>
                  {result.waterLiters} lít / ngày
                </Text>
              </Text>
            </View>
          </ScrollView>

          {/* Footer Action Buttons */}
          <View style={styles.footerRow}>
            <Pressable style={styles.closeBtnFooter} onPress={onClose}>
              <Text style={styles.closeBtnFooterText}>Đóng</Text>
            </Pressable>

            {onApplyPlan && (
              <Pressable style={styles.applyBtn} onPress={handleApply}>
                <Sparkles size={16} color="#FFFFFF" />
                <Text style={styles.applyBtnText}>Tạo thực đơn theo Macro này</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '92%',
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
    backgroundColor: '#EFF6FF',
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  genderBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  genderBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  genderBtnActiveFemale: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FBCFE8',
  },
  genderText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  genderTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  inputsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11.5,
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
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  goalsList: {
    gap: 8,
  },
  goalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  goalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goalIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  goalSub: {
    fontSize: 11,
    color: colors.textMuted,
  },
  activityList: {
    gap: 6,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  activityItemActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FF',
  },
  activityName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
  activityNameActive: {
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  activityDesc: {
    fontSize: 10.5,
    color: colors.textMuted,
  },
  energyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  energyBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  energyLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
  },
  energyVal: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.primaryNavy,
    marginVertical: 2,
  },
  energyUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  energySub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  waterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  waterText: {
    fontSize: 12,
    color: '#0369A1',
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
  closeBtnFooter: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  closeBtnFooterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
