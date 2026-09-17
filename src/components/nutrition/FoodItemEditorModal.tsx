import React, { useEffect, useMemo, useState } from 'react';
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
import { Check, Flame, Info, Sparkles, Utensils, X } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import type { FoodCategory, FoodItem } from '@/types/nutrition';
import {
  FOOD_CATEGORY_LABELS,
  addCustomFood,
  updateCustomFood,
} from '@/services/foodDatabase';

export interface FoodItemEditorModalProps {
  visible: boolean;
  editingFood: FoodItem | null;
  onClose: () => void;
  onSaved: (savedFood: FoodItem) => void;
}

const CATEGORY_OPTIONS: Array<FoodCategory> = [
  'protein',
  'carbs',
  'veggies',
  'soup',
  'fat',
  'snack',
  'drink',
];

export function FoodItemEditorModal({
  visible,
  editingFood,
  onClose,
  onSaved,
}: FoodItemEditorModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('protein');
  const [servingLabel, setServingLabel] = useState('1 đĩa (150g)');
  const [servingGrams, setServingGrams] = useState('150');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [calories, setCalories] = useState('');
  const [prepTip, setPrepTip] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingFood) {
      setName(editingFood.name || '');
      setCategory(editingFood.category || 'protein');
      setServingLabel(
        editingFood.servingLabel || `${editingFood.defaultServingGrams || 150}g`
      );
      setServingGrams(String(editingFood.defaultServingGrams || 150));

      const grams = editingFood.defaultServingGrams || 100;
      const factor = grams / 100;
      const p = parseFloat((editingFood.proteinPer100g * factor).toFixed(1));
      const c = parseFloat((editingFood.carbsPer100g * factor).toFixed(1));
      const f = parseFloat((editingFood.fatPer100g * factor).toFixed(1));
      const kcal = Math.round(editingFood.caloriesPer100g * factor);

      setProtein(p > 0 ? String(p) : '');
      setCarbs(c > 0 ? String(c) : '');
      setFat(f > 0 ? String(f) : '');
      setCalories(kcal > 0 ? String(kcal) : '');
      setPrepTip(editingFood.prepTip || '');
    } else {
      setName('');
      setCategory('protein');
      setServingLabel('1 đĩa (150g)');
      setServingGrams('150');
      setProtein('');
      setCarbs('');
      setFat('');
      setCalories('');
      setPrepTip('');
    }
  }, [editingFood, visible]);

  // Live calculation of Macro percentages and calories
  const pVal = parseFloat(protein) || 0;
  const cVal = parseFloat(carbs) || 0;
  const fVal = parseFloat(fat) || 0;
  const autoKcal = Math.round(pVal * 4 + cVal * 4 + fVal * 9);
  const displayKcal = calories.trim() ? parseFloat(calories) || 0 : autoKcal;

  const totalMacroGrams = pVal + cVal + fVal;
  const pPct = totalMacroGrams > 0 ? Math.round((pVal / totalMacroGrams) * 100) : 0;
  const cPct = totalMacroGrams > 0 ? Math.round((cVal / totalMacroGrams) * 100) : 0;
  const fPct = totalMacroGrams > 0 ? Math.max(0, 100 - pPct - cPct) : 0;

  // Conversion to per 100g
  const gramsNum = parseFloat(servingGrams) || 150;
  const factor100 = gramsNum > 0 ? 100 / gramsNum : 1;
  const p100 = parseFloat((pVal * factor100).toFixed(1));
  const c100 = parseFloat((cVal * factor100).toFixed(1));
  const f100 = parseFloat((fVal * factor100).toFixed(1));
  const kcal100 = Math.round(displayKcal * factor100);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên món ăn.');
      return;
    }

    if (gramsNum <= 0) {
      Alert.alert('Khối lượng không hợp lệ', 'Khối lượng khẩu phần phải lớn hơn 0g.');
      return;
    }

    setSaving(true);
    try {
      if (editingFood) {
        await updateCustomFood(editingFood.id, {
          name: name.trim(),
          category,
          categoryLabel: FOOD_CATEGORY_LABELS[category],
          caloriesPer100g: kcal100,
          proteinPer100g: p100,
          carbsPer100g: c100,
          fatPer100g: f100,
          defaultServingGrams: gramsNum,
          servingLabel: servingLabel.trim() || `${gramsNum}g`,
          prepTip: prepTip.trim() || undefined,
          unit: editingFood.unit || 'phần',
        });

        const updated: FoodItem = {
          ...editingFood,
          name: name.trim(),
          category,
          categoryLabel: FOOD_CATEGORY_LABELS[category],
          caloriesPer100g: kcal100,
          proteinPer100g: p100,
          carbsPer100g: c100,
          fatPer100g: f100,
          defaultServingGrams: gramsNum,
          servingLabel: servingLabel.trim() || `${gramsNum}g`,
          prepTip: prepTip.trim() || undefined,
          isCustom: true,
        };
        onSaved(updated);
      } else {
        const created = await addCustomFood({
          name: name.trim(),
          category,
          categoryLabel: FOOD_CATEGORY_LABELS[category],
          caloriesPer100g: kcal100,
          proteinPer100g: p100,
          carbsPer100g: c100,
          fatPer100g: f100,
          defaultServingGrams: gramsNum,
          servingLabel: servingLabel.trim() || `${gramsNum}g`,
          prepTip: prepTip.trim() || undefined,
          unit: 'phần',
        });
        onSaved(created);
      }
      onClose();
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể lưu món ăn vào kho dữ liệu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerSubtitle}>KHO MÓN ĂN 3S GYM</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {editingFood ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Tên món */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Tên món ăn <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Ví dụ: Ức gà nướng bơ tỏi, Salad cá ngừ..."
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Phân loại món */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Phân loại dinh dưỡng</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = category === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        isSelected && styles.categoryPillTextActive,
                      ]}
                    >
                      {FOOD_CATEGORY_LABELS[cat]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Khẩu phần */}
          <View style={styles.rowTwoCols}>
            <View style={[styles.fieldGroup, { flex: 1.4 }]}>
              <Text style={styles.fieldLabel}>Tên khẩu phần</Text>
              <TextInput
                style={styles.textInput}
                value={servingLabel}
                onChangeText={setServingLabel}
                placeholder="1 đĩa (150g)"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Trọng lượng (g)</Text>
              <TextInput
                style={styles.textInput}
                value={servingGrams}
                onChangeText={setServingGrams}
                keyboardType="numeric"
                placeholder="150"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Dinh dưỡng cho 1 phần */}
          <View style={styles.nutritionBox}>
            <View style={styles.nutritionBoxHeader}>
              <Utensils size={14} color="#0284c7" />
              <Text style={styles.nutritionBoxTitle}>
                Dinh dưỡng cho 1 khẩu phần ({gramsNum}g):
              </Text>
            </View>

            <View style={styles.rowTwoCols}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.subFieldLabel}>Đạm / Protein (g)</Text>
                <TextInput
                  style={[styles.textInput, styles.numInput]}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.subFieldLabel}>Tinh bột / Carbs (g)</Text>
                <TextInput
                  style={[styles.textInput, styles.numInput]}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            <View style={styles.rowTwoCols}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.subFieldLabel}>Chất béo / Fat (g)</Text>
                <TextInput
                  style={[styles.textInput, styles.numInput]}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.subFieldLabel}>
                  Calo (kcal){' '}
                  {autoKcal > 0 && !calories ? `(Gợi ý: ${autoKcal})` : ''}
                </Text>
                <TextInput
                  style={[styles.textInput, styles.numInput]}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  placeholder={autoKcal > 0 ? String(autoKcal) : '0'}
                  placeholderTextColor={colors.textMuted}
                />
              </View>
            </View>

            {/* Live Macro Bar Preview */}
            <View style={styles.macroPreviewCard}>
              <View style={styles.macroPreviewTop}>
                <View style={styles.macroPreviewCalorie}>
                  <Flame size={14} color="#ea580c" />
                  <Text style={styles.macroPreviewCalorieText}>
                    {Math.round(displayKcal)} kcal / phần
                  </Text>
                </View>
                <Text style={styles.macroPreview100gText}>
                  Quy đổi: {kcal100} kcal / 100g
                </Text>
              </View>

              {totalMacroGrams > 0 ? (
                <View style={styles.macroBarTrack}>
                  <View
                    style={[styles.macroBarSegment, { flex: pPct || 1, backgroundColor: '#2563eb' }]}
                  />
                  <View
                    style={[styles.macroBarSegment, { flex: cPct || 1, backgroundColor: '#059669' }]}
                  />
                  <View
                    style={[styles.macroBarSegment, { flex: fPct || 1, backgroundColor: '#d97706' }]}
                  />
                </View>
              ) : null}

              <View style={styles.macroLegendsRow}>
                <Text style={[styles.macroLegendItem, { color: '#2563eb' }]}>
                  Đạm: {pVal}g ({pPct}%)
                </Text>
                <Text style={[styles.macroLegendItem, { color: '#059669' }]}>
                  Carb: {cVal}g ({cPct}%)
                </Text>
                <Text style={[styles.macroLegendItem, { color: '#d97706' }]}>
                  Béo: {fVal}g ({fPct}%)
                </Text>
              </View>
            </View>
          </View>

          {/* Mẹo chế biến / Hướng dẫn */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithHint}>
              <Text style={styles.fieldLabel}>Mẹo chế biến & Ghi chú (tùy chọn)</Text>
              <Info size={13} color={colors.textMuted} />
            </View>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={prepTip}
              onChangeText={setPrepTip}
              multiline
              numberOfLines={3}
              placeholder="Ví dụ: Áp chảo ít dầu lửa vừa, rắc muối tiêu thảo mộc hoặc ăn kèm xà lách..."
              placeholderTextColor={colors.textMuted}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.spacer} />
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelBtnText}>Hủy</Text>
          </Pressable>

          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Check size={16} color="#ffffff" />
            <Text style={styles.saveBtnText}>
              {saving ? 'Đang lưu...' : editingFood ? 'Cập nhật món' : 'Lưu món ăn'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? spacing.md : spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#0284c7',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  subFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  requiredMark: {
    color: '#ef4444',
  },
  labelWithHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  numInput: {
    fontWeight: '700',
  },
  multilineInput: {
    minHeight: 74,
    paddingTop: 10,
  },
  categoryScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  nutritionBox: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nutritionBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  nutritionBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
  },
  macroPreviewCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
    borderRadius: radius.md,
    padding: 10,
    marginTop: 4,
  },
  macroPreviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroPreviewCalorie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroPreviewCalorieText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  macroPreview100gText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  macroBarTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#e2e8f0',
  },
  macroBarSegment: {
    height: '100%',
  },
  macroLegendsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroLegendItem: {
    fontSize: 11,
    fontWeight: '700',
  },
  spacer: {
    height: 30,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  saveBtn: {
    flex: 2,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
