import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ tiếp nhận' },
  { value: 'ACCEPTED', label: 'Đã tiếp nhận' },
  { value: 'REJECTED', label: 'Đã từ chối' },
  { value: 'ADMIN_FORCED', label: 'Admin điều chuyển' },
];

const getStatusBadge = (statusStr: string) => {
  switch (statusStr) {
    case 'ACCEPTED':
      return { label: 'Đã tiếp nhận', bg: '#DCFCE7', color: '#16A34A', icon: 'check-circle' as const };
    case 'REJECTED':
      return { label: 'Đã từ chối', bg: '#FEE2E2', color: '#EF4444', icon: 'x-circle' as const };
    case 'ADMIN_FORCED':
      return { label: 'Admin điều chuyển', bg: '#E0F2FE', color: '#0284C7', icon: 'shield' as const };
    case 'CANCELLED':
      return { label: 'Đã hủy', bg: '#F1F5F9', color: '#64748B', icon: 'slash' as const };
    case 'PENDING':
    default:
      return { label: 'Chờ tiếp nhận', bg: '#FEF3C7', color: '#D97706', icon: 'clock' as const };
  }
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

  // Applied filter state
  const [appliedStatus, setAppliedStatus] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');
  const [appliedFromPtId, setAppliedFromPtId] = useState('');
  const [appliedToPtId, setAppliedToPtId] = useState('');

  // Draft filter state inside modal
  const [draftStatus, setDraftStatus] = useState('');
  const [draftFromDate, setDraftFromDate] = useState('');
  const [draftToDate, setDraftToDate] = useState('');
  const [draftFromPtId, setDraftFromPtId] = useState('');
  const [draftToPtId, setDraftToPtId] = useState('');

  const [trainers, setTrainers] = useState<AdminRecord[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [ptPickerTarget, setPtPickerTarget] = useState<'from' | 'to' | null>(null);
  const [ptFilterSearch, setPtFilterSearch] = useState('');
  const [dateField, setDateField] = useState<DateField | null>(null);
  const [pickerMonth, setPickerMonth] = useState(() => new Date());

  // Selected transfer for detail sheet
  const [selectedTransfer, setSelectedTransfer] = useState<AdminRecord | null>(null);

  const version = useRef(0);

  const transferPath = useCallback((currentPage: number) => {
    const params = new URLSearchParams({ page: String(currentPage), limit: '20' });
    if (appliedKeyword.trim()) params.set('keyword', appliedKeyword.trim());
    if (appliedStatus) params.set('status', appliedStatus);
    if (appliedFromDate) params.set('fromDate', appliedFromDate);
    if (appliedToDate) params.set('toDate', appliedToDate);
    if (appliedFromPtId) params.set('fromPtId', appliedFromPtId);
    if (appliedToPtId) params.set('toPtId', appliedToPtId);
    return resource.path + '?' + params.toString();
  }, [resource.path, appliedKeyword, appliedStatus, appliedFromDate, appliedToDate, appliedFromPtId, appliedToPtId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setAppliedKeyword(keyword.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    let active = true;
    void api.getPage<AdminRecord>('/api/users?role=PT&limit=100')
      .then((result) => { if (active) setTrainers(result.data || []); })
      .catch(() => {
        if (active) {
          void api.getPage<AdminRecord>(listPath(resources.pts, 1, '', ''))
            .then((res) => { if (active) setTrainers(res.data || []); })
            .catch(() => {});
        }
      });
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

  const handleOpenFilter = () => {
    setDraftStatus(appliedStatus);
    setDraftFromDate(appliedFromDate);
    setDraftToDate(appliedToDate);
    setDraftFromPtId(appliedFromPtId);
    setDraftToPtId(appliedToPtId);
    setFilterOpen(true);
  };

  const handleApplyFilter = () => {
    setAppliedStatus(draftStatus);
    setAppliedFromDate(draftFromDate);
    setAppliedToDate(draftToDate);
    setAppliedFromPtId(draftFromPtId);
    setAppliedToPtId(draftToPtId);
    setPage(1);
    setFilterOpen(false);
  };

  const handleResetDraft = () => {
    setDraftStatus('');
    setDraftFromDate('');
    setDraftToDate('');
    setDraftFromPtId('');
    setDraftToPtId('');
  };

  const handleClearAppliedFilter = () => {
    setAppliedStatus('');
    setAppliedFromDate('');
    setAppliedToDate('');
    setAppliedFromPtId('');
    setAppliedToPtId('');
    setPage(1);
  };

  const hasActiveFilter = Boolean(
    appliedStatus || appliedFromDate || appliedToDate || appliedFromPtId || appliedToPtId
  );
  const hasDraftFilter = Boolean(
    draftStatus || draftFromDate || draftToDate || draftFromPtId || draftToPtId
  );

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

  const getTrainerName = (id: string) => {
    if (!id) return 'Tất cả HLV';
    const found = trainers.find((t) => recordId(t) === id);
    return found ? String(found.fullName || found.username || id) : id;
  };

  const filteredTrainers = trainers.filter((t) => {
    const q = ptFilterSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      String(t.fullName || '').toLowerCase().includes(q) ||
      String(t.username || '').toLowerCase().includes(q) ||
      String(t.phone || '').includes(q)
    );
  });

  // Client-side filtering fallback ensures immediate precision even if server filter behaves loosely
  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Status filter
      if (appliedStatus && item.status !== appliedStatus) {
        return false;
      }
      // 2. From date filter
      if (appliedFromDate && item.createdAt) {
        const itemDate = toIsoDate(new Date(String(item.createdAt)));
        if (itemDate < appliedFromDate) return false;
      }
      // 3. To date filter
      if (appliedToDate && item.createdAt) {
        const itemDate = toIsoDate(new Date(String(item.createdAt)));
        if (itemDate > appliedToDate) return false;
      }
      // 4. From PT filter
      if (appliedFromPtId) {
        const fromVal = item.fromPtId;
        const fromId =
          typeof fromVal === 'object' && fromVal !== null
            ? recordId(fromVal as AdminRecord)
            : String(fromVal || '');
        if (fromId !== appliedFromPtId) return false;
      }
      // 5. To PT filter
      if (appliedToPtId) {
        const toVal = item.toPtId;
        const toId =
          typeof toVal === 'object' && toVal !== null
            ? recordId(toVal as AdminRecord)
            : String(toVal || '');
        if (toId !== appliedToPtId) return false;
      }
      // 6. Keyword filter fallback
      if (appliedKeyword.trim()) {
        const q = appliedKeyword.trim().toLowerCase();
        const customer = getPartyInfo(item.customerId);
        const fromPt = getPartyInfo(item.fromPtId);
        const toPt = getPartyInfo(item.toPtId);
        const reason = String(item.reason || '').toLowerCase();
        const match =
          customer.name.toLowerCase().includes(q) ||
          Boolean(customer.phone && customer.phone.includes(q)) ||
          fromPt.name.toLowerCase().includes(q) ||
          toPt.name.toLowerCase().includes(q) ||
          reason.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [items, appliedStatus, appliedFromDate, appliedToDate, appliedFromPtId, appliedToPtId, appliedKeyword]);

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
          {keyword ? (
            <Pressable onPress={() => setKeyword('')} hitSlop={8}>
              <Feather name="x" size={16} color="#64748B" />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={[styles.filterButton, hasActiveFilter && styles.filterButtonActive]}
          onPress={handleOpenFilter}
          accessibilityLabel="Mở bộ lọc lịch sử chuyển giao"
        >
          <Feather name="sliders" size={16} color={colors.primary} />
          <Text style={styles.filterButtonText}>Lọc</Text>
          {hasActiveFilter && <View style={styles.filterActiveDot} />}
        </Pressable>
      </View>

      {hasActiveFilter ? (
        <View style={styles.activeFilterRow}>
          <View style={styles.activeFilterBadge}>
            <Feather name="filter" size={12} color={colors.primary} />
            <Text style={styles.activeFilterText} numberOfLines={1}>
              {[
                appliedStatus ? STATUS_OPTIONS.find((s) => s.value === appliedStatus)?.label : null,
                appliedFromDate ? `Từ ${displayDate(appliedFromDate)}` : null,
                appliedToDate ? `Đến ${displayDate(appliedToDate)}` : null,
                appliedFromPtId ? `HLV giao: ${getTrainerName(appliedFromPtId)}` : null,
                appliedToPtId ? `HLV nhận: ${getTrainerName(appliedToPtId)}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Pressable onPress={handleClearAppliedFilter} hitSlop={6}>
            <Text style={styles.clearFilterText}>Xóa lọc</Text>
          </Pressable>
        </View>
      ) : null}

      {filterOpen && (
        <Modal
          transparent
          animationType="slide"
          visible
          onRequestClose={() => {
            if (ptPickerTarget) setPtPickerTarget(null);
            else setFilterOpen(false);
          }}
        >
          <View style={styles.filterOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => {
                if (ptPickerTarget) setPtPickerTarget(null);
                else setFilterOpen(false);
              }}
            />
            <View style={styles.filterSheet}>
              {ptPickerTarget ? (
                /* BOTTOM SHEET: CHỌN HLV BÀN GIAO / TIẾP NHẬN */
                <View style={styles.pickerView}>
                  <View style={styles.sheetHandle} />
                  <View style={styles.filterHeader}>
                    <Pressable
                      onPress={() => setPtPickerTarget(null)}
                      style={styles.sheetBackBtn}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Quay lại"
                    >
                      <Feather name="arrow-left" size={18} color={colors.text} />
                    </Pressable>
                    <Text style={styles.filterTitle}>
                      {ptPickerTarget === 'from' ? 'Chọn HLV bàn giao' : 'Chọn HLV tiếp nhận'}
                    </Text>
                    <Pressable
                      onPress={() => {
                        setPtPickerTarget(null);
                        setFilterOpen(false);
                      }}
                      hitSlop={8}
                      style={styles.sheetCloseBtnMini}
                      accessibilityRole="button"
                      accessibilityLabel="Đóng"
                    >
                      <Feather name="x" size={18} color={colors.text} />
                    </Pressable>
                  </View>

                  <View style={styles.ptSearchBox}>
                    <Feather name="search" size={15} color="#94A3B8" />
                    <TextInput
                      value={ptFilterSearch}
                      onChangeText={setPtFilterSearch}
                      placeholder="Tìm theo tên HLV, SĐT..."
                      placeholderTextColor="#94A3B8"
                      style={styles.ptSearchInput}
                    />
                    {ptFilterSearch ? (
                      <Pressable onPress={() => setPtFilterSearch('')} hitSlop={6}>
                        <Feather name="x-circle" size={15} color="#94A3B8" />
                      </Pressable>
                    ) : null}
                  </View>

                  <ScrollView style={styles.ptList} showsVerticalScrollIndicator={false}>
                    {/* Option: Tất cả HLV */}
                    <Pressable
                      style={[
                        styles.ptItem,
                        (ptPickerTarget === 'from' ? !draftFromPtId : !draftToPtId) && styles.ptItemActive,
                      ]}
                      onPress={() => {
                        if (ptPickerTarget === 'from') setDraftFromPtId('');
                        else setDraftToPtId('');
                        setPtPickerTarget(null);
                      }}
                    >
                      <View style={styles.ptAvatarAll}>
                        <Feather name="users" size={15} color={colors.primary} />
                      </View>
                      <Text
                        style={[
                          styles.ptName,
                          (ptPickerTarget === 'from' ? !draftFromPtId : !draftToPtId) && styles.ptNameActive,
                        ]}
                      >
                        Tất cả HLV
                      </Text>
                      {(ptPickerTarget === 'from' ? !draftFromPtId : !draftToPtId) && (
                        <Feather name="check" size={16} color={colors.primary} />
                      )}
                    </Pressable>

                    {filteredTrainers.length === 0 ? (
                      <View style={styles.ptEmptyBox}>
                        <Text style={styles.ptEmptyText}>Không tìm thấy HLV phù hợp</Text>
                      </View>
                    ) : (
                      filteredTrainers.map((trainer) => {
                        const id = recordId(trainer);
                        const isSelected = (ptPickerTarget === 'from' ? draftFromPtId : draftToPtId) === id;
                        const initial = String(trainer.fullName || trainer.username || 'PT')
                          .charAt(0)
                          .toUpperCase();
                        return (
                          <Pressable
                            key={id}
                            style={[styles.ptItem, isSelected && styles.ptItemActive]}
                            onPress={() => {
                              if (ptPickerTarget === 'from') setDraftFromPtId(id);
                              else setDraftToPtId(id);
                              setPtPickerTarget(null);
                            }}
                          >
                            <View style={styles.ptAvatar}>
                              <Text style={styles.ptAvatarText}>{initial}</Text>
                            </View>
                            <View style={styles.ptInfo}>
                              <Text
                                style={[styles.ptName, isSelected && styles.ptNameActive]}
                                numberOfLines={1}
                              >
                                {String(trainer.fullName || trainer.username || id)}
                              </Text>
                              {trainer.phone ? (
                                <Text style={styles.ptSubText} numberOfLines={1}>
                                  {String(trainer.phone)}
                                </Text>
                              ) : null}
                            </View>
                            {isSelected && (
                              <Feather name="check" size={16} color={colors.primary} />
                            )}
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>
                </View>
              ) : (
                /* MAIN FILTER SHEET */
                <View style={styles.filterMainView}>
                  <View style={styles.sheetHandle} />
                  <View style={styles.filterHeader}>
                    <Text style={styles.filterTitle}>Lọc lịch sử chuyển giao</Text>
                    <Pressable
                      onPress={() => setFilterOpen(false)}
                      hitSlop={8}
                      style={styles.sheetCloseBtnMini}
                      accessibilityRole="button"
                      accessibilityLabel="Đóng"
                    >
                      <Feather name="x" size={18} color={colors.text} />
                    </Pressable>
                  </View>

                  {/* Filter: Trạng thái */}
                  <Text style={styles.filterLabel}>Trạng thái</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statusChipsRow}
                  >
                    {STATUS_OPTIONS.map((opt) => {
                      const isSelected = draftStatus === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          style={[styles.statusChip, isSelected && styles.statusChipActive]}
                          onPress={() => setDraftStatus(opt.value)}
                        >
                          <Text
                            style={[
                              styles.statusChipText,
                              isSelected && styles.statusChipTextActive,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Filter: Khoảng ngày */}
                  <Text style={styles.filterLabel}>Khoảng ngày</Text>
                  <View style={styles.dateRow}>
                    {(['from', 'to'] as DateField[]).map((field) => {
                      const value = field === 'from' ? draftFromDate : draftToDate;
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
                          <Feather name="calendar" size={15} color="#64748B" />
                          <Text style={value ? styles.dateValue : styles.datePlaceholder} numberOfLines={1}>
                            {value ? displayDate(value) : field === 'from' ? 'Từ ngày' : 'Đến ngày'}
                          </Text>
                          {value ? (
                            <Pressable
                              onPress={(e) => {
                                e.stopPropagation();
                                if (field === 'from') setDraftFromDate('');
                                else setDraftToDate('');
                              }}
                              hitSlop={6}
                            >
                              <Feather name="x" size={14} color="#94A3B8" />
                            </Pressable>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Filter: HLV bàn giao */}
                  <Text style={styles.filterLabel}>HLV bàn giao</Text>
                  <Pressable
                    style={styles.ptSelectorBtn}
                    onPress={() => {
                      setPtPickerTarget('from');
                      setPtFilterSearch('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Chọn HLV bàn giao"
                  >
                    <View style={styles.ptSelectorLeft}>
                      <View style={[styles.ptSelectorIconBox, draftFromPtId ? styles.ptSelectorIconBoxActive : null]}>
                        <Feather name="user-minus" size={14} color={draftFromPtId ? colors.primary : '#64748B'} />
                      </View>
                      <Text
                        style={[styles.ptSelectorText, draftFromPtId ? styles.ptSelectorTextActive : null]}
                        numberOfLines={1}
                      >
                        {getTrainerName(draftFromPtId)}
                      </Text>
                    </View>
                    <Feather name="chevron-down" size={16} color="#94A3B8" />
                  </Pressable>

                  {/* Filter: HLV tiếp nhận */}
                  <Text style={styles.filterLabel}>HLV tiếp nhận</Text>
                  <Pressable
                    style={styles.ptSelectorBtn}
                    onPress={() => {
                      setPtPickerTarget('to');
                      setPtFilterSearch('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Chọn HLV tiếp nhận"
                  >
                    <View style={styles.ptSelectorLeft}>
                      <View style={[styles.ptSelectorIconBox, draftToPtId ? styles.ptSelectorIconBoxActive : null]}>
                        <Feather name="user-check" size={14} color={draftToPtId ? colors.primary : '#64748B'} />
                      </View>
                      <Text
                        style={[styles.ptSelectorText, draftToPtId ? styles.ptSelectorTextActive : null]}
                        numberOfLines={1}
                      >
                        {getTrainerName(draftToPtId)}
                      </Text>
                    </View>
                    <Feather name="chevron-down" size={16} color="#94A3B8" />
                  </Pressable>

                  <View style={styles.filterActionsRow}>
                    {hasDraftFilter ? (
                      <Pressable
                        style={styles.resetFilterButton}
                        onPress={handleResetDraft}
                      >
                        <Text style={styles.resetFilterText}>Đặt lại</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[
                        styles.applyFilterButton,
                        !hasDraftFilter && { flex: 1 },
                      ]}
                      onPress={handleApplyFilter}
                    >
                      <Text style={styles.applyFilterText}>Áp dụng</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

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
                  const selected = (dateField === 'from' ? draftFromDate : draftToDate) === iso;
                  return (
                    <Pressable
                      key={iso}
                      style={[styles.calendarDay, selected && styles.calendarDaySelected]}
                      onPress={() => {
                        if (dateField === 'from') setDraftFromDate(iso);
                        else setDraftToDate(iso);
                        setDateField(null);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Chọn ngày ${day}`}
                    >
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
        ) : displayedItems.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="swap-horizontal-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>
              {hasActiveFilter || appliedKeyword
                ? 'Chưa có lịch sử chuyển giao nào phù hợp bộ lọc.'
                : 'Chưa có lịch sử chuyển giao nào.'}
            </Text>
            {hasActiveFilter || appliedKeyword ? (
              <Pressable
                style={styles.clearFilterBtn}
                onPress={() => {
                  handleClearAppliedFilter();
                  setKeyword('');
                  setAppliedKeyword('');
                }}
              >
                <Text style={styles.clearFilterText}>Xóa tất cả bộ lọc</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          displayedItems.map((item) => {
            const tId = recordId(item);
            const customer = getPartyInfo(item.customerId);
            const fromPt = getPartyInfo(item.fromPtId);
            const toPt = getPartyInfo(item.toPtId);
            const timeStr = formatDate(item.createdAt);
            const badge = getStatusBadge(String(item.status || ''));

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
  filterButtonActive: { borderColor: colors.primary, backgroundColor: '#E0F2FE' },
  filterActiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginLeft: -2 },
  filterButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  activeFilterRow: { minHeight: 28, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  activeFilterBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  activeFilterText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  statusChipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  statusChipActive: { borderColor: colors.primary, backgroundColor: '#F0F9FF' },
  statusChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  statusChipTextActive: { color: colors.primary, fontWeight: '700' },
  filterOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.5)' },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 18,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  filterMainView: {
    gap: 10,
  },
  pickerView: {
    gap: 10,
    maxHeight: 480,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sheetCloseBtnMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  dateValue: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  datePlaceholder: {
    flex: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  ptSelectorBtn: {
    height: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ptSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 8,
  },
  ptSelectorIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptSelectorIconBoxActive: {
    backgroundColor: '#E0F2FE',
  },
  ptSelectorText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#64748B',
    flex: 1,
  },
  ptSelectorTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  filterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  resetFilterButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetFilterText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  applyFilterButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFilterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ptSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    gap: 6,
    marginBottom: 4,
  },
  ptSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: colors.text,
    paddingVertical: 0,
  },
  ptList: {
    maxHeight: 280,
  },
  ptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  ptItemActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  ptAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptAvatarAll: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  ptInfo: {
    flex: 1,
    minWidth: 0,
  },
  ptName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  ptNameActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  ptSubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  ptEmptyBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  ptEmptyText: {
    fontSize: 12.5,
    color: colors.textMuted,
  },
  datePickerOverlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.5)' },
  datePickerSheet: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 14 },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarNavButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  calendarMonthLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  weekdayRow: { flexDirection: 'row' },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: colors.textMuted },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center' },
  calendarDaySelected: { borderRadius: 22, backgroundColor: colors.primary },
  calendarDayText: { fontSize: 14, color: colors.text },
  calendarDayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
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
