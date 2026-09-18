import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { AppAlertModal, useAppAlert } from '@/components/AppAlertModal';
import { CustomerSelectModal } from '@/components/CustomerSelectModal';
import { api, ApiError } from '@/services/api/client';
import {
  generateSmartRoadmap,
  type RoadmapCustomerMeta,
  type RoadmapEvaluationCheckpoint,
  type RoadmapGoalType,
  type RoadmapPhaseProposal,
  type RoadmapStrategyProposal,
} from '@/services/roadmapGenerator';
import { evaluateGoalFeasibility } from '@/services/goalFeasibilityService';
import type { CustomerProfile } from '@/types/domain';
import type { InBodyRecordData } from '@/types/inbody';
import type { Roadmap } from '@/types/roadmap';

interface RoadmapCreateModalProps {
  visible: boolean;
  customers: CustomerProfile[];
  initialCustomerId?: string;
  onClose: () => void;
  onSuccess: (createdRoadmap: Roadmap) => void;
}

const GOAL_OPTIONS: Array<{
  value: RoadmapGoalType;
  label: string;
  desc: string;
  icon: string;
}> = [
  {
    value: 'FAT_LOSS',
    label: 'Giảm mỡ & Giữ cơ',
    desc: 'Thâm hụt calo, bảo toàn cơ nạc',
    icon: 'flame-outline',
  },
  {
    value: 'WEIGHT_LOSS',
    label: 'Giảm cân toàn thân',
    desc: 'Giảm trọng lượng cơ thể tổng thể',
    icon: 'trending-down-outline',
  },
  {
    value: 'MUSCLE_GAIN',
    label: 'Tăng cơ nạc (Bulking)',
    desc: 'Thặng dư calo, progressive overload',
    icon: 'barbell-outline',
  },
  {
    value: 'RECOMPOSITION',
    label: 'Tái cấu trúc vóc dáng',
    desc: 'Vừa giảm mỡ vừa tăng cơ săn chắc',
    icon: 'flash-outline',
  },
  {
    value: 'FITNESS',
    label: 'Thể lực & Sức bền',
    desc: 'Tăng VO2Max & độ linh hoạt khớp',
    icon: 'bicycle-outline',
  },
  {
    value: 'STRENGTH',
    label: 'Sức mạnh nền tảng',
    desc: 'Nâng cao mức tạ tối đa 1RM/3RM',
    icon: 'shield-checkmark-outline',
  },
];

const DURATION_OPTIONS = [
  { value: 4, label: '4 tuần', subtitle: 'Cấp tốc' },
  { value: 8, label: '8 tuần', subtitle: 'Cơ bản' },
  { value: 12, label: '12 tuần', subtitle: 'Chuẩn NSCA' },
  { value: 16, label: '16 tuần', subtitle: 'Chuyên sâu' },
  { value: 24, label: '24 tuần', subtitle: 'Chuyển hóa' },
];

const SESSIONS_OPTIONS = [
  { value: 3, label: '3 buổi/tuần', desc: 'Full Body' },
  { value: 4, label: '4 buổi/tuần', desc: 'Upper / Lower' },
  { value: 5, label: '5 buổi/tuần', desc: 'Push / Pull / Legs' },
  { value: 6, label: '6 buổi/tuần', desc: 'Chuyên nghiệp' },
];

const AI_STEPS = [
  'Đang phân tích chỉ số thể trạng và InBody...',
  'Tính toán năng lượng BMR, TDEE và mục tiêu Calo...',
  'Xây dựng chiến lược huấn luyện và phân bổ Macro...',
  'Phân chia các giai đoạn (Phases) và lịch trình từng tuần...',
];

export function RoadmapCreateModal({
  visible,
  customers,
  initialCustomerId,
  onClose,
  onSuccess,
}: RoadmapCreateModalProps) {
  const { alertConfig, showSuccess, showError, showWarning } = useAppAlert();

  // Step 1: Customer Selection & Context
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerMeta, setCustomerMeta] = useState<RoadmapCustomerMeta | null>(null);
  const [latestInbody, setLatestInbody] = useState<InBodyRecordData | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  // Step 2: Goal Configuration
  const [goalType, setGoalType] = useState<RoadmapGoalType>('FAT_LOSS');
  const [targetValue, setTargetValue] = useState('5');
  const [targetUnit, setTargetUnit] = useState<'kg' | '% mỡ' | 'cm eo'>('kg');
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState(60);
  const [customNotes, setCustomNotes] = useState('');

  // Step 3: Generated Roadmap Draft Data
  const [draftTitle, setDraftTitle] = useState('');
  const [draftStrategy, setDraftStrategy] = useState<RoadmapStrategyProposal | null>(null);
  const [draftPhases, setDraftPhases] = useState<RoadmapPhaseProposal[]>([]);
  const [draftBaseline, setDraftBaseline] = useState<Record<string, number>>({});
  const [expandedPhases, setExpandedPhases] = useState<Record<number, boolean>>({ 0: true });

  // Loading & Step State
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiStepIndex, setAiStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // Map customer ID to object
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c._id === customerId);
  }, [customers, customerId]);

  // Real-time Feasibility Assessment
  const feasibility = useMemo(() => {
    return evaluateGoalFeasibility({
      goalType,
      targetValue: parseFloat(targetValue) || 0,
      targetUnit,
      durationWeeks,
      sessionsPerWeek,
      customerMeta,
      latestInbody,
    });
  }, [goalType, targetValue, targetUnit, durationWeeks, sessionsPerWeek, customerMeta, latestInbody]);

  // Sync initial customer ID
  useEffect(() => {
    if (initialCustomerId) {
      setCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  // Fetch customer context (details, InBody, goals) when customerId changes
  useEffect(() => {
    if (!visible || !customerId) {
      setCustomerMeta(null);
      setLatestInbody(null);
      return;
    }

    let active = true;
    setLoadingContext(true);

    Promise.all([
      api.get<any>(`/api/customers/${customerId}`).catch(() => null),
      api.get<InBodyRecordData[]>(`/api/inbody?customerId=${customerId}&limit=1`).catch(() => []),
      api.get<any[]>(`/api/goals?customerId=${customerId}&limit=1`).catch(() => []),
    ])
      .then(([customerRes, inbodyRes, goalsRes]) => {
        if (!active) return;
        const custData = customerRes?.data || customerRes;
        if (custData) {
          setCustomerMeta(custData);
          if (custData.medicalNotes) {
            setCustomNotes((prev) => prev || custData.medicalNotes);
          }
        }
        const inbodyList = Array.isArray(inbodyRes) ? inbodyRes : (inbodyRes as any)?.data || [];
        if (inbodyList.length > 0) {
          setLatestInbody(inbodyList[0]);
        }
        const goalsList = Array.isArray(goalsRes) ? goalsRes : (goalsRes as any)?.data || [];
        if (goalsList.length > 0) {
          const g = goalsList[0];
          if (g.type) setGoalType(g.type);
          if (g.targetValue) setTargetValue(String(g.targetValue));
          if (g.targetUnit) setTargetUnit(g.targetUnit);
          if (g.sessionsPerWeek) setSessionsPerWeek(Number(g.sessionsPerWeek));
        }
      })
      .finally(() => {
        if (active) setLoadingContext(false);
      });

    return () => {
      active = false;
    };
  }, [visible, customerId]);

  // AI Step Simulation
  useEffect(() => {
    if (!loadingAi) {
      setAiStepIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setAiStepIndex((prev) => (prev < AI_STEPS.length - 1 ? prev + 1 : prev));
    }, 2800);
    return () => clearInterval(timer);
  }, [loadingAi]);

  // Reset modal state on open
  useEffect(() => {
    if (visible) {
      setDraftTitle('');
      setDraftStrategy(null);
      setDraftPhases([]);
      setDraftBaseline({});
      setLoadingAi(false);
      setSaving(false);
      setExpandedPhases({ 0: true });
    }
  }, [visible]);

  // Apply instant sports science template
  const handleApplyInstantSportsScience = () => {
    if (!customerId) {
      showWarning('Vui lòng chọn học viên trước khi tạo lộ trình.', 'Chưa chọn học viên');
      return;
    }

    const val = parseFloat(targetValue) || 5;
    const proposal = generateSmartRoadmap(
      customerMeta || { _id: customerId, fullName: selectedCustomer?.fullName || 'Học viên' },
      latestInbody,
      {
        type: goalType,
        targetValue: val,
        targetUnit,
        durationWeeks,
        sessionsPerWeek,
        customNotes,
        sessionDurationMinutes,
      }
    );

    setDraftTitle(proposal.title);
    setDraftStrategy(proposal.strategy);
    setDraftPhases(proposal.phases);
    setDraftBaseline(proposal.baseline);
    setExpandedPhases(Object.fromEntries(proposal.phases.map((_, idx) => [idx, true])));
    showSuccess('Đã tạo bản mẫu lộ trình theo Khoa học Thể thao. Vui lòng rà soát và lưu!', 'Thành công');
  };

  // Generate with AI (Gemini)
  const handleGenerateAi = async () => {
    if (!customerId) {
      showWarning('Vui lòng chọn học viên trước khi tạo lộ trình AI.', 'Chưa chọn học viên');
      return;
    }

    const val = parseFloat(targetValue);
    if (isNaN(val) || val <= 0) {
      showWarning('Vui lòng nhập chỉ số mục tiêu hợp lệ.', 'Chỉ số không hợp lệ');
      return;
    }

    setLoadingAi(true);
    const requestText = `Mục tiêu chính: ${goalType}, Số lượng/Chỉ số: ${val} ${targetUnit}, Thời lượng: ${durationWeeks} tuần, Tần suất: ${sessionsPerWeek} buổi/tuần, tối đa ${sessionDurationMinutes} phút/buổi. Ghi chú & Yêu cầu riêng: ${customNotes || 'Tối ưu hóa thể hình và sức khỏe toàn diện'}`;

    try {
      const result = await api.post<{
        title: string;
        strategy: RoadmapStrategyProposal;
        phases: RoadmapPhaseProposal[];
        baseline: Record<string, number>;
      }>('/api/content-drafts/roadmap', {
        customerId,
        request: requestText,
        durationWeeks,
        sessionsPerWeek,
        goalType,
        targetValue: val,
        targetUnit,
        sessionDurationMinutes,
      });

      const proposal = (result as any)?.data || result;
      if (!proposal?.title || !proposal?.strategy || !Array.isArray(proposal?.phases)) {
        throw new Error('Dữ liệu lộ trình trả về từ AI không đầy đủ.');
      }

      setDraftTitle(proposal.title);
      setDraftStrategy(proposal.strategy);
      setDraftPhases(proposal.phases);
      setDraftBaseline(proposal.baseline || {});
      setExpandedPhases(Object.fromEntries(proposal.phases.map((_: unknown, idx: number) => [idx, true])));
      showSuccess('AI đã lập xong bản nháp lộ trình huấn luyện. PT vui lòng kiểm tra và lưu lại.', 'Tạo thành công');
    } catch (err: unknown) {
      // Fallback gracefully to sports science template on failure/timeout
      handleApplyInstantSportsScience();
      const msg = err instanceof Error ? err.message : 'AI bận hoặc phản hồi chậm.';
      showWarning(`${msg} Hệ thống đã tự động áp dụng bản mẫu theo Khoa học Thể thao chuẩn NSCA để không làm gián đoạn công việc của bạn.`, 'Áp dụng bản mẫu');
    } finally {
      setLoadingAi(false);
    }
  };

  // Save Roadmap (Draft or Publish)
  const handleSaveRoadmap = async (publishImmediately: boolean) => {
    if (!draftTitle.trim()) {
      showWarning('Vui lòng nhập tiêu đề lộ trình.', 'Thiếu tiêu đề');
      return;
    }
    if (!draftStrategy || draftPhases.length === 0) {
      showWarning('Vui lòng tạo bản phác thảo lộ trình trước khi lưu.', 'Chưa có nội dung');
      return;
    }

    setSaving(true);
    try {
      // Ensure phase weeks are consecutive and correct
      let weekNum = 1;
      const sanitizedPhases = draftPhases.map((phase, pIdx) => ({
        order: pIdx + 1,
        name: phase.name,
        durationWeeks: phase.weeks.length,
        goals: phase.goals || [],
        weeks: phase.weeks.map((w) => ({
          week: weekNum++,
          focus: w.focus || 'Tập luyện theo kế hoạch',
          sessionTargets: sessionsPerWeek,
          sessions: [],
        })),
      }));

      const payload = {
        customerId,
        title: draftTitle.trim(),
        strategy: {
          ...draftStrategy,
          estimatedWeeks: sanitizedPhases.reduce((acc, p) => acc + p.durationWeeks, 0),
          sessionsPerWeek,
        },
        phases: sanitizedPhases,
        baseline: draftBaseline,
      };

      const created = await api.post<Roadmap>('/api/roadmaps', payload);
      const createdItem = (created as any)?.data || created;

      if (publishImmediately && createdItem?._id) {
        try {
          const published = await api.patch<Roadmap>(`/api/roadmaps/${createdItem._id}/publish`);
          const pubItem = (published as any)?.data || published;
          onSuccess(pubItem || createdItem);
        } catch {
          // If publish fails, still return draft
          onSuccess(createdItem);
        }
      } else {
        onSuccess(createdItem);
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu lộ trình.';
      showError(msg, 'Lỗi lưu lộ trình');
    } finally {
      setSaving(false);
    }
  };

  // Helper to toggle phase accordion
  const togglePhase = (idx: number) => {
    setExpandedPhases((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Helper to update phase week focus
  const updateWeekFocus = (phaseIdx: number, weekIdx: number, focus: string) => {
    setDraftPhases((prev) =>
      prev.map((p, pI) => {
        if (pI !== phaseIdx) return p;
        const nextWeeks = p.weeks.map((w, wI) => (wI === weekIdx ? { ...w, focus } : w));
        return { ...p, weeks: nextWeeks };
      })
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.headerIconBadge}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.modalTitle}>Tạo Lộ trình Huấn luyện</Text>
                <Text style={styles.modalSubtitle}>Trợ lý AI & Khoa học Thể thao NSCA/ACSM</Text>
              </View>
            </View>

            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Scrollable Form Body */}
          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Chọn Học viên & Chỉ số Thể trạng */}
            <View style={styles.cardSection}>
              <Text style={styles.sectionHeading}>1. Học viên & Thể trạng</Text>

              {/* Customer Selector Button */}
              <Pressable
                onPress={() => setShowCustomerPicker(true)}
                style={styles.customerPickerBtn}
              >
                <View style={styles.customerAvatarMini}>
                  <Text style={styles.customerAvatarText}>
                    {selectedCustomer?.fullName?.charAt(0) || 'HV'}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.pickerLabel}>Học viên áp dụng</Text>
                  <Text style={styles.pickerValue}>
                    {selectedCustomer?.fullName || 'Chạm để chọn học viên...'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </Pressable>

              {/* Health & InBody Snapshot */}
              {customerId ? (
                <View style={styles.healthCard}>
                  <View style={styles.healthHeaderRow}>
                    <Ionicons name="fitness-outline" size={16} color={colors.primary} />
                    <Text style={styles.healthHeaderTitle}>Chỉ số Thể trạng & InBody Gần Nhất</Text>
                    {loadingContext && <ActivityIndicator size="small" color={colors.primary} />}
                  </View>

                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statBoxLabel}>Cân nặng</Text>
                      <Text style={styles.statBoxValue}>
                        {latestInbody?.weight || customerMeta?.initialWeight || '--'} kg
                      </Text>
                    </View>

                    <View style={styles.statBox}>
                      <Text style={styles.statBoxLabel}>% Mỡ cơ thể</Text>
                      <Text
                        style={[
                          styles.statBoxValue,
                          latestInbody?.bodyFatPercentage && latestInbody.bodyFatPercentage > 25
                            ? { color: '#DC2626' }
                            : { color: '#16A34A' },
                        ]}
                      >
                        {latestInbody?.bodyFatPercentage ? `${latestInbody.bodyFatPercentage}%` : '--'}
                      </Text>
                    </View>

                    <View style={styles.statBox}>
                      <Text style={styles.statBoxLabel}>Cơ nạc (SMM)</Text>
                      <Text style={[styles.statBoxValue, { color: '#0284C7' }]}>
                        {latestInbody?.muscleMass ? `${latestInbody.muscleMass} kg` : '--'}
                      </Text>
                    </View>

                    <View style={styles.statBox}>
                      <Text style={styles.statBoxLabel}>Mỡ nội tạng</Text>
                      <Text style={[styles.statBoxValue, { color: '#D97706' }]}>
                        {latestInbody?.visceralFatLevel ? `Level ${latestInbody.visceralFatLevel}` : '--'}
                      </Text>
                    </View>

                    <View style={styles.statBox}>
                      <Text style={styles.statBoxLabel}>BMR cơ bản</Text>
                      <Text style={styles.statBoxValue}>
                        {latestInbody?.bmr || (customerMeta?.gender === 'FEMALE' ? 1300 : 1600)} kcal
                      </Text>
                    </View>
                  </View>

                  {customerMeta?.medicalNotes ? (
                    <View style={styles.medicalAlertBox}>
                      <Ionicons name="alert-circle" size={16} color="#B45309" />
                      <Text style={styles.medicalAlertText}>
                        <Text style={{ fontWeight: '700' }}>Lưu ý bệnh lý/chấn thương: </Text>
                        {customerMeta.medicalNotes}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* 2. Thiết lập Mục tiêu */}
            <View style={styles.cardSection}>
              <Text style={styles.sectionHeading}>2. Thiết lập Thông số Mục tiêu</Text>

              {/* Goal Types Grid */}
              <Text style={styles.fieldLabel}>Mục tiêu chính</Text>
              <View style={styles.goalsGrid}>
                {GOAL_OPTIONS.map((opt) => {
                  const isSelected = goalType === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setGoalType(opt.value)}
                      style={[styles.goalCard, isSelected && styles.goalCardActive]}
                    >
                      <Ionicons
                        name={opt.icon as any}
                        size={18}
                        color={isSelected ? colors.primary : colors.textMuted}
                      />
                      <Text style={[styles.goalLabel, isSelected && styles.goalLabelActive]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Target Value & Unit */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
                Chỉ số mục tiêu cụ thể
              </Text>
              <View style={styles.targetRow}>
                <TextInput
                  value={targetValue}
                  onChangeText={setTargetValue}
                  keyboardType="numeric"
                  placeholder="5"
                  style={styles.targetInput}
                />
                <View style={styles.unitButtonGroup}>
                  {(['kg', '% mỡ', 'cm eo'] as const).map((unit) => (
                    <Pressable
                      key={unit}
                      onPress={() => setTargetUnit(unit)}
                      style={[styles.unitBtn, targetUnit === unit && styles.unitBtnActive]}
                    >
                      <Text
                        style={[
                          styles.unitBtnText,
                          targetUnit === unit && styles.unitBtnTextActive,
                        ]}
                      >
                        {unit}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Duration Weeks */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
                Thời gian dự kiến (Tuần)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {DURATION_OPTIONS.map((d) => {
                  const isSelected = durationWeeks === d.value;
                  return (
                    <Pressable
                      key={d.value}
                      onPress={() => setDurationWeeks(d.value)}
                      style={[styles.chipItem, isSelected && styles.chipItemActive]}
                    >
                      <Text style={[styles.chipTitle, isSelected && styles.chipTitleActive]}>
                        {d.label}
                      </Text>
                      <Text style={[styles.chipSubtitle, isSelected && styles.chipSubtitleActive]}>
                        {d.subtitle}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Sessions Per Week */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
                Tần suất tập luyện
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                {SESSIONS_OPTIONS.map((s) => {
                  const isSelected = sessionsPerWeek === s.value;
                  return (
                    <Pressable
                      key={s.value}
                      onPress={() => setSessionsPerWeek(s.value)}
                      style={[styles.chipItem, isSelected && styles.chipItemActive]}
                    >
                      <Text style={[styles.chipTitle, isSelected && styles.chipTitleActive]}>
                        {s.label}
                      </Text>
                      <Text style={[styles.chipSubtitle, isSelected && styles.chipSubtitleActive]}>
                        {s.desc}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Custom Notes */}
              <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
                Ghi chú & Yêu cầu riêng
              </Text>
              <TextInput
                value={customNotes}
                onChangeText={setCustomNotes}
                placeholder="Ví dụ: Đau khớp cổ tay nhẹ, tránh bài đẩy ngực tạ đơn nặng..."
                multiline
                numberOfLines={3}
                style={styles.notesInput}
              />
            </View>

            {/* 3. Đánh giá Tính khả thi (AI Feasibility Feedback) */}
            <View
              style={[
                styles.feasibilityBox,
                feasibility.status === 'INFEASIBLE'
                  ? styles.feasibilityRed
                  : feasibility.status === 'CHALLENGING'
                  ? styles.feasibilityYellow
                  : styles.feasibilityGreen,
              ]}
            >
              <View style={styles.feasibilityHeader}>
                <View
                  style={[
                    styles.feasibilityBadge,
                    { backgroundColor: feasibility.badgeColor },
                  ]}
                >
                  <Text style={styles.feasibilityBadgeText}>{feasibility.badgeLabel}</Text>
                </View>
                <Text style={styles.feasibilityRateText}>
                  Tốc độ: {feasibility.weeklyRate} {feasibility.weeklyRateUnit}
                </Text>
              </View>

              <Text style={styles.feasibilityHeadline}>{feasibility.headline}</Text>

              {feasibility.reasons.length > 0 && (
                <View style={styles.feasibilityReasonsList}>
                  {feasibility.reasons.map((r, i) => (
                    <Text key={i} style={styles.feasibilityReasonItem}>
                      • {r}
                    </Text>
                  ))}
                </View>
              )}

              {/* Quick Adjustment Shortcuts if Infeasible or Challenging */}
              {(feasibility.recommendedWeeks || feasibility.recommendedTarget) && (
                <View style={styles.shortcutRow}>
                  {feasibility.recommendedWeeks ? (
                    <Pressable
                      onPress={() => setDurationWeeks(feasibility.recommendedWeeks!)}
                      style={styles.shortcutBtn}
                    >
                      <Text style={styles.shortcutBtnText}>
                        Đổi thời gian: {feasibility.recommendedWeeks} tuần
                      </Text>
                    </Pressable>
                  ) : null}

                  {feasibility.recommendedTarget ? (
                    <Pressable
                      onPress={() => setTargetValue(String(feasibility.recommendedTarget))}
                      style={styles.shortcutBtn}
                    >
                      <Text style={styles.shortcutBtnText}>
                        Đổi mục tiêu: {feasibility.recommendedTarget} {targetUnit}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>

            {/* 4. Action Buttons to Generate */}
            <View style={styles.generateSection}>
              {loadingAi ? (
                <View style={styles.aiLoadingBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.aiStepText}>{AI_STEPS[aiStepIndex]}</Text>
                  <Text style={styles.aiStepSubtext}>
                    Trợ lý Gemini đang phân tích và tối ưu hóa giáo án...
                  </Text>
                </View>
              ) : (
                <View style={styles.generateBtnGroup}>
                  <Pressable
                    onPress={handleGenerateAi}
                    style={({ pressed }) => [styles.btnAiGenerate, pressed && { opacity: 0.9 }]}
                  >
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.btnAiGenerateText}>Tạo Lộ trình bằng AI</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleApplyInstantSportsScience}
                    style={({ pressed }) => [styles.btnInstantGenerate, pressed && { opacity: 0.85 }]}
                  >
                    <Ionicons name="flash-outline" size={16} color={colors.primary} />
                    <Text style={styles.btnInstantGenerateText}>Mẫu Khoa học Thể thao (Nhanh)</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* 5. Xem trước & Tinh chỉnh Bản thảo (Preview Draft) */}
            {draftStrategy && (
              <View style={styles.draftPreviewSection}>
                <View style={styles.draftSectionHeader}>
                  <Ionicons name="document-text" size={18} color={colors.primary} />
                  <Text style={styles.draftSectionTitle}>Bản thảo Lộ trình Đã tạo</Text>
                </View>

                {/* Editable Title */}
                <Text style={styles.fieldLabel}>Tiêu đề lộ trình</Text>
                <TextInput
                  value={draftTitle}
                  onChangeText={setDraftTitle}
                  style={styles.draftTitleInput}
                />

                {/* Strategy Summary Card */}
                <View style={styles.strategySummaryCard}>
                  <Text style={styles.strategyCardHeading}>Chiến lược & Dinh dưỡng Dự kiến</Text>

                  <View style={styles.strategyMetricsRow}>
                    <View style={styles.strategyMetricCol}>
                      <Text style={styles.strategyMetricLabel}>Calo mục tiêu</Text>
                      <Text style={styles.strategyMetricValue}>
                        {draftStrategy.nutrition.targetCalories} kcal
                      </Text>
                    </View>

                    <View style={styles.strategyMetricCol}>
                      <Text style={styles.strategyMetricLabel}>Đạm (Protein)</Text>
                      <Text style={[styles.strategyMetricValue, { color: '#0284C7' }]}>
                        {draftStrategy.nutrition.proteinGrams}g
                      </Text>
                    </View>

                    <View style={styles.strategyMetricCol}>
                      <Text style={styles.strategyMetricLabel}>Tinh bột</Text>
                      <Text style={[styles.strategyMetricValue, { color: '#D97706' }]}>
                        {draftStrategy.nutrition.carbsGrams}g
                      </Text>
                    </View>

                    <View style={styles.strategyMetricCol}>
                      <Text style={styles.strategyMetricLabel}>Chất béo</Text>
                      <Text style={[styles.strategyMetricValue, { color: '#16A34A' }]}>
                        {draftStrategy.nutrition.fatGrams}g
                      </Text>
                    </View>
                  </View>

                  <View style={styles.strategyDivider} />

                  <View style={styles.strategyInfoRow}>
                    <Ionicons name="barbell-outline" size={15} color={colors.textMuted} />
                    <Text style={styles.strategyInfoText}>
                      <Text style={{ fontWeight: '700' }}>Phân bổ nhóm cơ: </Text>
                      {draftStrategy.trainingSplit}
                    </Text>
                  </View>

                  <View style={styles.strategyInfoRow}>
                    <Ionicons name="heart-outline" size={15} color={colors.textMuted} />
                    <Text style={styles.strategyInfoText}>
                      <Text style={{ fontWeight: '700' }}>Giao thức Cardio: </Text>
                      {draftStrategy.cardioProtocol}
                    </Text>
                  </View>

                  <View style={styles.strategyInfoRow}>
                    <Ionicons name="restaurant-outline" size={15} color={colors.textMuted} />
                    <Text style={styles.strategyInfoText}>
                      <Text style={{ fontWeight: '700' }}>Lời khuyên: </Text>
                      {draftStrategy.nutrition.advice}
                    </Text>
                  </View>
                </View>

                {/* Phases Accordion */}
                <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>
                  Các Giai đoạn ({draftPhases.length} Phases - {durationWeeks} Tuần)
                </Text>

                {draftPhases.map((phase, pIdx) => {
                  const isExpanded = !!expandedPhases[pIdx];
                  return (
                    <View key={pIdx} style={styles.phaseAccordionCard}>
                      <Pressable
                        onPress={() => togglePhase(pIdx)}
                        style={styles.phaseHeaderBtn}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.phaseHeaderName}>{phase.name}</Text>
                          <Text style={styles.phaseHeaderWeeks}>
                            {phase.weeks.length} tuần • {phase.goals?.length || 0} mục tiêu
                          </Text>
                        </View>
                        <Feather
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={colors.textMuted}
                        />
                      </Pressable>

                      {isExpanded && (
                        <View style={styles.phaseBody}>
                          {phase.goals && phase.goals.length > 0 && (
                            <View style={styles.phaseGoalsBox}>
                              <Text style={styles.phaseGoalsLabel}>Mục tiêu giai đoạn:</Text>
                              {phase.goals.map((g, gIdx) => (
                                <Text key={gIdx} style={styles.phaseGoalText}>
                                  ✓ {g}
                                </Text>
                              ))}
                            </View>
                          )}

                          <View style={styles.weeksList}>
                            {phase.weeks.map((w, wIdx) => (
                              <View key={wIdx} style={styles.weekItemRow}>
                                <View style={styles.weekBadge}>
                                  <Text style={styles.weekBadgeText}>T{w.week}</Text>
                                </View>
                                <TextInput
                                  value={w.focus}
                                  onChangeText={(text) => updateWeekFocus(pIdx, wIdx, text)}
                                  placeholder="Trọng tâm huấn luyện tuần..."
                                  style={styles.weekFocusInput}
                                />
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Checkpoints List */}
                {draftStrategy.checkpoints && draftStrategy.checkpoints.length > 0 && (
                  <View style={styles.checkpointsCard}>
                    <Text style={styles.checkpointsTitle}>
                      Mốc Đánh giá & Đo InBody ({draftStrategy.checkpoints.length} mốc)
                    </Text>
                    {draftStrategy.checkpoints.map((cp, cpIdx) => (
                      <View key={cpIdx} style={styles.checkpointItem}>
                        <View style={styles.checkpointWeekBadge}>
                          <Text style={styles.checkpointWeekText}>Tuần {cp.week}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: spacing.sm }}>
                          <Text style={styles.checkpointItemTitle}>{cp.title}</Text>
                          <Text style={styles.checkpointItemDesc}>{cp.description}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Modal Footer Actions */}
          <View style={styles.modalFooter}>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={[styles.footerBtn, styles.footerBtnCancel]}
            >
              <Text style={styles.footerBtnCancelText}>Hủy</Text>
            </Pressable>

            {draftStrategy ? (
              <>
                <Pressable
                  onPress={() => handleSaveRoadmap(false)}
                  disabled={saving}
                  style={[styles.footerBtn, styles.footerBtnDraft]}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.footerBtnDraftText}>Lưu Bản Nháp</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => handleSaveRoadmap(true)}
                  disabled={saving}
                  style={[styles.footerBtn, styles.footerBtnPublish]}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.footerBtnPublishText}>Lưu & Công Bố</Text>
                  )}
                </Pressable>
              </>
            ) : null}
          </View>
        </View>

        {/* Customer Picker Modal */}
        <CustomerSelectModal
          visible={showCustomerPicker}
          customers={customers}
          selectedId={customerId}
          onSelect={(id) => setCustomerId(id)}
          onClose={() => setShowCustomerPicker(false)}
        />

        {/* App Alert Feedback */}
        <AppAlertModal {...alertConfig} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '92%',
    minHeight: '80%',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  modalBody: {
    flex: 1,
  },
  bodyContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryNavy,
    marginBottom: spacing.sm,
  },
  customerPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customerAvatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  pickerLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginTop: 2,
  },
  healthCard: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  healthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  healthHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryNavy,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBoxLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  statBoxValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryNavy,
    marginTop: 2,
  },
  medicalAlertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  medicalAlertText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 6,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  goalCard: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  goalCardActive: {
    backgroundColor: '#EEF2FF',
    borderColor: colors.primary,
  },
  goalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    flex: 1,
  },
  goalLabelActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  targetInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  unitButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  unitBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unitBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  unitBtnTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  chipsScroll: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
  },
  chipItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  chipItemActive: {
    backgroundColor: '#EEF2FF',
    borderColor: colors.primary,
  },
  chipTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  chipTitleActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  chipSubtitle: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
  },
  chipSubtitleActive: {
    color: colors.primary,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: spacing.sm,
    fontSize: 12,
    color: colors.primaryNavy,
    textAlignVertical: 'top',
    minHeight: 64,
  },
  feasibilityBox: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  feasibilityGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  feasibilityYellow: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  feasibilityRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  feasibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  feasibilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  feasibilityBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  feasibilityRateText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  feasibilityHeadline: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryNavy,
    lineHeight: 18,
    marginBottom: 6,
  },
  feasibilityReasonsList: {
    gap: 3,
  },
  feasibilityReasonItem: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  shortcutRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  shortcutBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shortcutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  generateSection: {
    marginVertical: spacing.xs,
  },
  aiLoadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  aiStepText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryNavy,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  aiStepSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  generateBtnGroup: {
    gap: spacing.sm,
  },
  btnAiGenerate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  btnAiGenerateText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  btnInstantGenerate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EEF2FF',
    borderRadius: radius.md,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  btnInstantGenerateText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  draftPreviewSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  draftSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  draftSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  draftTitleInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  strategySummaryCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  strategyCardHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginBottom: spacing.xs,
  },
  strategyMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  strategyMetricCol: {
    alignItems: 'center',
  },
  strategyMetricLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  strategyMetricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryNavy,
    marginTop: 2,
  },
  strategyDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.xs,
  },
  strategyInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginVertical: 2,
  },
  strategyInfoText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  phaseAccordionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 4,
  },
  phaseHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: '#F1F5F9',
  },
  phaseHeaderName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  phaseHeaderWeeks: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  phaseBody: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  phaseGoalsBox: {
    backgroundColor: '#FFFFFF',
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },
  phaseGoalsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 2,
  },
  phaseGoalText: {
    fontSize: 10,
    color: colors.textMuted,
    lineHeight: 15,
  },
  weeksList: {
    gap: 4,
  },
  weekItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekBadge: {
    width: 32,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  weekFocusInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 11,
    color: colors.primaryNavy,
  },
  checkpointsCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: spacing.xs,
  },
  checkpointsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  checkpointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  checkpointWeekBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  checkpointWeekText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  checkpointItemTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  checkpointItemDesc: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
    lineHeight: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnCancel: {
    backgroundColor: '#F1F5F9',
    maxWidth: 70,
  },
  footerBtnCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  footerBtnDraft: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  footerBtnDraftText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  footerBtnPublish: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  footerBtnPublishText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
