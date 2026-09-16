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
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type { CustomerProfile } from '@/types/domain';
import { createCustomer } from '@/services/customerService';

export interface QuickCustomerInitialData {
  fullName?: string | null;
  height?: number | null;
  initialWeight?: number | null;
}

export interface QuickAddCustomerModalProps {
  visible: boolean;
  initialData?: QuickCustomerInitialData;
  onClose: () => void;
  onCreated: (newCustomer: CustomerProfile) => void;
}

export function QuickAddCustomerModal({
  visible,
  initialData,
  onClose,
  onCreated,
}: QuickAddCustomerModalProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('OTHER');
  const [height, setHeight] = useState('');
  const [initialWeight, setInitialWeight] = useState('');
  const [initialGoal, setInitialGoal] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setFullName(initialData?.fullName?.trim() || '');
      setHeight(initialData?.height != null ? String(initialData.height) : '');
      setInitialWeight(initialData?.initialWeight != null ? String(initialData.initialWeight) : '');
      setPhone('');
      setGender('OTHER');
      setInitialGoal('');
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    const cleanName = fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên học viên (tối thiểu 2 ký tự).');
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại học viên.');
      return;
    }

    if (!/^[0-9+]{9,15}$/.test(cleanPhone)) {
      Alert.alert('Sai số điện thoại', 'Số điện thoại phải từ 9 đến 15 chữ số.');
      return;
    }

    const hNum = height.trim() ? Number(height) : undefined;
    if (hNum != null && (isNaN(hNum) || hNum <= 0)) {
      Alert.alert('Sai chiều cao', 'Chiều cao phải là số dương.');
      return;
    }

    const wNum = initialWeight.trim() ? Number(initialWeight) : undefined;
    if (wNum != null && (isNaN(wNum) || wNum <= 0)) {
      Alert.alert('Sai cân nặng', 'Cân nặng phải là số dương.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        fullName: cleanName,
        phone: cleanPhone,
        gender,
        status: 'ACTIVE' as const,
        height: hNum,
        initialWeight: wNum,
        initialGoal: initialGoal.trim() || undefined,
        internalNotes: 'Tạo nhanh từ phiếu đo InBody AI',
      };

      const created = await createCustomer(payload);
      Alert.alert('Thành công', `Đã thêm học viên "${created.fullName}" vào hệ thống!`);
      onCreated(created);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo học viên mới.';
      Alert.alert('Lỗi tạo học viên', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!loading) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="person-add" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Thêm nhanh học viên mới</Text>
                <Text style={styles.subTitle}>Tự động gán vào kết quả đo InBody</Text>
              </View>
            </View>
            <Pressable
              hitSlop={8}
              onPress={onClose}
              disabled={loading}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Form inputs */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Full Name */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Họ và tên <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Nguyễn Văn A"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            {/* Phone */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Số điện thoại <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: 0912345678"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Gender */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Giới tính</Text>
              <View style={styles.genderRow}>
                {(
                  [
                    { id: 'MALE', label: 'Nam' },
                    { id: 'FEMALE', label: 'Nữ' },
                    { id: 'OTHER', label: 'Khác' },
                  ] as const
                ).map((item) => {
                  const isSelected = gender === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.genderBtn, isSelected && styles.genderBtnActive]}
                      onPress={() => setGender(item.id)}
                    >
                      <Text
                        style={[
                          styles.genderBtnText,
                          isSelected && styles.genderBtnTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Height & Weight Row */}
            <View style={styles.twoColRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Chiều cao (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="170"
                  placeholderTextColor={colors.textMuted}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Cân nặng (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="65"
                  placeholderTextColor={colors.textMuted}
                  value={initialWeight}
                  onChangeText={setInitialWeight}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Initial Goal */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Mục tiêu ban đầu</Text>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: Giảm 3kg mỡ, tăng cơ nạc..."
                placeholderTextColor={colors.textMuted}
                value={initialGoal}
                onChangeText={setInitialGoal}
              />
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footerRow}>
            <Pressable
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>

            <Pressable
              style={[styles.saveBtn, loading && styles.btnDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Lưu & Gán Học Viên</Text>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 32 : spacing.md,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  subTitle: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryNavy,
    marginBottom: 4,
  },
  req: {
    color: colors.danger,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.text,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  genderBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  genderBtnText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  genderBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
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
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
