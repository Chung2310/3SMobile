import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/services/api/client';
import {
  display,
  listPath,
  recordId,
  resources,
  type AdminRecord,
} from '@/services/adminResources';
import { colors } from '@/theme';
import { messageOf } from '@/utils/error';

export function AdminKnowledgeManagement() {
  const resource = resources.knowledge;
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<AdminRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number>();
  const [keyword, setKeyword] = useState('');
  const [applied, setApplied] = useState('');
  const [status, setStatus] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [form, setForm] = useState<AdminRecord | null | undefined>(undefined);
  const [selectedKnowledge, setSelectedKnowledge] = useState<AdminRecord | null>(null);
  const [deletingKnowledge, setDeletingKnowledge] = useState<AdminRecord | null>(null);
  const [publishTarget, setPublishTarget] = useState<AdminRecord | null>(null);
  const [showSeedModal, setShowSeedModal] = useState(false);
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
      setDeletingKnowledge(null);
      setPublishTarget(null);
      setSelectedKnowledge(null);
      afterSave();
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  const handleSeedStandard = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setActionError('');
    try {
      const result = await api.post<{ count: number }>('/api/knowledge/seed-standard', {});
      setShowSeedModal(false);
      setSuccess(`Đã nạp thành công ${result.count} tài liệu tri thức chuẩn 3S Gym.`);
      setTimeout(() => setSuccess(''), 4000);
      void load();
    } catch (e) {
      setActionError(messageOf(e));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  };

  // Stats
  const totalKnowledge = total ?? items.length;
  const publishedCount = items.filter((i) => i.status === 'PUBLISHED').length;
  const draftCount = items.filter((i) => i.status === 'DRAFT').length;

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
              <Ionicons name="bulb" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalKnowledge}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Tổng bài viết
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatus('PUBLISHED');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
            </View>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{publishedCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Đã xuất bản
            </Text>
          </Pressable>

          <View style={styles.statDivider} />

          <Pressable
            style={styles.statItem}
            onPress={() => {
              setStatus('DRAFT');
              setPage(1);
            }}
          >
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="document-text" size={16} color="#D97706" />
            </View>
            <Text style={[styles.statValue, { color: '#D97706' }]}>{draftCount}</Text>
            <Text style={styles.statLabel} numberOfLines={1} ellipsizeMode="tail">
              Bản nháp
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. ACTIONS TOOLBAR */}
      <View style={styles.toolbarRow}>
        <Pressable
          onPress={() => setForm(null)}
          style={({ pressed }) => [
            styles.addKnowledgeBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Feather name="plus" size={17} color="#FFFFFF" />
          <Text style={styles.addKnowledgeBtnText}>Thêm tri thức</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setActionError('');
            setShowSeedModal(true);
          }}
          style={({ pressed }) => [
            styles.seedBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="sparkles" size={15} color={colors.primary} />
          <Text style={styles.seedBtnText}>Nạp mẫu 3S</Text>
        </Pressable>

        <Pressable
          onPress={() => void load()}
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
            placeholder="Tìm theo tiêu đề, chủ đề, từ khóa…"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            value={keyword}
            onChangeText={setKeyword}
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
              <Feather name="x-circle" size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 4. STATUS FILTER PILLS */}
      <View style={styles.filterPillsRow}>
        {(
          [
            { key: 'ALL', label: 'Tất cả' },
            { key: 'PUBLISHED', label: 'Đã xuất bản' },
            { key: 'DRAFT', label: 'Bản nháp' },
          ] as const
        ).map((tab) => {
          const isSelected = status === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              style={[
                styles.filterPill,
                isSelected && styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isSelected && styles.filterPillTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Success banner */}
      {success ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      {/* 5. KNOWLEDGE LIST */}
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
            <Text style={styles.statusBoxText}>Đang tải kho tri thức AI…</Text>
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
            <Ionicons name="bulb-outline" size={40} color="#94A3B8" />
            <Text style={styles.statusBoxText}>Chưa có tài liệu tri thức nào phù hợp.</Text>
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
            const kId = recordId(item);
            const isPublished = item.status === 'PUBLISHED';

            return (
              <View key={kId} style={styles.knowledgeCard}>
                {/* Clickable body area to view details */}
                <Pressable
                  onPress={() => setSelectedKnowledge(item)}
                  style={({ pressed }) => [
                    styles.cardMainPressable,
                    pressed && { opacity: 0.92 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Chi tiết bài viết ${display(item.title)}`}
                >
                  <View style={styles.cardHeaderRow}>
                    {/* Topic Tag Chip */}
                    <View style={styles.topicChip}>
                      <Ionicons name="bookmark" size={11} color={colors.primary} />
                      <Text style={styles.topicChipText} numberOfLines={1}>
                        {String(item.topic || 'Chung')}
                      </Text>
                    </View>

                    {item.version !== undefined && (
                      <View style={styles.versionChip}>
                        <Text style={styles.versionChipText}>v{String(item.version)}</Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }} />

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: isPublished ? '#DCFCE7' : '#FEF3C7' },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: isPublished ? '#16A34A' : '#D97706' },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: isPublished ? '#16A34A' : '#D97706' },
                        ]}
                      >
                        {isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                      </Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={styles.knowledgeTitle} numberOfLines={2} ellipsizeMode="tail">
                    {display(item.title)}
                  </Text>

                  {/* Content snippet */}
                  {typeof item.content === 'string' && item.content.trim() ? (
                    <Text style={styles.knowledgeExcerpt} numberOfLines={3} ellipsizeMode="tail">
                      {item.content.trim()}
                    </Text>
                  ) : null}
                </Pressable>

                {/* Actions Row */}
                <View style={styles.cardActionsRow}>
                  {/* Xem */}
                  <Pressable
                    onPress={() => setSelectedKnowledge(item)}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && styles.actionBtnPressed,
                    ]}
                  >
                    <Feather name="eye" size={14} color="#334155" />
                    <Text style={styles.actionBtnText}>Đọc</Text>
                  </Pressable>

                  {/* Sửa */}
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

                  {/* Xuất bản / Thu hồi với popup xác nhận */}
                  <Pressable
                    onPress={() => {
                      setActionError('');
                      setPublishTarget(item);
                    }}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      pressed && styles.actionBtnPressed,
                    ]}
                  >
                    <Feather
                      name={isPublished ? 'arrow-down-circle' : 'arrow-up-circle'}
                      size={14}
                      color={isPublished ? '#D97706' : '#16A34A'}
                    />
                    <Text
                      style={[
                        styles.actionBtnText,
                        { color: isPublished ? '#D97706' : '#16A34A' },
                      ]}
                    >
                      {isPublished ? 'Thu hồi' : 'Xuất bản'}
                    </Text>
                  </Pressable>

                  {/* Xóa */}
                  <Pressable
                    onPress={() => {
                      setActionError('');
                      setDeletingKnowledge(item);
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

      {/* MODAL 1: FORM CREATE / EDIT */}
      {form !== undefined && (
        <KnowledgeFormModal
          visible={form !== undefined}
          item={form}
          onClose={() => setForm(undefined)}
          onSuccess={afterSave}
        />
      )}

      {/* MODAL 2: DETAIL BOTTOM SHEET */}
      {selectedKnowledge && (
        <Modal
          visible={Boolean(selectedKnowledge)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedKnowledge(null)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSelectedKnowledge(null)}
            />

            <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.sheetHandle} />

              <View style={styles.detailHeader}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <View style={styles.topicChip}>
                      <Text style={styles.topicChipText}>{String(selectedKnowledge.topic || 'Chung')}</Text>
                    </View>
                    {selectedKnowledge.version !== undefined && (
                      <View style={styles.versionChip}>
                        <Text style={styles.versionChipText}>v{String(selectedKnowledge.version)}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.detailTitle}>{display(selectedKnowledge.title)}</Text>
                </View>

                <Pressable
                  onPress={() => setSelectedKnowledge(null)}
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
                <View style={styles.contentCard}>
                  <Text style={styles.contentText}>
                    {String(selectedKnowledge.content || 'Chưa có nội dung văn bản.')}
                  </Text>
                </View>
              </ScrollView>

              {/* Detail Sheet Actions */}
              <View style={styles.detailActions}>
                <Pressable
                  onPress={() => {
                    const k = selectedKnowledge;
                    setSelectedKnowledge(null);
                    setForm(k);
                  }}
                  style={styles.detailEditBtn}
                >
                  <Feather name="edit-2" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.detailEditText}>Chỉnh sửa bài viết</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const k = selectedKnowledge;
                    setSelectedKnowledge(null);
                    setActionError('');
                    setPublishTarget(k);
                  }}
                  style={[
                    styles.detailPublishBtn,
                    {
                      backgroundColor:
                        selectedKnowledge.status === 'PUBLISHED' ? '#FEF3C7' : '#DCFCE7',
                      borderColor:
                        selectedKnowledge.status === 'PUBLISHED' ? '#FDE68A' : '#86EFAC',
                    },
                  ]}
                >
                  <Feather
                    name={selectedKnowledge.status === 'PUBLISHED' ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={16}
                    color={selectedKnowledge.status === 'PUBLISHED' ? '#D97706' : '#16A34A'}
                  />
                </Pressable>

                <Pressable
                  onPress={() => {
                    const k = selectedKnowledge;
                    setSelectedKnowledge(null);
                    setActionError('');
                    setDeletingKnowledge(k);
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

      {/* MODAL 3: CONFIRM PUBLISH / UNPUBLISH */}
      {publishTarget && (
        <Modal
          visible={Boolean(publishTarget)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setPublishTarget(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View
                style={[
                  styles.modalIconBox,
                  {
                    backgroundColor:
                      publishTarget.status === 'PUBLISHED' ? '#FEF3C7' : '#DCFCE7',
                  },
                ]}
              >
                <Feather
                  name={publishTarget.status === 'PUBLISHED' ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={26}
                  color={publishTarget.status === 'PUBLISHED' ? '#D97706' : '#16A34A'}
                />
              </View>

              <Text style={styles.modalTitle}>
                {publishTarget.status === 'PUBLISHED'
                  ? 'Thu hồi tài liệu về bản nháp'
                  : 'Xuất bản tri thức AI'}
              </Text>

              <Text style={styles.modalDesc}>
                {publishTarget.status === 'PUBLISHED'
                  ? `Bạn có chắc chắn muốn thu hồi tài liệu “${display(publishTarget.title)}”? Trợ lý AI và hội viên sẽ tạm thời không truy xuất tài liệu này.`
                  : `Bạn có chắc chắn muốn xuất bản tài liệu “${display(publishTarget.title)}”? Tài liệu sẽ được cung cấp cho mô hình AI và huấn luyện viên sử dụng.`}
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
                  onPress={() => setPublishTarget(null)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    void runAction(() => {
                      const isPub = publishTarget.status === 'PUBLISHED';
                      return api.patch(
                        `${resource.path}/${recordId(publishTarget)}/${isPub ? 'unpublish' : 'publish'}`,
                        {}
                      );
                    })
                  }
                  style={[
                    styles.modalConfirmBtn,
                    {
                      backgroundColor:
                        publishTarget.status === 'PUBLISHED' ? '#D97706' : '#16A34A',
                    },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmText}>
                      {publishTarget.status === 'PUBLISHED' ? 'Thu hồi nháp' : 'Xuất bản ngay'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 4: CONFIRM DELETE */}
      {deletingKnowledge && (
        <Modal
          visible={Boolean(deletingKnowledge)}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setDeletingKnowledge(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.deleteIconBox}>
                <Feather name="trash-2" size={26} color="#EF4444" />
              </View>

              <Text style={styles.modalTitle}>Xóa tài liệu tri thức</Text>

              <Text style={styles.modalDesc}>
                Bạn có chắc chắn muốn xóa bài viết &ldquo;{display(deletingKnowledge.title)}&rdquo;? Thao tác này không thể hoàn tác.
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
                  onPress={() => setDeletingKnowledge(null)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() =>
                    void runAction(() =>
                      api.delete(`${resource.path}/${recordId(deletingKnowledge)}`)
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

      {/* MODAL 5: SEED STANDARD KNOWLEDGE */}
      {showSeedModal && (
        <Modal
          visible={showSeedModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setShowSeedModal(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={[styles.modalIconBox, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="sparkles" size={26} color={colors.primary} />
              </View>

              <Text style={styles.modalTitle}>Nạp tri thức chuẩn 3S Gym</Text>

              <Text style={styles.modalDesc}>
                Hệ thống sẽ bổ sung và tự động xuất bản các tài liệu kiến thức chuẩn về dinh dưỡng, lịch tập, phục hồi cơ bản của 3S Gym. Các tài liệu đã tồn tại sẽ được giữ nguyên.
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
                  onPress={() => setShowSeedModal(false)}
                  style={styles.modalCancelBtn}
                >
                  <Text style={styles.modalCancelText}>Hủy</Text>
                </Pressable>

                <Pressable
                  disabled={busy}
                  onPress={() => void handleSeedStandard()}
                  style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalConfirmText}>Nạp và xuất bản</Text>
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

// Dedicated Knowledge Form Modal
function KnowledgeFormModal({
  visible,
  item,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  item?: AdminRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const resource = resources.knowledge;
  const insets = useSafeAreaInsets();
  const editing = Boolean(item);

  const [title, setTitle] = useState(String(item?.title || ''));
  const [topic, setTopic] = useState(String(item?.topic || ''));
  const [content, setContent] = useState(String(item?.content || ''));

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  const handleSubmit = async () => {
    if (lock.current || busy) return;
    setError('');

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề tài liệu.');
      return;
    }

    if (!topic.trim()) {
      setError('Vui lòng nhập chủ đề tài liệu.');
      return;
    }

    if (!content.trim()) {
      setError('Vui lòng nhập nội dung tài liệu.');
      return;
    }

    try {
      lock.current = true;
      setBusy(true);

      const payload = {
        title: title.trim(),
        topic: topic.trim(),
        content: content.trim(),
      };

      if (editing && item) {
        await api.patch(`${resource.path}/${recordId(item)}`, payload);
      } else {
        await api.post(resource.path, payload);
      }

      onSuccess();
    } catch (err) {
      setError(messageOf(err));
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
          style={{ maxHeight: '94%' }}
        >
          <View style={[styles.formSheetContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>
                  {editing ? 'Chỉnh sửa tài liệu tri thức' : 'Thêm tài liệu tri thức mới'}
                </Text>
                <Text style={styles.sheetSub}>
                  {editing ? display(item?.title) : 'Đào tạo và bổ trợ kiến thức cho trợ lý AI'}
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

              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Tiêu đề tài liệu <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ví dụ: Nguyên tắc nạp Protein sau buổi tập kháng lực"
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {/* Topic */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Chủ đề <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ví dụ: Dinh dưỡng, Phục hồi, Luyện tập, Bệnh lý..."
                  placeholderTextColor="#94A3B8"
                  value={topic}
                  onChangeText={setTopic}
                />
              </View>

              {/* Content */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Nội dung chi tiết <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.formInput, { height: 180, paddingTop: 10, textAlignVertical: 'top' }]}
                  placeholder="Nhập toàn văn tài liệu, hướng dẫn, lưu ý dinh dưỡng/bài tập chi tiết để AI học hỏi…"
                  placeholderTextColor="#94A3B8"
                  value={content}
                  onChangeText={setContent}
                  multiline
                />
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
                    {editing ? 'Lưu thay đổi' : 'Lưu bản nháp'}
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
  addKnowledgeBtn: {
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
  addKnowledgeBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  seedBtn: {
    flex: 1,
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
  seedBtnText: {
    fontSize: 13,
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
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
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
    gap: 10,
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
  knowledgeCard: {
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
    gap: 8,
  },
  cardMainPressable: {
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  topicChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  versionChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  versionChipText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
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
  knowledgeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
  },
  knowledgeExcerpt: {
    fontSize: 12.5,
    color: '#64748B',
    lineHeight: 18,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    gap: 8,
    marginTop: 2,
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
    paddingHorizontal: 4,
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
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
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
  },
  contentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  contentText: {
    fontSize: 13.5,
    color: '#334155',
    lineHeight: 21,
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
  detailPublishBtn: {
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
  modalIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
  modalConfirmBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
