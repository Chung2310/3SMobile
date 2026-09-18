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
import { Feather, Ionicons } from '@expo/vector-icons';
import { api } from '@/services/api/client';
import {
  listPath,
  recordId,
  resources,
  type AdminRecord,
} from '@/services/adminResources';
import { resolveTransferTrainers } from '@/services/transferTrainers';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';

const ICON_ZALO = require('../../../assets/public/zalo-icon.png');

type DateField = 'from' | 'to';

const toIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const displayDate = (value: string) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [fromPtId, setFromPtId] = useState('');
  const [toPtId, setToPtId] = useState('');
  const [trainers, setTrainers] = useState<AdminRecord[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateField, setDateField] = useState<DateField | null>(null);
  const [pickerMonth, setPickerMonth] = useState(() => new Date());

  // Selected transfer for detail sheet
  const [selectedTransfer, setSelectedTransfer] = useState<AdminRecord | null>(null);

  const version = useRef(0);

  const transferPath = useCallback((currentPage: number) => {
    const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
    if (appliedKeyword.trim()) params.set('keyword', appliedKeyword.trim());
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    if (fromPtId) params.set('fromPtId', fromPtId);
    if (toPtId) params.set('toPtId', toPtId);
    return resource.path + '?' + params.toString();
  }, [resource.path, appliedKeyword, fromDate, toDate, fromPtId, toPtId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setAppliedKeyword(keyword.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    let active = true;
    void api.getPage<AdminRecord>(listPath(resources.pts, 1, '', ''))
      .then((result) => { if (active) setTrainers(result.data || []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const load = useCallback(async () => {
    const request = ++version.current;
    setLoading(true);
    setError('');
    try {
      const path = transferPath(page);
      const result = await api.getPage<AdminRecord>(path);
      if (version.current !== request) return;
      const transfers = await resolveTransferTrainers(result.data || [], (trainerPage) =>
        api.getPage<AdminRecord>(listPath(resources.pts, trainerPage, '', '')),
      );
      if (version.current !== request) return;
      setItems(transfers);
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
  }, [page, transferPath]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => {
      clearTimeout(timer);
      version.current += 1;
    };
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


  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Feather name="search" size={16} color="#64748B" />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Tìm học viên, HLV, lý do..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            numberOfLines={1}
          />
          {keyword ? <Pressable onPress={() => setKeyword('')} hitSlop={8}><Feather name="x" size={16} color="#64748B" /></Pressable> : null}
        </View>
        <Pressable style={styles.filterButton} onPress={() => setFilterOpen(true)} accessibilityLabel="Mở bộ lọc lịch sử chuyển giao">
          <Feather name="sliders" size={16} color={colors.primary} />
          <Text style={styles.filterButtonText}>Lọc</Text>
        </Pressable>
      </View>
      <View style={styles.activeFilterRow}>
        {(fromDate || toDate || fromPtId || toPtId) ? <Text style={styles.activeFilterText} numberOfLines={1}>Đang áp dụng bộ lọc</Text> : null}
        {(fromDate || toDate || fromPtId || toPtId) ? <Pressable onPress={() => { setFromDate(''); setToDate(''); setFromPtId(''); setToPtId(''); setPage(1); }}><Text style={styles.clearFilterText}>Xóa lọc</Text></Pressable> : null}
      </View>

      {filterOpen && <Modal transparent animationType="slide" visible onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.filterOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}><Text style={styles.filterTitle}>Lọc lịch sử chuyển giao</Text><Pressable onPress={() => setFilterOpen(false)} hitSlop={10}><Feather name="x" size={20} color={colors.text} /></Pressable></View>
            <Text style={styles.filterLabel}>Khoảng ngày</Text>
            <View style={styles.dateRow}>
              {(['from', 'to'] as DateField[]).map((field) => {
                const value = field === 'from' ? fromDate : toDate;
                return (
                  <Pressable
                    key={field}
                    style={styles.dateInput}
                    onPress={() => {
                      setDateField(field);
                      const selected = value ? new Date(`${value}T00:00:00`) : new Date();
                      setPickerMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={field === 'from' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}
                  >
                    <Feather name="calendar" size={16} color="#64748B" />
                    <Text style={value ? styles.dateValue : styles.datePlaceholder} numberOfLines={1}>
                      {value ? displayDate(value) : field === 'from' ? 'Từ ngày' : 'Đến ngày'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.filterLabel}>HLV bàn giao</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}><Pressable style={[styles.choicePill, !fromPtId && styles.choicePillActive]} onPress={() => setFromPtId('')}><Text>Tất cả</Text></Pressable>{trainers.map((trainer) => { const id=recordId(trainer); return <Pressable key={id} style={[styles.choicePill, fromPtId===id && styles.choicePillActive]} onPress={() => setFromPtId(id)}><Text numberOfLines={1}>{String(trainer.fullName || trainer.username || id)}</Text></Pressable>; })}</ScrollView>
            <Text style={styles.filterLabel}>HLV tiếp nhận</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}><Pressable style={[styles.choicePill, !toPtId && styles.choicePillActive]} onPress={() => setToPtId('')}><Text>Tất cả</Text></Pressable>{trainers.map((trainer) => { const id=recordId(trainer); return <Pressable key={id} style={[styles.choicePill, toPtId===id && styles.choicePillActive]} onPress={() => setToPtId(id)}><Text numberOfLines={1}>{String(trainer.fullName || trainer.username || id)}</Text></Pressable>; })}</ScrollView>
            <Pressable style={styles.applyFilterButton} onPress={() => { setPage(1); setFilterOpen(false); }}><Text style={styles.applyFilterText}>Áp dụng</Text></Pressable>
          </View>
        </View>
      </Modal>}

      {dateField && (
        <Modal transparent animationType="fade" visible onRequestClose={() => setDateField(null)}>
          <View style={styles.datePickerOverlay}>
            <View style={styles.datePickerSheet}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>{dateField === 'from' ? 'Chọn ngày bắt đầu' : 'Chọn ngày kết thúc'}</Text>
                <Pressable onPress={() => setDateField(null)} hitSlop={10} accessibilityLabel="Đóng bộ chọn ngày">
                  <Feather name="x" size={20} color={colors.text} />
                </Pressable>
              </View>
              <View style={styles.calendarHeader}>
                <Pressable style={styles.calendarNavButton} onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} hitSlop={6}>
                  <Feather name="chevron-left" size={18} color={colors.text} />
                </Pressable>
                <Text style={styles.calendarMonthLabel}>{`Tháng ${pickerMonth.getMonth() + 1}/${pickerMonth.getFullYear()}`}</Text>
                <Pressable style={styles.calendarNavButton} onPress={() => setPickerMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} hitSlop={6}>
                  <Feather name="chevron-right" size={18} color={colors.text} />
                </Pressable>
              </View>
              <View style={styles.weekdayRow}>{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => <Text key={day} style={styles.weekdayText}>{day}</Text>)}</View>
              <View style={styles.calendarGrid}>
                {Array.from({ length: new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0).getDate() + new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1).getDay() }).map((_, index) => {
                  const firstDay = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1).getDay();
                  if (index < firstDay) return <View key={`empty-${index}`} style={styles.calendarDay} />;
                  const day = index - firstDay + 1;
                  const date = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), day);
                  const iso = toIsoDate(date);
                  const selected = (dateField === 'from' ? fromDate : toDate) === iso;
                  return (
                    <Pressable key={iso} style={[styles.calendarDay, selected && styles.calendarDaySelected]} onPress={() => { if (dateField === 'from') setFromDate(iso); else setToDate(iso); setDateField(null); }} accessibilityRole="button" accessibilityLabel={`Chọn ngày ${day}`}>
                      <Text style={[styles.calendarDayText, selected && styles.calendarDayTextSelected]}>{day}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      )}
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

          </View>
        ) : (
          items.map((item) => {
            const tId = recordId(item);
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
                {/* Top Meta */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.timeTag}>
                    <Feather name="calendar" size={12} color="#64748B" />
                    <Text style={styles.timeText}>{timeStr}</Text>
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
                            <Text style={styles.comparePartyName} numberOfLines={2} ellipsizeMode="tail">{pt.name}</Text>
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
                            <Text style={[styles.comparePartyName, { color: colors.primary }]} numberOfLines={2} ellipsizeMode="tail">{pt.name}</Text>
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  searchBox: { flex: 1, minWidth: 0, height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 13, color: colors.text, padding: 0 },
  filterButton: { height: 46, minWidth: 70, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#BAE6FD', backgroundColor: '#F0F9FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  filterButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  activeFilterRow: { minHeight: 4, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeFilterText: { color: colors.textMuted, fontSize: 12 },
  filterOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  filterSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10, maxHeight: '80%' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  filterTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  filterLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 4 },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1, height: 44, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', color: colors.text, fontSize: 12 },
  dateValue: { flex: 1, marginLeft: 8, fontSize: 13, color: colors.text, fontWeight: '600' },
  datePlaceholder: { flex: 1, marginLeft: 8, fontSize: 13, color: colors.textMuted },
  datePickerOverlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.5)' },
  datePickerSheet: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 14 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarNavButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  calendarMonthLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  weekdayRow: { flexDirection: 'row' },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: colors.textMuted },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center' },
  calendarDaySelected: { borderRadius: 22, backgroundColor: colors.primary },
  calendarDayText: { fontSize: 14, color: colors.text },
  calendarDayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  choiceRow: { gap: 8, paddingVertical: 2 },
  choicePill: { maxWidth: 180, minHeight: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', justifyContent: 'center' },
  choicePillActive: { borderColor: colors.primary, backgroundColor: '#F0F9FF' },
  applyFilterButton: { minHeight: 48, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  applyFilterText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
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
    justifyContent: 'flex-start',
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
