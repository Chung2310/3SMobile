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
  listPath,
  recordId,
  resources,
  type AdminRecord,
} from '@/services/adminResources';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';

const ICON_ZALO = require('../../../assets/public/zalo-icon.png');

interface TransferParty {
  _id?: string;
  id?: string;
  fullName?: string;
  username?: string;
  phone?: string;
  email?: string;
}

export function AdminTransfersManagement() {
  const resource = resources.transfers;

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

  // Selected transfer for detail sheet
  const [selectedTransfer, setSelectedTransfer] = useState<AdminRecord | null>(null);

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

  // Quick contact triggers
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

  // Resolve parties safely
  const getPartyInfo = (val: unknown): { name: string; user?: string; phone?: string; email?: string } => {
    if (!val) return { name: '—' };
    if (typeof val === 'object') {
      const obj = val as TransferParty;
      return {
        name: obj.fullName || obj.username || '—',
        user: obj.username,
        phone: obj.phone,
        email: obj.email,
      };
    }
    return { name: String(val) };
  };

  // Status mapping
  const getStatusBadge = (st?: string) => {
    switch (st) {
      case 'ACCEPTED':
        return { label: 'Đã tiếp nhận', color: '#16A34A', bg: '#DCFCE7', icon: 'check-circle' as const };
      case 'ADMIN_FORCED':
        return { label: 'Admin điều chuyển', color: '#7C3AED', bg: '#F3E8FF', icon: 'shield' as const };
      case 'PENDING':
        return { label: 'Chờ tiếp nhận', color: '#D97706', bg: '#FEF3C7', icon: 'clock' as const };
      case 'REJECTED':
        return { label: 'Đã từ chối', color: '#EF4444', bg: '#FEE2E2', icon: 'x-circle' as const };
      default:
        return { label: st || 'Chưa rõ', color: '#64748B', bg: '#F1F5F9', icon: 'help-circle' as const };
    }
  };

  // Format date helper
  const formatDate = (val?: unknown) => {
    if (!val) return '—';
    try {
      const d = new Date(String(val));
      if (isNaN(d.getTime())) return String(val);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${mins} · ${day}/${month}/${year}`;
    } catch {
      return String(val);
    }
  };

  // Quick stats derived from items if total provided
  const acceptedCount = items.filter((i) => i.status === 'ACCEPTED').length;
  const forcedCount = items.filter((i) => i.status === 'ADMIN_FORCED').length;
  const pendingCount = items.filter((i) => i.status === 'PENDING').length;
  const rejectedCount = items.filter((i) => i.status === 'REJECTED').length;

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
              <Ionicons name="swap-horizontal" size={17} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.statValue, { color: colors.primary }]}>{total ?? items.length}</Text>
              <Text style={styles.statLabel}>Tổng lượt</Text>
            </View>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatus('ACCEPTED');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-done" size={17} color="#16A34A" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: '#16A34A' }]}>{acceptedCount}</Text>
              <Text style={styles.statLabel}>Tiếp nhận</Text>
            </View>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatus('ADMIN_FORCED');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="shield-checkmark" size={17} color="#7C3AED" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: '#7C3AED' }]}>{forcedCount}</Text>
              <Text style={styles.statLabel}>Admin chuyển</Text>
            </View>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatus('PENDING');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time" size={17} color="#D97706" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: '#D97706' }]}>{pendingCount}</Text>
              <Text style={styles.statLabel}>Chờ duyệt</Text>
            </View>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatus('REJECTED');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={17} color="#EF4444" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{rejectedCount}</Text>
              <Text style={styles.statLabel}>Từ chối</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* 2. TOOLBAR: BATCH TRANSFER BUTTON */}
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
            placeholder="Tìm theo tên học viên, HLV, lý do…"
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterPillsRow}
      >
        {(
          [
            { key: 'ALL', label: 'Tất cả' },
            { key: 'ACCEPTED', label: 'Đã tiếp nhận' },
            { key: 'ADMIN_FORCED', label: 'Admin điều chuyển' },
            { key: 'PENDING', label: 'Chờ duyệt' },
            { key: 'REJECTED', label: 'Đã từ chối' },
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
      </ScrollView>

      {/* 5. TRANSFER LIST */}
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
            <Text style={styles.statusBoxText}>Đang tải lịch sử chuyển giao…</Text>
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
            <Ionicons name="swap-horizontal-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>
              Chưa có lịch sử chuyển giao nào phù hợp.
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
            const tId = recordId(item);
            const badge = getStatusBadge(String(item.status || ''));
            const customer = getPartyInfo(item.customerId);
            const fromPt = getPartyInfo(item.fromPtId);
            const toPt = getPartyInfo(item.toPtId);
            const timeStr = formatDate(item.createdAt);

            return (
              <Pressable
                key={tId}
                onPress={() => setSelectedTransfer(item)}
                style={({ pressed }) => [
                  styles.transferCard,
                  pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Chi tiết chuyển giao học viên ${customer.name}`}
              >
                {/* Top Meta: Time + Status Badge */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.timeTag}>
                    <Feather name="calendar" size={12} color="#64748B" />
                    <Text style={styles.timeText}>{timeStr}</Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Feather name={badge.icon} size={11} color={badge.color} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Customer Section */}
                <View style={styles.customerRow}>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerAvatarText}>
                      {customer.name.trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {customer.name}
                    </Text>
                    <Text style={styles.customerSub}>
                      Học viên · {customer.phone || 'Chưa có SĐT'}
                    </Text>
                  </View>

                  {/* Contact quick actions for customer */}
                  {customer.phone ? (
                    <View style={styles.contactRow}>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleCall(customer.phone);
                        }}
                        hitSlop={6}
                        style={styles.contactBtn}
                        accessibilityLabel={`Gọi điện cho ${customer.name}`}
                      >
                        <Feather name="phone" size={12} color="#0284C7" />
                      </Pressable>

                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleSms(customer.phone);
                        }}
                        hitSlop={6}
                        style={styles.contactBtn}
                        accessibilityLabel={`Gửi SMS cho ${customer.name}`}
                      >
                        <Feather name="message-square" size={12} color="#16A34A" />
                      </Pressable>

                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleZalo(customer.phone);
                        }}
                        hitSlop={6}
                        style={styles.contactBtn}
                        accessibilityLabel={`Mở Zalo cho ${customer.name}`}
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

                {/* Transfer Flow Diagram */}
                <View style={styles.flowCard}>
                  {/* From PT */}
                  <View style={styles.flowPartyCol}>
                    <Text style={styles.flowPartyRole}>HLV BÀN GIAO</Text>
                    <View style={styles.partyBox}>
                      <View style={[styles.partyAvatar, { backgroundColor: '#F1F5F9' }]}>
                        <Feather name="user" size={13} color="#64748B" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.partyName} numberOfLines={1}>
                          {fromPt.name}
                        </Text>
                        {fromPt.user ? (
                          <Text style={styles.partyUser} numberOfLines={1}>
                            @{fromPt.user}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Arrow Transfer Icon */}
                  <View style={styles.flowArrowWrap}>
                    <View style={styles.flowArrowCircle}>
                      <Feather name="arrow-right" size={14} color="#FFFFFF" />
                    </View>
                  </View>

                  {/* To PT */}
                  <View style={styles.flowPartyCol}>
                    <Text style={[styles.flowPartyRole, { color: colors.primary }]}>HLV TIẾP NHẬN</Text>
                    <View style={[styles.partyBox, styles.partyBoxTarget]}>
                      <View style={[styles.partyAvatar, { backgroundColor: '#E0F2FE' }]}>
                        <Feather name="user-check" size={13} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.partyName, { color: colors.primary }]} numberOfLines={1}>
                          {toPt.name}
                        </Text>
                        {toPt.user ? (
                          <Text style={styles.partyUser} numberOfLines={1}>
                            @{toPt.user}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Reason Block */}
                {item.reason ? (
                  <View style={styles.reasonBox}>
                    <Feather name="file-text" size={13} color="#64748B" style={{ marginTop: 2 }} />
                    <Text style={styles.reasonText} numberOfLines={2}>
                      Lý do: {String(item.reason)}
                    </Text>
                  </View>
                ) : null}

                {/* Tap to view detail hint */}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardFooterText}>Chạm để xem chi tiết chuyển giao</Text>
                  <Feather name="chevron-right" size={14} color="#94A3B8" />
                </View>
              </Pressable>
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

      {/* DETAIL BOTTOM SHEET */}
      {selectedTransfer && (
        <Modal
          visible={Boolean(selectedTransfer)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedTransfer(null)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedTransfer(null)}
            />

            <View style={styles.sheetContent}>
              <View style={styles.sheetHandle} />

              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Chi tiết chuyển giao</Text>
                  <Text style={styles.sheetSub}>
                    Mã hồ sơ: {recordId(selectedTransfer)}
                  </Text>
                </View>

                <Pressable
                  onPress={() => setSelectedTransfer(null)}
                  hitSlop={8}
                  style={styles.sheetCloseBtn}
                >
                  <Feather name="x" size={20} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetBody}>
                {/* Status Bar */}
                <View style={styles.sheetStatusBox}>
                  <Text style={styles.sheetStatusLabel}>Trạng thái chuyển giao:</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBadge(String(selectedTransfer.status)).bg },
                    ]}
                  >
                    <Feather
                      name={getStatusBadge(String(selectedTransfer.status)).icon}
                      size={12}
                      color={getStatusBadge(String(selectedTransfer.status)).color}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusBadge(String(selectedTransfer.status)).color },
                      ]}
                    >
                      {getStatusBadge(String(selectedTransfer.status)).label}
                    </Text>
                  </View>
                </View>

                {/* Section: Học viên */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Học viên</Text>
                  {(() => {
                    const c = getPartyInfo(selectedTransfer.customerId);
                    return (
                      <View style={styles.partyDetailCard}>
                        <View style={styles.customerAvatar}>
                          <Text style={styles.customerAvatarText}>
                            {c.name.trim().charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.partyDetailName}>{c.name}</Text>
                          <Text style={styles.partyDetailSub}>SĐT: {c.phone || 'Chưa cập nhật'}</Text>
                          {c.email ? <Text style={styles.partyDetailSub}>Email: {c.email}</Text> : null}
                        </View>
                      </View>
                    );
                  })()}
                </View>

                {/* Section: Đối chiếu điều chuyển */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Thông tin HLV</Text>
                  <View style={styles.compareBlock}>
                    {/* HLV cũ */}
                    <View style={styles.compareCol}>
                      <Text style={styles.compareColLabel}>HLV BÀN GIAO</Text>
                      {(() => {
                        const pt = getPartyInfo(selectedTransfer.fromPtId);
                        return (
                          <View style={styles.comparePartyCard}>
                            <Text style={styles.comparePartyName}>{pt.name}</Text>
                            {pt.user ? <Text style={styles.comparePartyUser}>@{pt.user}</Text> : null}
                            {pt.phone ? <Text style={styles.comparePartyPhone}>{pt.phone}</Text> : null}
                          </View>
                        );
                      })()}
                    </View>

                    {/* Arrow */}
                    <View style={styles.compareArrowBox}>
                      <Feather name="arrow-right" size={18} color={colors.primary} />
                    </View>

                    {/* HLV mới */}
                    <View style={styles.compareCol}>
                      <Text style={[styles.compareColLabel, { color: colors.primary }]}>HLV TIẾP NHẬN</Text>
                      {(() => {
                        const pt = getPartyInfo(selectedTransfer.toPtId);
                        return (
                          <View style={[styles.comparePartyCard, { borderColor: '#BAE6FD', backgroundColor: '#F0F9FF' }]}>
                            <Text style={[styles.comparePartyName, { color: colors.primary }]}>{pt.name}</Text>
                            {pt.user ? <Text style={styles.comparePartyUser}>@{pt.user}</Text> : null}
                            {pt.phone ? <Text style={styles.comparePartyPhone}>{pt.phone}</Text> : null}
                          </View>
                        );
                      })()}
                    </View>
                  </View>
                </View>

                {/* Section: Lý do */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Lý do chuyển giao</Text>
                  <Text style={styles.reasonFullText}>
                    {String(selectedTransfer.reason || 'Không ghi chú lý do.')}
                  </Text>
                </View>

                {/* Section: Mốc thời gian */}
                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionTitle}>Mốc thời gian</Text>
                  <View style={styles.timelineRow}>
                    <Feather name="clock" size={13} color="#64748B" />
                    <Text style={styles.timelineLabel}>Khởi tạo lúc:</Text>
                    <Text style={styles.timelineValue}>{formatDate(selectedTransfer.createdAt)}</Text>
                  </View>

                  {selectedTransfer.handledAt ? (
                    <View style={styles.timelineRow}>
                      <Feather name="check" size={13} color="#16A34A" />
                      <Text style={styles.timelineLabel}>Xử lý lúc:</Text>
                      <Text style={styles.timelineValue}>{formatDate(selectedTransfer.handledAt)}</Text>
                    </View>
                  ) : null}
                </View>
              </ScrollView>

              {/* Sheet Close Button */}
              <View style={styles.sheetFooter}>
                <Pressable
                  onPress={() => setSelectedTransfer(null)}
                  style={styles.sheetClosePrimaryBtn}
                >
                  <Text style={styles.sheetClosePrimaryText}>Đóng</Text>
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
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 9.5,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 34,
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
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  filterPill: {
    height: 36,
    paddingHorizontal: 14,
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
  transferCard: {
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
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  customerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.text,
  },
  customerSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zaloIcon: {
    width: 15,
    height: 15,
  },
  flowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  flowPartyCol: {
    flex: 1,
    gap: 4,
  },
  flowPartyRole: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  partyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 6,
    gap: 6,
  },
  partyBoxTarget: {
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  partyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  partyUser: {
    fontSize: 10,
    color: colors.textMuted,
  },
  flowArrowWrap: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    gap: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cardFooterText: {
    fontSize: 11.5,
    color: colors.primary,
    fontWeight: '600',
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
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
  sheetBody: {
    paddingVertical: 14,
  },
  sheetStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sheetStatusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
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
  infoSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
  },
  partyDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partyDetailName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  partyDetailSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  compareBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compareCol: {
    flex: 1,
    gap: 4,
  },
  compareColLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  comparePartyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  comparePartyName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },
  comparePartyUser: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 1,
  },
  comparePartyPhone: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  compareArrowBox: {
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonFullText: {
    fontSize: 13,
    color: colors.text,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    lineHeight: 18,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  timelineLabel: {
    fontSize: 12.5,
    color: '#64748B',
  },
  timelineValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
  sheetFooter: {
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  sheetClosePrimaryBtn: {
    height: 46,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetClosePrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
