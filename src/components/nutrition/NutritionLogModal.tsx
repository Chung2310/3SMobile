import React, { useEffect, useState } from 'react';
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
import { CheckCircle2, Flame, Pencil, Utensils, X } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import { AppAlertModal, useAppAlert } from '@/components/AppAlertModal';
import type { MealType, NutritionLogItem } from '@/types/nutrition';
import { nutritionService } from '@/services/nutritionService';

const MACRO_COLORS = {
  protein: '#2563EB',
  carbs: '#059669',
  fat: '#D97706',
};

interface NutritionLogModalProps {
  visible: boolean;
  customerId?: string;
  initialType?: 'FOOD' | 'ACTIVITY';
  editingLog?: NutritionLogItem | null;
  onClose: () => void;
  onSaved: (log: NutritionLogItem) => void;
}

const FOOD_PRESETS = [
  { name: 'Phở bò tái nạm', cal: 480, p: 28, c: 55, f: 14 },
  { name: 'Cơm tấm sườn bì chả', cal: 650, p: 32, c: 78, f: 24 },
  { name: 'Ức gà áp chảo 200g + Cơm lức', cal: 420, p: 58, c: 35, f: 6 },
  { name: 'Bún chả Hà Nội', cal: 520, p: 26, c: 62, f: 18 },
  { name: '1 Muỗng Whey Isolate', cal: 130, p: 27, c: 2, f: 1 },
  { name: 'Trứng gà luộc 2 quả', cal: 155, p: 13, c: 1, f: 11 },
  { name: 'Bánh mì nạc ram pate', cal: 460, p: 20, c: 50, f: 20 },
  { name: 'Khoai lang luộc 200g', cal: 172, p: 3, c: 40, f: 0.3 },
];

const ACTIVITY_PRESETS = [
  { name: 'Gym / Kháng lực cường độ cao (1h)', cal: 450, duration: 60 },
  { name: 'Chạy bộ ngoài trời (30p)', cal: 320, duration: 30 },
  { name: 'Đạp xe Cardio ngoài trời (45p)', cal: 350, duration: 45 },
  { name: 'Bơi lội tự do (40p)', cal: 320, duration: 40 },
  { name: 'HIIT / Tabata ngắt quãng (30p)', cal: 380, duration: 30 },
  { name: 'Boxing / Kickfit (45p)', cal: 420, duration: 45 },
  { name: 'Nhảy dây tốc độ (30p)', cal: 400, duration: 30 },
  { name: 'Đi bộ nhanh 5,000 bước (40p)', cal: 200, duration: 40 },
];

export function NutritionLogModal({
  visible,
  customerId,
  initialType = 'FOOD',
  editingLog,
  onClose,
  onSaved,
}: NutritionLogModalProps) {
  const isEditing = !!editingLog;

  const [type, setType] = useState<'FOOD' | 'ACTIVITY'>(initialType);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [mealType, setMealType] = useState<MealType>('LUNCH');
  const [notes, setNotes] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [saving, setSaving] = useState(false);
  const { alertConfig, showSuccess, showError, showWarning } = useAppAlert();

  useEffect(() => {
    if (visible) {
      if (editingLog) {
        setType(editingLog.type || 'FOOD');
        setName(editingLog.name || '');
        setCalories(editingLog.calories ? String(editingLog.calories) : '');
        setDurationMinutes(
          (editingLog as any).durationMinutes ? String((editingLog as any).durationMinutes) : ''
        );
        setMealType(editingLog.mealType || 'LUNCH');
        setNotes(editingLog.notes || '');
        setProtein(editingLog.macros?.protein ? String(editingLog.macros.protein) : '');
        setCarbs(editingLog.macros?.carbs ? String(editingLog.macros.carbs) : '');
        setFat(editingLog.macros?.fat ? String(editingLog.macros.fat) : '');
      } else {
        setType(initialType);
        setName('');
        setCalories('');
        setDurationMinutes('');
        setMealType('LUNCH');
        setNotes('');
        setProtein('');
        setCarbs('');
        setFat('');
      }
    }
  }, [visible, initialType, editingLog]);

  const handleApplyFoodPreset = (item: (typeof FOOD_PRESETS)[0]) => {
    setName(item.name);
    setCalories(String(item.cal));
    setProtein(String(item.p));
    setCarbs(String(item.c));
    setFat(String(item.f));
  };

  const handleApplyActivityPreset = (item: (typeof ACTIVITY_PRESETS)[0]) => {
    setName(item.name);
    setCalories(String(item.cal));
    setDurationMinutes(String(item.duration));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showWarning('Vui lòng nhập tên món ăn hoặc bài tập vận động.', 'Thiếu thông tin');
      return;
    }
    const calNum = parseFloat(calories);
    if (isNaN(calNum) || calNum <= 0) {
      showWarning('Vui lòng nhập số calories hợp lệ lớn hơn 0.', 'Sai Calo');
      return;
    }

    try {
      setSaving(true);
      const payload: Partial<NutritionLogItem> = {
        customerId,
        type,
        name: name.trim(),
        calories: calNum,
        time: editingLog?.time || new Date().toISOString(),
        mealType: type === 'FOOD' ? mealType : undefined,
        notes: notes.trim() || undefined,
        macros:
          type === 'FOOD' && (protein || carbs || fat)
            ? {
                protein: parseFloat(protein) || 0,
                carbs: parseFloat(carbs) || 0,
                fat: parseFloat(fat) || 0,
              }
            : undefined,
      };

      if (type === 'ACTIVITY' && durationMinutes) {
        (payload as any).durationMinutes = parseFloat(durationMinutes) || 30;
      }

      let resultLog: NutritionLogItem;

      if (isEditing && editingLog) {
        const logId = editingLog._id || editingLog.id || '';
        resultLog = await nutritionService.updateLog(logId, payload);
        showSuccess('Đã cập nhật bản ghi nhật ký.', 'Thành công', () => {
          onSaved(resultLog);
          onClose();
        });
      } else {
        resultLog = await nutritionService.createLog(payload);
        showSuccess(
          type === 'FOOD' ? 'Đã ghi nhận món ăn' : 'Đã ghi nhận tiêu hao calo',
          'Thành công',
          () => {
            onSaved(resultLog);
            onClose();
          }
        );
      }
    } catch (err: any) {
      showError(err?.message || 'Không thể lưu vào hệ thống.', 'Lỗi lưu nhật ký');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View
                  style={[
                    styles.headerIconCircle,
                    {
                      backgroundColor:
                        type === 'FOOD' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    },
                  ]}
                >
                  {type === 'FOOD' ? (
                    <Utensils size={18} color={colors.primary} />
                  ) : (
                    <Flame size={18} color={colors.danger} />
                  )}
                </View>
                <View>
                  <Text style={styles.headerTitle}>
                    {isEditing ? 'Chỉnh Sửa Nhật Ký' : 'Ghi Nhật Ký Dinh Dưỡng & Vận Động'}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {type === 'FOOD' ? 'Ghi nhận calo nạp vào cơ thể' : 'Ghi nhận năng lượng đốt cháy qua vận động'}
                  </Text>
                </View>
              </View>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
              {/* Type Selector (Nạp vào vs Tiêu hao) */}
              <View style={styles.typeSelectorRow}>
                <Pressable
                  onPress={() => setType('FOOD')}
                  style={[styles.typeTab, type === 'FOOD' && styles.typeTabActiveFood]}
                >
                  <Utensils
                    size={16}
                    color={type === 'FOOD' ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[styles.typeTabText, type === 'FOOD' && styles.typeTabTextActiveFood]}
                  >
                    Nạp Vào (Ăn uống)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setType('ACTIVITY')}
                  style={[styles.typeTab, type === 'ACTIVITY' && styles.typeTabActiveActivity]}
                >
                  <Flame
                    size={16}
                    color={type === 'ACTIVITY' ? colors.danger : colors.textMuted}
                  />
                  <Text
                    style={[styles.typeTabText, type === 'ACTIVITY' && styles.typeTabTextActiveActivity]}
                  >
                    Tiêu Hao (Vận động)
                  </Text>
                </Pressable>
              </View>

              {/* Quick Presets */}
              <View style={styles.presetSection}>
                <Text style={styles.sectionSubtitle}>
                  {type === 'FOOD' ? 'Gợi ý nhanh món ăn phổ biến:' : 'Gợi ý nhanh bài tập & vận động:'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
                  {type === 'FOOD'
                    ? FOOD_PRESETS.map((p, idx) => (
                        <Pressable
                          key={idx}
                          style={styles.presetPill}
                          onPress={() => handleApplyFoodPreset(p)}
                        >
                          <Text style={styles.presetPillText}>{p.name}</Text>
                          <Text style={styles.presetPillCal}>+{p.cal} kcal</Text>
                        </Pressable>
                      ))
                    : ACTIVITY_PRESETS.map((a, idx) => (
                        <Pressable
                          key={idx}
                          style={[styles.presetPill, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                          onPress={() => handleApplyActivityPreset(a)}
                        >
                          <Text style={styles.presetPillText}>{a.name}</Text>
                          <Text style={[styles.presetPillCal, { color: colors.danger }]}>-{a.cal} kcal</Text>
                        </Pressable>
                      ))}
                </ScrollView>
              </View>

              {/* Form Fields */}
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>
                  {type === 'FOOD' ? 'Tên món ăn / đồ uống *' : 'Tên bài tập / hoạt động *'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder={type === 'FOOD' ? 'VD: Cơm trưa công ty, Sinh tố bơ...' : 'VD: Chạy bộ máy 30p, Tập tạ ngực...'}
                  placeholderTextColor={colors.textMuted}
                />

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>
                      Calories ({type === 'FOOD' ? 'kcal' : '-kcal'}) *
                    </Text>
                    <TextInput
                      style={[styles.input, styles.calInput]}
                      value={calories}
                      onChangeText={setCalories}
                      placeholder="VD: 350"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                    />
                  </View>

                  {type === 'FOOD' ? (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Bữa ăn</Text>
                      <View style={styles.mealSelectRow}>
                        {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as MealType[]).map((m) => (
                          <Pressable
                            key={m}
                            style={[
                              styles.mealMiniBtn,
                              mealType === m && styles.mealMiniBtnActive,
                            ]}
                            onPress={() => setMealType(m)}
                          >
                            <Text
                              style={[
                                styles.mealMiniBtnText,
                                mealType === m && styles.mealMiniBtnTextActive,
                              ]}
                            >
                              {m === 'BREAKFAST'
                                ? 'Sáng'
                                : m === 'LUNCH'
                                ? 'Trưa'
                                : m === 'DINNER'
                                ? 'Tối'
                                : 'Phụ'}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Thời lượng (phút)</Text>
                      <TextInput
                        style={styles.input}
                        value={durationMinutes}
                        onChangeText={setDurationMinutes}
                        placeholder="VD: 45"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="numeric"
                      />
                    </View>
                  )}
                </View>

                {/* Optional Macros for FOOD */}
                {type === 'FOOD' && (
                  <View style={styles.macroInputsCard}>
                    <Text style={styles.macroCardTitle}>Thành phần Macro (tùy chọn)</Text>
                    <View style={styles.macroCols}>
                      <View style={styles.macroColItem}>
                        <Text style={[styles.macroColLabel, { color: MACRO_COLORS.protein }]}>Protein (g)</Text>
                        <TextInput
                          style={styles.macroInput}
                          value={protein}
                          onChangeText={setProtein}
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.macroColItem}>
                        <Text style={[styles.macroColLabel, { color: MACRO_COLORS.carbs }]}>Carbs (g)</Text>
                        <TextInput
                          style={styles.macroInput}
                          value={carbs}
                          onChangeText={setCarbs}
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.macroColItem}>
                        <Text style={[styles.macroColLabel, { color: MACRO_COLORS.fat }]}>Fat (g)</Text>
                        <TextInput
                          style={styles.macroInput}
                          value={fat}
                          onChangeText={setFat}
                          placeholder="0"
                          placeholderTextColor={colors.textMuted}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Notes */}
                <Text style={styles.inputLabel}>Ghi chú thêm</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ghi chú về khối lượng hoặc cảm giác sau tập..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            {/* Footer actions */}
            <View style={styles.footer}>
              <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
                <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.saveBtn,
                  type === 'ACTIVITY' && { backgroundColor: colors.danger },
                  saving && styles.saveBtnDisabled,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    {isEditing ? (
                      <Pencil size={17} color="#fff" />
                    ) : (
                      <CheckCircle2 size={17} color="#fff" />
                    )}
                    <Text style={styles.saveBtnText}>
                      {isEditing ? 'Lưu Thay Đổi' : 'Lưu Nhật Ký'}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AppAlertModal {...alertConfig} />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  contentScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  typeTabActiveFood: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeTabActiveActivity: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typeTabTextActiveFood: {
    color: colors.primary,
    fontWeight: '800',
  },
  typeTabTextActiveActivity: {
    color: colors.danger,
    fontWeight: '800',
  },
  presetSection: {
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 6,
  },
  presetScroll: {
    flexDirection: 'row',
  },
  presetPill: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetPillText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  presetPillCal: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  formSection: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  calInput: {
    fontWeight: '700',
    color: colors.primary,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mealSelectRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  mealMiniBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.card,
  },
  mealMiniBtnActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  mealMiniBtnText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  mealMiniBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  macroInputsCard: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  macroCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  macroCols: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroColItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroColLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  macroInput: {
    width: '100%',
    textAlign: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  notesInput: {
    height: 60,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
