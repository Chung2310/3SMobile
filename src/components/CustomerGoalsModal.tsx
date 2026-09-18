import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  fetchCustomerGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  publishGoal,
  unpublishGoal,
  type GoalItem,
  type GoalType,
  type GoalStatus,
  GOAL_TYPE_OPTIONS,
  GOAL_TYPE_LABELS,
} from '@/services/goalService';
import { DatePickerModal } from '@/components/DatePickerModal';
import { AppAlertModal } from '@/components/AppAlertModal';

const MASCOT_COACH = require('../../assets/public/3s-coach.png');

interface CustomerGoalsModalProps {
  visible: boolean;
  customer: {
    id: string;
    fullName: string;
    phone?: string;
  } | null;
  onClose: () => void;
}

interface GoalFormState {
  title: string;
  type: GoalType;
  targetValue: string;
  targetUnit: string;
  deadlineIso: string;
  deadlineDisplay: string;
  sessionsPerWeek: string;
  cardioNotes: string;
  evaluationNotes: string;
}

const initialFormState: GoalFormState = {
  title: '',
  type: 'FAT_LOSS',
  targetValue: '',
  targetUnit: 'kg',
  deadlineIso: '',
  deadlineDisplay: '',
  sessionsPerWeek: '3',
  cardioNotes: '',
  evaluationNotes: '',
};

function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function CustomerGoalsModal({
  visible,
  customer,
  onClose,
}: CustomerGoalsModalProps) {
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<GoalFormState>(initialFormState);
  const [formError, setFormError] = useState<string>('');

  // Modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const customerId = customer?.id;

  const loadGoals = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const items = await fetchCustomerGoals(customerId);
      setGoals(items);
    } catch {
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (!visible || !customerId) return;
    let active = true;

    void (async () => {
      try {
        const items = await fetchCustomerGoals(customerId);
        if (active) {
          setGoals(items);
          setLoading(false);
        }
      } catch {
        if (active) {
          setGoals([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [visible, customerId]);

  const handleClose = () => {
    setViewMode('list');
    setEditingGoalId(null);
    setFormError('');
    onClose();
  };

  const handleStartCreate = () => {
    setEditingGoalId(null);
    setForm({
      ...initialFormState,
      deadlineIso: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      deadlineDisplay: formatDateDisplay(new Date(Date.now() + 30 * 86400000).toISOString()),
    });
    setFormError('');
    setViewMode('create');
  };

  const handleStartEdit = (goal: GoalItem) => {
    const goalId = goal._id || goal.id || '';
    setEditingGoalId(goalId);
    setForm({
      title: goal.title || '',
      type: goal.type || 'FAT_LOSS',
      targetValue: goal.targetValue != null ? String(goal.targetValue) : '',
      targetUnit: goal.targetUnit || 'kg',
      deadlineIso: goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : '',
      deadlineDisplay: formatDateDisplay(goal.deadline),
      sessionsPerWeek: String(goal.sessionsPerWeek || 3),
      cardioNotes: goal.cardioNotes || '',
      evaluationNotes: goal.evaluationNotes || '',
    });
    setFormError('');
    setViewMode('create');
  };

  const handleSelectType = (type: GoalType) => {
    let unit = form.targetUnit;
    if (type === 'FAT_LOSS' || type === 'WEIGHT_LOSS' || type === 'WEIGHT_GAIN' || type === 'MUSCLE_GAIN') {
      unit = 'kg';
    } else if (type === 'FITNESS') {
      unit = 'phút';
    } else if (type === 'RECOMPOSITION') {
      unit = '%';
    }
    setForm((prev) => ({ ...prev, type, targetUnit: unit }));
  };

  const handleSubmitGoal = async (status: GoalStatus) => {
    if (!customer?.id) return;
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setFormError('Vui lòng nhập Tên mục tiêu (bắt buộc).');
      return;
    }
    if (!form.type) {
      setFormError('Vui lòng chọn Loại mục tiêu (bắt buộc).');
      return;
    }
    if (!form.deadlineIso) {
      setFormError('Vui lòng chọn Thời hạn hoàn thành (bắt buộc).');
      return;
    }
    if (!form.sessionsPerWeek.trim()) {
      setFormError('Vui lòng nhập Số buổi mỗi tuần (bắt buộc).');
      return;
    }
    const sessions = parseInt(form.sessionsPerWeek, 10);
    if (isNaN(sessions) || sessions < 1 || sessions > 14) {
      setFormError('Số buổi mỗi tuần phải là số nguyên từ 1 đến 14.');
      return;
    }

    let targetVal: number | null = null;
    if (form.targetValue.trim()) {
      targetVal = parseFloat(form.targetValue.trim());
      if (isNaN(targetVal)) {
        setFormError('Giá trị mục tiêu phải là số hợp lệ (ví dụ: 5.5).');
        return;
      }
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingGoalId) {
        await updateGoal(editingGoalId, {
          title: trimmedTitle,
          type: form.type,
          targetValue: targetVal,
          targetUnit: form.targetUnit.trim(),
          deadline: new Date(form.deadlineIso).toISOString(),
          sessionsPerWeek: sessions,
          cardioNotes: form.cardioNotes.trim(),
          evaluationNotes: form.evaluationNotes.trim(),
        });

        // Nếu bấm "Lưu & Công bố", gọi tiếp publishGoal
        if (status === 'PUBLISHED') {
          await publishGoal(editingGoalId);
        }

        setAlertConfig({
          visible: true,
          title: 'Thành công',
          message: status === 'PUBLISHED' ? 'Đã cập nhật và công bố mục tiêu thành công.' : 'Đã cập nhật bản nháp mục tiêu thành công.',
          type: 'success',
          confirmLabel: 'Đóng',
          onConfirm: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            setEditingGoalId(null);
            setViewMode('list');
            loadGoals();
          },
        });
      } else {
        const createdGoal = await createGoal({
          customerId: customer.id,
          title: trimmedTitle,
          type: form.type,
          targetValue: targetVal,
          targetUnit: form.targetUnit.trim(),
          deadline: new Date(form.deadlineIso).toISOString(),
          sessionsPerWeek: sessions,
          cardioNotes: form.cardioNotes.trim(),
          evaluationNotes: form.evaluationNotes.trim(),
        });

        // Nếu bấm "Lưu & Công bố", gọi API công bố mục tiêu
        if (status === 'PUBLISHED') {
          const createdId = createdGoal?._id || createdGoal?.id;
          if (createdId) {
            await publishGoal(createdId);
          }
        }

        setAlertConfig({
          visible: true,
          title: 'Thành công',
          message: status === 'PUBLISHED' ? 'Đã tạo và công bố mục tiêu thành công.' : 'Đã lưu bản nháp mục tiêu thành công.',
          type: 'success',
          confirmLabel: 'Đóng',
          onConfirm: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            setEditingGoalId(null);
            setViewMode('list');
            loadGoals();
          },
        });
      }
    } catch (err: any) {
      setFormError(err?.message || 'Không thể lưu mục tiêu. Vui lòng kiểm tra lại các trường thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = (goal: GoalItem) => {
    setAlertConfig({
      visible: true,
      title: 'Xóa mục tiêu',
      message: `Bạn có chắc muốn xóa mục tiêu "${goal.title}"?`,
      type: 'error',
      confirmLabel: 'Xóa',
      cancelLabel: 'Hủy',
      onConfirm: async () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        try {
          const goalId = goal._id || goal.id || '';
          await deleteGoal(goalId);
          loadGoals();
        } catch {
          setAlertConfig({
            visible: true,
            title: 'Lỗi',
            message: 'Không thể xóa mục tiêu. Vui lòng thử lại.',
            type: 'error',
            confirmLabel: 'Đóng',
            onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
          });
        }
      },
    });
  };

  const handleTogglePublish = async (goal: GoalItem) => {
    const goalId = goal._id || goal.id || '';
    try {
      if (goal.status === 'PUBLISHED') {
        await unpublishGoal(goalId);
      } else {
        await publishGoal(goalId);
      }
      loadGoals();
    } catch {
      setAlertConfig({
        visible: true,
        title: 'Lỗi',
        message: 'Không thể thay đổi trạng thái mục tiêu.',
        type: 'error',
        confirmLabel: 'Đóng',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  if (!customer) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.container}>
          {/* MODAL HEADER */}
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <View style={[styles.headerIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <MaterialCommunityIcons name="bullseye-arrow" size={22} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {editingGoalId ? 'Chỉnh sửa mục tiêu' : viewMode === 'create' ? 'Tạo mục tiêu' : 'Mục tiêu của học viên'}
                </Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {customer.fullName}
                  {customer.phone ? ` · ${customer.phone}` : ''}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityLabel="Đóng"
            >
              <Feather name="x" size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* VIEW MODE 1: LIST OF GOALS */}
          {viewMode === 'list' && (
            <>
              <View style={styles.listTopBar}>
                <Text style={styles.listCountText}>
                  Danh sách ({goals.length})
                </Text>
                <Pressable
                  style={styles.createBtn}
                  onPress={handleStartCreate}
                  accessibilityLabel="Tạo mục tiêu mới"
                >
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <Text style={styles.createBtnText}>Tạo mục tiêu</Text>
                </Pressable>
              </View>

              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {loading ? (
                  <View style={styles.centerLoading}>
                    <ActivityIndicator size="small" color="#0284C7" />
                    <Text style={styles.loadingText}>Đang tải mục tiêu...</Text>
                  </View>
                ) : goals.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Image
                      source={MASCOT_COACH}
                      style={styles.emptyMascotImg}
                      resizeMode="contain"
                    />
                    <Text style={styles.emptyTitle}>Chưa có mục tiêu</Text>
                    <Text style={styles.emptyDesc}>
                      Học viên này chưa có mục tiêu huấn luyện nào. Hãy tạo mục tiêu để theo dõi lộ trình thể lực!
                    </Text>
                    <Pressable
                      style={styles.emptyActionBtn}
                      onPress={handleStartCreate}
                    >
                      <Feather name="plus" size={16} color="#FFFFFF" />
                      <Text style={styles.emptyActionBtnText}>Tạo mục tiêu ngay</Text>
                    </Pressable>
                  </View>
                ) : (
                  goals.map((g, idx) => {
                    const typeLabel = GOAL_TYPE_LABELS[g.type] || g.type;
                    const isPublished = g.status === 'PUBLISHED';
                    return (
                      <View key={g._id || g.id || idx} style={styles.goalCard}>
                        {/* CARD TOP ROW: TYPE + STATUS + DELETE */}
                        <View style={styles.cardTopRow}>
                          <View style={styles.badgeGroup}>
                            <View style={styles.typeBadge}>
                              <Text style={styles.typeBadgeText}>{typeLabel}</Text>
                            </View>
                            <View
                              style={[
                                styles.statusBadge,
                                isPublished ? styles.statusPublished : styles.statusDraft,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusText,
                                  isPublished ? styles.statusTextPublished : styles.statusTextDraft,
                                ]}
                              >
                                {isPublished ? 'Đã công bố' : 'Bản nháp'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.cardActionsGroup}>
                            {/* NÚT SỬA - CHỈ ICON KHÔNG CÓ TEXT */}
                            <Pressable
                              style={styles.editBtn}
                              onPress={() => handleStartEdit(g)}
                              hitSlop={8}
                              accessibilityLabel="Chỉnh sửa mục tiêu"
                            >
                              <Feather name="edit-2" size={15} color="#0284C7" />
                            </Pressable>

                            {/* NÚT XÓA - CHỈ ICON KHÔNG CÓ TEXT */}
                            <Pressable
                              style={styles.deleteBtn}
                              onPress={() => handleDeleteGoal(g)}
                              hitSlop={8}
                              accessibilityLabel="Xóa mục tiêu"
                            >
                              <Feather name="trash-2" size={15} color="#EF4444" />
                            </Pressable>
                          </View>
                        </View>

                        {/* TITLE */}
                        <Text style={styles.goalTitle}>{g.title}</Text>

                        {/* METRICS ROW */}
                        <View style={styles.metricsGrid}>
                          {g.targetValue != null && (
                            <View style={styles.metricItem}>
                              <Text style={styles.metricLabel}>Chỉ số mục tiêu</Text>
                              <Text style={styles.metricValue}>
                                {g.targetValue} {g.targetUnit || ''}
                              </Text>
                            </View>
                          )}
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Thời hạn</Text>
                            <Text style={styles.metricValue}>
                              {formatDateDisplay(g.deadline)}
                            </Text>
                          </View>
                          <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Tần suất tập</Text>
                            <Text style={styles.metricValue}>
                              {g.sessionsPerWeek || 3} buổi / tuần
                            </Text>
                          </View>
                        </View>

                        {/* NOTES */}
                        {!!g.cardioNotes && (
                          <View style={styles.noteBox}>
                            <Feather name="activity" size={13} color="#0284C7" />
                            <Text style={styles.noteText}>
                              <Text style={{ fontWeight: '600' }}>Cardio: </Text>
                              {g.cardioNotes}
                            </Text>
                          </View>
                        )}
                        {!!g.evaluationNotes && (
                          <View style={styles.noteBox}>
                            <Feather name="info" size={13} color="#D97706" />
                            <Text style={styles.noteText}>
                              <Text style={{ fontWeight: '600' }}>Đánh giá: </Text>
                              {g.evaluationNotes}
                            </Text>
                          </View>
                        )}

                        {/* ACTION BOTTOM */}
                        <View style={styles.goalCardFooter}>
                          <Pressable
                            style={[
                              styles.publishToggleBtn,
                              isPublished ? styles.btnUnpublish : styles.btnPublish,
                            ]}
                            onPress={() => handleTogglePublish(g)}
                          >
                            <Feather
                              name={isPublished ? 'archive' : 'check-circle'}
                              size={14}
                              color={isPublished ? '#64748B' : '#0284C7'}
                            />
                            <Text
                              style={[
                                styles.publishToggleText,
                                isPublished ? { color: '#64748B' } : { color: '#0284C7' },
                              ]}
                            >
                              {isPublished ? 'Nháp' : 'Công bố'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </>
          )}

          {/* VIEW MODE 2: CREATE GOAL FORM (Matches User Screenshot) */}
          {viewMode === 'create' && (
            <>
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.formScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* 1. HỌC VIÊN / KHÁCH HÀNG */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Học viên / Khách hàng <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <View style={styles.customerSelectBox}>
                    <Feather name="user" size={16} color="#0284C7" />
                    <Text style={styles.customerSelectText} numberOfLines={1}>
                      {customer.fullName}
                      {customer.phone ? ` (${customer.phone})` : ''}
                    </Text>
                    <Feather name="check" size={16} color="#16A34A" />
                  </View>
                </View>

                {/* 2. TÊN MỤC TIÊU */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Tên mục tiêu <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: Giảm mỡ bụng đón hè..."
                    placeholderTextColor="#94A3B8"
                    value={form.title}
                    onChangeText={(val) => setForm((prev) => ({ ...prev, title: val }))}
                  />
                </View>

                {/* 3. LOẠI MỤC TIÊU */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Loại mục tiêu <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <View style={styles.typeGrid}>
                    {GOAL_TYPE_OPTIONS.map((opt) => {
                      const isSelected = form.type === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          style={[
                            styles.typeOptionPill,
                            isSelected && styles.typeOptionPillActive,
                          ]}
                          onPress={() => handleSelectType(opt.value)}
                        >
                          <Text
                            style={[
                              styles.typeOptionText,
                              isSelected && styles.typeOptionTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* 4. GIÁ TRỊ MỤC TIÊU & ĐƠN VỊ (2 CỘT) */}
                <View style={styles.twoColRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Giá trị mục tiêu</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ví dụ: 5.0"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={form.targetValue}
                      onChangeText={(val) =>
                        setForm((prev) => ({ ...prev, targetValue: val }))
                      }
                    />
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Đơn vị</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ví dụ: kg, %, cm..."
                      placeholderTextColor="#94A3B8"
                      value={form.targetUnit}
                      onChangeText={(val) =>
                        setForm((prev) => ({ ...prev, targetUnit: val }))
                      }
                    />
                  </View>
                </View>

                {/* 5. THỜI HẠN & SỐ BUỔI MỖI TUẦN (2 CỘT) */}
                <View style={styles.twoColRow}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>
                      Thời hạn <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <Pressable
                      style={styles.datePickerBox}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text
                        style={[
                          styles.datePickerText,
                          !form.deadlineDisplay && { color: '#94A3B8' },
                        ]}
                      >
                        {form.deadlineDisplay || 'dd/mm/yyyy'}
                      </Text>
                      <Feather name="calendar" size={16} color="#64748B" />
                    </Pressable>
                  </View>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>
                      Số buổi mỗi tuần <Text style={styles.reqStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ví dụ: 3"
                      placeholderTextColor="#94A3B8"
                      keyboardType="number-pad"
                      value={form.sessionsPerWeek}
                      onChangeText={(val) =>
                        setForm((prev) => ({ ...prev, sessionsPerWeek: val }))
                      }
                    />
                  </View>
                </View>

                {/* 6. GHI CHÚ CARDIO */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Ghi chú cardio</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Ví dụ: 20 phút chạy bộ sau mỗi buổi tập..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={form.cardioNotes}
                    onChangeText={(val) =>
                      setForm((prev) => ({ ...prev, cardioNotes: val }))
                    }
                  />
                </View>

                {/* 7. GHI CHÚ ĐÁNH GIÁ */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Ghi chú đánh giá</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Nhập đánh giá khả năng hoàn thành mục tiêu..."
                    placeholderTextColor="#94A3B8"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={form.evaluationNotes}
                    onChangeText={(val) =>
                      setForm((prev) => ({ ...prev, evaluationNotes: val }))
                    }
                  />
                </View>

                {!!formError && (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.errorText}>{formError}</Text>
                  </View>
                )}
              </ScrollView>

              {/* FOOTER ACTIONS (Hủy, Lưu bản nháp, Lưu & Công bố) */}
              <View style={styles.formFooter}>
                <Pressable
                  style={styles.btnCancel}
                  onPress={() => {
                    setEditingGoalId(null);
                    setViewMode('list');
                  }}
                  disabled={submitting}
                >
                  <Text style={styles.btnCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  style={styles.btnDraft}
                  onPress={() => handleSubmitGoal('DRAFT')}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#0369A1" />
                  ) : (
                    <Text style={styles.btnDraftText}>Lưu bản nháp</Text>
                  )}
                </Pressable>

                <Pressable
                  style={styles.btnPublishSubmit}
                  onPress={() => handleSubmitGoal('PUBLISHED')}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.btnPublishSubmitText}>Lưu & Công bố</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}

          {/* DATE PICKER MODAL FOR DEADLINE */}
          <DatePickerModal
            visible={showDatePicker}
            value={form.deadlineIso}
            title="Thời hạn hoàn thành mục tiêu"
            maxDate={null}
            onClose={() => setShowDatePicker(false)}
            onSelect={(isoDate, displayDate) => {
              setShowDatePicker(false);
              setForm((prev) => ({
                ...prev,
                deadlineIso: isoDate,
                deadlineDisplay: displayDate,
              }));
            }}
          />

          {/* APP ALERT MODAL */}
          <AppAlertModal
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            confirmLabel={alertConfig.confirmLabel}
            cancelLabel={alertConfig.cancelLabel}
            onConfirm={() => {
              if (alertConfig.onConfirm) alertConfig.onConfirm();
              else setAlertConfig((prev) => ({ ...prev, visible: false }));
            }}
            onCancel={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '65%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* LIST TOP BAR */
  listTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  listCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    minHeight: 38,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* SCROLL AREA */
  scrollArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  formScrollContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 30,
  },

  /* EMPTY STATE */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 20,
  },
  emptyMascotImg: {
    width: 130,
    height: 130,
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#0284C7',
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  centerLoading: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
  },

  /* GOAL CARD */
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPublished: {
    backgroundColor: '#DCFCE7',
  },
  statusDraft: {
    backgroundColor: '#F1F5F9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextPublished: {
    color: '#15803D',
  },
  statusTextDraft: {
    color: '#64748B',
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
  },
  metricItem: {
    flex: 1,
    minWidth: 80,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
  },
  noteText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    lineHeight: 16,
  },
  goalCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  publishToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  btnPublish: {
    backgroundColor: '#E0F2FE',
  },
  btnUnpublish: {
    backgroundColor: '#F1F5F9',
  },
  publishToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* FORM STYLES */
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  reqStar: {
    color: '#EF4444',
  },
  customerSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  customerSelectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 46,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 10,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  datePickerText: {
    fontSize: 14,
    color: '#0F172A',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOptionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeOptionPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  typeOptionTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  formFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  btnCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  btnDraft: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDraftText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369A1',
  },
  btnPublishSubmit: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPublishSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
