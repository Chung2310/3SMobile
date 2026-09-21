import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchWorkoutTemplates,
  type WorkoutTemplateItem,
} from '@/services/customerWorkoutPlanService';
import { LEVELS } from '@/services/workouts';
import { colors } from '@/theme/colors';

const MASCOT_COACH = require('../../assets/public/3s-coach.png');

interface WorkoutTemplatePickerModalProps {
  visible: boolean;
  customerName: string;
  onClose: () => void;
  onConfirm: (templateId: string) => Promise<void>;
}

export function WorkoutTemplatePickerModal({
  visible,
  customerName,
  onClose,
  onConfirm,
}: WorkoutTemplatePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [templates, setTemplates] = useState<WorkoutTemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelectedId('');
      setSearchQuery('');
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchWorkoutTemplates()
      .then((data) => {
        if (isMounted) {
          setTemplates(data || []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Không thể tải danh sách giáo án mẫu.'
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => {
      const title = (t.title || '').toLowerCase();
      const goal = (t.goal || '').toLowerCase();
      const level = (t.level || '').toLowerCase();
      return title.includes(q) || goal.includes(q) || level.includes(q);
    });
  }, [templates, searchQuery]);

  const handleConfirm = async () => {
    if (!selectedId || submitting) return;
    try {
      setSubmitting(true);
      await onConfirm(selectedId);
      onClose();
    } catch {
      // Error is handled in parent via modal/toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Top Drag Indicator */}
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Chọn giáo án mẫu</Text>
              <Text
                style={styles.headerSubtitle}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Gán lộ trình tập luyện cho {customerName}
              </Text>
            </View>
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Đóng"
            >
              <Feather name="x" size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={16} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm theo tên giáo án, mục tiêu..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                style={styles.clearSearchBtn}
              >
                <Feather name="x-circle" size={16} color="#94A3B8" />
              </Pressable>
            )}
          </View>

          {/* Template List or State */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#0284C7" />
              <Text style={styles.loadingText}>Đang tải danh sách giáo án mẫu...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Feather name="alert-circle" size={32} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => {
                  setLoading(true);
                  setError(null);
                  fetchWorkoutTemplates()
                    .then((data) => setTemplates(data || []))
                    .catch((err) =>
                      setError(
                        err instanceof Error
                          ? err.message
                          : 'Không thể tải danh sách giáo án mẫu.'
                      )
                    )
                    .finally(() => setLoading(false));
                }}
              >
                <Text style={styles.retryBtnText}>Thử lại</Text>
              </Pressable>
            </View>
          ) : filteredTemplates.length === 0 ? (
            <View style={styles.emptyBox}>
              <Image
                source={MASCOT_COACH}
                style={styles.emptyMascot}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>
                {searchQuery
                  ? 'Không tìm thấy giáo án phù hợp'
                  : 'Chưa có giáo án mẫu'}
              </Text>
              <Text style={styles.emptyDesc}>
                {searchQuery
                  ? 'Thử tìm kiếm với từ khóa khác.'
                  : 'Hãy tạo giáo án mẫu trong mục Giáo án để gán cho khách hàng.'}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredTemplates.map((item) => {
                const isSelected = selectedId === item._id;
                const levelLabel =
                  LEVELS[item.level as keyof typeof LEVELS] || item.level || 'Cá nhân hóa';
                const durationText = item.durationDays
                  ? `${item.durationDays} ngày`
                  : 'Linh hoạt';
                const sessionsCount = Array.isArray(item.sessions)
                  ? item.sessions.length
                  : Array.isArray(item.scheduledExercises)
                  ? item.scheduledExercises.length
                  : 0;

                return (
                  <Pressable
                    key={item._id}
                    style={[
                      styles.templateCard,
                      isSelected && styles.templateCardSelected,
                    ]}
                    onPress={() => setSelectedId(item._id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.cardMain}>
                      <View style={styles.cardHeaderRow}>
                        <Text
                          style={[
                            styles.cardTitle,
                            isSelected && styles.cardTitleSelected,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.title}
                        </Text>
                        <View
                          style={[
                            styles.radioCircle,
                            isSelected && styles.radioCircleSelected,
                          ]}
                        >
                          {isSelected && (
                            <Feather name="check" size={12} color="#FFFFFF" />
                          )}
                        </View>
                      </View>

                      {!!item.goal && (
                        <Text
                          style={styles.cardGoal}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {item.goal}
                        </Text>
                      )}

                      <View style={styles.cardMetaRow}>
                        <View style={styles.badgePill}>
                          <Feather name="award" size={11} color="#0284C7" />
                          <Text style={styles.badgeText}>{levelLabel}</Text>
                        </View>

                        <View style={styles.badgePill}>
                          <Feather name="calendar" size={11} color="#64748B" />
                          <Text style={styles.badgeText}>{durationText}</Text>
                        </View>

                        {sessionsCount > 0 && (
                          <View style={styles.badgePill}>
                            <Feather name="layers" size={11} color="#64748B" />
                            <Text style={styles.badgeText}>
                              {sessionsCount} buổi
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </Pressable>

            <Pressable
              style={[
                styles.confirmBtn,
                (!selectedId || submitting) && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedId || submitting}
            >
              {submitting ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>Đang gán...</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Feather name="check" size={16} color="#FFFFFF" />
                  <Text style={styles.confirmBtnText}>Xác nhận gán</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: '85%',
    minHeight: '55%',
    paddingTop: 12,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  dragHandle: {
    width: 44,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
  },
  clearSearchBtn: {
    padding: 4,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0284C7',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  emptyMascot: {
    width: 90,
    height: 90,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 16,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
  },
  templateCardSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  cardMain: {
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 10,
  },
  cardTitleSelected: {
    color: '#0284C7',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  radioCircleSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#0284C7',
  },
  cardGoal: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1.6,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
