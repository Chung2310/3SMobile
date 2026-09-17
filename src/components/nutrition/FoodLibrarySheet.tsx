import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CheckCircle2, Minus, Plus, Search, X, XCircle } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import type { FoodCategory, FoodItem, MealFoodEntry } from '@/types/nutrition';
import {
  FOOD_CATEGORY_LABELS,
  calculateFoodMacros,
  searchFoods,
  subscribeToFoodDatabaseUpdates,
} from '@/services/foodDatabase';
import { FoodItemEditorModal } from './FoodItemEditorModal';

export interface FoodLibrarySheetProps {
  visible: boolean;
  title?: string;
  targetMealTitle?: string;
  onClose: () => void;
  onSelectFood?: (entry: MealFoodEntry) => void;
}

const CATEGORIES: Array<FoodCategory | 'all' | 'custom'> = [
  'all',
  'custom',
  'protein',
  'carbs',
  'veggies',
  'soup',
  'fat',
  'snack',
  'drink',
];

export function FoodLibrarySheet({
  visible,
  title,
  targetMealTitle = 'bữa ăn',
  onClose,
  onSelectFood,
}: FoodLibrarySheetProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'all' | 'custom'>('all');
  const [dbVersion, setDbVersion] = useState(0);
  const [editorModalVisible, setEditorModalVisible] = useState(false);

  // Selected food for portion adjusting
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [grams, setGrams] = useState('150');

  useEffect(() => {
    return subscribeToFoodDatabaseUpdates(() => {
      setDbVersion((v) => v + 1);
    });
  }, []);

  const foods = useMemo(() => {
    return searchFoods(search, selectedCategory);
  }, [search, selectedCategory, dbVersion]);

  const handlePickItem = (food: FoodItem) => {
    setSelectedFood(food);
    setGrams(String(food.defaultServingGrams || 100));
  };

  const handleConfirmAdd = () => {
    if (!selectedFood) return;
    const g = parseFloat(grams) || selectedFood.defaultServingGrams || 100;
    const calc = calculateFoodMacros(selectedFood, g);

    const entry: MealFoodEntry = {
      id: `food-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      foodId: selectedFood.id,
      name: selectedFood.name,
      grams: g,
      calories: calc.calories,
      protein: calc.protein,
      carbs: calc.carbs,
      fat: calc.fat,
      notes: selectedFood.prepTip,
    };

    if (onSelectFood) {
      onSelectFood(entry);
    }
    setSelectedFood(null);
    onClose();
  };

  const adjustGrams = (delta: number) => {
    const cur = parseFloat(grams) || 100;
    const next = Math.max(10, cur + delta);
    setGrams(String(next));
  };

  const activeMacros = selectedFood
    ? calculateFoodMacros(selectedFood, parseFloat(grams) || selectedFood.defaultServingGrams)
    : null;

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{title || 'Kho Món Ăn Dinh Dưỡng'}</Text>
                <Text style={styles.subtitle}>
                  {onSelectFood ? (
                    <>
                      Thêm món vào <Text style={{ fontWeight: '700', color: colors.primary }}>{targetMealTitle}</Text>
                    </>
                  ) : (
                    'Tra cứu thành phần dinh dưỡng & định lượng calo chuẩn'
                  )}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Quick Create Dish Button */}
            <View style={styles.sheetActionRow}>
              <Pressable
                style={styles.sheetAddFoodBtn}
                onPress={() => setEditorModalVisible(true)}
              >
                <Plus size={14} color="#ffffff" />
                <Text style={styles.sheetAddFoodBtnText}>+ Thêm món ăn mới vào kho</Text>
              </Pressable>
            </View>

            {/* Search Box */}
          <View style={styles.searchBox}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Tìm theo tên món (VD: Ức gà, Cơm tấm, Phở bò...)"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
            {search ? (
              <Pressable hitSlop={8} onPress={() => setSearch('')}>
                <XCircle size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat)}
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

          {/* Food List */}
          <ScrollView
            style={styles.listScroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {foods.map((item) => {
              const isChosen = selectedFood?.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.foodCard, isChosen && styles.foodCardChosen]}
                  onPress={() => handlePickItem(item)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.foodName, isChosen && { color: colors.primary }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.isCustom && (
                        <View style={styles.customFoodBadge}>
                          <Text style={styles.customFoodBadgeText}>Tự thêm</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.foodServingSub}>
                      Khẩu phần: {item.servingLabel || `${item.defaultServingGrams}g`}
                    </Text>
                    <View style={styles.macroPillsRow}>
                      <View style={[styles.macroPill, { backgroundColor: '#EFF6FF' }]}>
                        <Text style={[styles.macroPillText, { color: '#1D4ED8' }]}>
                          P: {item.proteinPer100g}g
                        </Text>
                      </View>
                      <View style={[styles.macroPill, { backgroundColor: '#FFFBEB' }]}>
                        <Text style={[styles.macroPillText, { color: '#B45309' }]}>
                          C: {item.carbsPer100g}g
                        </Text>
                      </View>
                      <View style={[styles.macroPill, { backgroundColor: '#FEF2F2' }]}>
                        <Text style={[styles.macroPillText, { color: '#B91C1C' }]}>
                          F: {item.fatPer100g}g
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.foodCalCol}>
                    <Text style={styles.foodCalNum}>{item.caloriesPer100g}</Text>
                    <Text style={styles.foodCalUnit}>kcal / 100g</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Selected Food Portion Adjuster Drawer (When item is selected) */}
          {selectedFood && activeMacros && (
            <View style={styles.portionBox}>
              <View style={styles.portionTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.portionName} numberOfLines={1}>
                    {selectedFood.name}
                  </Text>
                  <Text style={styles.portionTip} numberOfLines={1}>
                    {selectedFood.prepTip || 'Định lượng khẩu phần'}
                  </Text>
                </View>

                <View style={styles.portionTotalCal}>
                  <Text style={styles.portionTotalNum}>{activeMacros.calories}</Text>
                  <Text style={styles.portionTotalUnit}>kcal</Text>
                </View>
              </View>

              {/* Gram stepper */}
              <View style={styles.stepperRow}>
                <Text style={styles.stepperLabel}>Số lượng (gram):</Text>
                <View style={styles.stepperBtns}>
                  <Pressable style={styles.stepperBtn} onPress={() => adjustGrams(-25)}>
                    <Minus size={16} color={colors.text} />
                  </Pressable>
                  <TextInput
                    value={grams}
                    onChangeText={setGrams}
                    keyboardType="numeric"
                    style={styles.stepperInput}
                  />
                  <Pressable style={styles.stepperBtn} onPress={() => adjustGrams(25)}>
                    <Plus size={16} color={colors.text} />
                  </Pressable>
                </View>
              </View>

              {/* Add Button */}
              <Pressable style={styles.addBtn} onPress={handleConfirmAdd}>
                <CheckCircle2 size={18} color="#FFFFFF" />
                <Text style={styles.addBtnText}>
                  {onSelectFood
                    ? `Thêm vào ${targetMealTitle} (${activeMacros.calories} kcal)`
                    : `Xong (${activeMacros.calories} kcal)`}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>

    {/* Food Item Editor Modal for Creating Food On The Fly */}
    <FoodItemEditorModal
      visible={editorModalVisible}
      editingFood={null}
      onClose={() => setEditorModalVisible(false)}
      onSaved={(saved) => {
        setEditorModalVisible(false);
        handlePickItem(saved);
      }}
    />
  </>
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
    maxHeight: '90%',
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
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  sheetActionRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  sheetAddFoodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0284c7',
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  sheetAddFoodBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    padding: 0,
  },
  categoryRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  categoryPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listScroll: {
    maxHeight: 320,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    gap: 8,
    paddingBottom: 16,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  foodCardChosen: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FF',
  },
  foodName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  foodServingSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 6,
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  macroPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  macroPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  customFoodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#E0F2FE',
  },
  customFoodBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
  },
  foodCalCol: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  foodCalNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EA580C',
  },
  foodCalUnit: {
    fontSize: 9.5,
    color: colors.textMuted,
  },
  portionBox: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1.5,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  portionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portionName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  portionTip: {
    fontSize: 11,
    color: colors.textMuted,
  },
  portionTotalCal: {
    alignItems: 'flex-end',
  },
  portionTotalNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#C2410C',
  },
  portionTotalUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EA580C',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
  stepperBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperInput: {
    width: 60,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    padding: 0,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
