import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import type { CustomerProfile } from '@/types/domain';

interface CustomerDetailModalProps {
  visible: boolean;
  customer: {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
    initialGoal?: string;
    measurementCount?: number;
    status: string;
    rawProfile?: CustomerProfile | null;
  } | null;
  onClose: () => void;
  onEdit?: () => void;
  onManagePackages?: () => void;
}

const formatDateDisplay = (isoStr?: string | null): string => {
  if (!isoStr) return 'Chưa cập nhật';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getGenderText = (gender?: string): string => {
  if (gender === 'MALE') return 'Nam';
  if (gender === 'FEMALE') return 'Nữ';
  if (gender === 'OTHER') return 'Khác';
  return 'Chưa cập nhật';
};

const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'ACTIVE':
      return { text: 'Đang hoạt động', color: '#16A34A', bg: '#DCFCE7' };
    case 'INACTIVE':
      return { text: 'Ngừng hoạt động', color: '#64748B', bg: '#F1F5F9' };
    case 'LEAD':
      return { text: 'Tiềm năng', color: '#D97706', bg: '#FEF3C7' };
    default:
      return { text: status || 'Hoạt động', color: '#16A34A', bg: '#DCFCE7' };
  }
};

export function CustomerDetailModal({
  visible,
  customer,
  onClose,
  onEdit,
  onManagePackages,
}: CustomerDetailModalProps) {
  if (!customer) return null;

  const profile = customer.rawProfile;
  const badge = getStatusBadge(customer.status || profile?.status);

  // Tính BMI nếu có height và weight
  const heightM = (profile?.height || 0) / 100;
  const weightKg = profile?.initialWeight || 0;
  const bmi = heightM > 0 && weightKg > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {customer.fullName.trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fullName}>{customer.fullName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.statusText, { color: badge.color }]}>
                    {badge.text}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.scrollContent}
          >
            {/* THÔNG TIN LIÊN HỆ */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
              <View style={styles.infoRow}>
                <Feather name="phone" size={15} color="#00C2FF" />
                <Text style={styles.infoLabel}>Số điện thoại:</Text>
                <Text style={styles.infoValue}>{customer.phone || 'Chưa cập nhật'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Feather name="mail" size={15} color="#00C2FF" />
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{customer.email || profile?.email || 'Chưa cập nhật'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Feather name="calendar" size={15} color="#00C2FF" />
                <Text style={styles.infoLabel}>Ngày sinh:</Text>
                <Text style={styles.infoValue}>{formatDateDisplay(profile?.dateOfBirth)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Feather name="user" size={15} color="#00C2FF" />
                <Text style={styles.infoLabel}>Giới tính:</Text>
                <Text style={styles.infoValue}>{getGenderText(profile?.gender)}</Text>
              </View>
            </View>

            {/* CHỈ SỐ VÀ SỨC KHỎE */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chỉ số & Sức khỏe</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Chiều cao</Text>
                  <Text style={styles.statValue}>
                    {profile?.height ? `${profile.height} cm` : '—'}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Cân nặng đầu</Text>
                  <Text style={styles.statValue}>
                    {profile?.initialWeight ? `${profile.initialWeight} kg` : '—'}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>BMI ban đầu</Text>
                  <Text style={styles.statValue}>{bmi || '—'}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Phiếu InBody</Text>
                  <Text style={styles.statValue}>{customer.measurementCount || 0}</Text>
                </View>
              </View>

              {customer.initialGoal || profile?.initialGoal ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteBoxTitle}>Mục tiêu ban đầu</Text>
                  <Text style={styles.noteBoxContent}>
                    {customer.initialGoal || profile?.initialGoal}
                  </Text>
                </View>
              ) : null}

              {profile?.medicalNotes ? (
                <View style={[styles.noteBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <Text style={[styles.noteBoxTitle, { color: '#B91C1C' }]}>Lưu ý sức khỏe / Tiền sử</Text>
                  <Text style={[styles.noteBoxContent, { color: '#991B1B' }]}>
                    {profile.medicalNotes}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* GHI CHÚ NỘI BỘ */}
            {profile?.internalNotes ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ghi chú nội bộ</Text>
                <View style={styles.noteBox}>
                  <Text style={styles.noteBoxContent}>{profile.internalNotes}</Text>
                </View>
              </View>
            ) : null}

            {/* QUICK ACTIONS */}
            <View style={styles.actionButtonsRow}>
              {onManagePackages && (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }]}
                  onPress={() => {
                    onClose();
                    onManagePackages();
                  }}
                >
                  <Feather name="package" size={16} color="#7C3AED" />
                  <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>Quản lý gói PT</Text>
                </Pressable>
              )}

              {onEdit && (
                <Pressable
                  style={[styles.actionBtn, { backgroundColor: '#E6F8FF', borderColor: '#00C2FF' }]}
                  onPress={() => {
                    onClose();
                    onEdit();
                  }}
                >
                  <Feather name="edit-2" size={16} color="#0098CC" />
                  <Text style={[styles.actionBtnText, { color: '#0098CC' }]}>Chỉnh sửa</Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00C2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fullName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
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
    padding: 18,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textMuted,
    width: 105,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.cardSecondary,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  noteBox: {
    backgroundColor: colors.cardSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  noteBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  noteBoxContent: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
