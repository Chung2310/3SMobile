import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';

import { api } from '@/services/api/client';
import {
  display,
  listPath,
  recordId,
  resources,
  type AdminRecord,
} from '@/services/adminResources';
import { fetchAdminDashboard, type AdminDashboardData } from '@/services/dashboardService';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { CustomerAdminFormModal } from './CustomerAdminFormModal';
import { AdminForceTransferModal } from './AdminForceTransferModal';

const ICON_ZALO = require('../../../assets/public/zalo-icon.png');

export function AdminCustomersManagement() {
  const resource = resources.customers;


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

  // Dashboard summary stats
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);

  // Modals state
  const [form, setForm] = useState<AdminRecord | null | undefined>(undefined);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminRecord | null>(null);
  const [transferCustomer, setTransferCustomer] = useState<AdminRecord | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<AdminRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const actionLock = useRef(false);
  const version = useRef(0);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await fetchAdminDashboard();
      if (data) setDashboardData(data);
    } catch {
      // Bỏ qua lỗi ngầm
    }
  }, []);

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
      void loadDashboard();
    }, 0);
    return () => clearTimeout(timer);
  }, [load, loadDashboard]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
    void loadDashboard();
  }, [load, loadDashboard]);

  const afterSave = () => {
    setSuccess('Đã lưu thay đổi thành công.');
    setTimeout(() => setSuccess(''), 3500);
    void load();
    void loadDashboard();
  };

  const runAction = async (action: () => Promise<unknown>) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setActionError('');
    try {
      await action();
      setDeletingCustomer(null);
      setSelectedCustomer(null);
      afterSave();
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  // Contacts
  const handleCall = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9+]/g, '');
    if (clean) void Linking.openURL(`tel:${clean}`);
  };

  const handleSms = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9+]/g, '');
    if (clean) void Linking.openURL(`sms:${clean}`);
  };

  const handleZalo = (phone?: string) => {
    if (!phone) return;
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean) void Linking.openURL(`https://zalo.me/${clean}`);
  };

  // Resolve PT name from customer record
  const getAssignedPtName = (item: AdminRecord) => {
    if (!item.assignedPtId) return 'Chưa phân công HLV';
    if (typeof item.assignedPtId === 'object') {
      const ptObj = item.assignedPtId as AdminRecord;
      return String(ptObj.fullName || ptObj.username || 'HLV');
    }
    const ptId = String(item.assignedPtId);
    if (dashboardData?.ptWorkload) {
      const found = dashboardData.ptWorkload.find((w) => w.ptId === ptId);
      if (found) return found.fullName || found.username;
    }
    return ptId;
  };

  // Stats calculation
  const totalCount = dashboardData?.totalCustomers ?? total ?? 0;
  const activeCount = dashboardData?.customerStats?.active ?? 0;
  const leadCount = dashboardData?.customerStats?.lead ?? 0;
  const inactiveCount = dashboardData?.customerStats?.inactive ?? 0;

  // Status mapping
  const getStatusBadge = (st?: string) => {
    switch (st) {
      case 'ACTIVE':
        return { label: 'Đang tập', color: '#16A34A', bg: '#DCFCE7' };
      case 'LEAD':
        return { label: 'Tiềm năng', color: '#D97706', bg: '#FEF3C7' };
      case 'INACTIVE':
        return { label: 'Ngừng tập', color: '#64748B', bg: '#F1F5F9' };
      default:
        return { label: st || 'Chưa rõ', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. EXECUTIVE STATS BANNER */}
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
              <Ionicons name="people" size={17} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.primary }]}>{totalCount}</Text>
              <Text style={styles.statLabel}>Tổng học viên</Text>
            </View>
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
              <Ionicons name="checkmark-circle" size={17} color="#16A34A" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: '#16A34A' }]}>{activeCount}</Text>
              <Text style={styles.statLabel}>Đang tập</Text>
            </View>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatus('LEAD');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={17} color="#D97706" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: '#D97706' }]}>{leadCount}</Text>
              <Text style={styles.statLabel}>Tiềm năng</Text>
            </View>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatus('INACTIVE');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons name="pause-circle" size={17} color="#64748B" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: '#64748B' }]}>{inactiveCount}</Text>
              <Text style={styles.statLabel}>Ngừng tập</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* 2. TOOLBAR: BATCH TRANSFER + ADD CUSTOMER */}
      <View style={styles.actionToolbar}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(app)/admin/[section]',
              params: { section: 'batchTransfers' },
            })
          }
          style={({ pressed }) => [
            styles.batchTransferBtn,
            pressed && { opacity: 0.8 },
          ]}
          accessibilityLabel="Chuyển giao hàng loạt"
        >
          <Feather name="repeat" size={15} color={colors.primary} />
          <Text style={styles.batchTransferText}>Chuyển giao hàng loạt</Text>
        </Pressable>

        <Pressable
          onPress={() => setForm(null)}
          style={({ pressed }) => [
            styles.addCustomerBtn,
            pressed && { opacity: 0.85 },
          ]}
          accessibilityLabel="Thêm khách hàng"
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
          <Text style={styles.addCustomerText}>Thêm mới</Text>
        </Pressable>
      </View>

      {/* 3. SEARCH BAR */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#64748B" style={{ marginLeft: 4 }} />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Tìm theo tên, SĐT, email học viên…"
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
            { key: 'ACTIVE', label: 'Đang tập' },
            { key: 'LEAD', label: 'Tiềm năng' },
            { key: 'INACTIVE', label: 'Ngừng tập' },
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

      {/* 5. CUSTOMER LIST */}
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
            <Text style={styles.statusBoxText}>Đang tải dữ liệu học viên…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable
              onPress={() => void load()}
              style={styles.retryBtn}
            >
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="person-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>
              Không tìm thấy học viên phù hợp.
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
            const cId = recordId(item);
            const badge = getStatusBadge(String(item.status || ''));
            const ptName = getAssignedPtName(item);

            // BMI estimate
            const hNum = Number(item.height);
            const wNum = Number(item.initialWeight);
            const bmi =
              hNum > 0 && wNum > 0
                ? (wNum / Math.pow(hNum / 100, 2)).toFixed(1)
                : null;

            return (
              <View key={cId} style={styles.customerCard}>
                {/* Main Clickable Card Area: tap to open detail sheet */}
                <Pressable
                  onPress={() => setSelectedCustomer(item)}
                  style={({ pressed }) => [
                    styles.cardMainPressable,
                    pressed && { opacity: 0.92 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Xem chi tiết học viên ${display(item.fullName || item.name)}`}
                >
                  {/* Header Row: Avatar, Name, Status, Contacts */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {String(item.fullName || 'H').trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.headerInfo}>
                      <Text style={styles.customerName} numberOfLines={1}>
                        {display(item.fullName || item.name || 'Học viên')}
                      </Text>

                      <View style={styles.metaRow}>
                        <Text style={styles.phoneText}>
                          {String(item.phone || 'Chưa có SĐT')}
                        </Text>
                        {item.phone ? (
                          <View style={styles.contactRow}>
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation?.();
                                handleCall(String(item.phone));
                              }}
                              hitSlop={8}
                              style={styles.contactIconBtn}
                              accessibilityLabel={`Gọi điện cho ${display(item.fullName)}`}
                            >
                              <Feather name="phone" size={12} color="#0284C7" />
                            </Pressable>

                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation?.();
                                handleSms(String(item.phone));
                              }}
                              hitSlop={8}
                              style={styles.contactIconBtn}
                              accessibilityLabel={`Gửi SMS cho ${display(item.fullName)}`}
                            >
                              <Feather name="message-square" size={12} color="#16A34A" />
                            </Pressable>

                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation?.();
                                handleZalo(String(item.phone));
                              }}
                              hitSlop={8}
                              style={styles.contactIconBtn}
                              accessibilityLabel={`Mở Zalo cho ${display(item.fullName)}`}
                            >
                              <Image
                                source={ICON_ZALO}
                                style={styles.zaloIcon}
                                resizeMode="contain"
                              />
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  {/* PT Assigned Badge */}
                  <View style={styles.ptBadgeRow}>
                    <View style={styles.ptBadge}>
                      <Feather name="shield" size={12} color={colors.primary} />
                      <Text style={styles.ptBadgeLabel}>HLV:</Text>
                      <Text style={styles.ptBadgeName} numberOfLines={1}>
                        {ptName}
                      </Text>
                    </View>

                    {item.email ? (
                      <Text style={styles.emailText} numberOfLines={1}>
                        {String(item.email)}
                      </Text>
                    ) : null}
                  </View>

                  {/* Physical metrics summary */}
                  <View style={styles.physicalRow}>
                    {item.height ? (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricChipLabel}>Cao:</Text>
                        <Text style={styles.metricChipVal}>{String(item.height)} cm</Text>
                      </View>
                    ) : null}

                    {item.initialWeight ? (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricChipLabel}>Nặng:</Text>
                        <Text style={styles.metricChipVal}>{String(item.initialWeight)} kg</Text>
                      </View>
                    ) : null}

                    {bmi ? (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricChipLabel}>BMI:</Text>
                        <Text style={styles.metricChipVal}>{bmi}</Text>
                      </View>
                    ) : null}

                    {item.gender ? (
                      <View style={styles.metricChip}>
                        <Text style={styles.metricChipLabel}>Giới tính:</Text>
                        <Text style={styles.metricChipVal}>
                          {item.gender === 'MALE' ? 'Nam' : item.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Goal & Medical Notes */}
                  {item.initialGoal ? (
                    <View style={styles.noteBox}>
                      <Feather name="target" size={12} color="#0284C7" />
                      <Text style={styles.noteText} numberOfLines={1}>
                        Mục tiêu: {String(item.initialGoal)}
                      </Text>
                    </View>
                  ) : null}

                  {item.medicalNotes ? (
                    <View style={[styles.noteBox, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
                      <Ionicons name="warning-outline" size={12} color="#EF4444" />
                      <Text style={[styles.noteText, { color: '#B91C1C' }]} numberOfLines={1}>
                        Lưu ý: {String(item.medicalNotes)}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>

                {/* Actions Footer */}
                <View style={styles.cardActionsRow}>
                  {/* Chuyển HLV */}
                  <Pressable
                    onPress={() => setTransferCustomer(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && styles.actionBtnPressed,
                    ]}
                  >
                    <Feather name="repeat" size={14} color="#7C3AED" />
                    <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>Chuyển PT</Text>
                  </Pressable>

                  {/* Chỉnh sửa */}
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

                  {/* Xóa */}
                  <Pressable
                    onPress={() => setDeletingCustomer(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && styles.actionBtnPressed,
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

      {/* MODAL 1: ADD / EDIT CUSTOMER */}
      <CustomerAdminFormModal
        visible={form !== undefined}
        item={form || null}
        onClose={() => setForm(undefined)}
        onSave={async (payload) => {
          if (form) {
            await api.patch(`${resource.path}/${recordId(form)}`, payload);
          } else {
            await api.post(resource.path, { ...payload, ...resource.query });
          }
          afterSave();
        }}
      />

      {/* MODAL 2: FORCE TRANSFER PT */}
      <AdminForceTransferModal
        visible={Boolean(transferCustomer)}
        customer={transferCustomer}
        onClose={() => setTransferCustomer(null)}
        onSuccess={() => {
          afterSave();
        }}
      />

      {/* MODAL 3: DETAIL BOTTOM SHEET */}
      {selectedCustomer && (
        <Modal
          visible={Boolean(selectedCustomer)}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (!busy) setSelectedCustomer(null);
          }}
        >
          <View style={styles.sheetOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                if (!busy) setSelectedCustomer(null);
              }}
            />

            <View style={styles.detailSheetContent}>
              <View style={styles.sheetHandle} />

              <View style={styles.detailHeader}>
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>
                    {String(selectedCustomer.fullName || 'H').charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{display(selectedCustomer)}</Text>
                  <Text style={styles.detailSub}>Mã ID: {recordId(selectedCustomer)}</Text>
                </View>

                <Pressable
                  onPress={() => setSelectedCustomer(null)}
                  hitSlop={8}
                  style={styles.sheetCloseBtn}
                >
                  <Feather name="x" size={20} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.detailBody}>
                {actionError ? (
                  <View style={styles.detailErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.detailErrorText}>{actionError}</Text>
                  </View>
                ) : null}

                {/* Quick contact buttons */}
                {selectedCustomer.phone ? (
                  <View style={styles.detailContactRow}>
                    <Pressable
                      onPress={() => handleCall(String(selectedCustomer.phone))}
                      style={styles.detailContactBtn}
                    >
                      <Feather name="phone" size={15} color="#0284C7" />
                      <Text style={[styles.detailContactText, { color: '#0284C7' }]}>Gọi điện</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleSms(String(selectedCustomer.phone))}
                      style={styles.detailContactBtn}
                    >
                      <Feather name="message-square" size={15} color="#16A34A" />
                      <Text style={[styles.detailContactText, { color: '#16A34A' }]}>Nhắn SMS</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleZalo(String(selectedCustomer.phone))}
                      style={styles.detailContactBtn}
                    >
                      <Image source={ICON_ZALO} style={{ width: 16, height: 16 }} resizeMode="contain" />
                      <Text style={[styles.detailContactText, { color: '#0068FF' }]}>Zalo</Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* Section: Thông tin chính */}
                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Trạng thái</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusBadge(String(selectedCustomer.status)).bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: getStatusBadge(String(selectedCustomer.status)).color },
                        ]}
                      >
                        {getStatusBadge(String(selectedCustomer.status)).label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>HLV phụ trách</Text>
                    <Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>
                      {getAssignedPtName(selectedCustomer)}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Số điện thoại</Text>
                    <Text style={styles.infoValue}>
                      {String(selectedCustomer.phone || 'Chưa cập nhật')}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>
                      {String(selectedCustomer.email || 'Chưa cập nhật')}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Giới tính</Text>
                    <Text style={styles.infoValue}>
                      {selectedCustomer.gender === 'MALE'
                        ? 'Nam'
                        : selectedCustomer.gender === 'FEMALE'
                        ? 'Nữ'
                        : 'Khác'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Chiều cao</Text>
                    <Text style={styles.infoValue}>
                      {selectedCustomer.height ? `${selectedCustomer.height} cm` : '—'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Cân nặng ban đầu</Text>
                    <Text style={styles.infoValue}>
                      {selectedCustomer.initialWeight ? `${selectedCustomer.initialWeight} kg` : '—'}
                    </Text>
                  </View>
                </View>

                {/* Section: Mục tiêu & Y tế */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionHeaderTitle}>Mục tiêu & Y tế</Text>
                  <Text style={styles.notesBlock}>
                    {String(selectedCustomer.initialGoal || 'Chưa đặt mục tiêu')}
                  </Text>

                  {selectedCustomer.medicalNotes ? (
                    <>
                      <Text style={[styles.sectionHeaderTitle, { color: '#DC2626', marginTop: 10 }]}>
                        Lưu ý sức khỏe
                      </Text>
                      <Text style={[styles.notesBlock, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2', color: '#B91C1C' }]}>
                        {String(selectedCustomer.medicalNotes)}
                      </Text>
                    </>
                  ) : null}
                </View>
              </ScrollView>

              {/* Sheet Action Buttons */}
              <View style={styles.detailActions}>
                <Pressable
                  onPress={() => {
                    const cust = selectedCustomer;
                    setSelectedCustomer(null);
                    setTransferCustomer(cust);
                  }}
                  style={styles.detailTransferBtn}
                >
                  <Feather name="repeat" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.detailTransferText}>Chuyển HLV</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const cust = selectedCustomer;
                    setSelectedCustomer(null);
                    setForm(cust);
                  }}
                  style={styles.detailEditBtn}
                >
                  <Feather name="edit-2" size={16} color={colors.text} style={{ marginRight: 6 }} />
                  <Text style={styles.detailEditText}>Sửa</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const cust = selectedCustomer;
                    setSelectedCustomer(null);
                    setDeletingCustomer(cust);
                  }}
                  style={styles.detailDeleteBtn}
                >
                  <Feather name="trash-2" size={16} color="#EF4444" />
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 4: CONFIRM DELETE */}
      {deletingCustomer && (
        <Modal
          visible={Boolean(deletingCustomer)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setDeletingCustomer(null);
          }}
        >
          <View style={styles.deleteOverlay}>
            <View style={styles.deleteCard}>
              <View style={styles.deleteIconBox}>
                <Feather name="trash-2" size={26} color="#EF4444" />
              </View>
              <Text style={styles.deleteTitle}>Xác nhận xóa khách hàng</Text>
              <Text style={styles.deleteDesc}>
                Bạn có chắc chắn muốn xóa hồ sơ học viên &quot;{display(deletingCustomer)}&quot;? Toàn bộ dữ liệu InBody, lịch tập và lịch sử liên quan sẽ bị xóa vĩnh viễn.
              </Text>
              {actionError ? (
                <View style={styles.detailErrorBox}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.detailErrorText}>{actionError}</Text>
                </View>
              ) : null}
              <View style={styles.deleteActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => setDeletingCustomer(null)}
                  style={styles.deleteCancelBtn}
                >
                  <Text style={styles.deleteCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    void runAction(() =>
                      api.delete(`${resource.path}/${recordId(deletingCustomer)}`)
                    )
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
    gap: 4,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E2E8F0',
  },
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  batchTransferBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  batchTransferText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  addCustomerBtn: {
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addCustomerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
  customerCard: {
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
    gap: 10,
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
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 8,
  },
  phoneText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zaloIcon: {
    width: 14,
    height: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  ptBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  ptBadgeLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  ptBadgeName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  emailText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 8,
    maxWidth: '45%',
  },
  physicalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  metricChipLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  metricChipVal: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },
  noteText: {
    fontSize: 11,
    color: '#0369A1',
    flex: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  actionBtnTextPrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
  detailSheetContent: {
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
  detailBody: {
    paddingVertical: 14,
  },
  detailErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  detailErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
  detailContactRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  detailContactBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailContactText: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
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
  },
  notesBlock: {
    fontSize: 13,
    color: colors.text,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    lineHeight: 18,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailTransferBtn: {
    flex: 2,
    height: 46,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTransferText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailEditBtn: {
    flex: 1.5,
    height: 46,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
});
