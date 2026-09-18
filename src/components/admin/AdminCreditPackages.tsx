import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api/client';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';

export interface CreditPackage {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  amountVnd: number;
  baseCredits?: number;
  bonusCredits: number;
  sortOrder: number;
  active: boolean;
  createdAt?: string;
}

interface FormState {
  name: string;
  description: string;
  amountVnd: string;
  bonusCredits: string;
  sortOrder: string;
  active: boolean;
}

function PackageFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: CreditPackage | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<FormState>(() => ({
    name: initial?.name || '',
    description: initial?.description || '',
    amountVnd: initial?.amountVnd ? String(initial.amountVnd) : '100000',
    bonusCredits: initial?.bonusCredits !== undefined ? String(initial.bonusCredits) : '0',
    sortOrder: initial?.sortOrder !== undefined ? String(initial.sortOrder) : '0',
    active: initial?.active ?? true,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  const handleSave = async () => {
    if (lock.current) return;
    const name = form.name.trim();
    if (!name) {
      setError('Vui lòng nhập tên gói nạp credit.');
      return;
    }
    const amount = Number(form.amountVnd);
    if (!Number.isFinite(amount) || amount < 10000 || amount % 1000 !== 0 || amount > 50000000) {
      setError('Giá tiền phải là bội số của 1.000 VNĐ, từ 10.000 đến 50.000.000 VNĐ.');
      return;
    }
    const bonus = Number(form.bonusCredits);
    if (!Number.isFinite(bonus) || bonus < 0 || !Number.isInteger(bonus)) {
      setError('Credit tặng thêm phải là số nguyên không âm.');
      return;
    }
    const order = Number(form.sortOrder);
    if (!Number.isFinite(order) || order < 0 || !Number.isInteger(order)) {
      setError('Thứ tự hiển thị phải là số nguyên không âm.');
      return;
    }

    lock.current = true;
    setBusy(true);
    setError('');

    const payload = {
      name,
      description: form.description.trim(),
      amountVnd: amount,
      bonusCredits: bonus,
      sortOrder: order,
      active: form.active,
    };

    try {
      const pkgId = initial?._id || initial?.id;
      if (pkgId) {
        await api.patch(`/api/admin/credit-packages/${pkgId}`, payload);
      } else {
        await api.post('/api/admin/credit-packages', payload);
      }
      onSaved();
      onClose();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>
                {initial ? 'Chỉnh sửa gói credit' : 'Thêm gói nạp credit'}
              </Text>
              <Text style={styles.sheetSub}>
                {initial ? 'Cập nhật mệnh giá và ưu đãi credit' : 'Tạo gói nạp mới cho hội viên'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.sheetCloseBtn}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            ) : null}

            {/* Tên gói */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Tên gói credit <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
                placeholder="Ví dụ: Gói Cơ Bản 100 Credit"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Giá tiền VNĐ */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Giá bán (VNĐ, bội số 1.000) <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={styles.textInput}
                value={form.amountVnd}
                onChangeText={(t) => setForm((f) => ({ ...f, amountVnd: t.replace(/\D/g, '') }))}
                keyboardType="numeric"
                placeholder="100000"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputHint}>
                Tương đương: {Number(form.amountVnd || 0).toLocaleString('vi-VN')} VNĐ
              </Text>
            </View>

            {/* Credit tặng thêm */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Credit tặng thêm (Bonus)</Text>
              <TextInput
                style={styles.textInput}
                value={form.bonusCredits}
                onChangeText={(t) => setForm((f) => ({ ...f, bonusCredits: t.replace(/\D/g, '') }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Thứ tự hiển thị */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Thứ tự hiển thị (sortOrder)</Text>
              <TextInput
                style={styles.textInput}
                value={form.sortOrder}
                onChangeText={(t) => setForm((f) => ({ ...f, sortOrder: t.replace(/\D/g, '') }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputHint}>Số nhỏ hơn sẽ hiển thị trước.</Text>
            </View>

            {/* Mô tả */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mô tả gói</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                multiline
                numberOfLines={3}
                placeholder="Mô tả ưu đãi hoặc lưu ý gói nạp…"
                placeholderTextColor="#94A3B8"
              />
            </View>

            {/* Trạng thái mở bán */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Trạng thái kinh doanh</Text>
              <Pressable
                onPress={() => setForm((f) => ({ ...f, active: !f.active }))}
                style={[
                  styles.toggleBtn,
                  form.active ? styles.toggleBtnActive : styles.toggleBtnInactive,
                ]}
              >
                <Ionicons
                  name={form.active ? 'checkmark-circle' : 'pause-circle'}
                  size={20}
                  color={form.active ? '#16A34A' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.toggleBtnText,
                    { color: form.active ? '#16A34A' : '#EF4444' },
                  ]}
                >
                  {form.active ? 'Đang mở bán' : 'Tạm ngừng bán'}
                </Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.toggleHintText}>Chạm để đổi</Text>
              </Pressable>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.formFooter}>
            <Pressable
              onPress={onClose}
              disabled={busy}
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>

            <Pressable
              onPress={() => void handleSave()}
              disabled={busy}
              style={({ pressed }) => [
                styles.saveBtn,
                pressed && { opacity: 0.85 },
                busy && { opacity: 0.6 },
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save" size={17} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>{initial ? 'Cập nhật gói' : 'Tạo gói nạp'}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function AdminCreditPackages() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<CreditPackage | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<CreditPackage | null>(null);
  const [toggleTarget, setToggleTarget] = useState<CreditPackage | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const actionLock = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get<CreditPackage[]>('/api/admin/credit-packages');
      setPackages(Array.isArray(data) ? data : []);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) void load();
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [load, reload]);

  const onRefresh = () => {
    setRefreshing(true);
    setReload((n) => n + 1);
  };

  const handleToggleActive = async () => {
    if (!toggleTarget || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    try {
      const id = toggleTarget._id || toggleTarget.id;
      const nextActive = !toggleTarget.active;
      await api.patch(`/api/admin/credit-packages/${id}`, { active: nextActive });
      setSuccess(`Đã ${nextActive ? 'mở bán' : 'tạm ngừng bán'} gói credit.`);
      setTimeout(() => setSuccess(''), 3500);
      setToggleTarget(null);
      void load();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    try {
      const id = deleting._id || deleting.id;
      await api.delete(`/api/admin/credit-packages/${id}`);
      setSuccess('Đã xóa gói nạp credit thành công.');
      setTimeout(() => setSuccess(''), 3500);
      setDeleting(null);
      void load();
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  // Stats calculation
  const totalCount = packages.length;
  const activeCount = packages.filter((p) => p.active).length;
  const inactiveCount = totalCount - activeCount;

  // Filtered packages
  const filteredPackages = packages.filter((pkg) => {
    if (statusFilter === 'ACTIVE') return pkg.active;
    if (statusFilter === 'INACTIVE') return !pkg.active;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* 1. EXECUTIVE STATS CARD (Centered Vertical Stack) */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Pressable
            style={styles.statItem}
            onPress={() => setStatusFilter('ALL')}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="card" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Tổng số gói
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => setStatusFilter('ACTIVE')}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            </View>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{activeCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Đang mở bán
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => setStatusFilter('INACTIVE')}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="pause-circle" size={16} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{inactiveCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Tạm ngừng
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. ACTION TOOLBAR */}
      <View style={styles.toolbarRow}>
        <Pressable
          onPress={() => setEditing(null)}
          style={({ pressed }) => [
            styles.addPackageBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addPackageBtnText}>Thêm gói credit</Text>
        </Pressable>

        <Pressable
          onPress={() => setReload((n) => n + 1)}
          disabled={loading}
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="refresh-cw" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* 3. FILTER PILLS */}
      <View style={styles.filterPillsRow}>
        {(
          [
            { key: 'ALL', label: 'Tất cả' },
            { key: 'ACTIVE', label: 'Đang mở bán' },
            { key: 'INACTIVE', label: 'Tạm ngừng' },
          ] as const
        ).map((pill) => (
          <Pressable
            key={pill.key}
            onPress={() => setStatusFilter(pill.key)}
            style={[
              styles.filterPill,
              statusFilter === pill.key && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                statusFilter === pill.key && styles.filterPillTextActive,
              ]}
            >
              {pill.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Success Notification Banner */}
      {success ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      {/* 4. PACKAGES LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.statusBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.statusBoxText}>Đang tải danh sách gói credit…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable onPress={() => setReload((n) => n + 1)} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : filteredPackages.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="card-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>Chưa có gói nạp credit nào.</Text>
          </View>
        ) : (
          filteredPackages.map((pkg) => {
            const isPkgActive = pkg.active;
            const totalCredits = (pkg.baseCredits || Math.floor(pkg.amountVnd / 1000)) + (pkg.bonusCredits || 0);

            return (
              <View key={pkg._id || pkg.id || pkg.name} style={styles.packageCard}>
                {/* Header Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.creditBadgeBox}>
                    <Ionicons name="sparkles" size={16} color={colors.primary} />
                    <Text style={styles.creditBadgeValue}>+{totalCredits}</Text>
                  </View>

                  <View style={styles.headerInfo}>
                    <Text style={styles.packageName} numberOfLines={1} ellipsizeMode="tail">
                      {pkg.name}
                    </Text>
                    <Text style={styles.packagePrice}>
                      {pkg.amountVnd.toLocaleString('vi-VN')} VNĐ
                    </Text>
                  </View>

                  {/* Status Badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: isPkgActive ? '#DCFCE7' : '#F1F5F9' },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isPkgActive ? '#16A34A' : '#94A3B8' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: isPkgActive ? '#16A34A' : '#64748B' },
                      ]}
                    >
                      {isPkgActive ? 'Đang bán' : 'Tạm ngừng'}
                    </Text>
                  </View>
                </View>

                {/* Metrics Row */}
                <View style={styles.metricsRow}>
                  {pkg.baseCredits !== undefined ? (
                    <View style={styles.metricChip}>
                      <Ionicons name="flash-outline" size={13} color="#0284C7" />
                      <Text style={styles.metricChipText}>Gốc: {pkg.baseCredits} Credit</Text>
                    </View>
                  ) : null}

                  {pkg.bonusCredits > 0 ? (
                    <View style={[styles.metricChip, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}>
                      <Ionicons name="gift-outline" size={13} color="#D97706" />
                      <Text style={[styles.metricChipText, { color: '#B45309', fontWeight: '700' }]}>
                        +{pkg.bonusCredits} Bonus
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.metricChip}>
                    <Ionicons name="swap-vertical" size={13} color="#64748B" />
                    <Text style={styles.metricChipText}>Thứ tự: {pkg.sortOrder}</Text>
                  </View>
                </View>

                {/* Description */}
                {pkg.description ? (
                  <Text style={styles.packageDesc} numberOfLines={2} ellipsizeMode="tail">
                    {pkg.description}
                  </Text>
                ) : null}

                {/* Action Buttons */}
                <View style={styles.cardActionsRow}>
                  <Pressable
                    onPress={() => setEditing(pkg)}
                    style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Feather name="edit-2" size={14} color={colors.primary} />
                    <Text style={styles.actionBtnText}>Sửa</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setToggleTarget(pkg)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Ionicons
                      name={isPkgActive ? 'pause-circle-outline' : 'play-circle-outline'}
                      size={15}
                      color={isPkgActive ? '#D97706' : '#16A34A'}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: isPkgActive ? '#D97706' : '#16A34A' },
                      ]}
                    >
                      {isPkgActive ? 'Tạm ngừng' : 'Mở bán'}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setDeleting(pkg)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      styles.actionBtnDanger,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Feather name="trash-2" size={14} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Xóa</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal: Form Create / Edit */}
      {editing !== undefined && (
        <PackageFormModal
          initial={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setSuccess(editing ? 'Đã cập nhật gói nạp.' : 'Đã tạo gói nạp mới.');
            setTimeout(() => setSuccess(''), 3500);
            setReload((n) => n + 1);
          }}
        />
      )}

      {/* Modal: Confirm Toggle Active */}
      {toggleTarget && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setToggleTarget(null)}>
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogCard}>
              <View
                style={[
                  styles.dialogIconBox,
                  { backgroundColor: toggleTarget.active ? '#FEF3C7' : '#DCFCE7' },
                ]}
              >
                <Ionicons
                  name={toggleTarget.active ? 'pause' : 'play'}
                  size={24}
                  color={toggleTarget.active ? '#D97706' : '#16A34A'}
                />
              </View>

              <Text style={styles.dialogTitle}>
                {toggleTarget.active ? 'Tạm ngừng bán gói credit?' : 'Mở bán lại gói credit?'}
              </Text>

              <Text style={styles.dialogDesc}>
                {toggleTarget.active
                  ? `Gói "${toggleTarget.name}" sẽ tạm thời ẩn khỏi màn hình nạp credit của hội viên.`
                  : `Gói "${toggleTarget.name}" sẽ xuất hiện trở lại trên màn hình nạp credit.`}
              </Text>

              <View style={styles.dialogActions}>
                <Pressable
                  onPress={() => setToggleTarget(null)}
                  disabled={busy}
                  style={styles.dialogCancelBtn}
                >
                  <Text style={styles.dialogCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  onPress={() => void handleToggleActive()}
                  disabled={busy}
                  style={[
                    styles.dialogConfirmBtn,
                    { backgroundColor: toggleTarget.active ? '#D97706' : colors.primary },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.dialogConfirmText}>
                      {toggleTarget.active ? 'Tạm ngừng' : 'Mở bán'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal: Confirm Delete */}
      {deleting && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setDeleting(null)}>
          <View style={styles.dialogOverlay}>
            <View style={styles.dialogCard}>
              <View style={[styles.dialogIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-bin" size={24} color="#EF4444" />
              </View>

              <Text style={styles.dialogTitle}>Xóa gói credit?</Text>

              <Text style={styles.dialogDesc}>
                Bạn có chắc chắn muốn xóa gói &quot;{deleting.name}&quot; ({deleting.amountVnd.toLocaleString('vi-VN')} VNĐ)? Thao tác này không thể hoàn tác.
              </Text>

              <View style={styles.dialogActions}>
                <Pressable
                  onPress={() => setDeleting(null)}
                  disabled={busy}
                  style={styles.dialogCancelBtn}
                >
                  <Text style={styles.dialogCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  onPress={() => void handleDelete()}
                  disabled={busy}
                  style={[styles.dialogConfirmBtn, { backgroundColor: '#EF4444' }]}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.dialogConfirmText}>Xóa vĩnh viễn</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  addPackageBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  addPackageBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterPillActive: {
    backgroundColor: '#E0F2FE',
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  successText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  statusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  statusBoxText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statusBoxError: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditBadgeBox: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  creditBadgeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
    justifyContent: 'center',
  },
  packageName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  packagePrice: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metricChipText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '600',
  },
  packageDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 9,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  actionBtnDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  // Sheet Form
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sheetSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formScroll: {
    paddingVertical: 14,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  inputHint: {
    fontSize: 11.5,
    color: '#64748B',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: colors.text,
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  toggleBtnInactive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  toggleBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  toggleHintText: {
    fontSize: 11.5,
    color: '#64748B',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12.5,
    color: '#EF4444',
    fontWeight: '500',
  },
  formFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  saveBtn: {
    flex: 1.4,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Dialog confirmation
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  dialogIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dialogTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  dialogDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  dialogCancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  dialogConfirmBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
