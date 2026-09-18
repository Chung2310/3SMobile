import { PASSWORD_HINT } from '@/services/passwordValidation';
import React, { useRef, useState } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formPayload, resources, type AdminRecord } from '@/services/adminResources';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';

interface PtFormModalProps {
  visible: boolean;
  item: AdminRecord | null; // null => Thêm mới, object => Chỉnh sửa
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}

function PtFormModalInner({
  item,
  onClose,
  onSave,
}: {
  item: AdminRecord | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const editing = Boolean(item);
  const resource = resources.pts;

  // Form states initialized directly from props
  const [fullName, setFullName] = useState(() => String(item?.fullName || ''));
  const [username, setUsername] = useState(() => String(item?.username || ''));
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(() => String(item?.phone || ''));
  const [email, setEmail] = useState(() => String(item?.email || ''));
  const [specialization, setSpecialization] = useState(() => String(item?.specialization || ''));
  const [yearsOfExperience, setYearsOfExperience] = useState(() =>
    item?.yearsOfExperience !== undefined && item?.yearsOfExperience !== null
      ? String(item.yearsOfExperience)
      : ''
  );
  const [bio, setBio] = useState(() => String(item?.bio || ''));
  const [status, setStatus] = useState<'ACTIVE' | 'LOCKED'>(
    () => (item?.status as 'ACTIVE' | 'LOCKED') || 'ACTIVE'
  );

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [discardModal, setDiscardModal] = useState(false);
  const lock = useRef(false);

  const handleCloseAttempt = () => {
    if (lock.current || busy) return;
    if (dirty) {
      setDiscardModal(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (lock.current || busy) return;
    setError('');

    // Xây dựng map giá trị chuỗi gửi vào formPayload chuẩn của hệ thống
    const valuesMap: Record<string, string> = {
      fullName,
      username,
      password,
      phone,
      email,
      specialization,
      yearsOfExperience,
      bio,
      status,
    };

    try {
      const payload = formPayload(resource.fields || [], valuesMap, editing);
      lock.current = true;
      setBusy(true);
      await onSave(payload);
      onClose();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={handleCloseAttempt}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleCloseAttempt} />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
        >
          {/* Thanh kéo handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeftIconWrap}>
              <Ionicons
                name={editing ? 'person-circle' : 'person-add'}
                size={22}
                color={colors.primary}
              />
            </View>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.sheetTitle}>
                {editing ? 'Chỉnh sửa HLV' : 'Thêm huấn luyện viên mới'}
              </Text>
              <Text style={styles.sheetSub}>
                {editing
                  ? `Cập nhật thông tin cho @${item?.username}`
                  : 'Tạo tài khoản và phân quyền cho HLV'}
              </Text>
            </View>

            <Pressable
              onPress={handleCloseAttempt}
              style={styles.closeBtn}
              hitSlop={8}
              accessibilityLabel="Đóng popup"
            >
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          {/* Form Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.formScrollContent}
          >
            {/* Cảnh báo lỗi */}
            {error ? (
              <View style={styles.errorNotice}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorNoticeText}>{error}</Text>
              </View>
            ) : null}

            {/* NHÓM 1: THÔNG TIN TÀI KHOẢN */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>THÔNG TIN ĐĂNG NHẬP</Text>

              {/* Tên đăng nhập */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Tên đăng nhập (Username) <Text style={styles.reqStar}>*</Text>
                </Text>
                <TextInput
                  editable={!editing && !busy}
                  value={username}
                  onChangeText={(v) => {
                    setDirty(true);
                    setUsername(v);
                  }}
                  placeholder="Ví dụ: pt_namnguyen"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    editing && styles.inputDisabled,
                  ]}
                />
                {editing && (
                  <Text style={styles.helperText}>
                    Tên đăng nhập là định danh cố định không thể thay đổi
                  </Text>
                )}
              </View>

              {/* Mật khẩu */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  {editing ? 'Đổi mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu khởi tạo'}
                  {!editing && <Text style={styles.reqStar}> *</Text>}
                </Text>
                <View style={styles.passwordInputWrap}>
                  <TextInput
                    editable={!busy}
                    value={password}
                    onChangeText={(v) => {
                      setDirty(true);
                      setPassword(v);
                    }}
                    placeholder={editing ? 'Nhập mật khẩu mới (tối thiểu 8 ký tự)...' : 'Mật khẩu tối thiểu 8 ký tự'}
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    keyboardType="default"
                    autoCapitalize="none" autoCorrect={false}
                    style={styles.passwordInput}
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={8}
                    style={styles.eyeBtn}
                  >
                    <Feather
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={18}
                      color={colors.textMuted}
                    />
                  </Pressable>
                </View>
                <Text style={styles.helperText}>
                  {PASSWORD_HINT}
                </Text>
              </View>

              {/* Trạng thái tài khoản */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Trạng thái tài khoản</Text>
                <View style={styles.statusToggleRow}>
                  <Pressable
                    onPress={() => {
                      setDirty(true);
                      setStatus('ACTIVE');
                    }}
                    style={[
                      styles.statusToggleBtn,
                      status === 'ACTIVE' && styles.statusToggleActive,
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={status === 'ACTIVE' ? '#16A34A' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.statusToggleText,
                        status === 'ACTIVE' && styles.statusToggleTextActive,
                      ]}
                    >
                      Đang hoạt động
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setDirty(true);
                      setStatus('LOCKED');
                    }}
                    style={[
                      styles.statusToggleBtn,
                      status === 'LOCKED' && styles.statusToggleLocked,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={15}
                      color={status === 'LOCKED' ? '#EF4444' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.statusToggleText,
                        status === 'LOCKED' && styles.statusToggleTextLocked,
                      ]}
                    >
                      Khóa tài khoản
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* NHÓM 2: HỒ SƠ & LIÊN HỆ */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionHeading}>HỒ SƠ CÁ NHÂN & LIÊN HỆ</Text>

              {/* Họ và tên */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>
                  Họ và tên HLV <Text style={styles.reqStar}>*</Text>
                </Text>
                <TextInput
                  editable={!busy}
                  value={fullName}
                  onChangeText={(v) => {
                    setDirty(true);
                    setFullName(v);
                  }}
                  placeholder="Ví dụ: Nguyễn Văn Nam"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>

              {/* Số điện thoại & Email */}
              <View style={styles.twoColRow}>
                <View style={[styles.fieldWrap, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>
                    Số điện thoại <Text style={styles.reqStar}>*</Text>
                  </Text>
                  <TextInput
                    editable={!busy}
                    value={phone}
                    onChangeText={(v) => {
                      setDirty(true);
                      setPhone(v);
                    }}
                    placeholder="0912 345 678"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    style={styles.input}
                  />
                </View>

                <View style={[styles.fieldWrap, { flex: 1.2 }]}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <TextInput
                    editable={!busy}
                    value={email}
                    onChangeText={(v) => {
                      setDirty(true);
                      setEmail(v);
                    }}
                    placeholder="hlv@3sgym.vn"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Chuyên môn & Số năm kinh nghiệm */}
              <View style={styles.twoColRow}>
                <View style={[styles.fieldWrap, { flex: 1.4 }]}>
                  <Text style={styles.fieldLabel}>Chuyên môn đào tạo</Text>
                  <TextInput
                    editable={!busy}
                    value={specialization}
                    onChangeText={(v) => {
                      setDirty(true);
                      setSpecialization(v);
                    }}
                    placeholder="Tăng cơ, Giảm mỡ, Phục hồi..."
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                  />
                </View>

                <View style={[styles.fieldWrap, { flex: 0.8 }]}>
                  <Text style={styles.fieldLabel}>Số năm KN</Text>
                  <TextInput
                    editable={!busy}
                    value={yearsOfExperience}
                    onChangeText={(v) => {
                      setDirty(true);
                      setYearsOfExperience(v);
                    }}
                    placeholder="3"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Giới thiệu / Bio */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Giới thiệu / Tiểu sử HLV</Text>
                <TextInput
                  editable={!busy}
                  value={bio}
                  onChangeText={(v) => {
                    setDirty(true);
                    setBio(v);
                  }}
                  placeholder="Chứng chỉ HLV, thành tích thi đấu, triết lý huấn luyện..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.textArea]}
                />
              </View>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.sheetFooter}>
            <Pressable
              disabled={busy}
              onPress={handleCloseAttempt}
              style={({ pressed }) => [
                styles.cancelFooterBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.cancelFooterText}>Hủy bỏ</Text>
            </Pressable>

            <Pressable
              disabled={busy}
              onPress={() => void handleSubmit()}
              style={({ pressed }) => [
                styles.saveFooterBtn,
                pressed && styles.saveFooterBtnPressed,
                busy && { opacity: 0.6 },
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" />
                  <Text style={styles.saveFooterText}>
                    {editing ? 'Lưu thay đổi' : 'Tạo Huấn luyện viên'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Modal xác nhận bỏ thay đổi */}
        {discardModal && (
          <Modal
            visible={discardModal}
            transparent
            animationType="fade"
            onRequestClose={() => setDiscardModal(false)}
          >
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmBox}>
                <View style={styles.warningIconWrap}>
                  <Ionicons name="warning-outline" size={26} color="#F59E0B" />
                </View>
                <Text style={styles.confirmTitle}>Bỏ thay đổi chưa lưu?</Text>
                <Text style={styles.confirmMsg}>
                  Các thông tin HLV bạn vừa nhập sẽ không được lưu lại.
                </Text>
                <View style={styles.confirmBtnRow}>
                  <Pressable
                    onPress={() => setDiscardModal(false)}
                    style={styles.keepEditBtn}
                  >
                    <Text style={styles.keepEditText}>Tiếp tục sửa</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      setDiscardModal(false);
                      onClose();
                    }}
                    style={styles.discardBtn}
                  >
                    <Text style={styles.discardText}>Bỏ thay đổi</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function PtFormModal({
  visible,
  item,
  onClose,
  onSave,
}: PtFormModalProps) {
  if (!visible) return null;
  const itemKey = item ? String(item._id || item.id || item.username || 'edit') : 'new';
  return (
    <PtFormModalInner
      key={itemKey}
      item={item}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  headerLeftIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSub: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Scroll Content */
  formScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 16,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
  },
  errorNoticeText: {
    fontSize: 12.5,
    color: '#EF4444',
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },

  /* Section Blocks */
  sectionBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.6,
  },

  /* Field Rows */
  fieldWrap: {
    gap: 5,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  reqStar: {
    color: '#EF4444',
    fontWeight: '700',
  },
  input: {
    minHeight: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },

  /* Password Input Wrap */
  passwordInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },

  /* Status Toggle */
  statusToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  statusToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusToggleActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  statusToggleLocked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  statusToggleTextActive: {
    color: '#16A34A',
    fontWeight: '700',
  },
  statusToggleTextLocked: {
    color: '#EF4444',
    fontWeight: '700',
  },

  /* Footer */
  sheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 10,
  },
  cancelFooterBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelFooterText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
  saveFooterBtn: {
    flex: 1.8,
    flexDirection: 'row',
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveFooterBtnPressed: {
    backgroundColor: '#0369A1',
  },
  saveFooterText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Confirm Discard Overlay */
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  confirmBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  warningIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  confirmMsg: {
    fontSize: 12.5,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  keepEditBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  discardBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
