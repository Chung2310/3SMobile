import React, { useEffect, useMemo, useState } from 'react';
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
import { X } from 'lucide-react-native';
import { colors, radius } from '@/theme';
import { AppAlertModal, useAppAlert } from '@/components/AppAlertModal';
import type { CustomerProfile } from '@/types/domain';
import type { MealBlock, NutritionPlanData, WeekMenuPlan } from '@/types/nutrition';
import { ALLERGY_CHIPS } from '@/types/nutrition';
import { nutritionService } from '@/services/nutritionService';
import {
  formatDisplayDateVi,
  formatShortDay,
  normalizePlanToWeeks,
} from '@/utils/nutritionScheduleHelper';

interface AiNutritionDraftModalProps {
  visible: boolean;
  customer?: CustomerProfile | null;
  onClose: () => void;
  onPlanCreated: (plan: NutritionPlanData) => void;
  onOpenManualEditor?: (draftPlan: NutritionPlanData) => void;
}

const AI_PRESET_PROMPTS = [
  {
    label: 'Giảm mỡ (4 bữa)',
    prompt:
      'Thực đơn 4 bữa/ngày (Sáng, Trưa, Phụ, Tối), tập trung thâm hụt calo giảm mỡ an toàn, giữ cơ bắp, ưu tiên món cơm Việt dễ nấu (ức gà, cá, trứng, khoai lang, rau muống luộc).',
  },
  {
    label: 'Tăng cơ nạc (5 bữa)',
    prompt:
      'Thực đơn 5 bữa/ngày, giàu đạm Protein (2.2g/kg), bổ sung tinh bột hấp thu chậm trước tập, ưu tiên thịt bò thăn, ức gà, trứng luộc, chuối và sữa chua.',
  },
  {
    label: 'Eat Clean cơm Việt',
    prompt:
      'Thực đơn 3 bữa chính + 1 bữa phụ, chế biến ít dầu mỡ, nhiều chất xơ rau củ theo mùa, gia vị tự nhiên (tỏi, gừng, chanh), hạn chế đồ chiên ngập dầu.',
  },
  {
    label: 'Ăn chay thể hình',
    prompt:
      'Thực đơn thuần chay hoặc chay có trứng sữa, đảm bảo đủ đạm từ đậu hũ, nấm, trứng, các loại hạt đậu, bột yến mạch và sữa hạt.',
  },
  {
    label: 'Nhanh gọn cho người bận',
    prompt:
      'Thực đơn tối ưu thời gian nấu nướng dưới 20 phút mỗi bữa, nguyên liệu dễ mua tại siêu thị, tiện chia phần chuẩn bị từ tối hôm trước.',
  },
];


export function AiNutritionDraftModal({
  visible,
  customer,
  onClose,
  onPlanCreated,
  onOpenManualEditor,
}: AiNutritionDraftModalProps) {
  const [request, setRequest] = useState(AI_PRESET_PROMPTS[0].prompt);
  const [durationDays, setDurationDays] = useState(30);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<NutritionPlanData | null>(null);
  const [adviceExpanded, setAdviceExpanded] = useState(true);
  const { alertConfig, showSuccess, showError, showWarning } = useAppAlert();
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  const weeks: WeekMenuPlan[] = useMemo(() => {
    if (!generatedDraft) return [];
    return normalizePlanToWeeks(generatedDraft);
  }, [generatedDraft]);

  const activeWeek = weeks[selectedWeekIdx] || weeks[0];
  const activeDay = activeWeek?.days?.[selectedDayIdx] || activeWeek?.days?.[0];
  const activeMeals: MealBlock[] = activeDay?.meals || [];


  // Reset state on open
  useEffect(() => {
    if (visible) {
      // Reset this persistent native modal when it is opened for a new editing session.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGeneratedDraft(null);
      setLoading(false);
      setSaving(false);
      setAdviceExpanded(false);
      setSelectedWeekIdx(0);
      setSelectedDayIdx(0);
      setSelectedAllergies([]);
      setCustomAllergy('');
    }
  }, [visible]);

  const toggleAllergy = (chip: string) => {
    setSelectedAllergies((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  };

  // Handle AI generation
  const handleGenerate = async () => {
    const customerId = customer?._id || (customer as any)?.id;
    if (!customerId) {
      showWarning('Vui lòng chọn học viên trước khi tạo thực đơn AI.', 'Chưa chọn học viên');
      return;
    }

    try {
      setLoading(true);
      const allRestrictions = [...selectedAllergies];
      if (customAllergy.trim()) {
        allRestrictions.push(customAllergy.trim());
      }
      const allergyClause =
        allRestrictions.length > 0
          ? `\n- Kiêng kỵ & Dị ứng bắt buộc tránh: ${allRestrictions.join(', ')}.`
          : '';
      const promptWithDuration = `Thực đơn ${durationDays} ngày (kéo dài ${Math.ceil(durationDays / 7)} tuần), chia theo tuần và từng ngày: ${request}${allergyClause}`;
      const draft = await nutritionService.generateAiNutritionDraft(customerId, promptWithDuration, undefined, durationDays);
      draft.durationDays = draft.durationDays || durationDays;
      setGeneratedDraft(draft);
      setSelectedWeekIdx(0);
      setSelectedDayIdx(0);
    } catch (err: any) {
      showError(
        err?.message || 'Không thể tạo thực đơn AI lúc này. Vui lòng thử lại sau.',
        'Lỗi tạo thực đơn AI'
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Save to DB directly
  const handleSaveDraft = async () => {
    if (!generatedDraft) return;
    const customerId = customer?._id || (customer as any)?.id;
    if (!customerId) return;

    try {
      setSaving(true);
      const menuPayload = weeks.map((w) => ({
        weekNumber: w.weekNumber,
        name: w.name,
        startDate: w.startDate,
        endDate: w.endDate,
        days: w.days.map((d) => ({
          dayNumber: d.dayNumber,
          date: d.date,
          dayOfWeek: d.dayOfWeek,
          meals: d.meals.map((m) => ({
            id: m.id,
            name: m.title || m.name,
            timeSlot: m.timeHint || m.timeSlot,
            calories: m.totalCalories || m.calories || 0,
            items: (m.items || []).map((i) => ({
              name: i.name,
              amount: i.amount || `${(i as any).grams || 100}g`,
              calories: i.calories,
              protein: i.protein,
              carbs: i.carbs,
              fat: i.fat,
              prepTip: i.prepTip || (i as any).notes,
            })),
            imageUrl: m.imageUrl,
          })),
        })),
      }));

      const dailyPlansPayload = weeks.flatMap((w) =>
        w.days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          dayNumber: d.dayNumber,
          date: d.date,
          meals: d.meals,
        }))
      );

      const payload: Partial<NutritionPlanData> = {
        customerId,
        title: generatedDraft.title,
        startDate: generatedDraft.startDate || new Date().toISOString(),
        endDate: generatedDraft.endDate,
        durationDays: generatedDraft.durationDays || durationDays,
        targetCalories: generatedDraft.targetCalories,
        macros: generatedDraft.macros,
        status: 'PUBLISHED',
        notes: generatedDraft.notes,
        menu: menuPayload,
        dailyPlans: dailyPlansPayload,
      };
      const id = generatedDraft._id || generatedDraft.id;
      const saved = id ? await nutritionService.updatePlan(id, payload) : await nutritionService.createPlan(payload);
      showSuccess('Đã lưu thực đơn do AI tạo vào danh sách thực đơn!', 'Thành công', () => {
        onPlanCreated(saved);
        onClose();
      });
    } catch (err: any) {
      showError(err?.message || 'Không thể lưu thực đơn.', 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  };

  // Handle handoff to manual editor for adjustments
  const handleEditManually = () => {
    if (!generatedDraft) return;
    onClose();
    if (onOpenManualEditor) {
      const fullDraft: NutritionPlanData = {
        ...generatedDraft,
        durationDays: generatedDraft.durationDays || durationDays,
        menu: weeks as any,
        dailyPlans: weeks.flatMap((w) =>
          w.days.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            dayNumber: d.dayNumber,
            date: d.date,
            meals: d.meals,
          }))
        ),
      };
      onOpenManualEditor(fullDraft);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View>
                <Text style={styles.headerTitle}>Trợ Lý AI Lên Thực Đơn</Text>
                <Text style={styles.headerSub}>
                  {customer ? `${customer.fullName} • Cá nhân hóa cơm Việt` : 'Dành cho học viên'}
                </Text>
              </View>
            </View>

            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
            {/* Step 1: Input Request if no draft generated yet */}
            {!generatedDraft ? (
              <View style={styles.promptSection}>
                {/* Customer Info Card */}
                {customer && (
                  <View style={styles.customerCard}>
                    <Text style={styles.customerCardTitle}>Thông số thể trạng học viên:</Text>
                    <Text style={styles.customerCardMeta}>
                      {customer.initialWeight ? `${customer.initialWeight}kg` : ''}
                      {customer.height ? ` • ${customer.height}cm` : ''}
                      {customer.initialGoal ? ` • Mục tiêu: ${customer.initialGoal}` : ''}
                      {customer.medicalNotes ? ` • Lưu ý: ${customer.medicalNotes}` : ''}
                    </Text>
                  </View>
                )}

                {/* Prompt Text Input */}
                <Text style={styles.sectionLabel}>Yêu cầu và định hướng cho AI:</Text>
                <TextInput
                  style={styles.promptInput}
                  multiline
                  numberOfLines={4}
                  value={request}
                  onChangeText={setRequest}
                  placeholder="Nhập yêu cầu riêng cho học viên..."
                  placeholderTextColor={colors.textMuted}
                />

                {/* KIÊNG KỴ & DỊ ỨNG */}
                <View style={styles.allergyCard}>
                  <View style={styles.allergyCardHeader}>
                    <Text style={styles.allergySectionTitle}>KIÊNG KỴ & DỊ ỨNG</Text>
                    {selectedAllergies.length > 0 && (
                      <Pressable onPress={() => setSelectedAllergies([])} hitSlop={6}>
                        <Text style={styles.allergyClearText}>Bỏ chọn tất cả</Text>
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.allergyChipsWrap}>
                    {ALLERGY_CHIPS.map((chip) => {
                      const active = selectedAllergies.includes(chip);
                      return (
                        <Pressable
                          key={chip}
                          style={[
                            styles.allergyChip,
                            active && styles.allergyChipActive,
                          ]}
                          onPress={() => toggleAllergy(chip)}
                        >
                          <Text
                            style={[
                              styles.allergyChipText,
                              active && styles.allergyChipTextActive,
                            ]}
                          >
                            {active ? '✓ ' : '+ '}
                            {chip}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Input nhập thêm phần kiêng khác */}
                  <View style={styles.customAllergyWrap}>
                    <TextInput
                      value={customAllergy}
                      onChangeText={setCustomAllergy}
                      placeholder="Nhập thêm đồ kiêng khác (VD: kiêng đậu phộng, đồ ngọt, dầu mỡ...)"
                      placeholderTextColor={colors.textMuted}
                      style={styles.customAllergyInput}
                    />
                  </View>
                </View>

                {/* Preset Chips */}
                <Text style={styles.presetLabel}>Gợi ý nhanh theo mục tiêu:</Text>
                <View style={styles.presetWrap}>
                  {AI_PRESET_PROMPTS.map((p, idx) => (
                    <Pressable
                      key={idx}
                      style={[
                        styles.presetChip,
                        request === p.prompt && styles.presetChipActive,
                      ]}
                      onPress={() => setRequest(p.prompt)}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          request === p.prompt && styles.presetChipTextActive,
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Duration Presets */}
                <Text style={styles.presetLabel}>Thời hạn áp dụng thực đơn:</Text>
                <View style={styles.durationPillsRow}>
                  {[7, 14, 21, 30].map((days) => (
                    <Pressable
                      key={days}
                      style={[
                        styles.durationPill,
                        durationDays === days && styles.durationPillActive,
                      ]}
                      onPress={() => setDurationDays(days)}
                    >
                      <Text
                        style={[
                          styles.durationPillText,
                          durationDays === days && styles.durationPillTextActive,
                        ]}
                      >
                        {days === 30 ? '1 Tháng (30N)' : `${days} Ngày`}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Generate Action Button */}
                <Pressable
                  style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
                  disabled={loading || !request.trim()}
                  onPress={handleGenerate}
                >
                  {loading ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator size="small" color="#fff" />
                      <Text style={styles.generateBtnText}>Đang tạo...</Text>
                    </View>
                  ) : (
                    <Text style={styles.generateBtnText}>Bắt Đầu Tạo Thực Đơn AI</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              /* Step 2: AI Result Preview */
              <View style={styles.previewSection}>
                {/* Result Title & Calorie Badge */}
                <View style={styles.resultHeaderCard}>
                  <View style={styles.aiBadgeRow}>
                    <View style={styles.aiBadge}>
                      <Text style={styles.aiBadgeText}>
                        AI THỰC ĐƠN • {weeks.length} TUẦN ({generatedDraft.durationDays || durationDays} NGÀY)
                      </Text>
                    </View>
                    <Text style={styles.resultCalText}>
                      {generatedDraft.targetCalories} kcal / ngày
                    </Text>
                  </View>

                  <Text style={styles.resultTitle}>{generatedDraft.title}</Text>

                  {/* Macros 3 Cols */}
                  <View style={styles.macroPillRow}>
                    <View style={[styles.macroPill, { borderColor: '#93C5FD' }]}>
                      <Text style={[styles.macroPillLabel, { color: '#1D4ED8' }]}>ĐẠM (P)</Text>
                      <Text style={styles.macroPillVal}>{generatedDraft.macros.protein}g</Text>
                    </View>
                    <View style={[styles.macroPill, { borderColor: '#FDE68A' }]}>
                      <Text style={[styles.macroPillLabel, { color: '#B45309' }]}>CARB (C)</Text>
                      <Text style={styles.macroPillVal}>{generatedDraft.macros.carbs}g</Text>
                    </View>
                    <View style={[styles.macroPill, { borderColor: '#FCA5A5' }]}>
                      <Text style={[styles.macroPillLabel, { color: '#B91C1C' }]}>BÉO (F)</Text>
                      <Text style={styles.macroPillVal}>{generatedDraft.macros.fat}g</Text>
                    </View>
                  </View>
                </View>

                {/* AI Advice Box (Collapsible) */}
                {generatedDraft.notes ? (
                  <Pressable
                    style={styles.adviceBox}
                    onPress={() => setAdviceExpanded((p) => !p)}
                  >
                    <View style={styles.adviceHeaderRow}>
                      <Text style={styles.adviceTitle}>Lời khuyên dinh dưỡng từ AI:</Text>
                      <Text style={styles.adviceToggleText}>
                        {adviceExpanded ? 'Thu gọn ▴' : 'Xem thêm ▾'}
                      </Text>
                    </View>
                    <Text
                      style={styles.adviceBody}
                      numberOfLines={adviceExpanded ? undefined : 2}
                    >
                      {generatedDraft.notes}
                    </Text>
                  </Pressable>
                ) : null}

                {/* LEVEL 1: Week Selector when plan has multiple weeks */}
                {weeks.length > 1 && (
                  <View style={styles.weeksSelectorSection}>
                    <View style={styles.daysSelectorHeader}>
                      <Text style={styles.daysSelectorTitle}>
                        1. PHÂN CẤP THEO TUẦN ({weeks.length} TUẦN • {generatedDraft.durationDays || durationDays} NGÀY):
                      </Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.dayTabsScroll}
                    >
                      {weeks.map((w, wIdx) => {
                        const isSel = selectedWeekIdx === wIdx;
                        return (
                          <Pressable
                            key={`w-${w.weekNumber || wIdx}`}
                            style={[
                              styles.weekTabPill,
                              isSel && styles.weekTabPillActive,
                            ]}
                            onPress={() => {
                              setSelectedWeekIdx(wIdx);
                              setSelectedDayIdx(0);
                            }}
                          >
                            <Text
                              style={[
                                styles.weekTabPillText,
                                isSel && styles.weekTabPillTextActive,
                              ]}
                            >
                              {w.name}
                            </Text>
                            <Text
                              style={[
                                styles.weekTabSubText,
                                isSel && styles.weekTabSubTextActive,
                              ]}
                            >
                              {w.startDate && w.endDate
                                ? `${formatDisplayDateVi(w.startDate, false)} - ${formatDisplayDateVi(w.endDate, false)}`
                                : `${w.days.length} ngày`}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* LEVEL 2: Day of Week Selector */}
                {activeWeek && activeWeek.days.length > 0 && (
                  <View style={styles.daysSelectorSection}>
                    <View style={styles.daysSelectorHeader}>
                      <Text style={styles.daysSelectorTitle}>
                        {weeks.length > 1
                          ? `2. ${activeWeek?.name || 'Tuần'}: Chọn ngày (${activeWeek?.days.length || 0} ngày):`
                          : `Chọn ngày trong tuần (${activeWeek?.days.length || 0} ngày):`}
                      </Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.dayTabsScroll}
                    >
                      {activeWeek.days.map((day, idx) => {
                        const isSel = selectedDayIdx === idx;
                        const dayCal = (day.meals || []).reduce(
                          (s, m) => s + (m.totalCalories || m.calories || 0),
                          0
                        );
                        return (
                          <Pressable
                            key={`d-${idx}`}
                            style={[styles.dayTabPill, isSel && styles.dayTabPillActive]}
                            onPress={() => setSelectedDayIdx(idx)}
                          >
                            <Text style={[styles.dayTabPillText, isSel && styles.dayTabPillTextActive]}>
                              {formatShortDay(day.dayOfWeek)}
                            </Text>
                            <Text style={[styles.dayTabSubText, isSel && styles.dayTabSubTextActive]}>
                              {day.date ? formatDisplayDateVi(day.date, false) : `N${day.dayNumber}`}
                            </Text>
                            <Text style={[styles.dayTabMetaText, isSel && styles.dayTabMetaTextActive]}>
                              {dayCal > 0 ? `${Math.round(dayCal)}k` : `${day.meals.length} bữa`}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Detailed Meals List */}
                <Text style={styles.mealsSectionHeading}>
                  {activeDay
                    ? `Thực đơn ${activeDay.dayOfWeek}${activeDay.date ? ` (${formatDisplayDateVi(activeDay.date, false)})` : ''}${weeks.length > 1 ? ` • ${activeWeek?.name || ''}` : ''} (${activeMeals.length} bữa ăn):`
                    : `Chi tiết ${activeMeals.length} bữa ăn đề xuất:`}
                </Text>

                <View style={styles.mealsList}>
                  {activeMeals.map((meal, mealIdx) => (
                    <View key={mealIdx} style={styles.mealCard}>
                      <View style={styles.mealCardHeader}>
                        <View style={styles.mealTitleRow}>
                          <Text style={styles.mealTitle}>{meal.title || `Bữa ${mealIdx + 1}`}</Text>
                        </View>
                        {meal.calories ? (
                          <Text style={styles.mealCal}>{meal.calories} kcal</Text>
                        ) : null}
                      </View>

                      {/* Dishes in meal */}
                      <View style={styles.dishList}>
                        {(meal.items || []).map((dish, dIdx) => (
                          <View key={dIdx} style={styles.dishRow}>
                            <View style={styles.dishBullet} />
                            <View style={{ flex: 1 }}>
                              <View style={styles.dishNameRow}>
                                <Text style={styles.dishName}>{dish.name}</Text>
                                <Text style={styles.dishAmount}>{dish.amount}</Text>
                              </View>
                              {dish.prepTip ? (
                                <Text style={styles.dishTip}>Mẹo: {dish.prepTip}</Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Action Buttons for Draft */}
                <View style={styles.actionButtonsCol}>
                  <Pressable
                    style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                    disabled={saving}
                    onPress={handleSaveDraft}
                  >
                    {saving ? (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.saveBtnText}>Đang lưu...</Text>
                      </View>
                    ) : (
                      <Text style={styles.saveBtnText}>Lưu & Áp Dụng Thực Đơn</Text>
                    )}
                  </Pressable>

                  <View style={styles.subActionRow}>
                    <Pressable style={styles.subActionBtn} onPress={handleEditManually}>
                      <Text style={styles.subActionBtnText}>Sửa thêm thủ công</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.subActionBtn, { borderColor: '#E2E8F0' }]}
                      onPress={() => setGeneratedDraft(null)}
                    >
                      <Text style={[styles.subActionBtnText, { color: colors.textMuted }]}>
                        Tạo lại với yêu cầu khác
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <AppAlertModal {...alertConfig} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '65%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sparkleIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  headerSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  /* Step 1: Prompt */
  promptSection: {
    gap: 12,
  },
  customerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customerCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  customerCardMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  promptInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: colors.text,
    textAlignVertical: 'top',
    minHeight: 90,
  },
  allergyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  allergyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allergyClearText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  allergySectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#003B70',
    letterSpacing: 0.5,
  },
  allergyChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  allergyChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
  },
  allergyChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
  },
  allergyChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  allergyChipTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  customAllergyWrap: {
    marginTop: 4,
  },
  customAllergyInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.text,
  },
  presetLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  durationPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  durationPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  durationPillTextActive: {
    color: '#FFFFFF',
  },
  generateBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  generateBtnDisabled: {
    opacity: 0.65,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  generateBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  /* Step 2: Preview */
  previewSection: {
    gap: 12,
  },
  resultHeaderCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aiBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  resultCalText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#EA580C',
  },
  resultTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  macroPillLabel: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  macroPillVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  adviceBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  adviceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  adviceTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#15803D',
  },
  adviceToggleText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803D',
  },
  adviceBody: {
    fontSize: 11.5,
    color: '#166534',
    lineHeight: 17,
  },
  /* Week Selector Styles */
  weeksSelectorSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 8,
  },
  weekTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    marginRight: 6,
  },
  weekTabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekTabPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  weekTabPillTextActive: {
    color: '#FFFFFF',
  },
  weekTabSubText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 1,
  },
  weekTabSubTextActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  /* 7-Day Selector Styles */
  daysSelectorSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    minWidth: 68,
  },
  dayTabPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTabPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
  },
  dayTabPillTextActive: {
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
    color: colors.textMuted,
    marginTop: 2,
  },
  dayTabMetaTextActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  mealsSectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4,
  },
  mealsList: {
    gap: 10,
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mealCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mealTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  mealCal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EA580C',
  },
  dishList: {
    gap: 6,
  },
  dishRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dishBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  dishNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dishName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  dishAmount: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dishTip: {
    fontSize: 10.5,
    color: '#059669',
    marginTop: 1,
  },
  actionButtonsCol: {
    gap: 10,
    marginTop: 12,
  },
  saveBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  subActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
  },
  subActionBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
});
