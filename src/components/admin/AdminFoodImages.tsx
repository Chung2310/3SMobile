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
      {/* 1. EXECUTIVE STATS CARD */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="images" size={16} color={colors.primary} />
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
              <Ionicons name="repeat" size={16} color="#16A34A" />
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
              <Ionicons name="sparkles" size={16} color="#7C3AED" />
            </View>
            <Text style={[styles.statValue, { color: '#7C3AED' }]}>
              {summary?.aiCount ?? 0}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Ảnh AI
            </Text>
          </View>
        </View>

        {summary?.estimatedSavingsVnd !== undefined && (
          <View style={styles.savingsBanner}>
            <Ionicons name="trending-up" size={14} color="#0284C7" />
            <Text style={styles.savingsText}>
              Tiết kiệm ước tính: {summary.estimatedSavingsVnd.toLocaleString('vi-VN')} VNĐ
            </Text>
          </View>
        )}
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
          <Feather name="upload-cloud" size={16} color="#FFFFFF" />
          <Text style={styles.uploadBtnText}>Tải ảnh lên</Text>
        </Pressable>

        <Pressable
          onPress={() => setAi(null)}
          style={({ pressed }) => [
            styles.aiGenBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="sparkles" size={15} color={colors.primary} />
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
          <Feather name="refresh-cw" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* 3. SEARCH INPUT */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Tìm theo tên món ăn hoặc từ khóa…"
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
              <Feather name="x-circle" size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 4. FILTER CHIPS (SOURCES & CATEGORIES) */}
      <View style={styles.filtersWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsScroll}
        >
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

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterChipsScroll, { marginTop: 6 }]}
        >
          {availableCategories.map((c) => {
            const isSelected = category === c.value;
            return (
              <Pressable
                key={`cat-${c.value}`}
                onPress={() => {
                  setCategory(c.value);
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
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Success banner */}
      {notice ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Text style={styles.successText}>{notice}</Text>
        </View>
      ) : null}

      {/* 5. FOOD IMAGES LIST */}
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
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.statusBoxError}>{error}</Text>
            <Pressable onPress={() => setReload((n) => n + 1)} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.statusBox}>
            <Ionicons name="images-outline" size={40} color="#94A3B8" />
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
          items.map((item) => {
            const srcLabel =
              foodSources.find((s) => s.value === item.source)?.label || item.source;
            const catLabel =
              foodCategories.find((c) => c.value === item.category)?.label ||
              item.category ||
              'Khác';

            return (
              <View key={item._id} style={styles.foodCard}>
                {/* Clickable Image & Header area to view details */}
                <Pressable
                  onPress={() => setSelected(item)}
                  style={({ pressed }) => [
                    styles.cardMainPressable,
                    pressed && { opacity: 0.94 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Chi tiết món ăn ${item.name}`}
                >
                  <FoodPhoto item={item} />

                  <View style={styles.cardInfo}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.foodName} numberOfLines={2} ellipsizeMode="tail">
                        {item.name}
                      </Text>

                      <View style={styles.usageBadge}>
                        <Ionicons name="repeat" size={11} color={colors.primary} />
                        <Text style={styles.usageBadgeText}>{item.usageCount} lượt</Text>
                      </View>
                    </View>

                    <View style={styles.tagsRow}>
                      <View style={styles.tagChip}>
                        <Ionicons name="restaurant" size={11} color="#64748B" />
                        <Text style={styles.tagChipText}>{catLabel}</Text>
                      </View>

                      <View style={styles.tagChip}>
                        <Feather name="layers" size={11} color="#64748B" />
                        <Text style={styles.tagChipText}>{srcLabel}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>

                {/* Actions Row */}
                <View style={styles.cardActionsRow}>
                  {/* Xem & Chi tiết */}
                  <Pressable
                    onPress={() => setSelected(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && styles.actionBtnPressed,
                    ]}
                  >
                    <Feather name="info" size={14} color="#334155" />
                    <Text style={styles.actionBtnText}>Chi tiết</Text>
                  </Pressable>

                  {/* Sửa */}
                  <Pressable
                    onPress={() => setEditor(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && styles.actionBtnPressed,
                    ]}
                  >
                    <Feather name="edit-2" size={14} color="#334155" />
                    <Text style={styles.actionBtnText}>Sửa</Text>
                  </Pressable>

                  {/* Tạo lại AI */}
                  <Pressable
                    onPress={() => setAi(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && styles.actionBtnPressed,
                    ]}
                  >
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Tạo lại AI</Text>
                  </Pressable>

                  {/* Xóa */}
                  <Pressable
                    onPress={() => {
                      setActionError('');
                      setDeleting(item);
                    }}
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

        {/* Pagination */}
        {!loading && !error && pages > 1 && (
          <View style={styles.paginationRow}>
            <Pressable
              onPress={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
            >
              <Feather name="chevron-left" size={16} color={colors.text} />
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
              <Feather name="chevron-right" size={16} color={colors.text} />
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
                <Feather name="trash-2" size={26} color="#EF4444" />
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
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 10,
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
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284C7',
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
  uploadBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiGenBtn: {
    flex: 1.2,
    height: 44,
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
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primary,
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
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#E0F2FE',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
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
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
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
  clearFilterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 12.5,
    color: colors.primary,
    fontWeight: '600',
  },
  foodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardMainPressable: {
    width: '100%',
  },
  foodImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F1F5F9',
  },
  photoFallback: {
    width: '100%',
    height: 180,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoFallbackText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  cardInfo: {
    padding: 12,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  foodName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  usageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  usageBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  tagChipText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minHeight: 38,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 6,
    gap: 4,
  },
  actionBtnPressed: {
    opacity: 0.7,
    backgroundColor: '#F1F5F9',
  },
  actionBtnText: {
    fontSize: 11.5,
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
    maxHeight: '92%',
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    marginLeft: 8,
  },
  sheetBody: {
    paddingVertical: 14,
    gap: 14,
  },
  detailPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  macrosSection: {
    gap: 8,
  },
  macrosTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  macroLabel: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  infoBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
  },
  infoBlockLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  infoBlockText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
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
    fontSize: 11.5,
    color: '#334155',
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
  detailAiBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
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
    marginBottom: 12,
  },
  errorNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#EF4444',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
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
