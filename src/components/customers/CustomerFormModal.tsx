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
import type { CreateCustomerPayload, CustomerProfile } from '@/types/domain';
import { createCustomer, updateCustomer } from '@/services/customerService';
import { DatePickerModal } from '../DatePickerModal';
import {
  CustomerFormState,
  CustomerListItem,
  formatDateDMY,
  initialCustomerFormState,
  parseDateInput,
} from './types';

interface CustomerFormModalProps {
  visible: boolean;
  editingCustomer: CustomerListItem | null;
  profileCustomers: CustomerProfile[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function CustomerFormModal({
  visible,
  editingCustomer,
  profileCustomers,
  onClose,
  onSuccess,
}: CustomerFormModalProps) {
  const [form, setForm] = useState<CustomerFormState>(initialCustomerFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      if (editingCustomer) {
        const profile =
          profileCustomers.find((p) => p._id === editingCustomer.id) ||
          editingCustomer.rawProfile;
        setForm({
          fullName: editingCustomer.fullName,
          dateOfBirth: formatDateDMY(profile?.dateOfBirth),
          gender: profile?.gender || 'OTHER',
          phone: editingCustomer.phone,
          email: profile?.email || editingCustomer.email || '',
          height: profile?.height != null ? String(profile.height) : '',
          initialWeight:
            profile?.initialWeight != null ? String(profile.initialWeight) : '',
          medicalNotes: profile?.medicalNotes || '',
          initialGoal: editingCustomer.initialGoal || profile?.initialGoal || '',
          internalNotes: profile?.internalNotes || '',
          status: (profile?.status || editingCustomer.status || 'ACTIVE') as
            | 'ACTIVE'
            | 'LEAD'
            | 'INACTIVE',
        });
      } else {
        setForm(initialCustomerFormState);
      }
      setFormError(null);
    }
  }, [visible, editingCustomer, profileCustomers]);

  const handleFormChange = (key: keyof CustomerFormState, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formError) setFormError(null);
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim()) {
      setFormError('Vui lòng nhập họ và tên khách hàng.');
      return;
    }
    if (!form.phone.trim()) {
      setFormError('Vui lòng nhập số điện thoại liên hệ.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const payload: CreateCustomerPayload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        dateOfBirth: parseDateInput(form.dateOfBirth),
        gender: form.gender,
        height: form.height ? Number(form.height) : null,
        initialWeight: form.initialWeight ? Number(form.initialWeight) : null,
        medicalNotes: form.medicalNotes.trim(),
        initialGoal: form.initialGoal.trim(),
        internalNotes: form.internalNotes.trim(),
        status: form.status,
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
        onSuccess('Cập nhật thông tin khách hàng thành công!');
      } else {
        await createCustomer(payload);
        onSuccess('Tạo khách hàng thành công!');
      }

      onClose();
    } catch (err: any) {
      setFormError(
        err?.message || 'Không thể lưu thông tin khách hàng. Vui lòng kiểm tra lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View style={[styles.modalCard, { maxHeight: '90%' }]}>
          {/* Header Modal */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.modalCloseBtn}
            >
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Nội dung form cuộn */}
          <ScrollView
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formScrollContent}
          >
            {/* Lỗi nếu có */}
            {formError ? (
              <View style={styles.formErrorWrap}>
                <Feather name="alert-triangle" size={16} color="#EF4444" />
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            {/* SECTION 1: THÔNG TIN CÁ NHÂN */}
            <Text style={styles.formSectionHeading}>Thông tin cá nhân</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                Họ tên <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                value={form.fullName}
                onChangeText={(t) => handleFormChange('fullName', t)}
                placeholder="Nhập họ và tên khách hàng..."
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldWrap, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>Ngày sinh</Text>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={styles.datePickerBtn}
                >
                  <Feather
                    name="calendar"
                    size={16}
                    color={form.dateOfBirth ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.datePickerBtnText,
                      !form.dateOfBirth && styles.datePickerBtnTextPlaceholder,
                    ]}
                  >
                    {form.dateOfBirth || 'dd/mm/yyyy'}
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.fieldWrap, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.fieldLabel}>Giới tính</Text>
                <View style={styles.pillGroup}>
                  <Pressable
                    onPress={() => handleFormChange('gender', 'OTHER')}
                    style={[styles.pillOption, form.gender === 'OTHER' && styles.pillOptionActive]}
                  >
                    <Text style={[styles.pillOptionText, form.gender === 'OTHER' && styles.pillOptionTextActive]}>
                      Khác
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleFormChange('gender', 'MALE')}
                    style={[styles.pillOption, form.gender === 'MALE' && styles.pillOptionActive]}
                  >
                    <Text style={[styles.pillOptionText, form.gender === 'MALE' && styles.pillOptionTextActive]}>
                      Nam
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleFormChange('gender', 'FEMALE')}
                    style={[styles.pillOption, form.gender === 'FEMALE' && styles.pillOptionActive]}
                  >
                    <Text style={[styles.pillOptionText, form.gender === 'FEMALE' && styles.pillOptionTextActive]}>
                      Nữ
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* SECTION 2: LIÊN HỆ */}
            <Text style={styles.formSectionHeading}>Liên hệ</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>
                Số điện thoại <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                value={form.phone}
                onChangeText={(t) => handleFormChange('phone', t)}
                placeholder="Nhập số điện thoại (ví dụ: 0912345678)..."
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={styles.textInput}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                value={form.email}
                onChangeText={(t) => handleFormChange('email', t)}
                placeholder="Nhập email (ví dụ: khachhang@example.com)..."
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.textInput}
              />
            </View>

            {/* SECTION 3: CHỈ SỐ VÀ SỨC KHỎE */}
            <Text style={styles.formSectionHeading}>Chỉ số và sức khỏe</Text>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldWrap, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>Chiều cao (cm)</Text>
                <TextInput
                  value={form.height}
                  onChangeText={(t) => handleFormChange('height', t)}
                  placeholder="Ví dụ: 172.5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={styles.textInput}
                />
              </View>

              <View style={[styles.fieldWrap, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.fieldLabel}>Cân nặng ban đầu (kg)</Text>
                <TextInput
                  value={form.initialWeight}
                  onChangeText={(t) => handleFormChange('initialWeight', t)}
                  placeholder="Ví dụ: 68.0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  style={styles.textInput}
                />
              </View>
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Lưu ý sức khỏe</Text>
              <TextInput
                value={form.medicalNotes}
                onChangeText={(t) => handleFormChange('medicalNotes', t)}
                placeholder="Nhập tiền sử bệnh lý, chấn thương hoặc lưu ý sức khỏe đặc biệt..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.textInput, styles.textArea]}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Mục tiêu ban đầu</Text>
              <TextInput
                value={form.initialGoal}
                onChangeText={(t) => handleFormChange('initialGoal', t)}
                placeholder="Ví dụ: Giảm 5kg mỡ, tăng cơ mông đùi..."
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
              />
            </View>

            {/* SECTION 4: QUẢN LÝ */}
            <Text style={styles.formSectionHeading}>Quản lý</Text>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Ghi chú nội bộ</Text>
              <TextInput
                value={form.internalNotes}
                onChangeText={(t) => handleFormChange('internalNotes', t)}
                placeholder="Nhập ghi chú nội bộ của PT dành cho khách hàng..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.textInput, styles.textArea]}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Trạng thái</Text>
              <View style={styles.statusPillGroup}>
                <Pressable
                  onPress={() => handleFormChange('status', 'ACTIVE')}
                  style={[styles.statusOption, form.status === 'ACTIVE' && styles.statusOptionActive]}
                >
                  <Text style={[styles.statusOptionText, form.status === 'ACTIVE' && styles.statusOptionTextActive]}>
                    Đang hoạt động
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleFormChange('status', 'LEAD')}
                  style={[styles.statusOption, form.status === 'LEAD' && styles.statusOptionActive]}
                >
                  <Text style={[styles.statusOptionText, form.status === 'LEAD' && styles.statusOptionTextActive]}>
                    Tiềm năng
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => handleFormChange('status', 'INACTIVE')}
                  style={[styles.statusOption, form.status === 'INACTIVE' && styles.statusOptionActive]}
                >
                  <Text style={[styles.statusOptionText, form.status === 'INACTIVE' && styles.statusOptionTextActive]}>
                    Ngừng hoạt động
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.modalFooter}>
            <Pressable
              onPress={onClose}
              disabled={submitting}
              style={({ pressed }) => [styles.btnCancel, pressed && styles.btnCancelPressed]}
            >
              <Text style={styles.btnCancelText}>Hủy</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.btnSubmit,
                pressed && styles.btnSubmitPressed,
                submitting && { opacity: 0.7 },
              ]}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnSubmitText}>
                  {editingCustomer ? 'Lưu thay đổi' : 'Tạo khách hàng'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* MODAL CHỌN NGÀY SINH TỪ LỊCH */}
      <DatePickerModal
        visible={showDatePicker}
        value={form.dateOfBirth}
        title="Chọn ngày sinh"
        onClose={() => setShowDatePicker(false)}
        onSelect={(_iso, displayDate) => {
          handleFormChange('dateOfBirth', displayDate);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  formErrorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  formErrorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
    fontWeight: '500',
  },
  formSectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  fieldWrap: {
    marginBottom: spacing.md,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  datePickerBtnText: {
    fontSize: 14,
    color: colors.text,
  },
  datePickerBtnTextPlaceholder: {
    color: colors.textMuted,
  },
  pillGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  pillOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOptionActive: {
    backgroundColor: '#00C2FF',
    borderColor: '#00C2FF',
  },
  pillOptionText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  pillOptionTextActive: {
    color: '#FFFFFF',
  },
  statusPillGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionActive: {
    backgroundColor: '#00C2FF',
    borderColor: '#00C2FF',
  },
  statusOptionText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelPressed: {
    backgroundColor: '#E2E8F0',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  btnSubmit: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: '#00C2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C2FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  btnSubmitPressed: {
    backgroundColor: '#0098CC',
  },
  btnSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
