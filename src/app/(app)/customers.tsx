import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MASCOT_SEARCH = require('../../../assets/public/3s-search.png');

import { Card, EmptyState, Row, SectionHeader } from '@/components/UI';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { CustomerDetailModal } from '@/components/CustomerDetailModal';
import { DatePickerModal } from '@/components/DatePickerModal';
import { PtPackageModal } from '@/components/PtPackageModal';
import {
  createCustomer,
  deleteCustomer,
  fetchCustomersList,
  updateCustomer,
} from '@/services/customerService';
import { fetchPtDashboard } from '@/services/dashboardService';
import { colors, radius, spacing, typography } from '@/theme';
import type {
  CreateCustomerPayload,
  CustomerProfile,
  ProgressCategory,
  PtCustomerSummary,
} from '@/types/domain';

type StatusFilter = 'ALL' | 'ACTIVE' | 'LEAD' | 'INACTIVE';

interface CustomerListItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  initialGoal: string;
  score: number | null;
  measurementCount: number;
  progressCategory: ProgressCategory;
  status: 'ACTIVE' | 'LEAD' | 'INACTIVE';
  rawProfile: CustomerProfile | null;
}

interface CustomerFormState {
  fullName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  email: string;
  height: string;
  initialWeight: string;
  medicalNotes: string;
  initialGoal: string;
  internalNotes: string;
  status: 'ACTIVE' | 'LEAD' | 'INACTIVE';
}

const initialFormState: CustomerFormState = {
  fullName: '',
  dateOfBirth: '',
  gender: 'OTHER',
  phone: '',
  email: '',
  height: '',
  initialWeight: '',
  medicalNotes: '',
  initialGoal: '',
  internalNotes: '',
  status: 'ACTIVE',
};

function parseDateInput(str: string): string | null {
  const trimmed = str.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(/[/.-]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${year}-${month}-${day}`;
  }
  return trimmed;
}

function formatDateDMY(isoStr?: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();

  const [customers, setCustomers] = useState<PtCustomerSummary[]>([]);
  const [profileCustomers, setProfileCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  // Modal thêm / sửa khách hàng & chọn ngày sinh
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState<CustomerFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal chi tiết hồ sơ khách hàng
  const [detailCustomer, setDetailCustomer] = useState<CustomerListItem | null>(null);

  // Modal quản lý gói PT
  const [packageCustomer, setPackageCustomer] = useState<{ id: string; fullName: string } | null>(null);

  // Modal xác nhận xóa khách hàng
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerListItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [dashData, listData] = await Promise.all([
        fetchPtDashboard().catch(() => null),
        fetchCustomersList().catch(() => []),
      ]);

      if (dashData?.customers?.length) {
        setCustomers(dashData.customers);
      }
      setProfileCustomers(listData || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  // Kết hợp danh sách hiển thị
  // Ưu tiên hiển thị danh sách profile kết hợp thông tin dashboard
  const allList: CustomerListItem[] = profileCustomers.length
    ? profileCustomers.map((p) => {
        const dash = customers.find((c) => c.customerId === p._id);
        return {
          id: p._id,
          fullName: p.fullName,
          phone: p.phone || dash?.phone || '',
          email: p.email || '',
          initialGoal: p.initialGoal || dash?.initialGoal || '',
          score: dash?.score ?? null,
          measurementCount: dash?.measurementCount ?? 0,
          progressCategory: dash?.progressCategory ?? 'GOOD',
          status: (p.status || 'ACTIVE') as any,
          rawProfile: p,
        };
      })
    : customers.map((c) => ({
        id: c.customerId,
        fullName: c.fullName,
        phone: c.phone || '',
        email: '',
        initialGoal: c.initialGoal || '',
        score: c.score ?? null,
        measurementCount: c.measurementCount,
        progressCategory: c.progressCategory,
        status: 'ACTIVE' as const,
        rawProfile: null,
      }));

  const filtered = allList.filter((c) => {
    // Filter trạng thái
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;

    // Filter tìm kiếm
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.initialGoal && c.initialGoal.toLowerCase().includes(q))
    );
  });

  const activeCount = allList.filter((c) => c.status === 'ACTIVE').length;
  const leadCount = allList.filter((c) => c.status === 'LEAD').length;
  const inactiveCount = allList.filter((c) => c.status === 'INACTIVE').length;

  function getStatusFilterLabel(status: StatusFilter) {
    switch (status) {
      case 'ACTIVE':
        return 'Đang hoạt động';
      case 'LEAD':
        return 'Tiềm năng';
      case 'INACTIVE':
        return 'Ngừng hoạt động';
      default:
        return 'Tất cả';
    }
  }

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setForm(initialFormState);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleEditCustomer = (item: CustomerListItem) => {
    const profile = profileCustomers.find((p) => p._id === item.id) || item.rawProfile;
    setEditingCustomer(item);
    setForm({
      fullName: item.fullName,
      dateOfBirth: formatDateDMY(profile?.dateOfBirth),
      gender: profile?.gender || 'OTHER',
      phone: item.phone,
      email: profile?.email || item.email || '',
      height: profile?.height != null ? String(profile.height) : '',
      initialWeight: profile?.initialWeight != null ? String(profile.initialWeight) : '',
      medicalNotes: profile?.medicalNotes || '',
      initialGoal: item.initialGoal || profile?.initialGoal || '',
      internalNotes: profile?.internalNotes || '',
      status: (profile?.status || item.status || 'ACTIVE') as 'ACTIVE' | 'LEAD' | 'INACTIVE',
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    if (submitting) return;
    setShowAddModal(false);
    setEditingCustomer(null);
    setFormError(null);
  };

  const handleFormChange = (key: keyof CustomerFormState, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (formError) setFormError(null);
  };

  const handleSubmitCustomer = async () => {
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
        setShowAddModal(false);
        setEditingCustomer(null);
        setForm(initialFormState);
        setToastMessage('Cập nhật thông tin khách hàng thành công!');
      } else {
        await createCustomer(payload);
        setShowAddModal(false);
        setForm(initialFormState);
        setToastMessage('Tạo khách hàng thành công!');
      }

      setTimeout(() => setToastMessage(null), 3000);

      // Tải lại danh sách
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Không thể lưu thông tin khách hàng. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    try {
      setDeleteLoading(true);
      await deleteCustomer(deletingCustomer.id);
      setDeletingCustomer(null);
      setToastMessage('Đã xóa khách hàng thành công!');
      setTimeout(() => setToastMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      setToastMessage(err?.message || 'Không thể xóa khách hàng. Vui lòng thử lại.');
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setDeleteLoading(false);
    }
  };

  function getBadgeColor(category?: string) {
    if (category === 'GOOD') return '#22C55E';
    if (category === 'SLOW') return '#F59E0B';
    if (category === 'POOR') return '#EF4444';
    return colors.textMuted;
  }

  function getCategoryText(category?: string) {
    if (category === 'GOOD') return 'Tiến bộ tốt';
    if (category === 'SLOW') return 'Tiến bộ chậm';
    if (category === 'POOR') return 'Cần cải thiện';
    return 'Chưa đánh giá';
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* 1. TOP BAR */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.navigate('/(app)/(tabs)')}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          accessibilityLabel="Quay lại"
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={styles.pageTitle}>Khách hàng của tôi</Text>
          <Text style={styles.pageSubtitle}>
            {allList.length} khách hàng đang quản lý
          </Text>
        </View>

        {/* Nút thêm mới - Bo tròn hoàn hảo */}
        <Pressable
          onPress={handleOpenAddModal}
          style={({ pressed }) => [styles.addHeaderBtn, pressed && styles.addHeaderBtnPressed]}
          hitSlop={8}
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Thông báo nổi (Toast) */}
      {toastMessage ? (
        <View style={styles.toastWrap}>
          <Feather name="check-circle" size={16} color="#22C55E" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
      >
        {/* 2. SEARCH BOX */}
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color="#00C2FF" style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm theo tên, số điện thoại, mục tiêu..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          {search ? (
            <Feather
              name="x"
              size={18}
              color={colors.textMuted}
              onPress={() => setSearch('')}
            />
          ) : null}
        </View>

        {/* 3. BỘ LỌC TRẠNG THÁI (NÚT FILTER MỞ BOTTOM SHEET) */}
        <View style={styles.filterTriggerRow}>
          <Pressable
            style={({ pressed }) => [
              styles.filterTriggerBtn,
              statusFilter !== 'ALL' && styles.filterTriggerBtnActive,
              pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] },
            ]}
            onPress={() => setShowStatusSheet(true)}
            hitSlop={6}
          >
            <Feather
              name="filter"
              size={14}
              color={statusFilter !== 'ALL' ? '#0098CC' : '#4B5563'}
            />
            <Text
              style={[
                styles.filterTriggerText,
                statusFilter !== 'ALL' && styles.filterTriggerTextActive,
              ]}
            >
              {getStatusFilterLabel(statusFilter)} ({filtered.length})
            </Text>
            <Feather
              name="chevron-down"
              size={14}
              color={statusFilter !== 'ALL' ? '#0098CC' : '#9CA3AF'}
            />
          </Pressable>
        </View>

        <SectionHeader title={`Danh sách (${filtered.length})`} />

        {/* 4. DANH SÁCH THẺ KHÁCH HÀNG (TỐI ƯU COMPACT MOBILE) */}
        {filtered.length ? (
          filtered.map((item) => (
            <View key={item.id} style={styles.customerCard}>
              {/* TOP ROW: Avatar + Tên + Badge trạng thái + Meta */}
              <Pressable
                style={({ pressed }) => [
                  styles.cardMainRow,
                  pressed && { opacity: 0.72, transform: [{ scale: 0.99 }] },
                ]}
                onPress={() => setDetailCustomer(item)}
              >
                <View style={styles.avatarMini}>
                  <Text style={styles.avatarMiniText}>
                    {item.fullName.trim().charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.customerInfoWrap}>
                  <View style={styles.nameRow}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {item.fullName}
                    </Text>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: `${getBadgeColor(item.progressCategory)}18` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          { color: getBadgeColor(item.progressCategory) },
                        ]}
                      >
                        {getCategoryText(item.progressCategory)}
                      </Text>
                    </View>
                  </View>

                  {/* SĐT & Số phiếu InBody gọn gàng trên 1 hàng */}
                  <View style={styles.metaRow}>
                    {item.phone ? (
                      <Text style={styles.phoneTextCompact}>{item.phone}</Text>
                    ) : null}
                    {item.phone ? <Text style={styles.metaDot}>•</Text> : null}
                    <Text style={styles.inbodyCountText}>
                      {item.measurementCount || 0} phiếu InBody
                    </Text>
                  </View>

                  {/* Mục tiêu rút gọn 1 dòng */}
                  {item.initialGoal ? (
                    <Text style={styles.goalTextCompact} numberOfLines={1}>
                      Mục tiêu: {item.initialGoal}
                    </Text>
                  ) : null}
                </View>
              </Pressable>

              {/* BOTTOM ROW: 4 NÚT THAO TÁC (GÓI PT -> HỒ SƠ -> SỬA -> XÓA) */}
              <View style={styles.cardActionsCompact}>
                {/* 1. Gói PT - có text, chiếm nhiều không gian hơn */}
                <Pressable
                  style={({ pressed }) => [
                    styles.ptPackageBtn,
                    pressed && styles.ptPackageBtnPressed,
                  ]}
                  onPress={() => setPackageCustomer({ id: item.id, fullName: item.fullName })}
                  hitSlop={4}
                  accessibilityLabel="Quản lý gói PT"
                >
                  <Feather name="package" size={13} color="#7C3AED" />
                  <Text style={styles.ptPackageBtnText}>Gói PT</Text>
                </Pressable>

                <View style={styles.actionDivider} />

                {/* 2. Hồ sơ (Con mắt) */}
                <Pressable
                  style={({ pressed }) => [
                    styles.compactActionBtn,
                    pressed && styles.actionBtnPressed,
                  ]}
                  onPress={() => setDetailCustomer(item)}
                  hitSlop={8}
                  accessibilityLabel="Xem chi tiết hồ sơ"
                >
                  <Feather name="eye" size={16} color="#00C2FF" />
                </Pressable>

                <View style={styles.actionDivider} />

                {/* 3. Sửa */}
                <Pressable
                  style={({ pressed }) => [
                    styles.compactActionBtn,
                    pressed && styles.actionBtnPressed,
                  ]}
                  onPress={() => handleEditCustomer(item)}
                  hitSlop={8}
                  accessibilityLabel="Chỉnh sửa thông tin"
                >
                  <Feather name="edit-2" size={15} color="#475569" />
                </Pressable>

                <View style={styles.actionDivider} />

                {/* 4. Xóa */}
                <Pressable
                  style={({ pressed }) => [
                    styles.compactActionBtn,
                    pressed && styles.actionBtnPressed,
                  ]}
                  onPress={() => setDeletingCustomer(item)}
                  hitSlop={8}
                  accessibilityLabel="Xóa khách hàng"
                >
                  <Feather name="trash-2" size={15} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptySearchWrap}>
            <Image
              source={MASCOT_SEARCH}
              style={styles.emptySearchImg}
              resizeMode="contain"
            />
            <Text style={styles.emptySearchText}>Không tìm thấy khách hàng mà bạn cần tìm</Text>
          </View>
        )}
      </ScrollView>

      {/* 5. MODAL THÊM / SỬA KHÁCH HÀNG */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={handleCloseAddModal}
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
                onPress={handleCloseAddModal}
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
                onPress={handleCloseAddModal}
                disabled={submitting}
                style={({ pressed }) => [styles.btnCancel, pressed && styles.btnCancelPressed]}
              >
                <Text style={styles.btnCancelText}>Hủy</Text>
              </Pressable>

              <Pressable
                onPress={handleSubmitCustomer}
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
      </Modal>

      {/* 6. MODAL CHỌN NGÀY SINH TỪ LỊCH (THEO UI-RULE 5C) */}
      <DatePickerModal
        visible={showDatePicker}
        value={form.dateOfBirth}
        title="Chọn ngày sinh"
        onClose={() => setShowDatePicker(false)}
        onSelect={(_iso, displayDate) => {
          handleFormChange('dateOfBirth', displayDate);
        }}
      />

      {/* 7. MODAL CHI TIẾT HỒ SƠ KHÁCH HÀNG */}
      <CustomerDetailModal
        visible={Boolean(detailCustomer)}
        customer={detailCustomer}
        onClose={() => setDetailCustomer(null)}
        onEdit={() => {
          if (detailCustomer) handleEditCustomer(detailCustomer);
        }}
        onManagePackages={() => {
          if (detailCustomer) {
            setPackageCustomer({ id: detailCustomer.id, fullName: detailCustomer.fullName });
          }
        }}
      />

      {/* 8. MODAL QUẢN LÝ GÓI PT (GÓI MÀ KH ĐĂNG KÍ) */}
      <PtPackageModal
        visible={Boolean(packageCustomer)}
        customer={packageCustomer}
        onClose={() => setPackageCustomer(null)}
      />

      {/* 9. MODAL XÁC NHẬN XÓA KHÁCH HÀNG */}
      <ConfirmDeleteModal
        visible={Boolean(deletingCustomer)}
        title="Xóa khách hàng?"
        message={`Bạn có chắc chắn muốn xóa khách hàng "${deletingCustomer?.fullName}"? Toàn bộ dữ liệu hồ sơ sẽ bị xóa vĩnh viễn và không thể khôi phục.`}
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Hủy"
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingCustomer(null)}
      />

      {/* 10. BOTTOM SHEET LỌC THEO TRẠNG THÁI KHÁCH HÀNG */}
      <Modal
        visible={showStatusSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowStatusSheet(false)}
          />
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Trạng thái khách hàng</Text>
              <Pressable
                onPress={() => setShowStatusSheet(false)}
                hitSlop={10}
                style={({ pressed }) => [styles.sheetCloseBtn, pressed && { opacity: 0.7 }]}
              >
                <Feather name="x" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={styles.sheetOptionsList}>
              {/* Tất cả */}
              <Pressable
                style={({ pressed }) => [
                  styles.sheetOptionItem,
                  statusFilter === 'ALL' && styles.sheetOptionItemActive,
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => {
                  setStatusFilter('ALL');
                  setShowStatusSheet(false);
                }}
              >
                <View style={styles.sheetOptionLeft}>
                  <View style={[styles.sheetDot, { backgroundColor: '#0284C7' }]} />
                  <Text
                    style={[
                      styles.sheetOptionText,
                      statusFilter === 'ALL' && styles.sheetOptionTextActive,
                    ]}
                  >
                    Tất cả ({allList.length})
                  </Text>
                </View>
                {statusFilter === 'ALL' ? (
                  <Feather name="check" size={18} color="#0284C7" />
                ) : null}
              </Pressable>

              {/* Đang hoạt động */}
              <Pressable
                style={({ pressed }) => [
                  styles.sheetOptionItem,
                  statusFilter === 'ACTIVE' && styles.sheetOptionItemActive,
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => {
                  setStatusFilter('ACTIVE');
                  setShowStatusSheet(false);
                }}
              >
                <View style={styles.sheetOptionLeft}>
                  <View style={[styles.sheetDot, { backgroundColor: '#22C55E' }]} />
                  <Text
                    style={[
                      styles.sheetOptionText,
                      statusFilter === 'ACTIVE' && styles.sheetOptionTextActive,
                    ]}
                  >
                    Đang hoạt động ({activeCount})
                  </Text>
                </View>
                {statusFilter === 'ACTIVE' ? (
                  <Feather name="check" size={18} color="#00C2FF" />
                ) : null}
              </Pressable>

              {/* Tiềm năng */}
              <Pressable
                style={({ pressed }) => [
                  styles.sheetOptionItem,
                  statusFilter === 'LEAD' && styles.sheetOptionItemActive,
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => {
                  setStatusFilter('LEAD');
                  setShowStatusSheet(false);
                }}
              >
                <View style={styles.sheetOptionLeft}>
                  <View style={[styles.sheetDot, { backgroundColor: '#F59E0B' }]} />
                  <Text
                    style={[
                      styles.sheetOptionText,
                      statusFilter === 'LEAD' && styles.sheetOptionTextActive,
                    ]}
                  >
                    Tiềm năng ({leadCount})
                  </Text>
                </View>
                {statusFilter === 'LEAD' ? (
                  <Feather name="check" size={18} color="#00C2FF" />
                ) : null}
              </Pressable>

              {/* Ngừng hoạt động */}
              <Pressable
                style={({ pressed }) => [
                  styles.sheetOptionItem,
                  statusFilter === 'INACTIVE' && styles.sheetOptionItemActive,
                  pressed && { opacity: 0.75 },
                ]}
                onPress={() => {
                  setStatusFilter('INACTIVE');
                  setShowStatusSheet(false);
                }}
              >
                <View style={styles.sheetOptionLeft}>
                  <View style={[styles.sheetDot, { backgroundColor: '#6B7280' }]} />
                  <Text
                    style={[
                      styles.sheetOptionText,
                      statusFilter === 'INACTIVE' && styles.sheetOptionTextActive,
                    ]}
                  >
                    Ngừng hoạt động ({inactiveCount})
                  </Text>
                </View>
                {statusFilter === 'INACTIVE' ? (
                  <Feather name="check" size={18} color="#00C2FF" />
                ) : null}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: '#E5E7EB',
  },
  titleWrap: {
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  pageSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  addHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#00C2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C2FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  addHeaderBtnPressed: {
    backgroundColor: '#0098CC',
    transform: [{ scale: 0.92 }],
  },
  toastWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: 8,
  },
  toastText: {
    color: '#16A34A',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: spacing.lg,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  filterTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTriggerBtnActive: {
    backgroundColor: '#E6F8FF',
    borderColor: '#00C2FF',
  },
  filterTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterTriggerTextActive: {
    color: '#0088CC',
    fontWeight: '700',
  },
  // Compact Mobile Customer Card
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F8FF',
    borderWidth: 1.5,
    borderColor: '#00C2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMiniText: {
    color: '#0098CC',
    fontSize: 14,
    fontWeight: '800',
  },
  customerInfoWrap: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
  },
  phoneTextCompact: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  metaDot: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  inbodyCountText: {
    fontSize: 12,
    color: '#0284C7',
    fontWeight: '600',
  },
  goalTextCompact: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  cardActionsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
    paddingTop: 6,
  },
  compactActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
  },
  ptPackageBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    gap: 4,
  },
  ptPackageBtnPressed: {
    opacity: 0.55,
  },
  ptPackageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7C3AED',
  },
  actionDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E5E7EB',
  },
  actionBtnPressed: {
    opacity: 0.5,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    display: 'flex',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  formErrorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  formErrorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  formSectionHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  fieldWrap: {
    marginBottom: 14,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#EF4444',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  pillGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    overflow: 'hidden',
    height: 42,
  },
  pillOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  pillOptionActive: {
    backgroundColor: '#0284C7',
  },
  pillOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  pillOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statusPillGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusOptionActive: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
  },
  statusOptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  statusOptionTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelPressed: {
    backgroundColor: '#E5E7EB',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  btnSubmit: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#00C2FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00C2FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  btnSubmitPressed: {
    backgroundColor: '#0098CC',
    transform: [{ scale: 0.98 }],
  },
  btnSubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 42,
  },
  datePickerBtnText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  datePickerBtnTextPlaceholder: {
    color: colors.textMuted,
    fontWeight: '400',
  },

  // Empty Search Mascot
  emptySearchWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptySearchImg: {
    width: 140,
    height: 140,
    marginBottom: 12,
  },
  emptySearchText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },

  // Bottom Sheet Modal
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  sheetOptionsList: {
    gap: 4,
  },
  sheetOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  sheetOptionItemActive: {
    backgroundColor: '#E0F2FE',
  },
  sheetOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  sheetOptionTextActive: {
    color: '#0284C7',
    fontWeight: '800',
  },
});
