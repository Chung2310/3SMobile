import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { Activity, Dumbbell, Flame, Info, Sparkles, X } from 'lucide-react-native';
import { colors, radius, spacing } from '@/theme';
import {
  ACTIVITY_CATEGORY_COLORS,
  ACTIVITY_CATEGORY_LABELS,
  type ActivityCategory,
  type ActivityItem,
  addCustomActivity,
  updateCustomActivity,
} from '@/services/activityDatabase';

interface ActivityEditorModalProps {
  visible: boolean;
  activityToEdit?: ActivityItem | null;
  onClose: () => void;
  onSaved: (activity: ActivityItem) => void;
}

const CATEGORIES: { id: ActivityCategory; label: string }[] = [
  { id: 'STRENGTH', label: 'Tập tạ / Gym' },
  { id: 'CARDIO', label: 'Cardio / Chạy / Bơi' },
  { id: 'MARTIAL_ARTS', label: 'Võ thuật / Kickfit' },
  { id: 'SPORTS', label: 'Thể thao đối kháng' },
  { id: 'RECOVERY', label: 'Phục hồi / Giãn cơ' },
];

export function ActivityEditorModal({
  visible,
  activityToEdit,
  onClose,
  onSaved,
}: ActivityEditorModalProps) {
  const isEditing = !!activityToEdit;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('STRENGTH');
  const [met, setMet] = useState('6.5');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [distanceKm, setDistanceKm] = useState('');
  const [benchmarkText, setBenchmarkText] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Điền dữ liệu khi mở modal
  useEffect(() => {
    if (visible) {
      if (activityToEdit) {
        setName(activityToEdit.name);
        setCategory(activityToEdit.category);
        setMet(String(activityToEdit.met));
        setDurationMinutes(String(activityToEdit.defaultDurationMinutes));
        setDistanceKm(activityToEdit.defaultDistanceKm ? String(activityToEdit.defaultDistanceKm) : '');
        setBenchmarkText(activityToEdit.benchmarkText || '');
        setDescription(activityToEdit.description || '');
      } else {
        setName('');
        setCategory('STRENGTH');
        setMet('6.5');
        setDurationMinutes('45');
        setDistanceKm('');
        setBenchmarkText('');
        setDescription('');
      }
    }
  }, [visible, activityToEdit]);

  // Tự động tính calo tiêu hao mẫu (70kg)
  const numMet = parseFloat(met) || 0;
  const numDuration = parseFloat(durationMinutes) || 0;
  const previewBurned70kg = Math.round(((numMet * 3.5 * 70) / 200) * numDuration);
  const calPerMin70kg = parseFloat(((numMet * 3.5 * 70) / 200).toFixed(1));

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên bộ môn hoặc bài tập vận động.');
      return;
    }
    if (numMet <= 0 || numMet > 30) {
      Alert.alert('Hệ số MET không hợp lệ', 'Hệ số MET phải lớn hơn 0 và không vượt quá 30.');
      return;
    }
    if (numDuration <= 0) {
      Alert.alert('Thời lượng không hợp lệ', 'Thời lượng mặc định phải lớn hơn 0 phút.');
      return;
    }

    try {
      setSaving(true);
      const benchmark = benchmarkText.trim() || `${numDuration}p tập ~ ${previewBurned70kg} kcal`;

      if (isEditing && activityToEdit) {
        const updated = await updateCustomActivity(activityToEdit.id, {
          name: name.trim(),
          category,
          categoryLabel: ACTIVITY_CATEGORY_LABELS[category],
          met: numMet,
          defaultDurationMinutes: numDuration,
          defaultDistanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
          benchmarkText: benchmark,
          description: description.trim() || `Tập luyện ${name.trim()} với hệ số tiêu hao MET ${numMet}`,
          badgeColor: ACTIVITY_CATEGORY_COLORS[category],
        });
        if (updated) {
          Alert.alert('Thành công', 'Đã cập nhật thông tin bộ môn vận động.');
          onSaved(updated);
          onClose();
        }
      } else {
        const created = await addCustomActivity({
          name: name.trim(),
          category,
          categoryLabel: ACTIVITY_CATEGORY_LABELS[category],
          met: numMet,
          defaultDurationMinutes: numDuration,
          defaultDistanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
          benchmarkText: benchmark,
          description: description.trim() || `Tập luyện ${name.trim()} với hệ số tiêu hao MET ${numMet}`,
          badgeColor: ACTIVITY_CATEGORY_COLORS[category],
        });
        Alert.alert('Thành công', 'Đã thêm bộ môn mới vào kho vận động.');
        onSaved(created);
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Lỗi lưu hoạt động', err?.message || 'Đã có lỗi xảy ra.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleCol}>
              <View style={styles.headerIconCircle}>
                <Activity size={18} color="#0284c7" />
              </View>
              <View>
                <Text style={styles.headerTitle}>
                  {isEditing ? 'Chỉnh Sửa Hoạt Động' : 'Thêm Hoạt Động Vận Động Mới'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  Kho tiêu hao năng lượng thể thao chuẩn ACSM METs
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Tên bài tập / Bộ môn */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>
                Tên bài tập / Hoạt động <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="VD: Tập tạ thân trên, Chạy bộ dốc 5%, Bơi bướm..."
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* 2. Nhóm bộ môn */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Nhóm bộ môn</Text>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map((cat) => {
                  const isSel = category === cat.id;
                  const catColor = ACTIVITY_CATEGORY_COLORS[cat.id];
                  return (
                    <Pressable
                      key={cat.id}
                      style={[
                        styles.categoryCard,
                        isSel && {
                          borderColor: catColor,
                          backgroundColor: `${catColor}12`,
                        },
                      ]}
                      onPress={() => setCategory(cat.id)}
                    >
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: catColor },
                        ]}
                      />
                      <Text
                        style={[
                          styles.categoryCardText,
                          isSel && { color: catColor, fontWeight: '700' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 3. METs & Thời lượng mặc định */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>
                  Hệ số MET <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="6.5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={met}
                  onChangeText={setMet}
                />
                <Text style={styles.helperText}>VD: Đi bộ ~3.5, Gym ~6.5, Chạy ~9.8</Text>
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>
                  Thời lượng mặc định (phút) <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="45"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                />
                <Text style={styles.helperText}>Thời gian trung bình 1 buổi tập</Text>
              </View>
            </View>

            {/* 4. Cự ly (km) & Benchmark */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Cự ly mặc định (km - tùy chọn)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: 5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={distanceKm}
                  onChangeText={setDistanceKm}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Mốc tiêu hao tham khảo</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: 1h tập ~ 400 - 500 kcal"
                  placeholderTextColor={colors.textMuted}
                  value={benchmarkText}
                  onChangeText={setBenchmarkText}
                />
              </View>
            </View>

            {/* 5. Mô tả & Kỹ thuật */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>Mô tả & Hướng dẫn kỹ thuật</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Ghi chú về nhóm cơ tác động, nhịp tim mục tiêu, thời gian nghỉ giữa set..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </View>

            {/* 6. Hộp Preview tính toán công thức ACSM */}
            <View style={styles.previewCard}>
              <View style={styles.previewHeaderRow}>
                <View style={styles.previewTitleRow}>
                  <Flame size={16} color="#ea580c" />
                  <Text style={styles.previewTitle}>ƯỚC TÍNH TIÊU HAO CALO (CHUẨN 70KG)</Text>
                </View>
                <View style={styles.previewBadge}>
                  <Text style={styles.previewBadgeText}>MET {numMet || 0}</Text>
                </View>
              </View>

              <View style={styles.previewMetricsRow}>
                <View style={styles.previewMetricItem}>
                  <Text style={styles.previewMetricLabel}>Tiêu hao 1 buổi ({numDuration}p)</Text>
                  <Text style={[styles.previewMetricVal, { color: '#ea580c' }]}>
                    {previewBurned70kg} <Text style={styles.previewMetricUnit}>kcal</Text>
                  </Text>
                </View>

                <View style={styles.previewDivider} />

                <View style={styles.previewMetricItem}>
                  <Text style={styles.previewMetricLabel}>Tốc độ đốt</Text>
                  <Text style={[styles.previewMetricVal, { color: '#0284c7' }]}>
                    {calPerMin70kg} <Text style={styles.previewMetricUnit}>kcal / phút</Text>
                  </Text>
                </View>
              </View>

              <Text style={styles.previewFormulaNote}>
                Công thức ACSM: Calo = (MET x 3.5 x Cân nặng / 200) x Thời gian (phút)
              </Text>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>Hủy bỏ</Text>
            </Pressable>

            <Pressable
              style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Sparkles size={16} color="#ffffff" />
                  <Text style={styles.submitBtnText}>
                    {isEditing ? 'Lưu Thay Đổi' : 'Tạo Hoạt Động Mới'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
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
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    display: 'flex',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  scrollInner: {
    paddingVertical: 16,
    gap: 14,
  },
  formGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  requiredStar: {
    color: '#ef4444',
  },
  textInput: {
    height: 44,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    paddingBottom: 10,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 11,
    color: '#64748b',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  previewCard: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 4,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9a3412',
    letterSpacing: 0.4,
  },
  previewBadge: {
    backgroundColor: '#ea580c',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  previewMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  previewMetricItem: {
    alignItems: 'center',
  },
  previewMetricLabel: {
    fontSize: 11,
    color: '#7c2d12',
    fontWeight: '600',
    marginBottom: 2,
  },
  previewMetricVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  previewMetricUnit: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#fed7aa',
  },
  previewFormulaNote: {
    fontSize: 10.5,
    color: '#9a3412',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  submitBtn: {
    flex: 2,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#0284c7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
