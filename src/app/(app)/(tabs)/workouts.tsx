import { LibraryIcon, LibraryIconContext } from '@/components/LibraryIcon';
import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api/client';
import { asRecords, readNumber, readText } from '@/services/journey';
import { customerPlans, recordId, workoutDays, LEVELS } from '@/services/workouts';
import type { CustomerJourney, JsonRecord } from '@/types/domain';
import { Button, Busy, Empty, Notice, Sheet } from '@/components/workouts/Controls';
import { PlanDetails } from '@/components/workouts/PlanDetails';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { colors } from '@/theme';

import { PlanSetup } from '@/components/workouts/PlanSetup';
const COACH = require('../../../../assets/public/3s-coach.png');

// Preserve metadata so server-side page limits cannot hide plans.
async function listAll(path: string): Promise<JsonRecord[]> {
  const rows: JsonRecord[] = [];
  for (let page = 1; ; page++) {
    const result = await api.getPage<JsonRecord>(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=100`);
    const data = asRecords(result.data);
    rows.push(...data);
    if (!data.length || (result.meta ? page >= result.meta.totalPages : data.length < 100)) return rows;
  }
}

function useResource<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const value = await loader();
      if (request === generation.current) setData(value);
    } catch (cause) {
      if (request === generation.current) {
        setError(cause instanceof Error ? cause.message : 'Không tải được giáo án.');
      }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [loader]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        generation.current++;
      };
    }, [refresh])
  );

  return { data, loading, error, refresh };
}

export default function WorkoutsScreen() {
  return <LibraryIconContext.Provider value={true}><WorkoutsScreenContent /></LibraryIconContext.Provider>;
}

function WorkoutsScreenContent() {
  const router = useRouter();
  const { session } = useAuth();
  if (!session) return null;
  if (session.user.role === 'CUSTOMER') return <CustomerWorkouts key={session.user.id} />;
  if (session.user.role === 'PT' || session.user.role === 'ADMIN') return <StaffWorkouts key={session.user.id} />;
  return (
    <Screen onBack={() => router.navigate('/(app)/(tabs)')} title="Giáo án">
      <Notice text="Tài khoản này không có quyền truy cập giáo án." />
    </Screen>
  );
}

function CustomerWorkouts() {
  const router = useRouter();
  const loader = useCallback(() => api.get<CustomerJourney>('/api/me/journey'), []);
  const { data, loading, error, refresh } = useResource(loader);
  const [selected, setSelected] = useState('');
  const plans = customerPlans(data?.plans);
  const plan = plans.find((item) => recordId(item) === selected) || plans[0];


  return (
    <Screen
      onBack={() => router.navigate('/(app)/(tabs)')}
      title="GIÁO ÁN"
      subtitle="Kế hoạch tập luyện được PT công bố cho bạn."
      refreshing={loading}
      onRefresh={refresh}
    >
      {!!error && (
        <View style={{ gap: 8, marginBottom: 16 }}>
          <Notice error text={error} />
          <Button secondary label="Thử lại" onPress={() => void refresh()} />
        </View>
      )}

      {loading && !data ? (
        <Busy />
      ) : plan ? (
        <View style={{ gap: 16 }}>
          {/* Plan Switcher Chips for Customers if multiple plans */}
          {plans.length > 1 && (
            <View style={styles.customerPlanSwitcher}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.planChipsContent}
              >
                {plans.map((item) => {
                  const id = recordId(item);
                  const isSelected = id === recordId(plan);
                  const isArchived = item.lifecycleStatus === 'ARCHIVED';

                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setSelected(id)}
                      style={[
                        styles.planChip,
                        isSelected ? styles.planChipActive : styles.planChipInactive,
                      ]}
                    >
                      <LibraryIcon
                        name={isArchived ? 'archive' : 'target'}
                        size={14}
                        color={isSelected ? '#FFFFFF' : colors.textMuted}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.planChipText,
                          isSelected ? styles.planChipTextActive : styles.planChipTextInactive,
                        ]}
                      >
                        {readText(item, ['title'])}
                        {isArchived ? ' (Lịch sử)' : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <PlanDetails key={recordId(plan)} plan={plan} />
        </View>
      ) : !error ? (
        <Empty
          title="Chưa có giáo án"
          text="Giáo án sẽ xuất hiện sau khi PT công bố cho bạn."
          action="Tải lại"
          onAction={() => void refresh()}
        />
      ) : null}
    </Screen>
  );

}

function StaffWorkouts() {
  const router = useRouter();
  const loader = useCallback(() => listAll('/api/workout-templates'), []);
  const { data, loading, error, refresh } = useResource(loader);
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState('ACTIVE');
  const [detail, setDetail] = useState<JsonRecord>();
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [deletingPlan, setDeletingPlan] = useState<JsonRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);

  const templates = data || [];
  const query = search.trim().toLocaleLowerCase('vi');
  const items = templates.filter(
    (item) =>
      (!status || item.status === status) &&
      `${readText(item, ['title'])} ${readText(item, ['goal'])}`.toLocaleLowerCase('vi').includes(query)
  );

  function requestDelete(item: JsonRecord) {
    setActionError('');
    setMessage('');
    setDeletingPlan(item);
  }

  async function handleConfirmDelete() {
    if (!deletingPlan || actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setActionError('');
    try {
      const path = '/api/workout-templates/' + recordId(deletingPlan);
      const current = await api.get<JsonRecord>(path);
      if (current.status !== 'ARCHIVED') await api.patch(path + '/archive');
      try {
        await api.delete(path);
      } catch (cause) {
        await refresh();
        throw new Error('Giáo án đã lưu trữ nhưng chưa xóa được. ' + (cause instanceof Error ? cause.message : 'Vui lòng thử lại.'));
      }
      setDeletingPlan(null);
      setDetail(undefined);
      setMessage('Đã xóa giáo án thành công.');
      await refresh();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không thực hiện được thao tác xóa giáo án.');
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  const statusOptions = [
    { key: 'ACTIVE', label: 'Đang dùng' },
    { key: 'ARCHIVED', label: 'Lưu trữ' },
    { key: '', label: 'Tất cả' },
  ];

  return (
    <Screen
      onBack={() => router.navigate('/(app)/(tabs)')}
      title="GIÁO ÁN"
      refreshing={loading}
      onRefresh={refresh}
    >
      <View style={styles.staffContainer}>
        {/* Compact Quick Action Toolbar */}
        <View style={styles.compactToolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tạo giáo án mới"
            onPress={() => setCreating(true)}
            style={({ pressed }) => [
              styles.toolbarBtn,
              styles.toolbarBtnPrimary,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <LibraryIcon name="plus" size={15} color="#FFFFFF" />
            <Text numberOfLines={1} style={styles.toolbarBtnPrimaryText}>
              Tạo mới
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tạo giáo án bằng AI"
            onPress={() => router.push('/(app)/ai-workout')}
            style={({ pressed }) => [
              styles.toolbarBtn,
              styles.toolbarBtnAi,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <LibraryIcon name="zap" size={14} color={colors.primary} />
            <Text numberOfLines={1} style={styles.toolbarBtnAiText}>
              Tạo bằng AI
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở Thư viện bài tập"
            onPress={() => router.push('/(app)/exercises')}
            style={({ pressed }) => [
              styles.toolbarBtn,
              styles.toolbarBtnSecondary,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <LibraryIcon name="book-open" size={14} color={colors.text} />
            <Text numberOfLines={1} style={styles.toolbarBtnSecondaryText}>
              Thư viện
            </Text>
          </Pressable>
        </View>

        {!!message && <Notice tone="success" text={message} />}
        {!!actionError && !deletingPlan && <Notice error text={actionError} />}
        {!!error && (
          <View style={{ gap: 8 }}>
            <Notice error text={error} />
            <Button secondary label="Thử lại" onPress={() => void refresh()} />
          </View>
        )}

        {/* Search Input Container */}
        <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
          <LibraryIcon name="search" size={18} color={searchFocused ? colors.primary : colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên giáo án hoặc mục tiêu..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            accessibilityLabel="Tìm kiếm giáo án"
          />
          {!!search && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa từ khóa"
              onPress={() => setSearch('')}
              style={styles.clearSearchBtn}
            >
              <LibraryIcon name="x" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Status Filter Chips */}
        <View style={styles.statusFilterRow}>
          {statusOptions.map((opt) => {
            const isSelected = status === opt.key;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setStatus(opt.key)}
                style={[
                  styles.statusChip,
                  isSelected ? styles.statusChipActive : styles.statusChipInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    isSelected ? styles.statusChipTextActive : styles.statusChipTextInactive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Templates Count Header */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listCountText}>
            {items.length} giáo án
            {status === 'ACTIVE' ? ' đang áp dụng' : status === 'ARCHIVED' ? ' đã lưu trữ' : ''}
          </Text>
        </View>

        {/* Templates List */}
        {loading && !data ? (
          <Busy />
        ) : (
          <View style={{ gap: 12 }}>
            {items.map((item) => {
              const daysCount = workoutDays(item).length;
              const isArchived = item.status === 'ARCHIVED';
              const levelKey = readText(item, ['level']) as keyof typeof LEVELS;
              const levelLabel = LEVELS[levelKey] || readText(item, ['level'], 'Cá nhân hóa');

              return (
                <View key={recordId(item)} style={styles.templateCard}>
                  {/* Top Card Row */}
                  <View style={styles.templateCardHeaderRow}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xem chi tiết giáo án ${readText(item, ['title'])}`}
                      onPress={() => setDetail(item)}
                      style={({ pressed }) => [
                        styles.templateMainPressable,
                        { opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      {/* Coach Thumbnail */}
                      <View style={styles.templateThumbnailContainer}>
                        <Image
                          source={COACH}
                          accessible={false}
                          style={styles.templateThumbnail}
                          resizeMode="cover"
                        />
                      </View>

                      {/* Title & Status */}
                      <View style={styles.templateInfo}>
                        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.templateTitle}>
                          {readText(item, ['title'])}
                        </Text>

                        <View style={styles.templateStatusRow}>
                          <View
                            style={[
                              styles.statusBadge,
                              isArchived ? styles.statusBadgeArchived : styles.statusBadgeActive,
                            ]}
                          >
                            <LibraryIcon
                              name={isArchived ? 'archive' : 'check-circle'}
                              size={11}
                              color={isArchived ? colors.textMuted : colors.success}
                            />
                            <Text
                              style={[
                                styles.statusBadgeText,
                                isArchived ? styles.statusBadgeTextArchived : styles.statusBadgeTextActive,
                              ]}
                            >
                              {isArchived ? 'ĐÃ LƯU TRỮ' : 'ĐANG DÙNG'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Pressable>

                    {/* Quick Actions (Sửa & Xóa đồng bộ kích thước) */}
                    <View style={styles.templateActionsRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Chỉnh sửa giáo án ${readText(item, ['title'])}`}
                        onPress={() => {
                          const id = recordId(item);
                          router.push({ pathname: '/(app)/workout-studio', params: { id } });
                        }}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.quickEditBtn,
                          pressed && { opacity: 0.7, backgroundColor: '#E0F2FE' },
                        ]}
                      >
                        <LibraryIcon name="edit-2" size={13} color={colors.primary} />
                        <Text style={styles.quickEditBtnText}>Sửa</Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Xóa giáo án ${readText(item, ['title'])}`}
                        onPress={() => requestDelete(item)}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.quickDeleteBtn,
                          pressed && { opacity: 0.7, backgroundColor: '#FEE2E2' },
                        ]}
                      >
                        <LibraryIcon name="trash-2" size={13} color={colors.danger} />
                        <Text style={styles.quickDeleteBtnText}>Xóa</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Goal description (tap to view detail) */}
                  {!!readText(item, ['goal']) && (
                    <Pressable onPress={() => setDetail(item)}>
                      <Text numberOfLines={2} ellipsizeMode="tail" style={styles.templateGoal}>
                        {readText(item, ['goal'])}
                      </Text>
                    </Pressable>
                  )}

                  {/* Meta footer row: Sessions · Duration · Level */}
                  <Pressable
                    onPress={() => setDetail(item)}
                    style={styles.templateMetaRow}
                  >
                    <View style={styles.templateMetaPill}>
                      <LibraryIcon name="calendar" size={12} color={colors.primaryDark} />
                      <Text style={styles.templateMetaPillText}>{daysCount} buổi tập</Text>
                    </View>

                    {readNumber(item, ['durationDays']) !== null && (
                      <View style={styles.templateMetaPill}>
                        <LibraryIcon name="clock" size={12} color={colors.textMuted} />
                        <Text style={styles.templateMetaPillText}>{readNumber(item, ['durationDays'])} ngày</Text>
                      </View>
                    )}

                    <View style={styles.templateMetaPill}>
                      <LibraryIcon name="award" size={12} color={colors.textMuted} />
                      <Text style={styles.templateMetaPillText}>{levelLabel}</Text>
                    </View>
                  </Pressable>
                </View>
              );
            })}

            {!items.length && !error && (
              <Empty
                title="Chưa có kết quả"
                text="Thử đổi từ khóa hoặc trạng thái để tìm giáo án phù hợp."
                action="Đặt lại bộ lọc"
                onAction={() => {
                  setSearch('');
                  setStatus('');
                }}
              />
            )}
          </View>
        )}

        {/* Plan Detail Sheet */}
        {detail && (
          <Sheet
            title="Chi tiết giáo án"
            onClose={() => setDetail(undefined)}
            footer={
              <View style={styles.detailSheetFooterRow}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Sửa giáo án"
                    icon="edit-2"
                    onPress={() => {
                      const id = recordId(detail);
                      setDetail(undefined);
                      router.push({ pathname: '/(app)/workout-studio', params: { id } });
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    secondary
                    destructive
                    label="Xóa giáo án"
                    icon="trash-2"
                    onPress={() => requestDelete(detail)}
                  />
                </View>
              </View>
            }
          >
            <PlanDetails plan={detail} />
          </Sheet>
        )}

        {/* Plan Setup Modal */}
        {creating && <PlanSetup onClose={() => setCreating(false)} onNext={(value) => { setCreating(false); router.push({ pathname: '/(app)/workout-studio', params: { ...value } }); }} />}

        {/* Popup Xác nhận Xóa Giáo án */}
        <ConfirmDeleteModal
          visible={!!deletingPlan}
          title="Xóa giáo án?"
          message={
            deletingPlan
              ? `Xóa vĩnh viễn giáo án “${readText(deletingPlan, ['title'])}”? Thao tác này không thể hoàn tác. Giáo án đang dùng sẽ được lưu trữ trước khi xóa.`
              : ''
          }
          confirmLabel="Xóa giáo án"
          cancelLabel="Hủy"
          loading={busy}
          error={actionError}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => {
            if (!busy) {
              setDeletingPlan(null);
              setActionError('');
            }
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  staffContainer: {
    gap: 14,
  },
  compactToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolbarBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  toolbarBtnPrimary: {
    backgroundColor: colors.primary,
  },
  toolbarBtnPrimaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  toolbarBtnAi: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  toolbarBtnAiText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  toolbarBtnSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toolbarBtnSecondaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },
  searchBox: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchBoxFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: colors.text,
  },
  clearSearchBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusChipActive: {
    backgroundColor: colors.primary,
  },
  statusChipInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  statusChipTextInactive: {
    color: colors.textMuted,
  },
  listHeaderRow: {
    paddingVertical: 2,
  },
  listCountText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.textMuted,
  },
  templateCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  templateCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  templateMainPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  templateThumbnailContainer: {
    width: 54,
    height: 54,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  templateThumbnail: {
    width: '100%',
    height: '100%',
  },
  templateInfo: {
    flex: 1,
    gap: 6,
  },
  templateTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    textTransform: 'uppercase',
  },
  templateStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeActive: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeArchived: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.3,
  },
  statusBadgeTextActive: {
    color: colors.success,
  },
  statusBadgeTextArchived: {
    color: colors.textMuted,
  },
  templateActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickEditBtn: {
    minHeight: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  quickEditBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  quickDeleteBtn: {
    minHeight: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  quickDeleteBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.danger,
  },
  templateGoal: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
  },
  templateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  templateMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
  },
  templateMetaPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.textMuted,
  },
  detailSheetFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customerPlanSwitcher: {
    marginHorizontal: -4,
  },
  planChipsContent: {
    paddingHorizontal: 4,
    gap: 8,
    alignItems: 'center',
  },
  planChip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planChipActive: {
    backgroundColor: colors.primary,
  },
  planChipInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  planChipTextActive: {
    color: '#FFFFFF',
  },
  planChipTextInactive: {
    color: colors.textMuted,
  },
});
