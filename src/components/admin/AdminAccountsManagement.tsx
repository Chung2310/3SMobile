import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api/client';
import { canDeleteAccount, canEditAccount } from '@/services/adminAccess';
import {
  display,
  formPayload,
  listPath,
  recordId,
  resources,
  type AdminRecord,
} from '@/services/adminResources';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';

export function AdminAccountsManagement() {
  const resource = resources.accounts;
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<AdminRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number>();
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [form, setForm] = useState<AdminRecord | null | undefined>(undefined);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminRecord | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminRecord | null>(null);
  const [lockTarget, setLockTarget] = useState<AdminRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const actionLock = useRef(false);
  const version = useRef(0);

  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true);
    setError('');
    try {
      const statusParam = status === 'ALL' ? '' : status;
      const path = listPath(resource, page, applied, statusParam);
      const result = await api.getPage<AdminRecord>(path);
      if (version.current !== request) return;
      setItems(result.data || []);
      setTotal(result.meta?.total ?? result.data?.length ?? 0);
      setPages(Math.max(1, result.meta?.totalPages || 1));
      if (result.meta && page > Math.max(1, result.meta.totalPages)) {
        setPage(Math.max(1, result.meta.totalPages));
      }
    } catch (e) {
      if (version.current === request) setError(messageOf(e));
    } finally {
      if (version.current === request) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [resource, page, applied, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const afterSave = () => {
    setSuccess('Đã lưu thay đổi thành công.');
    setTimeout(() => setSuccess(''), 3500);
    setForm(undefined);
    void load();
  };

  const runAction = async (action: () => Promise<unknown>) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setActionError('');
    try {
      await action();
      setDeletingAdmin(null);
      setLockTarget(null);
      setSelectedAdmin(null);
      afterSave();
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const editable = (item: AdminRecord) => session?.user ? canEditAccount(session.user, item) : false;
  const removable = (item: AdminRecord) => session?.user ? canDeleteAccount(session.user, item) : false;

  // Stats calculation
  const totalAdmins = total ?? items.length;
  const activeAdmins = items.filter((i) => i.status === 'ACTIVE').length;
  const lockedAdmins = items.filter((i) => i.status === 'LOCKED').length;

  return (
    <View style={styles.container}>
      {/* 1. STATS BANNER */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatus('ALL');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalAdmins}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Tổng quản trị
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatus('ACTIVE');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            </View>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{activeAdmins}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Hoạt động
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatus('LOCKED');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="lock-closed" size={16} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{lockedAdmins}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Đã khóa
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. ACTION TOOLBAR */}
      <View style={styles.actionToolbar}>
        <Pressable
          onPress={() => setForm(null)}
          style={({ pressed }) => [
            styles.addAdminBtn,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityLabel="Thêm tài khoản quản trị mới"
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addAdminText}>Thêm tài khoản Admin</Text>
        </Pressable>

        <Pressable
          onPress={() => void load()}
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityLabel="Làm mới dữ liệu"
        >
          <Feather name="refresh-cw" size={15} color={colors.text} />
          <Text style={styles.refreshBtnText}>Làm mới</Text>
        </Pressable>
      </View>

      {/* 3. SEARCH BAR */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#64748B" style={{ marginLeft: 4 }} />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Tìm theo họ tên, username, SĐT, email…"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => {
              setApplied(keyword);
              setPage(1);
            }}
          />
          {keyword ? (
            <Pressable
              onPress={() => {
                setKeyword('');
                setApplied('');
                setPage(1);
              }}
              hitSlop={8}
            >
              <Feather name="x" size={16} color="#64748B" />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={() => {
            setApplied(keyword);
            setPage(1);
          }}
          style={({ pressed }) => [
            styles.searchTriggerBtn,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.searchTriggerText}>Tìm</Text>
        </Pressable>
      </View>

      {/* 4. PILL STATUS FILTERS */}
      <View style={styles.filterPillsRow}>
        {(
          [
            { key: 'ALL', label: 'Tất cả' },
            { key: 'ACTIVE', label: 'Đang hoạt động' },
            { key: 'LOCKED', label: 'Đã khóa' },
          ] as const
        ).map((pill) => {
          const isActive = status === pill.key;
          return (
            <Pressable
              key={pill.key}
              onPress={() => {
                setStatus(pill.key);
                setPage(1);
              }}
              style={[
                styles.filterPill,
                isActive && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isActive && styles.filterPillTextActive,
                ]}
              >
                {pill.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* TOAST SUCCESS */}
      {success ? (
        <View style={styles.toastCard}>
          <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
          <Text style={styles.toastText}>{success}</Text>
        </View>
      ) : null}

      {/* 5. ADMIN ACCOUNTS LIST */}
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
            <Text style={styles.statusBoxText}>Đang tải danh sách quản trị viên…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="shield-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>
              Chưa có tài khoản quản trị nào phù hợp.
            </Text>
            <Pressable
              onPress={() => {
                setKeyword('');
                setApplied('');
                setStatus('ALL');
                setPage(1);
              }}
              style={styles.clearFilterBtn}
            >
              <Text style={styles.clearFilterText}>Xóa bộ lọc tìm kiếm</Text>
            </Pressable>
          </View>
        ) : (
          items.map((item) => {
            const aId = recordId(item);
            const isLocked = item.status === 'LOCKED';
            const isSuper = item.role === 'SUPER_ADMIN';

            return (
              <View key={aId} style={styles.adminCard}>
                {/* Clickable body area to view details */}
                <Pressable
                  onPress={() => setSelectedAdmin(item)}
                  style={({ pressed }) => [
                    styles.cardMainPressable,
                    pressed && { opacity: 0.92 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Chi tiết tài khoản ${display(item)}`}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {String(item.fullName || item.username || 'A').charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.headerInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.adminName} numberOfLines={1} ellipsizeMode="tail">
                          {display(item.fullName || item.username)}
                        </Text>
                        <View style={[styles.roleBadge, isSuper && styles.superRoleBadge]}>
                          <Text style={[styles.roleBadgeText, isSuper && styles.superRoleText]}>
                            {isSuper ? 'SUPER ADMIN' : 'ADMIN'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.adminUsername} numberOfLines={1} ellipsizeMode="tail">
                        @{String(item.username || '')}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: isLocked ? '#FEE2E2' : '#DCFCE7' },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isLocked ? '#EF4444' : '#16A34A' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: isLocked ? '#EF4444' : '#16A34A' },
                        ]}
                      >
                        {isLocked ? 'Đã khóa' : 'Hoạt động'}
                      </Text>
                    </View>
                  </View>

                  {/* Contact Row: full width under header, wraps cleanly and truncates safely */}
                  {(Boolean(item.phone) || Boolean(item.email)) && (
                    <View style={styles.contactRow}>
                      {item.phone ? (
                        <View style={styles.contactChip}>
                          <Feather name="phone" size={11} color="#64748B" />
                          <Text style={styles.contactText} numberOfLines={1}>
                            {String(item.phone)}
                          </Text>
                        </View>
                      ) : null}

                      {item.email ? (
                        <View style={styles.contactChip}>
                          <Feather name="mail" size={11} color="#64748B" />
                          <Text
                            style={styles.contactText}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {String(item.email)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </Pressable>

                {/* Actions Row */}
                <View style={styles.cardActionsRow}>
                  {/* Sửa */}
                  {editable(item) && (
                    <Pressable
                      onPress={() => setForm(item)}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        pressed && styles.actionBtnPressed,
                      ]}
                    >
                      <Feather name="edit-2" size={14} color="#334155" />
                      <Text style={styles.actionBtnText}>Sửa</Text>
                    </Pressable>
                  )}

                  {/* Khóa / Mở khóa với popup xác nhận */}
                  {editable(item) && (
                    <Pressable
                      onPress={() => {
                        setActionError('');
                        setLockTarget(item);
                      }}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        pressed && styles.actionBtnPressed,
                      ]}
                    >
                      <Feather
                        name={isLocked ? 'unlock' : 'lock'}
                        size={14}
                        color={isLocked ? '#16A34A' : '#D97706'}
                      />
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: isLocked ? '#16A34A' : '#D97706' },
                        ]}
                      >
                        {isLocked ? 'Mở khóa' : 'Khóa'}
                      </Text>
                    </Pressable>
                  )}

                  {/* Xóa */}
                  {removable(item) && (
                    <Pressable
                      onPress={() => setDeletingAdmin(item)}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        pressed && styles.actionBtnPressed,
                      ]}
                    >
                      <Feather name="trash-2" size={14} color="#EF4444" />
                      <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Xóa</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* PAGINATION */}
        {!loading && !error && pages > 1 && (
          <View style={styles.paginationRow}>
            <Pressable
              disabled={page <= 1}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              style={({ pressed }) => [
                styles.pageBtn,
                page <= 1 && styles.pageBtnDisabled,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="chevron-left" size={18} color={page <= 1 ? '#94A3B8' : colors.text} />
              <Text style={[styles.pageBtnText, page <= 1 && { color: '#94A3B8' }]}>Trước</Text>
            </Pressable>

            <Text style={styles.pageInfoText}>
              Trang {page} / {pages}
            </Text>

            <Pressable
              disabled={page >= pages}
              onPress={() => setPage((p) => p + 1)}
              style={({ pressed }) => [
                styles.pageBtn,
                page >= pages && styles.pageBtnDisabled,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[styles.pageBtnText, page >= pages && { color: '#94A3B8' }]}>Sau</Text>
              <Feather name="chevron-right" size={18} color={page >= pages ? '#94A3B8' : colors.text} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: ADD / EDIT ADMIN ACCOUNT */}
      {form !== undefined && (
        <AdminAccountFormModal
          visible={form !== undefined}
          item={form}
          onClose={() => setForm(undefined)}
          onSave={async (payload) => {
            if (form) {
              if (!editable(form)) throw new Error('Bạn không có quyền chỉnh sửa tài khoản này.');
              await api.patch(`${resource.path}/${recordId(form)}`, payload);
            } else {
              await api.post(resource.path, { ...payload, ...resource.query });
            }
            afterSave();
          }}
        />
      )}

      {/* MODAL 2: ADMIN DETAIL BOTTOM SHEET */}
      {selectedAdmin && (
        <Modal
          visible={Boolean(selectedAdmin)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedAdmin(null)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedAdmin(null)}
            />

            <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={styles.sheetHandle} />

              <View style={styles.detailHeader}>
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>
                    {String(selectedAdmin.fullName || selectedAdmin.username || 'A').charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{display(selectedAdmin)}</Text>
                  <Text style={styles.detailSub}>@{String(selectedAdmin.username || '')}</Text>
                </View>

                <Pressable
                  onPress={() => setSelectedAdmin(null)}
                  hitSlop={8}
                  style={styles.sheetCloseBtn}
                >
                  <Feather name="x" size={20} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetBody}>
                {actionError ? (
                  <View style={styles.errorNotice}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorNoticeText}>{actionError}</Text>
                  </View>
                ) : null}

                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Vai trò</Text>
                    <Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>
                      {selectedAdmin.role === 'SUPER_ADMIN' ? 'Quản trị viên cấp cao (SUPER_ADMIN)' : 'Quản trị viên (ADMIN)'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Trạng thái</Text>
                    <Text style={[styles.infoValue, { color: selectedAdmin.status === 'LOCKED' ? '#EF4444' : '#16A34A', fontWeight: '700' }]}>
                      {selectedAdmin.status === 'LOCKED' ? 'Đã khóa' : 'Đang hoạt động'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Số điện thoại</Text>
                    <Text style={styles.infoValue}>{String(selectedAdmin.phone || 'Chưa cập nhật')}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{String(selectedAdmin.email || 'Chưa cập nhật')}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mã tài khoản</Text>
                    <Text style={styles.infoValue}>{recordId(selectedAdmin)}</Text>
                  </View>
                </View>
              </ScrollView>

              {/* Detail Sheet Actions */}
              <View style={styles.detailActions}>
                {editable(selectedAdmin) && (
                  <Pressable
                    onPress={() => {
                      const adm = selectedAdmin;
                      setSelectedAdmin(null);
                      setForm(adm);
                    }}
                    style={styles.detailEditBtn}
                  >
                    <Feather name="edit-2" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.detailEditText}>Chỉnh sửa tài khoản</Text>
                  </Pressable>
                )}

                {editable(selectedAdmin) && (
                  <Pressable
                    onPress={() => {
                      const adm = selectedAdmin;
                      setSelectedAdmin(null);
                      setActionError('');
                      setLockTarget(adm);
                    }}
                    style={[
                      styles.detailLockBtn,
                      {
                        backgroundColor:
                          selectedAdmin.status === 'LOCKED' ? '#DCFCE7' : '#FEF3C7',
                        borderColor:
                          selectedAdmin.status === 'LOCKED' ? '#86EFAC' : '#FDE68A',
                      },
                    ]}
                  >
                    <Feather
                      name={selectedAdmin.status === 'LOCKED' ? 'unlock' : 'lock'}
                      size={16}
                      color={selectedAdmin.status === 'LOCKED' ? '#16A34A' : '#D97706'}
                    />
                  </Pressable>
                )}

                {removable(selectedAdmin) && (
                  <Pressable
                    onPress={() => {
                      const adm = selectedAdmin;
                      setSelectedAdmin(null);
                      setDeletingAdmin(adm);
                    }}
                    style={styles.detailDeleteBtn}
                  >
                    <Feather name="trash-2" size={16} color="#EF4444" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 3: CONFIRM DELETE */}
      {deletingAdmin && (
        <Modal
          visible={Boolean(deletingAdmin)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setDeletingAdmin(null);
          }}
        >
          <View style={styles.deleteOverlay}>
            <View style={styles.deleteCard}>
              <View style={styles.deleteIconBox}>
                <Feather name="trash-2" size={26} color="#EF4444" />
              </View>
              <Text style={styles.deleteTitle}>Xóa tài khoản Admin</Text>
              <Text style={styles.deleteDesc}>
                Bạn có chắc chắn muốn xóa tài khoản &ldquo;{display(deletingAdmin)}&rdquo;? Toàn bộ quyền truy cập quản trị của tài khoản này sẽ bị thu hồi vĩnh viễn.
              </Text>
              {actionError ? (
                <View style={styles.errorNotice}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorNoticeText}>{actionError}</Text>
                </View>
              ) : null}
              <View style={styles.deleteActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => setDeletingAdmin(null)}
                  style={styles.deleteCancelBtn}
                >
                  <Text style={styles.deleteCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    void runAction(() => {
                      if (!removable(deletingAdmin)) {
                        throw new Error('Bạn không có quyền xóa tài khoản quản trị này.');
                      }
                      return api.delete(`${resource.path}/${recordId(deletingAdmin)}`);
                    })
                  }
                  style={styles.deleteConfirmBtn}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.deleteConfirmText}>Xóa vĩnh viễn</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 4: CONFIRM LOCK / UNLOCK */}
      {lockTarget && (
        <Modal
          visible={Boolean(lockTarget)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setLockTarget(null);
          }}
        >
          <View style={styles.deleteOverlay}>
            <View style={styles.deleteCard}>
              <View
                style={[
                  styles.deleteIconBox,
                  {
                    backgroundColor:
                      lockTarget.status === 'LOCKED' ? '#DCFCE7' : '#FEF3C7',
                  },
                ]}
              >
                <Feather
                  name={lockTarget.status === 'LOCKED' ? 'unlock' : 'lock'}
                  size={26}
                  color={lockTarget.status === 'LOCKED' ? '#16A34A' : '#D97706'}
                />
              </View>
              <Text style={styles.deleteTitle}>
                {lockTarget.status === 'LOCKED'
                  ? 'Mở khóa tài khoản Admin'
                  : 'Khóa tài khoản Admin'}
              </Text>
              <Text style={styles.deleteDesc}>
                {lockTarget.status === 'LOCKED'
                  ? `Bạn có chắc chắn muốn mở khóa tài khoản “${display(lockTarget)}”? Quản trị viên này sẽ có thể đăng nhập và thao tác bình thường trở lại.`
                  : `Bạn có chắc chắn muốn khóa tài khoản “${display(lockTarget)}”? Quản trị viên này sẽ tạm thời không thể đăng nhập vào hệ thống quản trị.`}
              </Text>
              {actionError ? (
                <View style={styles.errorNotice}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorNoticeText}>{actionError}</Text>
                </View>
              ) : null}
              <View style={styles.deleteActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => setLockTarget(null)}
                  style={styles.deleteCancelBtn}
                >
                  <Text style={styles.deleteCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    void runAction(() => {
                      if (!editable(lockTarget)) {
                        throw new Error('Bạn không có quyền thay đổi trạng thái tài khoản này.');
                      }
                      return api.patch(`${resource.path}/${recordId(lockTarget)}`, {
                        status: lockTarget.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED',
                      });
                    })
                  }
                  style={[
                    styles.deleteConfirmBtn,
                    {
                      backgroundColor:
                        lockTarget.status === 'LOCKED' ? '#16A34A' : '#D97706',
                    },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.deleteConfirmText}>
                      {lockTarget.status === 'LOCKED' ? 'Mở khóa' : 'Khóa tài khoản'}
                    </Text>
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

// Dedicated Modal for Adding and Editing Admin Accounts
function AdminAccountFormModal({
  visible,
  item,
  onClose,
  onSave,
}: {
  visible: boolean;
  item: AdminRecord | null;
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const editing = Boolean(item);
  const resource = resources.accounts;

  const [fullName, setFullName] = useState(() => String(item?.fullName || ''));
  const [username, setUsername] = useState(() => String(item?.username || ''));
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(() => String(item?.phone || ''));
  const [email, setEmail] = useState(() => String(item?.email || ''));
  const [status, setStatus] = useState<'ACTIVE' | 'LOCKED'>(() => (item?.status as any) || 'ACTIVE');

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  const handleSubmit = async () => {
    if (lock.current || busy) return;
    setError('');

    const valuesMap: Record<string, string> = {
      fullName,
      username,
      password,
      phone,
      email,
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
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ maxHeight: '92%' }}
        >
          <View style={[styles.formSheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>
                  {editing ? 'Chỉnh sửa tài khoản Admin' : 'Thêm tài khoản Admin mới'}
                </Text>
                <Text style={styles.sheetSub}>
                  {editing ? `Tài khoản: @${String(item?.username || '')}` : 'Tạo tài khoản quản trị viên mới'}
                </Text>
              </View>

              <Pressable onPress={onClose} hitSlop={8} style={styles.sheetCloseBtn}>
                <Feather name="x" size={20} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingVertical: 16, gap: 14 }}
            >
              {error ? (
                <View style={styles.errorNotice}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorNoticeText}>{error}</Text>
                </View>
              ) : null}

              {/* Username */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Tên đăng nhập {!editing && <Text style={{ color: '#EF4444' }}>*</Text>}
                </Text>
                <TextInput
                  style={[styles.formInput, editing && styles.inputDisabled]}
                  placeholder="admin_3s"
                  placeholderTextColor="#94A3B8"
                  value={username}
                  onChangeText={(v) => {
                    setUsername(v);
                  }}
                  editable={!editing}
                  autoCapitalize="none"
                />
              </View>

              {/* Password */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  {editing ? 'Đổi mật khẩu 6 số (bỏ trống nếu giữ nguyên)' : 'Mật khẩu 6 chữ số *'}
                </Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.formInput, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                    placeholder={editing ? '••••••' : 'Nhập đúng 6 chữ số'}
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                    }}
                    secureTextEntry={!showPassword}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                  <Pressable
                    onPress={() => setShowPassword((p) => !p)}
                    style={styles.eyeBtn}
                  >
                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#64748B" />
                  </Pressable>
                </View>
              </View>

              {/* Full Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Họ và tên <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Nguyễn Văn Quản Trị"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={(v) => {
                    setFullName(v);
                  }}
                  autoCapitalize="words"
                />
              </View>

              {/* Phone & Email */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>
                    Số điện thoại <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="0987654321"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={(v) => {
                      setPhone(v);
                    }}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="admin@3sgym.vn"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Status */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Trạng thái tài khoản</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(
                    [
                      { key: 'ACTIVE', label: 'Đang hoạt động', color: '#16A34A', bg: '#DCFCE7' },
                      { key: 'LOCKED', label: 'Đã khóa', color: '#EF4444', bg: '#FEE2E2' },
                    ] as const
                  ).map((st) => (
                    <Pressable
                      key={st.key}
                      onPress={() => {
                        setStatus(st.key);
                      }}
                      style={[
                        styles.statusSelectPill,
                        status === st.key && { borderColor: st.color, backgroundColor: st.bg },
                      ]}
                    >
                      <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                      <Text
                        style={[
                          styles.statusSelectText,
                          status === st.key && { color: st.color, fontWeight: '700' },
                        ]}
                      >
                        {st.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.sheetFooter}>
              <Pressable
                onPress={onClose}
                disabled={busy}
                style={styles.formCancelBtn}
              >
                <Text style={styles.formCancelText}>Hủy</Text>
              </Pressable>

              <Pressable
                onPress={() => void handleSubmit()}
                disabled={busy}
                style={styles.formSubmitBtn}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.formSubmitText}>
                    {editing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
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
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
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
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  addAdminBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addAdminText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshBtn: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginLeft: 6,
  },
  searchTriggerBtn: {
    height: 42,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchTriggerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterPill: {
    flex: 1,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FF',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 12,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  toastText: {
    fontSize: 13,
    color: '#16A34A',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  statusBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  retryBtn: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearFilterBtn: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
  },
  clearFilterText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  adminCard: {
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
  cardMainPressable: {
    gap: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    maxWidth: '70%',
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  superRoleBadge: {
    backgroundColor: '#F3E8FF',
  },
  roleBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  superRoleText: {
    color: '#7C3AED',
  },
  adminUsername: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  contactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: '100%',
    flexShrink: 1,
  },
  contactText: {
    fontSize: 11.5,
    color: '#475569',
    flexShrink: 1,
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
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 4,
  },
  actionBtnPressed: {
    opacity: 0.7,
    backgroundColor: '#F1F5F9',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  pageInfoText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  // Sheet
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
    maxHeight: '85%',
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
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  detailSub: {
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
  sheetBody: {
    paddingVertical: 14,
  },
  infoSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailEditBtn: {
    flex: 1,
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailEditText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailLockBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDeleteBtn: {
    width: 46,
    height: 46,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Delete
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deleteCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  deleteIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  deleteDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  deleteConfirmBtn: {
    flex: 1.2,
    height: 44,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Form Sheet
  formSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
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
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  formInput: {
    height: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: colors.text,
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeBtn: {
    height: 46,
    width: 46,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSelectPill: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  formCancelBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  formSubmitBtn: {
    flex: 2,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
});
