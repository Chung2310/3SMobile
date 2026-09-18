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
import { Feather } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type {
  Roadmap,
  RoadmapEvaluationCheckpoint,
  RoadmapPhase,
} from '@/types/roadmap';

interface RoadmapEditModalProps {
  visible: boolean;
  roadmap: Roadmap | null;
  loading?: boolean;
  error?: string | null;
  onSave: (payload: {
    title: string;
    strategy?: Record<string, unknown>;
    baseline?: Record<string, unknown>;
    phases?: RoadmapPhase[];
  }) => Promise<void>;
  onClose: () => void;
}

type EditTab = 'metrics' | 'strategy' | 'phases';

export function RoadmapEditModal({
  visible,
  roadmap,
  loading = false,
  error,
  onSave,
  onClose,
}: RoadmapEditModalProps) {
  const [activeTab, setActiveTab] = useState<EditTab>('metrics');

  // Tab 1: General & Metrics
  const [title, setTitle] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('');
  const [sessionsPerWeek, setSessionsPerWeek] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [proteinGrams, setProteinGrams] = useState('');
  const [carbsGrams, setCarbsGrams] = useState('');
  const [fatGrams, setFatGrams] = useState('');
  const [waterLiters, setWaterLiters] = useState('');
  const [initialWeight, setInitialWeight] = useState('');
  const [initialBodyFat, setInitialBodyFat] = useState('');
  const [initialMuscleMass, setInitialMuscleMass] = useState('');

  // Tab 2: Strategy & Nutrition & Checkpoints
  const [trainingMethod, setTrainingMethod] = useState('');
  const [trainingSplit, setTrainingSplit] = useState('');
  const [cardioProtocol, setCardioProtocol] = useState('');
  const [nutritionAdvice, setNutritionAdvice] = useState('');
  const [checkpoints, setCheckpoints] = useState<RoadmapEvaluationCheckpoint[]>([]);

  // Tab 3: Phases & Weeks
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [expandedPhaseIndex, setExpandedPhaseIndex] = useState<number | null>(0);

  // Initialize form when roadmap opens
  useEffect(() => {
    if (roadmap) {
      setTitle(roadmap.title || '');
      setDurationWeeks(
        String(
          roadmap.strategy?.estimatedWeeks ||
            roadmap.strategy?.durationWeeks ||
            12
        )
      );
      setSessionsPerWeek(
        String(roadmap.strategy?.sessionsPerWeek || 3)
      );

      // Nutrition & Macros
      setTargetCalories(
        roadmap.strategy?.nutrition?.targetCalories
          ? String(roadmap.strategy.nutrition.targetCalories)
          : ''
      );
      setProteinGrams(
        roadmap.strategy?.nutrition?.proteinGrams !== undefined
          ? String(roadmap.strategy.nutrition.proteinGrams)
          : ''
      );
      setCarbsGrams(
        roadmap.strategy?.nutrition?.carbsGrams !== undefined
          ? String(roadmap.strategy.nutrition.carbsGrams)
          : ''
      );
      setFatGrams(
        roadmap.strategy?.nutrition?.fatGrams !== undefined
          ? String(roadmap.strategy.nutrition.fatGrams)
          : ''
      );
      setWaterLiters(
        roadmap.strategy?.nutrition?.waterLiters !== undefined
          ? String(roadmap.strategy.nutrition.waterLiters)
          : ''
      );

      // Baseline InBody
      setInitialWeight(
        roadmap.baseline?.initialWeight !== undefined
          ? String(roadmap.baseline.initialWeight)
          : ''
      );
      setInitialBodyFat(
        roadmap.baseline?.initialBodyFat !== undefined
          ? String(roadmap.baseline.initialBodyFat)
          : ''
      );
      setInitialMuscleMass(
        roadmap.baseline?.initialMuscleMass !== undefined
          ? String(roadmap.baseline.initialMuscleMass)
          : ''
      );

      // Strategy
      setTrainingMethod(roadmap.strategy?.trainingMethod || '');
      setTrainingSplit(roadmap.strategy?.trainingSplit || '');
      setCardioProtocol(roadmap.strategy?.cardioProtocol || '');
      setNutritionAdvice(
        roadmap.strategy?.nutrition?.advice ||
          roadmap.strategy?.nutritionStrategy ||
          ''
      );

      // Checkpoints (clone)
      setCheckpoints(
        Array.isArray(roadmap.strategy?.checkpoints)
          ? JSON.parse(JSON.stringify(roadmap.strategy.checkpoints))
          : []
      );

      // Phases (clone)
      setPhases(
        Array.isArray(roadmap.phases)
          ? JSON.parse(JSON.stringify(roadmap.phases))
          : []
      );

      setActiveTab('metrics');
      setExpandedPhaseIndex(0);
    }
  }, [roadmap, visible]);

  // Checkpoint handlers
  const handleAddCheckpoint = () => {
    const nextWeek = checkpoints.length > 0 ? (checkpoints[checkpoints.length - 1].week || 4) + 4 : 4;
    setCheckpoints((prev) => [
      ...prev,
      {
        week: nextWeek,
        title: `Đánh giá InBody mốc tuần ${nextWeek}`,
        description: 'Kiểm tra tỷ lệ mỡ và cơ để điều chỉnh chế độ tập luyện',
      },
    ]);
  };

  const handleUpdateCheckpoint = (
    index: number,
    field: keyof RoadmapEvaluationCheckpoint,
    val: string
  ) => {
    setCheckpoints((prev) => {
      const copy = [...prev];
      if (field === 'week') {
        copy[index] = { ...copy[index], week: parseInt(val, 10) || 1 };
      } else {
        copy[index] = { ...copy[index], [field]: val };
      }
      return copy;
    });
  };

  const handleRemoveCheckpoint = (index: number) => {
    setCheckpoints((prev) => prev.filter((_, i) => i !== index));
  };

  // Phase handlers
  const handleUpdatePhase = (
    phaseIdx: number,
    field: 'name' | 'goals',
    val: string
  ) => {
    setPhases((prev) => {
      const copy = [...prev];
      if (field === 'goals') {
        const lines = val.split('\n').map((l) => l.trim()).filter(Boolean);
        copy[phaseIdx] = { ...copy[phaseIdx], goals: lines };
      } else {
        copy[phaseIdx] = { ...copy[phaseIdx], name: val };
      }
      return copy;
    });
  };

  const handleUpdateWeekFocus = (
    phaseIdx: number,
    weekIdx: number,
    focus: string
  ) => {
    setPhases((prev) => {
      const copy = [...prev];
      const targetPhase = { ...copy[phaseIdx] };
      const targetWeeks = [...targetPhase.weeks];
      targetWeeks[weekIdx] = { ...targetWeeks[weekIdx], focus };
      targetPhase.weeks = targetWeeks;
      copy[phaseIdx] = targetPhase;
      return copy;
    });
  };

  const handleAddPhase = () => {
    setPhases((prev) => {
      const newOrder = prev.length + 1;
      let startWeek = 1;
      if (prev.length > 0) {
        const lastPhase = prev[prev.length - 1];
        const lastWeek = lastPhase.weeks?.[lastPhase.weeks.length - 1]?.week || 0;
        startWeek = lastWeek + 1;
      }

      const newPhaseWeeks = [0, 1, 2, 3].map((offset) => ({
        week: startWeek + offset,
        focus: `Tập luyện & duy trì tuần ${startWeek + offset}`,
        sessionTargets: parseInt(sessionsPerWeek, 10) || 3,
        sessions: [],
      }));

      const newPhase: RoadmapPhase = {
        order: newOrder,
        name: `Phase ${newOrder}: Tối ưu hóa & Phát triển`,
        durationWeeks: newPhaseWeeks.length,
        goals: ['Tăng cường thể lực', 'Tối ưu vóc dáng'],
        weeks: newPhaseWeeks,
      };

      return [...prev, newPhase];
    });
  };

  const handleRemovePhase = (phaseIdx: number) => {
    if (phases.length <= 1) return;
    setPhases((prev) => {
      const filtered = prev.filter((_, i) => i !== phaseIdx);
      // Renumber orders and weeks
      let curWeek = 1;
      return filtered.map((p, idx) => {
        const updatedWeeks = p.weeks.map((w) => ({
          ...w,
          week: curWeek++,
          sessions: [],
        }));
        return {
          ...p,
          order: idx + 1,
          durationWeeks: updatedWeeks.length,
          weeks: updatedWeeks,
        };
      });
    });
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!title.trim() || !roadmap) return;

    // 1. Build Baseline
    const updatedBaseline: Record<string, unknown> = {
      ...(roadmap.baseline || {}),
    };
    if (initialWeight.trim()) updatedBaseline.initialWeight = parseFloat(initialWeight);
    if (initialBodyFat.trim()) updatedBaseline.initialBodyFat = parseFloat(initialBodyFat);
    if (initialMuscleMass.trim()) updatedBaseline.initialMuscleMass = parseFloat(initialMuscleMass);

    // 2. Build Strategy & Nutrition
    const parsedCalories = targetCalories ? parseInt(targetCalories, 10) : (roadmap.strategy?.nutrition?.targetCalories || 1800);
    const parsedSessions = sessionsPerWeek ? parseInt(sessionsPerWeek, 10) : (roadmap.strategy?.sessionsPerWeek || 3);
    const parsedDuration = durationWeeks ? parseInt(durationWeeks, 10) : (roadmap.strategy?.estimatedWeeks || 12);

    const updatedNutrition: Record<string, unknown> = {
      ...(roadmap.strategy?.nutrition || {}),
      bmr: roadmap.strategy?.nutrition?.bmr || 1500,
      tdee: roadmap.strategy?.nutrition?.tdee || 2000,
      calorieDeficitOrSurplus: roadmap.strategy?.nutrition?.calorieDeficitOrSurplus || 0,
      targetCalories: parsedCalories,
      waterLiters: waterLiters ? parseFloat(waterLiters) : (roadmap.strategy?.nutrition?.waterLiters || 2.5),
      advice: nutritionAdvice.trim() || roadmap.strategy?.nutrition?.advice || 'Tuân thủ chế độ dinh dưỡng cân đối',
    };

    if (proteinGrams.trim()) updatedNutrition.proteinGrams = parseFloat(proteinGrams);
    if (carbsGrams.trim()) updatedNutrition.carbsGrams = parseFloat(carbsGrams);
    if (fatGrams.trim()) updatedNutrition.fatGrams = parseFloat(fatGrams);

    const updatedStrategy: Record<string, unknown> = {
      ...(roadmap.strategy || {}),
      targetSummary: roadmap.strategy?.targetSummary || title.trim(),
      estimatedWeeks: parsedDuration,
      sessionsPerWeek: parsedSessions,
      trainingMethod: trainingMethod.trim() || roadmap.strategy?.trainingMethod || 'Progressive Overload',
      trainingSplit: trainingSplit.trim() || roadmap.strategy?.trainingSplit || 'Upper - Lower - Full Body',
      cardioProtocol: cardioProtocol.trim() || roadmap.strategy?.cardioProtocol || 'Zone 2 Cardio',
      nutrition: updatedNutrition,
      checkpoints: checkpoints.map((cp, idx) => ({
        week: Number(cp.week) || (idx + 1) * 4,
        title: cp.title.trim() || `Đánh giá InBody tuần ${cp.week}`,
        description: cp.description?.trim() || 'Đo lại các chỉ số InBody',
      })),
    };

    // 3. Normalize Phases and Weeks
    let weekCounter = 1;
    const normalizedPhases: RoadmapPhase[] = phases.map((phase, pIdx) => {
      const fixedWeeks = phase.weeks.map((w) => ({
        ...w,
        week: weekCounter++,
        sessionTargets: parsedSessions,
        sessions: [], // backend validation requires sessions array to be empty in roadmap
        focus: w.focus?.trim() || `Trọng tâm tuần ${weekCounter}`,
      }));

      return {
        order: pIdx + 1,
        name: phase.name?.trim() || `Phase ${pIdx + 1}: Kế hoạch giai đoạn`,
        durationWeeks: fixedWeeks.length,
        goals: phase.goals && phase.goals.length > 0 ? phase.goals : ['Đạt mục tiêu giai đoạn'],
        weeks: fixedWeeks,
      };
    });

    await onSave({
      title: title.trim(),
      baseline: updatedBaseline,
      strategy: updatedStrategy,
      phases: normalizedPhases.length > 0 ? normalizedPhases : undefined,
    });
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
            <View>
              <Text style={styles.headerTitle}>Chỉnh sửa lộ trình</Text>
              <Text style={styles.headerSubtitle}>
                Cập nhật toàn bộ chỉ số, chiến lược và giai đoạn
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} disabled={loading} style={styles.closeBtn}>
              <Feather name="x" size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Segmented Tab Navigation */}
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => setActiveTab('metrics')}
              style={[styles.tabBtn, activeTab === 'metrics' && styles.tabBtnActive]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'metrics' && styles.tabBtnTextActive,
                ]}
              >
                Chỉ số & KPI
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('strategy')}
              style={[styles.tabBtn, activeTab === 'strategy' && styles.tabBtnActive]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'strategy' && styles.tabBtnTextActive,
                ]}
              >
                Chiến lược
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('phases')}
              style={[styles.tabBtn, activeTab === 'phases' && styles.tabBtnActive]}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'phases' && styles.tabBtnTextActive,
                ]}
              >
                Giai đoạn ({phases.length})
              </Text>
            </Pressable>
          </View>

          {/* Error Message */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Tab 1: Chỉ số & KPI */}
          {activeTab === 'metrics' && (
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <View style={styles.field}>
                <Text style={styles.label}>Tên lộ trình *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Nhập tên lộ trình..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Row: Weeks & Sessions */}
              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Thời lượng (Tuần)</Text>
                  <TextInput
                    style={styles.input}
                    value={durationWeeks}
                    onChangeText={setDurationWeeks}
                    placeholder="VD: 12"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Số buổi / tuần</Text>
                  <TextInput
                    style={styles.input}
                    value={sessionsPerWeek}
                    onChangeText={setSessionsPerWeek}
                    placeholder="VD: 4"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Row: Calories & Water */}
              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Calo mục tiêu (kcal)</Text>
                  <TextInput
                    style={styles.input}
                    value={targetCalories}
                    onChangeText={setTargetCalories}
                    placeholder="VD: 1800"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Nước (Lít / ngày)</Text>
                  <TextInput
                    style={styles.input}
                    value={waterLiters}
                    onChangeText={setWaterLiters}
                    placeholder="VD: 2.5"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Section: Macros */}
              <Text style={styles.subHeading}>Tỷ lệ đa lượng (Macros)</Text>
              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Protein (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={proteinGrams}
                    onChangeText={setProteinGrams}
                    placeholder="VD: 130"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Carbs (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={carbsGrams}
                    onChangeText={setCarbsGrams}
                    placeholder="VD: 150"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Fat (g)</Text>
                  <TextInput
                    style={styles.input}
                    value={fatGrams}
                    onChangeText={setFatGrams}
                    placeholder="VD: 45"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Section: Baseline InBody */}
              <Text style={styles.subHeading}>Chỉ số InBody ban đầu (Baseline)</Text>
              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Cân nặng (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={initialWeight}
                    onChangeText={setInitialWeight}
                    placeholder="VD: 60"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>% Mỡ (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={initialBodyFat}
                    onChangeText={setInitialBodyFat}
                    placeholder="VD: 25"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Cơ (kg)</Text>
                  <TextInput
                    style={styles.input}
                    value={initialMuscleMass}
                    onChangeText={setInitialMuscleMass}
                    placeholder="VD: 35"
                    keyboardType="numeric"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>
            </ScrollView>
          )}

          {/* Tab 2: Chiến lược & Định hướng */}
          {activeTab === 'strategy' && (
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* Training Method */}
              <View style={styles.field}>
                <Text style={styles.label}>Phương pháp tập luyện</Text>
                <TextInput
                  style={styles.input}
                  value={trainingMethod}
                  onChangeText={setTrainingMethod}
                  placeholder="VD: Progressive Overload & Hypertrophy"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Training split */}
              <View style={styles.field}>
                <Text style={styles.label}>Lịch chia buổi tập (Split)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={trainingSplit}
                  onChangeText={setTrainingSplit}
                  placeholder="VD: Upper / Lower / Full Body luân phiên..."
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Cardio */}
              <View style={styles.field}>
                <Text style={styles.label}>Chiến lược Cardio</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={cardioProtocol}
                  onChangeText={setCardioProtocol}
                  placeholder="VD: Zone 2 Cardio 30-45 phút, 3-4 buổi/tuần"
                  multiline
                  numberOfLines={2}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Nutrition advice */}
              <View style={styles.field}>
                <Text style={styles.label}>Lời khuyên dinh dưỡng</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={nutritionAdvice}
                  onChangeText={setNutritionAdvice}
                  placeholder="Ghi chú dinh dưỡng cho học viên..."
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Checkpoints */}
              <View style={styles.checkpointHeaderRow}>
                <Text style={styles.subHeading}>Mốc đánh giá InBody</Text>
                <Pressable
                  onPress={handleAddCheckpoint}
                  style={styles.miniAddBtn}
                >
                  <Feather name="plus" size={13} color={colors.primary} />
                  <Text style={styles.miniAddBtnText}>Thêm mốc</Text>
                </Pressable>
              </View>

              {checkpoints.map((cp, cIdx) => (
                <View key={cIdx} style={styles.checkpointEditCard}>
                  <View style={styles.checkpointEditTop}>
                    <View style={styles.checkpointWeekBox}>
                      <Text style={styles.label}>Tuần</Text>
                      <TextInput
                        style={[styles.input, styles.weekInput]}
                        value={String(cp.week)}
                        onChangeText={(val) => handleUpdateCheckpoint(cIdx, 'week', val)}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Tiêu đề mốc</Text>
                      <TextInput
                        style={styles.input}
                        value={cp.title}
                        onChangeText={(val) => handleUpdateCheckpoint(cIdx, 'title', val)}
                        placeholder="Tiêu đề mốc..."
                      />
                    </View>

                    <Pressable
                      onPress={() => handleRemoveCheckpoint(cIdx)}
                      style={styles.deleteCpBtn}
                    >
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </Pressable>
                  </View>

                  <View style={{ marginTop: 4 }}>
                    <Text style={styles.label}>Mô tả mục tiêu mốc</Text>
                    <TextInput
                      style={[styles.input, { minHeight: 38 }]}
                      value={cp.description}
                      onChangeText={(val) => handleUpdateCheckpoint(cIdx, 'description', val)}
                      placeholder="Mô tả chỉ số cần đo lại..."
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Tab 3: Các giai đoạn (Phases & Weeks) */}
          {activeTab === 'phases' && (
            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.checkpointHeaderRow}>
                <Text style={styles.subHeading}>Danh sách các giai đoạn</Text>
                <Pressable onPress={handleAddPhase} style={styles.miniAddBtn}>
                  <Feather name="plus" size={13} color={colors.primary} />
                  <Text style={styles.miniAddBtnText}>Thêm Phase</Text>
                </Pressable>
              </View>

              {phases.map((phase, pIdx) => {
                const isExpanded = expandedPhaseIndex === pIdx;
                const goalsText = (phase.goals || []).join('\n');

                return (
                  <View key={phase.order || pIdx} style={styles.phaseEditCard}>
                    {/* Phase Header */}
                    <View style={styles.phaseEditHeader}>
                      <Pressable
                        onPress={() => setExpandedPhaseIndex(isExpanded ? null : pIdx)}
                        style={styles.phaseExpandToggle}
                      >
                        <View style={styles.phaseBadge}>
                          <Text style={styles.phaseBadgeText}>Phase {phase.order || pIdx + 1}</Text>
                        </View>
                        <Text style={styles.phaseCardTitle} numberOfLines={1}>
                          {phase.name || `Phase ${pIdx + 1}`}
                        </Text>
                        <Feather
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={colors.textMuted}
                        />
                      </Pressable>

                      {phases.length > 1 && (
                        <Pressable
                          onPress={() => handleRemovePhase(pIdx)}
                          hitSlop={6}
                          style={styles.deletePhaseBtn}
                        >
                          <Feather name="trash-2" size={14} color="#EF4444" />
                        </Pressable>
                      )}
                    </View>

                    {/* Phase Content (Expandable) */}
                    {isExpanded && (
                      <View style={styles.phaseEditBody}>
                        {/* Phase Name */}
                        <View style={styles.field}>
                          <Text style={styles.label}>Tên giai đoạn</Text>
                          <TextInput
                            style={styles.input}
                            value={phase.name}
                            onChangeText={(val) => handleUpdatePhase(pIdx, 'name', val)}
                            placeholder="VD: Thích nghi thần kinh & Nền tảng"
                          />
                        </View>

                        {/* Phase Goals */}
                        <View style={styles.field}>
                          <Text style={styles.label}>Mục tiêu giai đoạn (Mỗi dòng 1 mục tiêu)</Text>
                          <TextInput
                            style={[styles.input, styles.textArea]}
                            value={goalsText}
                            onChangeText={(val) => handleUpdatePhase(pIdx, 'goals', val)}
                            placeholder="Nhập mục tiêu 1&#10;Nhập mục tiêu 2..."
                            multiline
                            numberOfLines={3}
                          />
                        </View>

                        {/* Weeks list inside phase */}
                        <Text style={[styles.subHeading, { marginTop: 6, fontSize: 11 }]}>
                          Chi tiết các tuần ({phase.weeks.length} tuần)
                        </Text>
                        <View style={styles.weeksList}>
                          {phase.weeks.map((w, wIdx) => (
                            <View key={wIdx} style={styles.weekItem}>
                              <View style={styles.weekBadge}>
                                <Text style={styles.weekBadgeText}>T{w.week}</Text>
                              </View>
                              <TextInput
                                style={[styles.input, { flex: 1, paddingVertical: 5 }]}
                                value={w.focus}
                                onChangeText={(val) => handleUpdateWeekFocus(pIdx, wIdx, val)}
                                placeholder={`Trọng tâm tuần ${w.week}...`}
                              />
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Action Footer */}
          <View style={styles.footer}>
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={[styles.btn, styles.btnCancel]}
            >
              <Text style={styles.btnCancelText}>Hủy</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={loading || !title.trim()}
              style={[
                styles.btn,
                styles.btnSave,
                (!title.trim() || loading) && { opacity: 0.6 },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnSaveText}>Lưu thay đổi</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    height: '88%',
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    padding: 3,
    marginTop: 8,
    marginBottom: 6,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.sm,
    padding: 8,
    marginVertical: 4,
  },
  errorText: {
    fontSize: 11.5,
    color: colors.danger,
  },
  formScroll: {
    flex: 1,
    paddingVertical: 4,
  },
  field: {
    marginBottom: 8,
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  subHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.primaryNavy,
    marginTop: 6,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 12.5,
    color: colors.text,
  },
  textArea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  checkpointHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 4,
  },
  miniAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  miniAddBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  checkpointEditCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.sm,
    padding: 8,
    marginBottom: 6,
  },
  checkpointEditTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkpointWeekBox: {
    width: 55,
  },
  weekInput: {
    textAlign: 'center',
    fontWeight: '700',
  },
  deleteCpBtn: {
    padding: 6,
  },
  phaseEditCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    marginBottom: 8,
    overflow: 'hidden',
  },
  phaseEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 8,
  },
  phaseExpandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  phaseBadge: {
    backgroundColor: colors.primaryNavy,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  phaseBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  phaseCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  deletePhaseBtn: {
    padding: 6,
  },
  phaseEditBody: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  weeksList: {
    gap: 4,
  },
  weekItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekBadge: {
    width: 32,
    height: 30,
    backgroundColor: '#F0F9FF',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  weekBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancel: {
    backgroundColor: '#F1F5F9',
  },
  btnCancelText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
  btnSave: {
    backgroundColor: colors.primary,
  },
  btnSaveText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
