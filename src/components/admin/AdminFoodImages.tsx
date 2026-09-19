import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import {
  foodCategories,
  foodSources,
  foodImagePath,
  imageRatios,
  type FoodImage,
} from '@/services/adminOperations';
import { resolveImageUrl } from '@/services/imageUtils';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';
import { AdminForm } from './AdminForm';
import { FoodImageEditor } from './FoodImageEditor';

function FoodPhoto({ item, style }: { item: FoodImage; style?: object }) {
  const [failed, setFailed] = useState(false);
  const url = resolveImageUrl(item.imageUrl);

  if (!url || failed) {
    return (
      <View style={[styles.photoFallback, style]}>
        <Feather name="image" size={32} color="#94A3B8" />
        <Text style={styles.photoFallbackText}>Không tải được ảnh</Text>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={item.name}
      source={{ uri: url }}
      onError={() => setFailed(true)}
      style={[styles.foodImage, style]}
      resizeMode="cover"
    />
  );
}

export function AdminFoodImages() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<FoodImage[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>();
  const [total, setTotal] = useState<number>();
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  // Modals
  const [editor, setEditor] = useState<FoodImage | null>();
  const [selected, setSelected] = useState<FoodImage>();
  const [actionItem, setActionItem] = useState<FoodImage>();
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [ai, setAi] = useState<FoodImage | null>();
  const [deleting, setDeleting] = useState<FoodImage>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      void api
        .getPage<FoodImage>(foodImagePath(page, search, source, category))
        .then((result) => {
          if (!active) return;
          setItems(result.data || []);
          setSummary(result.summary);
          setTotal(result.meta?.total);
          const last = Math.max(1, result.meta?.totalPages || 1);
          setPages(last);
          if (page > last) setPage(last);
        })
        .catch((cause) => {
          if (active) setError(messageOf(cause));
        })
        .finally(() => {
          if (active) {
            setLoading(false);
            setRefreshing(false);
          }
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [page, search, source, category, reload]);

  const saved = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 3500);
    setReload((n) => n + 1);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setReload((n) => n + 1);
  };

  const remove = async () => {
    if (!deleting || lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError('');
    try {
      await api.delete(`/api/food-images/${deleting._id}`);
      setDeleting(undefined);
      saved('Đã xóa ảnh khỏi kho.');
    } catch (cause) {
      setActionError(messageOf(cause));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const availableSources = [
    { value: '', label: 'Tất cả nguồn' },
    ...foodSources.filter((s) => s.value !== 'SEED'),
  ];

  const availableCategories = [
    { value: '', label: 'Tất cả nhóm' },
    ...foodCategories,
  ];

  return (
    <View style={styles.container}>
      {/* 1. EXECUTIVE STATS CARD (1 COMPACT ROW) */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="images" size={13} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {summary?.totalImages ?? total ?? items.length}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Tổng kho ảnh
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="repeat" size={13} color="#16A34A" />
            </View>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>
              {summary?.totalUsage ?? 0}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Lượt dùng
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="sparkles" size={13} color="#7C3AED" />
            </View>
            <Text style={[styles.statValue, { color: '#7C3AED' }]}>
              {summary?.aiCount ?? 0}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Ảnh AI
            </Text>
          </View>
        </View>
      </View>

      {/* 2. ACTION TOOLBAR */}
      <View style={styles.toolbarRow}>
        <Pressable
          onPress={() => setEditor(null)}
          style={({ pressed }) => [
            styles.uploadBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="upload-cloud" size={14} color="#FFFFFF" />
          <Text style={styles.uploadBtnText}>Tải ảnh lên</Text>
        </Pressable>

        <Pressable
          onPress={() => setAi(null)}
          style={({ pressed }) => [
            styles.aiGenBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={styles.aiGenBtnText}>Tạo bằng AI</Text>
        </Pressable>

        <Pressable
          onPress={() => setReload((n) => n + 1)}
          disabled={loading}
          style={({ pressed }) => [
            styles.refreshBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Feather name="refresh-cw" size={15} color={colors.primary} />
        </Pressable>
      </View>

      {/* 3. SEARCH INPUT (SHORTENED PLACEHOLDER) */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={15} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Tìm tên món, từ khóa..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => {
              setSearch(query);
              setPage(1);
            }}
          />
          {query ? (
            <Pressable
              onPress={() => {
                setQuery('');
                setSearch('');
                setPage(1);
              }}
              hitSlop={8}
            >
              <Feather name="x-circle" size={15} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 4. FILTER CHIPS (SOURCES + CATEGORY BOTTOM SHEET TRIGGER) */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
          {/* Category Bottom Sheet Trigger */}
          <Pressable
            onPress={() => setCategorySheetOpen(true)}
            style={[
              styles.filterChip,
              styles.categoryTriggerChip,
              !!category && styles.filterChipActive,
            ]}
          >
            <Feather
              name="filter"
              size={12}
              color={category ? colors.primary : '#64748B'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                !!category && styles.filterChipTextActive,
              ]}
            >
              {category
                ? availableCategories.find((c) => c.value === category)?.label || 'Dinh dưỡng'
                : 'Chất dinh dưỡng'}
            </Text>
            <Feather
              name="chevron-down"
              size={12}
              color={category ? colors.primary : '#94A3B8'}
              style={{ marginLeft: 3 }}
            />
          </Pressable>

          {/* Source filters */}
          {availableSources.map((s) => {
            const isSelected = source === s.value;
            return (
              <Pressable
                key={`src-${s.value}`}
                onPress={() => {
                  setSource(s.value);
                  setPage(1);
                }}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Success banner */}
      {notice ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
          <Text style={styles.successText}>{notice}</Text>
        </View>
      ) : null}

      {/* 5. FOOD IMAGES 2-COLUMN GRID */}
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
            <Text style={styles.statusBoxText}>Đang tải kho ảnh món ăn…</Text>
          </View>
        ) : error ? (
          <View style={styles.statusBox}>
            <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable onPress={() => setReload((n) => n + 1)} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="images-outline" size={36} color="#94A3B8" />
            <Text style={styles.statusBoxText}>Chưa có ảnh món ăn nào phù hợp.</Text>
            <Pressable
              onPress={() => {
                setQuery('');
                setSearch('');
                setSource('');
                setCategory('');
                setPage(1);
              }}
              style={styles.clearFilterBtn}
            >
              <Text style={styles.clearFilterText}>Xóa bộ lọc tìm kiếm</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {items.map((item) => {
              const catLabel =
                foodCategories.find((c) => c.value === item.category)?.label ||
                item.category ||
                'Khác';

              return (
                <View key={item._id} style={styles.gridCard}>
                  {/* Click directly on image to view details */}
                  <Pressable
                    onPress={() => setSelected(item)}
                    style={styles.gridImagePressable}
                    accessibilityRole="button"
                    accessibilityLabel={`Chi tiết món ăn ${item.name}`}
                  >
                    <FoodPhoto item={item} style={styles.gridFoodPhoto} />

                    {/* 3-dots icon at top-right corner */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setActionItem(item);
                      }}
                      style={styles.moreActionBtn}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel="Tùy chọn thao tác"
                    >
                      <Feather name="more-horizontal" size={15} color="#FFFFFF" />
                    </Pressable>
                  </Pressable>

                  {/* Card Info */}
                  <Pressable
                    onPress={() => setSelected(item)}
                    style={styles.gridCardInfo}
                  >
                    <Text style={styles.gridFoodName} numberOfLines={1} ellipsizeMode="tail">
                      {item.name}
                    </Text>

                    <View style={styles.gridMetaRow}>
                      <View style={styles.gridCatChip}>
                        <Text style={styles.gridCatChipText} numberOfLines={1}>
                          {catLabel}
                        </Text>
                      </View>

                      <View style={styles.gridUsageBadge}>
                        <Ionicons name="repeat" size={10} color={colors.primary} />
                        <Text style={styles.gridUsageText}>{item.usageCount}</Text>
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Pagination */}
        {!loading && !error && pages > 1 && (
          <View style={styles.paginationRow}>
            <Pressable
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            >
              <Feather name="chevron-left" size={15} color={colors.text} />
              <Text style={styles.pageBtnText}>Trước</Text>
            </Pressable>

            <Text style={styles.pageInfoText}>
              Trang {page} / {pages}
            </Text>

            <Pressable
              onPress={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              style={[styles.pageBtn, page >= pages && styles.pageBtnDisabled]}
            >
              <Text style={styles.pageBtnText}>Sau</Text>
              <Feather name="chevron-right" size={15} color={colors.text} />
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* MODAL 1: BOTTOM SHEET DETAIL */}
      {selected && (
        <Modal
          visible={Boolean(selected)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelected(undefined)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelected(undefined)}
            />

            <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.sheetHandle} />

              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTitle}>{selected.name}</Text>
                  <Text style={styles.detailSub}>
                    {foodCategories.find((c) => c.value === selected.category)?.label || selected.category || 'Khác'} · {selected.usageCount} lượt dùng
                  </Text>
                </View>

                <Pressable
                  onPress={() => setSelected(undefined)}
                  hitSlop={8}
                  style={styles.sheetCloseBtn}
                >
                  <Feather name="x" size={20} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetBody}
              >
                <FoodPhoto item={selected} style={styles.detailPhoto} />

                {/* Nutrition Macros Grid */}
                <View style={styles.macrosSection}>
                  <Text style={styles.macrosTitle}>Thông tin dinh dưỡng (ước tính)</Text>
                  <View style={styles.macrosGrid}>
                    <View style={[styles.macroCard, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.macroValue, { color: '#B45309' }]}>
                        {selected.calories ?? '—'}
                      </Text>
                      <Text style={styles.macroLabel}>Calories (kcal)</Text>
                    </View>

                    <View style={[styles.macroCard, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.macroValue, { color: '#15803D' }]}>
                        {selected.protein ?? '—'} g
                      </Text>
                      <Text style={styles.macroLabel}>Chất đạm</Text>
                    </View>

                    <View style={[styles.macroCard, { backgroundColor: '#E0F2FE' }]}>
                      <Text style={[styles.macroValue, { color: '#0369A1' }]}>
                        {selected.carbs ?? '—'} g
                      </Text>
                      <Text style={styles.macroLabel}>Tinh bột</Text>
                    </View>

                    <View style={[styles.macroCard, { backgroundColor: '#F3E8FF' }]}>
                      <Text style={[styles.macroValue, { color: '#7E22CE' }]}>
                        {selected.fat ?? '—'} g
                      </Text>
                      <Text style={styles.macroLabel}>Chất béo</Text>
                    </View>
                  </View>
                </View>

                {/* Keywords & Prompt */}
                {selected.keywords && selected.keywords.length > 0 && (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoBlockLabel}>Từ khóa:</Text>
                    <View style={styles.keywordsRow}>
                      {selected.keywords.map((kw, i) => (
                        <View key={i} style={styles.keywordTag}>
                          <Text style={styles.keywordTagText}>{kw}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {selected.prompt ? (
                  <View style={styles.infoBlock}>
                    <Text style={styles.infoBlockLabel}>Gợi ý ảnh AI (Prompt):</Text>
                    <Text style={styles.infoBlockText}>{selected.prompt}</Text>
                  </View>
                ) : null}
              </ScrollView>

              {/* Detail Actions */}
              <View style={styles.detailActions}>
                <Pressable
                  onPress={() => {
                    const it = selected;
                    setSelected(undefined);
                    setEditor(it);
                  }}
                  style={styles.detailEditBtn}
                >
                  <Feather name="edit-2" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.detailEditText}>Sửa ảnh / thông tin</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const it = selected;
                    setSelected(undefined);
                    setAi(it);
                  }}
                  style={styles.detailAiBtn}
                >
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                </Pressable>

                <Pressable
                  onPress={() => {
                    const it = selected;
                    setSelected(undefined);
                    setActionError('');
                    setDeleting(it);
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

      {/* MODAL 2: FOOD IMAGE EDITOR (UPLOAD / EDIT) */}
      {editor !== undefined && (
        <FoodImageEditor
          item={editor || undefined}
          onClose={() => setEditor(undefined)}
          onSaved={() => saved('Đã lưu ảnh món ăn thành công.')}
        />
      )}

      {/* MODAL 3: AI GENERATION / REGENERATION */}
      {ai !== undefined && (
        <AdminForm
          title={ai ? `Tạo lại ảnh AI: ${ai.name}` : 'Tạo ảnh món ăn bằng AI'}
          description={
            ai
              ? 'Ảnh hiện tại sẽ được cập nhật lại theo kết quả từ mô hình AI.'
              : 'Mô hình AI sẽ tự động thiết kế hình ảnh món ăn chuyên nghiệp và lưu vào kho dùng chung.'
          }
          initial={ai ? { prompt: ai.prompt || '', aspectRatio: '4:3' } : { aspectRatio: '4:3' }}
          fields={[
            ...(ai ? [] : [{ key: 'name', label: 'Tên món ăn', required: true }]),
            { key: 'prompt', label: 'Mô tả hình ảnh (Gợi ý AI)', multiline: true },
            { key: 'aspectRatio', label: 'Tỷ lệ ảnh', options: imageRatios, default: '4:3' },
          ]}
          onClose={() => setAi(undefined)}
          onSave={async (payload) => {
            await api.post(
              ai ? `/api/food-images/${ai._id}/regenerate-ai` : '/api/food-images/ai-generate',
              payload
            );
            saved(ai ? 'Đã tạo lại ảnh bằng AI thành công.' : 'Đã tạo ảnh mới bằng AI thành công.');
          }}
        />
      )}

      {/* MODAL 4: CONFIRM DELETE */}
      {deleting && (
        <Modal
          visible={Boolean(deleting)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setDeleting(undefined);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.deleteIconBox}>
                <Feather name="trash-2" size={24} color="#EF4444" />
              </View>

              <Text style={styles.modalTitle}>Xóa ảnh món ăn?</Text>

              <Text style={styles.modalDesc}>
                Bạn có chắc chắn muốn xóa ảnh món ăn &ldquo;{deleting.name}&rdquo;? Ảnh sẽ bị xóa vĩnh viễn khỏi kho dữ liệu.
              </Text>

              {actionError ? (
                <View style={styles.errorNotice}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorNoticeText}>{actionError}</Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                  disabled={busy}
                  onPress={() => setDeleting(undefined)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() => void remove()}
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

      {/* MODAL 5: 3-DOTS ACTION BOTTOM SHEET */}
      {actionItem && (
        <Modal
          visible={Boolean(actionItem)}
          transparent
          animationType="slide"
          onRequestClose={() => setActionItem(undefined)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setActionItem(undefined)}
            />

            <View style={[styles.actionSheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.sheetHandle} />

              {/* Header preview */}
              <View style={styles.actionSheetHeader}>
                <FoodPhoto item={actionItem} style={styles.actionSheetThumb} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.actionSheetTitle} numberOfLines={1} ellipsizeMode="tail">
                    {actionItem.name}
                  </Text>
                  <Text style={styles.actionSheetSub} numberOfLines={1}>
                    {foodCategories.find((c) => c.value === actionItem.category)?.label || actionItem.category || 'Khác'} · {actionItem.usageCount} lượt dùng
                  </Text>
                </View>
                <Pressable
                  onPress={() => setActionItem(undefined)}
                  hitSlop={8}
                  style={styles.sheetCloseBtn}
                >
                  <Feather name="x" size={18} color={colors.text} />
                </Pressable>
              </View>

              {/* Action List */}
              <View style={styles.actionSheetList}>
                {/* 1. Xem chi tiết */}
                <Pressable
                  style={styles.actionSheetRow}
                  onPress={() => {
                    const it = actionItem;
                    setActionItem(undefined);
                    setSelected(it);
                  }}
                >
                  <View style={[styles.actionSheetIconBox, { backgroundColor: '#F1F5F9' }]}>
                    <Feather name="info" size={15} color="#334155" />
                  </View>
                  <Text style={styles.actionSheetRowText}>Chi tiết món ăn & dinh dưỡng</Text>
                  <Feather name="chevron-right" size={15} color="#CBD5E1" />
                </Pressable>

                {/* 2. Sửa */}
                <Pressable
                  style={styles.actionSheetRow}
                  onPress={() => {
                    const it = actionItem;
                    setActionItem(undefined);
                    setEditor(it);
                  }}
                >
                  <View style={[styles.actionSheetIconBox, { backgroundColor: '#F1F5F9' }]}>
                    <Feather name="edit-2" size={15} color="#334155" />
                  </View>
                  <Text style={styles.actionSheetRowText}>Chỉnh sửa thông tin món</Text>
                  <Feather name="chevron-right" size={15} color="#CBD5E1" />
                </Pressable>

                {/* 3. Tạo lại AI */}
                <Pressable
                  style={styles.actionSheetRow}
                  onPress={() => {
                    const it = actionItem;
                    setActionItem(undefined);
                    setAi(it);
                  }}
                >
                  <View style={[styles.actionSheetIconBox, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="sparkles" size={15} color={colors.primary} />
                  </View>
                  <Text style={[styles.actionSheetRowText, { color: colors.primary, fontWeight: '600' }]}>
                    Tạo lại bằng AI
                  </Text>
                  <Feather name="chevron-right" size={15} color="#CBD5E1" />
                </Pressable>

                {/* 4. Xóa */}
                <Pressable
                  style={[styles.actionSheetRow, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    const it = actionItem;
                    setActionItem(undefined);
                    setActionError('');
                    setDeleting(it);
                  }}
                >
                  <View style={[styles.actionSheetIconBox, { backgroundColor: '#FEF2F2' }]}>
                    <Feather name="trash-2" size={15} color="#EF4444" />
                  </View>
                  <Text style={[styles.actionSheetRowText, { color: '#EF4444', fontWeight: '600' }]}>
                    Xóa ảnh khỏi kho
                  </Text>
                  <Feather name="chevron-right" size={15} color="#CBD5E1" />
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 6: CATEGORY FILTER BOTTOM SHEET */}
      {categorySheetOpen && (
        <Modal
          visible={categorySheetOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setCategorySheetOpen(false)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setCategorySheetOpen(false)}
            />

            <View style={[styles.actionSheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.sheetHandle} />

              <View style={styles.categorySheetHeader}>
                <Text style={styles.categorySheetTitle}>Nhóm chất dinh dưỡng</Text>
                <Pressable
                  onPress={() => setCategorySheetOpen(false)}
                  hitSlop={8}
                  style={styles.sheetCloseBtn}
                >
                  <Feather name="x" size={18} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                {availableCategories.map((c) => {
                  const isSelected = category === c.value;
                  return (
                    <Pressable
                      key={`sheet-cat-${c.value}`}
                      style={[styles.categoryOptionRow, isSelected && styles.categoryOptionRowActive]}
                      onPress={() => {
                        setCategory(c.value);
                        setCategorySheetOpen(false);
                        setPage(1);
                      }}
                    >
                      <Text style={[styles.categoryOptionText, isSelected && styles.categoryOptionTextActive]}>
                        {c.label}
                      </Text>
                      {isSelected ? (
                        <Feather name="check" size={18} color={colors.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
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
    paddingVertical: 2,
  },
  statIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F1F5F9',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  uploadBtn: {
    flex: 1.2,
    height: 42,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiGenBtn: {
    flex: 1.2,
    height: 42,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  aiGenBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: colors.text,
    paddingVertical: 0,
  },
  filtersWrapper: {
    marginBottom: 8,
  },
  filterChipsScroll: {
    paddingHorizontal: 16,
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 5.5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryTriggerChip: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  filterChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
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
    paddingVertical: 7,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  statusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  statusBoxText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  statusBoxError: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.primary,
  },
  clearFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },

  /* 2-COLUMN GRID STYLES */
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 10,
  },
  gridImagePressable: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  gridFoodPhoto: {
    width: '100%',
    height: '100%',
  },
  moreActionBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  gridCardInfo: {
    padding: 8,
    gap: 4,
  },
  gridFoodName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 16,
  },
  gridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    gap: 4,
  },
  gridCatChip: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    maxWidth: '70%',
  },
  gridCatChipText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  gridUsageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  gridUsageText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },

  foodImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
  },
  photoFallback: {
    width: '100%',
    height: 120,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoFallbackText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 4,
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
  },
  pageInfoText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },

  /* BOTTOM SHEETS */
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
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  actionSheetContent: {
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
  actionSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  actionSheetThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  actionSheetTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.text,
  },
  actionSheetSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionSheetList: {
    paddingVertical: 8,
  },
  actionSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 12,
  },
  actionSheetIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetRowText: {
    flex: 1,
    fontSize: 13.5,
    color: colors.text,
    fontWeight: '500',
  },
  categorySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categorySheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  categoryOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    borderRadius: 8,
  },
  categoryOptionRowActive: {
    backgroundColor: '#F0F9FF',
  },
  categoryOptionText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    fontWeight: '700',
    color: colors.primary,
  },

  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  detailSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sheetBody: {
    paddingVertical: 12,
    gap: 12,
  },
  detailPhoto: {
    width: '100%',
    height: 190,
    borderRadius: 14,
  },
  macrosSection: {
    gap: 8,
  },
  macrosTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  macroCard: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  macroLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  infoBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    gap: 6,
  },
  infoBlockLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#475569',
  },
  infoBlockText: {
    fontSize: 12.5,
    color: '#334155',
    lineHeight: 17,
  },
  keywordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  keywordTag: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  keywordTagText: {
    fontSize: 11,
    color: '#334155',
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailEditBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailEditText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailAiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailDeleteBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Common
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 12.5,
    color: '#EF4444',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
  },
  deleteConfirmBtn: {
    flex: 1.2,
    height: 42,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteConfirmText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
