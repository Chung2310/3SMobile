import { ErrorPopup, SuccessPopup } from './ErrorPopup';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LibraryIcon, LibraryIconContext } from '@/components/LibraryIcon';
import { api, type ApiPage } from '@/services/api/client';
import { asRecords, readText } from '@/services/journey';
import { EMPTY_EXERCISE_FILTERS, exerciseForPlan, exerciseQuery, exerciseVideos, stringList, videoLink, type ExerciseFilters } from '@/services/exercises';
import { LEVELS, TRACKING, recordId } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { colors } from '@/theme';
import { Button, Busy, Empty, Notice, Sheet } from '@/components/workouts/Controls';
import { ConfirmDeleteModal } from '@/components/ConfirmDeleteModal';
import { ExerciseForm } from './ExerciseForm';
import { MuscleGroups } from './MuscleGroups';

export function ExerciseLibrary(props: { onSelect?: (exercise: JsonRecord) => void }) {
  return <LibraryIconContext.Provider value={true}><ExerciseLibraryContent {...props} /></LibraryIconContext.Provider>;
}

function ExerciseLibraryContent({ onSelect }: { onSelect?: (exercise: JsonRecord) => void }) {
  const [filters, setFilters] = useState<ExerciseFilters>({ ...EMPTY_EXERCISE_FILTERS });
  const [groupRecords, setGroupRecords] = useState<JsonRecord[]>([]);
  const groups = groupRecords.map((item) => readText(item, ['name'])).filter(Boolean);
  const [groupManager, setGroupManager] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [detail, setDetail] = useState<JsonRecord>();
  const [createWithAi, setCreateWithAi] = useState(false);
  const [editing, setEditing] = useState<JsonRecord | null | undefined>();
  const [deleting, setDeleting] = useState<JsonRecord>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);

  const alive = useRef(true);
  const lock = useRef(false);

  const loadGroups = useCallback(async () => {
    setGroupError('');
    try {
      const result = asRecords(await api.get('/api/exercises/muscle-groups'));
      if (alive.current) setGroupRecords(result);
    } catch (cause) {
      if (alive.current) setGroupError(cause instanceof Error ? cause.message : 'Không tải được nhóm cơ.');
    }
  }, []);

  useEffect(() => {
    const mounted = alive;
    mounted.current = true;
    const timer = setTimeout(() => void loadGroups(), 0);
    return () => {
      mounted.current = false;
      clearTimeout(timer);
    };
  }, [loadGroups]);

  function openDetail(item: JsonRecord) {
    setActionError('');
    setDetail(item);
  }

  function openEdit(item: JsonRecord) {
    if (item.canManage !== true || !recordId(item)) return;
    setActionError('');
    setMessage('');
    setCreateWithAi(false);
    setEditing(item);
  }

  function select(item: JsonRecord) {
    try {
      exerciseForPlan(item);
      onSelect?.(item);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không chọn được bài tập.');
    }
  }

  async function remove() {
    if (!deleting || lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError('');
    try {
      await api.delete(`/api/exercises/${recordId(deleting)}`);
      setDeleting(undefined);
      setDetail(undefined);
      setMessage('Đã xóa bài tập khỏi thư viện.');
      setRevision((value) => value + 1);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Không xóa được bài tập.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  // Count active filters (muscleGroup, level, defaultTrackingType)
  const activeFilterCount = [filters.muscleGroup, filters.level, filters.defaultTrackingType].filter(Boolean).length;

  return (
    <View style={styles.container}>
      {/* Search & Filter bar row */}
      <View style={styles.searchRow}>
        <View style={[styles.searchInputContainer, searchFocused && styles.searchInputFocused]}>
          <LibraryIcon name="search" size={18} color={searchFocused ? colors.primary : colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên bài tập, kỹ thuật..."
            placeholderTextColor={colors.textMuted}
            value={filters.keyword}
            onChangeText={(keyword) => setFilters((current) => ({ ...current, keyword }))}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            accessibilityLabel="Tìm bài tập"
          />
          {!!filters.keyword && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa từ khóa tìm kiếm"
              onPress={() => setFilters((current) => ({ ...current, keyword: '' }))}
              style={styles.clearBtn}
            >
              <LibraryIcon name="x" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Bộ lọc bài tập"
          onPress={() => setFilterOpen(true)}
          style={({ pressed }) => [
            styles.filterBtn,
            activeFilterCount > 0 && styles.filterBtnActive,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <LibraryIcon
            name="sliders"
            size={18}
            color={activeFilterCount > 0 ? '#FFFFFF' : colors.text}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Active Filter Tags Summary (if any filters applied) */}
      {activeFilterCount > 0 && (
        <View style={styles.activeFiltersRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFiltersContent}
          >
            {!!filters.muscleGroup && (
              <View style={styles.activeFilterPill}>
                <Text numberOfLines={1} style={styles.activeFilterPillText}>
                  {filters.muscleGroup}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Bỏ lọc nhóm cơ ${filters.muscleGroup}`}
                  onPress={() => setFilters((f) => ({ ...f, muscleGroup: '' }))}
                  hitSlop={8}
                >
                  <LibraryIcon name="x" size={14} color={colors.primaryDark} />
                </Pressable>
              </View>
            )}

            {!!filters.level && (
              <View style={styles.activeFilterPill}>
                <Text numberOfLines={1} style={styles.activeFilterPillText}>
                  {LEVELS[filters.level as keyof typeof LEVELS] || filters.level}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Bỏ lọc cấp độ"
                  onPress={() => setFilters((f) => ({ ...f, level: '' }))}
                  hitSlop={8}
                >
                  <LibraryIcon name="x" size={14} color={colors.primaryDark} />
                </Pressable>
              </View>
            )}

            {!!filters.defaultTrackingType && (
              <View style={styles.activeFilterPill}>
                <Text numberOfLines={1} style={styles.activeFilterPillText}>
                  {TRACKING[filters.defaultTrackingType as keyof typeof TRACKING] ||
                    (filters.defaultTrackingType === 'UNCLASSIFIED'
                      ? 'Chưa phân loại'
                      : filters.defaultTrackingType)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Bỏ lọc cách ghi nhận"
                  onPress={() => setFilters((f) => ({ ...f, defaultTrackingType: '' }))}
                  hitSlop={8}
                >
                  <LibraryIcon name="x" size={14} color={colors.primaryDark} />
                </Pressable>
              </View>
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xóa tất cả bộ lọc"
              onPress={() =>
                setFilters((f) => ({
                  ...EMPTY_EXERCISE_FILTERS,
                  keyword: f.keyword,
                }))
              }
              style={styles.clearAllFiltersBtn}
            >
              <Text style={styles.clearAllFiltersText}>Xóa tất cả</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* Quick Action Bar for PT / Admin (hidden in selection mode) */}
      {!onSelect && (
        <View style={styles.actionBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tạo bài tập mới"
            onPress={() => {
              setCreateWithAi(false);
              setEditing(null);
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnPrimary,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <LibraryIcon name="plus" size={18} color="#FFFFFF" />
            <Text numberOfLines={1} style={styles.actionBtnPrimaryText}>Tạo bài tập</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tạo bài tập bằng AI"
            onPress={() => {
              setCreateWithAi(true);
              setEditing(null);
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnSecondary,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <LibraryIcon name="zap" size={16} color={colors.primary} />
            <Text numberOfLines={1} style={styles.actionBtnSecondaryText}>Tạo bằng AI</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quản lý nhóm cơ"
            onPress={() => setGroupManager(true)}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnSecondary,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <LibraryIcon name="layers" size={16} color={colors.text} />
            <Text numberOfLines={1} style={styles.actionBtnSecondaryText}>Nhóm cơ</Text>
          </Pressable>
        </View>
      )}

      {groupManager && (
        <MuscleGroups
          groups={groupRecords}
          onChanged={loadGroups}
          onClose={() => setGroupManager(false)}
        />
      )}

      <SuccessPopup message={message} onClose={() => setMessage('')} />
      <ErrorPopup message={groupError} onClose={() => setGroupError('')} onRetry={() => void loadGroups()} />

      {!detail && !deleting && <ErrorPopup message={actionError} onClose={() => setActionError('')} />}

      {/* Exercise Results List */}
      <ExerciseResults
        key={`${JSON.stringify(filters)}:${revision}`}
        filters={filters}
        onDetail={openDetail}
        onSelect={onSelect ? select : undefined}
        onReset={() => setFilters({ ...EMPTY_EXERCISE_FILTERS })}
      />

      {/* Interactive Bottom Sheet Filters (Direct Chip/Pill selection) */}
      {filterOpen && (
        <Filters
          initial={filters}
          groups={groups}
          onApply={(value) => {
            setFilters(value);
            setFilterOpen(false);
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {/* Exercise Detail Sheet */}
      {detail && editing === undefined && !deleting && (
        <Sheet title="Chi tiết bài tập" onClose={() => setDetail(undefined)}>
          <ExerciseDetails exercise={detail} />
          <ErrorPopup message={actionError} onClose={() => setActionError('')} />
          {onSelect && (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Button
                label="Thêm vào buổi tập"
                icon="plus"
                disabled={!Object.keys(TRACKING).includes(readText(detail, ['defaultTrackingType']))}
                onPress={() => select(detail)}
              />
              <Notice text="Thông số khởi tạo theo loại bài tập; PT có thể điều chỉnh trong giáo án." />
            </View>
          )}
          {!onSelect && detail.canManage === true && (
            <View style={styles.detailActionsRow}>
              <View style={{ flex: 1 }}>
                <Button label="Sửa bài tập" icon="edit-2" onPress={() => openEdit(detail)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  secondary
                  destructive
                  label="Xóa bài"
                  icon="trash-2"
                  onPress={() => {
                    setActionError('');
                    setDeleting(detail);
                  }}
                />
              </View>
            </View>
          )}
        </Sheet>
      )}

      {/* Exercise Create/Edit Form */}
      {editing !== undefined && (
        <ExerciseForm
          createWithAi={!editing && createWithAi}
          initial={editing || undefined}
          groups={groups}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            setDetail(undefined);
            setMessage(editing ? 'Đã cập nhật bài tập thành công.' : 'Đã tạo bài tập thành công.');
            setRevision((value) => value + 1);
            void loadGroups();
          }}
        />
      )}

      {/* Delete Confirmation Popup */}
      <ConfirmDeleteModal
        visible={!!deleting}
        title="Xóa bài tập?"
        message={
          deleting
            ? `Bạn có chắc chắn muốn xóa bài tập “${readText(deleting, ['name'])}” khỏi thư viện? Thao tác này không thể hoàn tác.`
            : ''
        }
        confirmLabel="Xóa bài tập"
        cancelLabel="Hủy"
        loading={busy}
        error={actionError}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (!busy) {
            setDeleting(undefined);
            setActionError('');
          }
        }}
      />
    </View>
  );
}

function ExerciseResults({
  filters,
  onDetail,
  onSelect,
  onReset,
}: {
  filters: ExerciseFilters;
  onDetail: (exercise: JsonRecord) => void;
  onSelect?: (exercise: JsonRecord) => void;
  onReset: () => void;
}) {
  const [data, setData] = useState<ApiPage<JsonRecord>>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const requestId = useRef(0);
  const retryPage = useRef(1);

  const load = useCallback(
    async (target: number) => {
      retryPage.current = target;
      const request = ++requestId.current;
      setLoading(true);
      setError('');
      try {
        const result = await api.getPage<JsonRecord>(exerciseQuery(filters, target));
        if (!Array.isArray(result.data) || !result.meta) {
          throw new Error('Dữ liệu thư viện không hợp lệ.');
        }
        if (request === requestId.current) {
          setData(result);
          setPage(target);
        }
      } catch (cause) {
        if (request === requestId.current) {
          setError(cause instanceof Error ? cause.message : 'Không tải được bài tập.');
        }
      } finally {
        if (request === requestId.current) setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    const requests = requestId;
    const timer = setTimeout(() => void load(1), 300);
    return () => {
      clearTimeout(timer);
      requests.current++;
    };
  }, [load]);

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <View style={{ gap: 12 }}>
      <ErrorPopup message={error} onClose={() => setError('')} onRetry={() => void load(retryPage.current)} />

      {loading ? (
        <Busy />
      ) : data ? (
        <>
          {/* Header count & refresh */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {data.meta.total} bài tập
              {filters.muscleGroup ? ` · ${filters.muscleGroup}` : ''}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tải lại danh sách"
              onPress={() => void load(page)}
              style={styles.refreshBtn}
            >
              <LibraryIcon name="refresh-cw" size={14} color={colors.textMuted} />
              <Text style={styles.refreshBtnText}>Tải lại</Text>
            </Pressable>
          </View>

          {/* Exercise Cards */}
          {data.data.map((exercise) => {
            const kind = readText(exercise, ['defaultTrackingType']);
            const classified = Object.keys(TRACKING).includes(kind);
            const videos = exerciseVideos(exercise);
            const muscleList = stringList(exercise.muscleGroups);
            const muscleText = muscleList.length ? muscleList.join(', ') : readText(exercise, ['muscleGroup']);
            const equipmentList = stringList(exercise.equipment);
            const levelKey = readText(exercise, ['level']) as keyof typeof LEVELS;
            const levelLabel = LEVELS[levelKey] || 'Chưa có cấp độ';
            const trackingLabel = TRACKING[kind as keyof typeof TRACKING] || 'Chưa phân loại';

            return (
              <View key={recordId(exercise)} style={styles.exerciseCard}>
                <View style={styles.cardHeaderRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Xem chi tiết bài tập ${readText(exercise, ['name'])}`}
                    onPress={() => onDetail(exercise)}
                    style={({ pressed }) => [
                      styles.cardMainPressable,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    {/* Visual Thumbnail with sport-specific icon */}
                    <View style={styles.thumbnailContainer}>
                      <View style={styles.thumbnailIconWrapper}>
                        <LibraryIcon
                          name={
                            kind === 'CARDIO'
                              ? 'activity'
                              : kind === 'MOBILITY'
                              ? 'sun'
                              : 'target'
                          }
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                      {videos.length > 0 && (
                        <View style={styles.videoIndicatorBadge}>
                          <LibraryIcon name="video" size={11} color="#FFFFFF" />
                        </View>
                      )}
                    </View>

                    {/* Exercise info */}
                    <View style={styles.cardInfo}>
                      <Text numberOfLines={2} ellipsizeMode="tail" style={styles.exerciseName}>
                        {readText(exercise, ['name'])}
                      </Text>

                      {/* Muscle Groups */}
                      {!!muscleText && (
                        <View style={styles.metaRow}>
                          <LibraryIcon name="layers" size={12} color={colors.textMuted} />
                          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.muscleText}>
                            {muscleText}
                          </Text>
                        </View>
                      )}

                      {/* Badges row: Level + Tracking */}
                      <View style={styles.badgesRow}>
                        <View style={styles.levelBadge}>
                          <Text style={styles.levelBadgeText}>{levelLabel}</Text>
                        </View>
                        <View style={styles.trackingBadge}>
                          <Text style={styles.trackingBadgeText}>{trackingLabel}</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                </View>

                {/* Equipment meta line if available */}
                {equipmentList.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Xem chi tiết thiết bị"
                    onPress={() => onDetail(exercise)}
                    style={styles.equipmentRow}
                  >
                    <LibraryIcon name="box" size={12} color={colors.textMuted} />
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.equipmentText}>
                      Thiết bị: {equipmentList.join(', ')}
                    </Text>
                  </Pressable>
                )}

                {/* Direct Action when selecting for a plan */}
                {onSelect && (
                  <View style={styles.selectActionContainer}>
                    <Button
                      secondary={classified}
                      icon="plus"
                      label={classified ? 'Thêm vào buổi tập' : 'Cần phân loại trước khi thêm'}
                      disabled={!classified}
                      onPress={() => onSelect(exercise)}
                    />
                  </View>
                )}
              </View>
            );
          })}

          {/* Empty state */}
          {!data.data.length && (
            <Empty
              title={hasFilters ? 'Không có bài phù hợp' : 'Chưa có bài tập'}
              text={
                hasFilters
                  ? 'Đổi từ khóa hoặc xóa bộ lọc để tìm bài tập.'
                  : 'Tạo bài tập trong thư viện để sử dụng cho giáo án.'
              }
              action={hasFilters ? 'Xóa bộ lọc' : 'Tải lại'}
              onAction={hasFilters ? onReset : () => void load(1)}
            />
          )}

          {/* Mobile-friendly Pagination Bar */}
          {data.data.length > 0 && (
            <View style={styles.paginationBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Trang trước"
                disabled={loading || page <= 1}
                onPress={() => void load(page - 1)}
                style={({ pressed }) => [
                  styles.pageNavBtn,
                  (loading || page <= 1) && styles.pageNavBtnDisabled,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <LibraryIcon
                  name="chevron-left"
                  size={20}
                  color={page <= 1 ? colors.border : colors.text}
                />
                <Text
                  style={[
                    styles.pageNavBtnText,
                    page <= 1 && { color: colors.textMuted },
                  ]}
                >
                  Trước
                </Text>
              </Pressable>

              <View style={styles.pageIndicatorWrapper}>
                <Text style={styles.pageIndicatorText}>
                  {page} / {Math.max(data.meta.totalPages, 1)}
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Trang sau"
                disabled={loading || page >= data.meta.totalPages}
                onPress={() => void load(page + 1)}
                style={({ pressed }) => [
                  styles.pageNavBtn,
                  (loading || page >= data.meta.totalPages) && styles.pageNavBtnDisabled,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text
                  style={[
                    styles.pageNavBtnText,
                    page >= data.meta.totalPages && { color: colors.textMuted },
                  ]}
                >
                  Sau
                </Text>
                <LibraryIcon
                  name="chevron-right"
                  size={20}
                  color={page >= data.meta.totalPages ? colors.border : colors.text}
                />
              </Pressable>
            </View>
          )}
        </>
      ) : <Button secondary label="Thử lại" onPress={() => void load(retryPage.current)} />}
    </View>
  );
}

function Filters({
  initial,
  groups,
  onApply,
  onClose,
}: {
  initial: ExerciseFilters;
  groups: string[];
  onApply: (filters: ExerciseFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({ ...initial });

  const draftCount = [draft.muscleGroup, draft.level, draft.defaultTrackingType].filter(Boolean).length;

  const trackingOptions: Record<string, string> = {
    '': 'Tất cả',
    ...TRACKING,
    UNCLASSIFIED: 'Chưa phân loại',
  };

  const levelOptions: Record<string, string> = {
    '': 'Tất cả',
    ...LEVELS,
  };

  return (
    <Sheet
      title="Lọc bài tập"
      onClose={onClose}
      footer={
        <View style={{ gap: 10 }}>
          <Button
            label={draftCount > 0 ? `Áp dụng bộ lọc (${draftCount})` : 'Áp dụng bộ lọc'}
            onPress={() => onApply(draft)}
          />
          <Button
            secondary
            label="Đặt lại về mặc định"
            onPress={() =>
              setDraft((current) => ({
                ...EMPTY_EXERCISE_FILTERS,
                keyword: current.keyword,
              }))
            }
          />
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        {/* Section 1: Nhóm cơ tác động */}
        <View style={{ gap: 6 }}>
          <View style={styles.filterSectionHeader}>
            <LibraryIcon name="layers" size={15} color={colors.primary} />
            <Text style={styles.filterSectionTitle}>Nhóm cơ tác động</Text>
            {!!draft.muscleGroup && (
              <Text numberOfLines={1} style={styles.filterSectionSelected}>
                ({draft.muscleGroup})
              </Text>
            )}
          </View>
          <View style={styles.filterChipsWrap}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: !draft.muscleGroup }}
              onPress={() => setDraft((d) => ({ ...d, muscleGroup: '' }))}
              style={[
                styles.filterChip,
                !draft.muscleGroup ? styles.filterChipActive : styles.filterChipInactive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  !draft.muscleGroup ? styles.filterChipTextActive : styles.filterChipTextInactive,
                ]}
              >
                Tất cả nhóm cơ
              </Text>
            </Pressable>
            {groups.map((group) => {
              const isSelected = draft.muscleGroup === group;
              return (
                <Pressable
                  key={group}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() =>
                    setDraft((d) => ({
                      ...d,
                      muscleGroup: isSelected ? '' : group,
                    }))
                  }
                  style={[
                    styles.filterChip,
                    isSelected ? styles.filterChipActive : styles.filterChipInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected ? styles.filterChipTextActive : styles.filterChipTextInactive,
                    ]}
                  >
                    {group}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 2: Cấp độ bài tập */}
        <View style={{ gap: 6 }}>
          <View style={styles.filterSectionHeader}>
            <LibraryIcon name="bar-chart-2" size={15} color={colors.primary} />
            <Text style={styles.filterSectionTitle}>Cấp độ bài tập</Text>
            {!!draft.level && (
              <Text numberOfLines={1} style={styles.filterSectionSelected}>
                ({levelOptions[draft.level] || draft.level})
              </Text>
            )}
          </View>
          <View style={styles.filterChipsWrap}>
            {Object.entries(levelOptions).map(([key, label]) => {
              const isSelected = draft.level === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => setDraft((d) => ({ ...d, level: key }))}
                  style={[
                    styles.filterChip,
                    isSelected ? styles.filterChipActive : styles.filterChipInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected ? styles.filterChipTextActive : styles.filterChipTextInactive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 3: Cách ghi nhận kết quả */}
        <View style={{ gap: 6 }}>
          <View style={styles.filterSectionHeader}>
            <LibraryIcon name="activity" size={15} color={colors.primary} />
            <Text style={styles.filterSectionTitle}>Cách ghi nhận kết quả</Text>
            {!!draft.defaultTrackingType && (
              <Text numberOfLines={1} style={styles.filterSectionSelected}>
                ({trackingOptions[draft.defaultTrackingType] || draft.defaultTrackingType})
              </Text>
            )}
          </View>
          <View style={styles.filterChipsWrap}>
            {Object.entries(trackingOptions).map(([key, label]) => {
              const isSelected = draft.defaultTrackingType === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  onPress={() => setDraft((d) => ({ ...d, defaultTrackingType: key }))}
                  style={[
                    styles.filterChip,
                    isSelected ? styles.filterChipActive : styles.filterChipInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      isSelected ? styles.filterChipTextActive : styles.filterChipTextInactive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Sheet>
  );
}

function ExerciseDetails({ exercise }: { exercise: JsonRecord }) {
  const [error, setError] = useState('');

  async function openVideo(value: string) {
    setError('');
    const url = videoLink(value);
    if (!url) {
      setError('Liên kết video không hợp lệ.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setError('Không mở được video. Vui lòng kiểm tra ứng dụng phát video hoặc trình duyệt.');
    }
  }

  const kind = readText(exercise, ['defaultTrackingType']);
  const levelKey = readText(exercise, ['level']) as keyof typeof LEVELS;
  const levelLabel = LEVELS[levelKey] || 'Chưa có cấp độ';
  const trackingLabel = TRACKING[kind as keyof typeof TRACKING] || 'Chưa phân loại';
  const muscleList = stringList(exercise.muscleGroups);
  const equipmentList = stringList(exercise.equipment);
  const videos = exerciseVideos(exercise);

  return (
    <View style={{ gap: 16 }}>
      {/* Exercise title & Badges */}
      <View style={{ gap: 8 }}>
        <Text numberOfLines={3} ellipsizeMode="tail" style={styles.detailTitle}>
          {readText(exercise, ['name'])}
        </Text>
        <View style={styles.badgesRow}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{levelLabel}</Text>
          </View>
          <View style={styles.trackingBadge}>
            <Text style={styles.trackingBadgeText}>{trackingLabel}</Text>
          </View>
        </View>
      </View>

      {!Object.keys(TRACKING).includes(kind) && (
        <Notice
          tone="warning"
          text="Bài tập chưa có cách ghi nhận. Người có quyền quản lý cần cập nhật trước khi thêm vào giáo án."
        />
      )}

      {/* Target muscles & equipment */}
      <View style={styles.detailMetaCard}>
        <View style={styles.detailMetaRow}>
          <LibraryIcon name="layers" size={16} color={colors.primary} />
          <Text numberOfLines={3} ellipsizeMode="tail" style={styles.detailMetaText}>
            <Text style={styles.detailMetaLabel}>Nhóm cơ: </Text>
            {muscleList.join(', ') || readText(exercise, ['muscleGroup'], 'Chưa cập nhật')}
          </Text>
        </View>
        <View style={styles.detailMetaRow}>
          <LibraryIcon name="box" size={16} color={colors.primary} />
          <Text numberOfLines={3} ellipsizeMode="tail" style={styles.detailMetaText}>
            <Text style={styles.detailMetaLabel}>Thiết bị: </Text>
            {equipmentList.join(', ') || 'Không yêu cầu thiết bị'}
          </Text>
        </View>
      </View>

      {/* Description & Technique */}
      {readText(exercise, ['description']) ? (
        <View style={styles.detailSection}>
          <View style={styles.sectionHeaderRow}>
            <LibraryIcon name="info" size={16} color={colors.text} />
            <Text style={styles.sectionTitle}>Mô tả bài tập</Text>
          </View>
          <Text numberOfLines={20} ellipsizeMode="tail" style={styles.sectionBody}>
            {readText(exercise, ['description'])}
          </Text>
        </View>
      ) : null}

      {readText(exercise, ['technique']) ? (
        <View style={styles.detailSection}>
          <View style={styles.sectionHeaderRow}>
            <LibraryIcon name="check-circle" size={16} color={colors.primary} />
            <Text style={styles.sectionTitle}>Hướng dẫn kỹ thuật</Text>
          </View>
          <Text numberOfLines={30} ellipsizeMode="tail" style={styles.sectionBody}>
            {readText(exercise, ['technique'])}
          </Text>
        </View>
      ) : null}

      {/* Common Mistakes, Contraindications, Variants */}
      {([
        ['commonMistakes', 'Lỗi thường gặp', 'alert-triangle', colors.warning],
        ['contraindications', 'Chống chỉ định', 'slash', colors.danger],
        ['variants', 'Biến thể bài tập', 'git-branch', colors.primary],
      ] as const).map(([key, label, icon, iconColor]) => {
        const items = stringList(exercise[key]);
        if (!items.length) return null;
        return (
          <View key={key} style={styles.detailSection}>
            <View style={styles.sectionHeaderRow}>
              <LibraryIcon name={icon} size={16} color={iconColor} />
              <Text style={styles.sectionTitle}>{label}</Text>
            </View>
            <View style={{ gap: 6, marginTop: 4 }}>
              {items.map((item, index) => (
                <View key={index} style={styles.bulletItemRow}>
                  <Text style={[styles.bulletIndex, { color: iconColor }]}>{index + 1}.</Text>
                  <Text numberOfLines={10} ellipsizeMode="tail" style={styles.bulletText}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      <ErrorPopup message={error} onClose={() => setError('')} />

      {/* Video Demonstration */}
      <View style={{ gap: 8 }}>
        <View style={styles.sectionHeaderRow}>
          <LibraryIcon name="video" size={16} color={colors.text} />
          <Text style={styles.sectionTitle}>Video hướng dẫn</Text>
        </View>
        {videos.length ? (
          videos.map((video, index) => (
            <Button
              key={index}
              secondary
              icon="play-circle"
              label={readText(video, ['title'], 'Xem video hướng dẫn')}
              onPress={() => void openVideo(readText(video, ['url']))}
            />
          ))
        ) : (
          <Notice text="Bài tập chưa có video hướng dẫn." />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInputFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: colors.text,
  },
  clearBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  filterBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#FFFFFF',
    lineHeight: 12,
  },
  activeFiltersRow: {
    marginHorizontal: -4,
  },
  activeFiltersContent: {
    paddingHorizontal: 4,
    gap: 8,
    alignItems: 'center',
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  activeFilterPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.primaryDark,
  },
  clearAllFiltersBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearAllFiltersText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    minHeight: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionBtnPrimary: {
    flex: 1.25,
    backgroundColor: colors.primary,
  },
  actionBtnPrimaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnSecondaryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: colors.text,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  resultsCount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.textMuted,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  refreshBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: colors.textMuted,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardMainPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  thumbnailContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  thumbnailIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIndicatorBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  exerciseName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  muscleText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.primaryDark,
    flexShrink: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  levelBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: '#475569',
  },
  trackingBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trackingBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: colors.primaryDark,
  },
  detailActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  equipmentText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    flexShrink: 1,
  },
  selectActionContainer: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 4,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageNavBtnDisabled: {
    opacity: 0.4,
  },
  pageNavBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },
  pageIndicatorWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pageIndicatorText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.textMuted,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterSectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.text,
  },
  filterSectionSelected: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: colors.primaryDark,
    flexShrink: 1,
  },
  filterChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  filterChipInactive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
  },
  filterChipTextInactive: {
    color: colors.text,
  },
  detailTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  detailMetaCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailMetaLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.text,
  },
  detailMetaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
    flex: 1,
  },
  detailSection: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.text,
  },
  sectionBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.text,
  },
  bulletItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletIndex: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    lineHeight: 18,
  },
  bulletText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    flex: 1,
  },
});
