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
import { colors } from '@/theme/colors';
import { createCustomerPackage, deleteCustomerPackage, fetchCustomerPackages } from '@/services/customerService';
import type { CreatePackagePayload, PtPackage } from '@/types/domain';
import { DatePickerModal } from './DatePickerModal';

interface PtPackageModalProps {
  visible: boolean;
  customer: { id: string; fullName: string } | null;
  onClose: () => void;
}

const getTodayIso = (): string => new Date().toISOString().slice(0, 10);

const calculateEndDate = (startDateIso: string, sessionsCount: number): string => {
  if (!startDateIso || isNaN(Date.parse(startDateIso))) return '';
  const sessions = Number(sessionsCount) || 0;
  if (sessions <= 0) return '';
  // Chuẩn phòng gym: 12 buổi = 30 ngày (1 tháng), 24 buổi = 60 ngày...
  const durationDays = Math.max(30, Math.ceil(sessions / 12) * 30);
  const start = new Date(startDateIso);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays);
  return end.toISOString().slice(0, 10);
};

const formatDateDisplay = (isoStr?: string): string => {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export function PtPackageModal({ visible, customer, onClose }: PtPackageModalProps) {
  const [packages, setPackages] = useState<PtPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [totalSessions, setTotalSessions] = useState('24');
  const [startDate, setStartDate] = useState(getTodayIso());
  const [endDate, setEndDate] = useState(() => calculateEndDate(getTodayIso(), 24));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPackages = async () => {
    if (!customer?.id) return;
    try {
      setLoading(true);
      const data = await fetchCustomerPackages(customer.id);
      setPackages(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (visible && customer?.id) {
        setShowAddForm(false);
        setName('');
        setTotalSessions('24');
        const today = getTodayIso();
        setStartDate(today);
        setEndDate(calculateEndDate(today, 24));
        setFormError(null);
        void loadPackages();
      } else {
        setPackages([]);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [visible, customer?.id, loadPackages]);

  const handleApplyTemplate = (templateName: string, sessions: number) => {
    setName(templateName);
    setTotalSessions(String(sessions));
    setEndDate(calculateEndDate(startDate, sessions));
  };

  const handleChangeSessions = (val: string) => {
    const num = parseInt(val, 10) || 0;
    setTotalSessions(val);
    setEndDate(calculateEndDate(startDate, num));
  };

  const handleCreatePackage = async () => {
    if (!customer?.id) return;
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên gói PT.');
      return;
    }
    const sessions = parseInt(totalSessions, 10);
    if (!sessions || sessions < 1) {
      setFormError('Tổng số buổi phải lớn hơn 0.');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Vui lòng chọn ngày bắt đầu và kết thúc.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const payload: CreatePackagePayload = {
        name: name.trim(),
        totalSessions: sessions,
        startDate,
        endDate,
        status: 'ACTIVE',
      };
      await createCustomerPackage(customer.id, payload);
      setShowAddForm(false);
      setName('');
      await loadPackages();
    } catch (err: any) {
      setFormError(err?.message || 'Không thể thêm gói PT. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePackage = async (pkgId: string) => {
    if (!customer?.id) return;
    try {
      setDeletingId(pkgId);
      await deleteCustomerPackage(customer.id, pkgId);
      setPackages((prev) => prev.filter((p) => p._id !== pkgId));
    } catch {
      // Ignore
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { text: 'Hoạt động', color: '#16A34A', bg: '#DCFCE7' };
      case 'EXPIRED':
        return { text: 'Hết hạn', color: '#64748B', bg: '#F1F5F9' };
      case 'COMPLETED':
        return { text: 'Hoàn thành', color: '#0284C7', bg: '#E0F2FE' };
      case 'CANCELLED':
        return { text: 'Đã hủy', color: '#EF4444', bg: '#FEE2E2' };
      default:
        return { text: status, color: '#64748B', bg: '#F1F5F9' };
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Feather name="package" size={20} color="#0284C7" />
              </View>
              <View>
                <Text style={styles.title}>Gói PT đăng ký</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {customer?.fullName || 'Khách hàng'}
                </Text>
              </View>
            </View>

            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Action to Toggle Form */}
            <View style={styles.topActions}>
              <Pressable
                style={[
                  styles.toggleBtn,
                  showAddForm ? styles.toggleBtnActive : styles.toggleBtnInactive,
                ]}
                onPress={() => {
                  setShowAddForm(!showAddForm);
                  setFormError(null);
                }}
              >
                <Feather
                  name={showAddForm ? 'minus-circle' : 'plus-circle'}
                  size={16}
                  color={showAddForm ? '#64748B' : '#0284C7'}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    { color: showAddForm ? '#64748B' : '#0284C7' },
                  ]}
                >
                  {showAddForm ? 'Đóng tạo gói' : 'Đăng ký gói mới'}
                </Text>
              </Pressable>
            </View>

            {/* Form Thêm Gói Mới */}
            {showAddForm && (
              <View style={styles.formContainer}>
                <Text style={styles.formHeading}>Thông tin gói PT mới</Text>

                {formError ? (
                  <View style={styles.errorBox}>
                    <Feather name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{formError}</Text>
                  </View>
                ) : null}

                {/* Gợi ý mẫu nhanh */}
                <Text style={styles.fieldLabel}>Chọn mẫu nhanh:</Text>
                <View style={styles.templatesRow}>
                  <Pressable
                    style={styles.templatePill}
                    onPress={() => handleApplyTemplate('Gói Khởi Động 12 Buổi', 12)}
                  >
                    <Text style={styles.templatePillText}>12 buổi (1 th)</Text>
                  </Pressable>
                  <Pressable
                    style={styles.templatePill}
                    onPress={() => handleApplyTemplate('Gói Tăng Cơ 24 Buổi', 24)}
                  >
                    <Text style={styles.templatePillText}>24 buổi (2 th)</Text>
                  </Pressable>
                  <Pressable
                    style={styles.templatePill}
                    onPress={() => handleApplyTemplate('Gói Chuyên Sâu 36 Buổi', 36)}
                  >
                    <Text style={styles.templatePillText}>36 buổi (3 th)</Text>
                  </Pressable>
                </View>

                {/* Tên gói */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>
                    Tên gói PT <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: Gói Huấn Luyện 1-1 24 Buổi"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      if (formError) setFormError(null);
                    }}
                  />
                </View>

                {/* Số buổi */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>
                    Tổng số buổi <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ví dụ: 24"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={totalSessions}
                    onChangeText={handleChangeSessions}
                  />
                </View>

                {/* Ngày bắt đầu & kết thúc */}
                <View style={styles.rowFields}>
                  <View style={[styles.fieldWrap, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.fieldLabel}>Ngày bắt đầu</Text>
                    <Pressable
                      style={styles.datePickerTrigger}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Feather name="calendar" size={16} color="#0284C7" />
                      <Text style={styles.datePickerText}>
                        {formatDateDisplay(startDate)}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={[styles.fieldWrap, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Ngày kết thúc (dự kiến)</Text>
                    <View style={[styles.input, styles.readOnlyInput]}>
                      <Text style={styles.readOnlyText}>
                        {formatDateDisplay(endDate)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Nút lưu */}
                <Pressable
                  style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleCreatePackage}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.submitBtnText}>Lưu gói PT</Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* Danh sách gói hiện tại */}
            <Text style={styles.sectionTitle}>
              Danh sách gói ({packages.length})
            </Text>

            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.loadingText}>Đang tải danh sách gói...</Text>
              </View>
            ) : packages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Feather name="inbox" size={32} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Chưa đăng ký gói PT nào</Text>
                <Text style={styles.emptyDesc}>
                  Bấm &quot;Đăng ký gói mới&quot; ở trên để bắt đầu thêm gói tập cho khách hàng.
                </Text>
              </View>
            ) : (
              packages.map((pkg) => {
                const badge = getStatusBadge(pkg.status);
                const isDeleting = deletingId === pkg._id;
                const remaining = pkg.remainingSessions ?? pkg.totalSessions;

                return (
                  <View key={pkg._id} style={styles.packageCard}>
                    <View style={styles.packageCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.packageName}>{pkg.name}</Text>
                        <View style={styles.dateRow}>
                          <Feather name="calendar" size={12} color={colors.textMuted} />
                          <Text style={styles.dateText}>
                            {formatDateDisplay(pkg.startDate)} → {formatDateDisplay(pkg.endDate)}
                          </Text>
                        </View>
                      </View>

                      <View
                        style={[styles.statusBadge, { backgroundColor: badge.bg }]}
                      >
                        <Text style={[styles.statusText, { color: badge.color }]}>
                          {badge.text}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.packageCardDivider} />

                    <View style={styles.packageCardFooter}>
                      <View style={styles.sessionsInfo}>
                        <Feather name="check-circle" size={14} color="#0284C7" />
                        <Text style={styles.sessionsText}>
                          Còn <Text style={styles.sessionsHighlight}>{remaining}</Text> / {pkg.totalSessions} buổi
                        </Text>
                      </View>

                      <Pressable
                        style={styles.deletePkgBtn}
                        hitSlop={8}
                        onPress={() => handleDeletePackage(pkg._id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Feather name="trash-2" size={15} color="#EF4444" />
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Date Picker Modal for Start Date */}
          <DatePickerModal
            visible={showStartDatePicker}
            value={startDate}
            title="Chọn ngày bắt đầu"
            maxDate={null}
            onSelect={(iso) => {
              setStartDate(iso);
              const num = parseInt(totalSessions, 10) || 0;
              setEndDate(calculateEndDate(iso, num));
            }}
            onClose={() => setShowStartDatePicker(false)}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  topActions: {
    marginBottom: 14,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleBtnActive: {
    backgroundColor: colors.cardSecondary,
    borderColor: colors.border,
  },
  toggleBtnInactive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    padding: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    flex: 1,
  },
  templatesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  templatePill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#0284C7',
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  templatePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
  },
  fieldWrap: {
    marginBottom: 12,
  },
  rowFields: {
    flexDirection: 'row',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  readOnlyInput: {
    backgroundColor: colors.cardSecondary,
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  datePickerText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerLoading: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  packageCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  packageCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  packageName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  packageCardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  packageCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionsText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  sessionsHighlight: {
    fontWeight: '700',
    color: colors.text,
  },
  deletePkgBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
