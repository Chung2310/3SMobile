import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import { AppAlertModal, useAppAlert } from '@/components/AppAlertModal';
import type { CustomerGoalData, InBodyRecordData } from '@/types/inbody';
import { api } from '@/services/api/client';
import { analyzeInBody } from '@/services/inbodyAnalytics';
import { inbodyService } from '@/services/inbodyService';
import * as Clipboard from 'expo-clipboard';
import { InBodySummaryBanner } from './InBodySummaryBanner';
import { InBodyMetricsGrid } from './InBodyMetricsGrid';
import { InBodySegmentalView } from './InBodySegmentalView';
import { InBodyConsultationGuide } from './InBodyConsultationGuide';
import { InBodyEvolutionChart } from './InBodyEvolutionChart';

interface InBodyDetailSheetProps {
  visible: boolean;
  record: InBodyRecordData | null;
  previousRecord?: InBodyRecordData | null;
  historyRecords?: InBodyRecordData[];
  onClose: () => void;
  onEdit?: (record: InBodyRecordData) => void;
  onDelete?: (record: InBodyRecordData) => void;
  onStatusChanged?: (updated: InBodyRecordData) => void;
}

const formatDate = (isoStr?: string): string => {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export function InBodyDetailSheet({
  visible,
  record,
  previousRecord,
  historyRecords,
  onClose,
  onEdit,
  onDelete,
  onStatusChanged,
}: InBodyDetailSheetProps) {
  const [goals, setGoals] = useState<CustomerGoalData[]>([]);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [copiedConsultation, setCopiedConsultation] = useState(false);
  const { alertConfig, showError } = useAppAlert();
  const [customerGoal, setCustomerGoal] = useState<CustomerGoalData | null>(null);
  const [customerHistory, setCustomerHistory] = useState<InBodyRecordData[]>(historyRecords || []);

  useEffect(() => {
    if (historyRecords && historyRecords.length > 0) {
      setCustomerHistory(historyRecords);
    }
  }, [historyRecords]);

  useEffect(() => {
    if (!visible || !record) {
      setCustomerGoal(null);
      setCustomerHistory([]);
      setCopiedConsultation(false);
      return;
    }
    const cId =
      typeof record.customerId === 'object' && record.customerId !== null
        ? record.customerId._id
        : String(record.customerId || '');
    if (!cId) {
      setCustomerGoal(null);
      return;
    }

    // Tải mục tiêu học viên
    api
      .get<CustomerGoalData[]>(`/api/goals?customerId=${cId}&limit=1`)
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setCustomerGoal(res[0]);
        } else if (
          res &&
          typeof res === 'object' &&
          'data' in res &&
          Array.isArray((res as any).data) &&
          (res as any).data.length > 0
        ) {
          setCustomerGoal((res as any).data[0]);
        } else {
          setCustomerGoal(null);
        }
      })
      .catch(() => setCustomerGoal(null));

    // Tải trọn vẹn toàn bộ lịch sử InBody của học viên này
    inbodyService
      .getRecords({ customerId: cId, limit: 100, sortBy: 'measurementDate', sortOrder: 'asc' })
      .then((res) => {
        const items = Array.isArray((res as any)?.data)
          ? (res as any).data
          : Array.isArray(res)
          ? res
          : [];
        if (items.length > 0) {
          setCustomerHistory(items);
        }
      })
      .catch((err) => {
        console.warn('[InBodyDetailSheet] Failed to load full customer InBody history:', err);
      });
  }, [visible, record]);

  const customerMeta = useMemo(() => {
    if (!record) return undefined;
    if (typeof record.customerId === 'object' && record.customerId !== null) {
      return {
        fullName: record.customerId.fullName,
        gender: record.customerId.gender,
        height: record.customerId.height,
        phone: record.customerId.phone,
      };
    }
    return undefined;
  }, [record]);

  const customerName = customerMeta?.fullName || 'Học viên';
  const isPublished = record?.status === 'PUBLISHED';

  // Tự động tìm phiếu đo trước đó từ toàn bộ lịch sử nếu previousRecord truyền vào bị thiếu
  const effectivePreviousRecord = useMemo(() => {
    if (previousRecord) return previousRecord;
    if (!record || customerHistory.length < 2) return null;
    const sorted = [...customerHistory].sort(
      (a, b) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime()
    );
    const idx = sorted.findIndex((r) => r._id === record._id);
    if (idx >= 0 && idx + 1 < sorted.length) {
      return sorted[idx + 1];
    }
    return null;
  }, [previousRecord, record, customerHistory]);

  const analysis = useMemo(() => {
    if (!record) return null;
    return analyzeInBody(record, effectivePreviousRecord, customerMeta, customerGoal);
  }, [record, effectivePreviousRecord, customerMeta, customerGoal]);

  if (!record) return null;

  const handleTogglePublish = async () => {
    if (!record._id || togglingStatus) return;
    try {
      setTogglingStatus(true);
      let updated: InBodyRecordData;
      if (isPublished) {
        updated = await inbodyService.unpublishRecord(record._id);
      } else {
        updated = await inbodyService.publishRecord(record._id);
      }
      onStatusChanged?.(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái';
      showError(msg);
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleCopyConsultation = async () => {
    if (!analysis?.quickMessage) {
      showError('Không tìm thấy nội dung tư vấn để sao chép.');
      return;
    }
    try {
      await Clipboard.setStringAsync(analysis.quickMessage);
      setCopiedConsultation(true);
      setTimeout(() => setCopiedConsultation(false), 2500);
    } catch (err) {
      console.warn('[InBodyDetailSheet] Failed to copy consultation message:', err);
      showError('Không thể sao chép vào bộ nhớ tạm.');
    }
  };

  const handleShareQuickMessage = async () => {
    if (!analysis?.quickMessage) return;
    try {
      await Share.share({
        message: analysis.quickMessage,
        title: `Kết quả InBody - ${customerName}`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarCircle}>
                <Ionicons name="fitness" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.customerTitle} numberOfLines={1}>
                  {customerName}
                </Text>
                <View style={styles.dateAndBadgeRow}>
                  <Text style={styles.dateSubtitle}>
                    Ngày đo: {formatDate(record.measurementDate)}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      { backgroundColor: isPublished ? '#DCFCE7' : '#FEF3C7' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: isPublished ? '#15803D' : '#B45309' },
                      ]}
                    >
                      {isPublished ? 'Đã công bố' : 'Bản nháp'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Action Bar for PT */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.actionBarScroll}
            contentContainerStyle={styles.actionBarContent}
          >
            <Pressable
              style={[
                styles.actionBtn,
                isPublished ? styles.actionBtnPublished : styles.actionBtnPublish,
              ]}
              onPress={handleTogglePublish}
              disabled={togglingStatus}
            >
              {togglingStatus ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={isPublished ? 'eye-off-outline' : 'eye-outline'}
                    size={15}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionBtnText}>
                    {isPublished ? 'Thu hồi nháp' : 'Công bố'}
                  </Text>
                </>
              )}
            </Pressable>

            {/* Nút Sao chép kịch bản tư vấn InBody */}
            <Pressable
              style={[
                styles.actionBtn,
                copiedConsultation ? styles.actionBtnSuccess : styles.actionBtnCopy,
              ]}
              onPress={handleCopyConsultation}
            >
              <Ionicons
                name={copiedConsultation ? 'checkmark-circle' : 'copy-outline'}
                size={15}
                color={copiedConsultation ? '#15803D' : '#0284C7'}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  { color: copiedConsultation ? '#15803D' : '#0284C7' },
                ]}
              >
                {copiedConsultation ? 'Đã sao chép' : 'Sao chép tư vấn'}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={handleShareQuickMessage}
            >
              <Ionicons name="share-social-outline" size={15} color={colors.primaryNavy} />
              <Text style={[styles.actionBtnText, { color: colors.primaryNavy }]}>Chia sẻ</Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.actionBtnSecondary]}
              onPress={() => {
                onClose();
                onEdit?.(record);
              }}
            >
              <Ionicons name="create-outline" size={15} color={colors.text} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>Sửa</Text>
            </Pressable>

            {onDelete && (
              <Pressable
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => {
                  onClose();
                  onDelete(record);
                }}
              >
                <Ionicons name="trash-outline" size={15} color={colors.danger} />
                <Text style={[styles.actionBtnText, { color: colors.danger }]}>Xóa</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Delta Banner if previous record exists */}
            {analysis?.comparison && (
              <InBodySummaryBanner
                comparison={analysis.comparison}
                customerName={customerName}
              />
            )}

            {/* 1.5 Goal Alignment Card if active customer goal exists */}
            {analysis?.goalAlignment && (
              <View style={styles.goalCard}>
                <View style={styles.goalCardHeader}>
                  <View style={styles.goalIconCircle}>
                    <Ionicons name="flag" size={16} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.goalTitleRow}>
                      <Text style={styles.goalTitle} numberOfLines={1}>
                        Mục tiêu: {analysis.goalAlignment.goal.title}
                      </Text>
                      <View style={styles.goalTypeBadge}>
                        <Text style={styles.goalTypeBadgeText}>
                          {analysis.goalAlignment.goalTypeLabel}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.goalSummaryText}>
                      {analysis.goalAlignment.statusSummary}
                    </Text>
                  </View>
                </View>

                {/* Deadline & schedule if available */}
                {(analysis.goalAlignment.goal.deadline ||
                  analysis.goalAlignment.goal.sessionsPerWeek) && (
                  <View style={styles.goalMetaRow}>
                    {analysis.goalAlignment.goal.deadline && (
                      <View style={styles.goalMetaPill}>
                        <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.goalMetaText}>
                          Hạn chót: {formatDate(analysis.goalAlignment.goal.deadline)}
                        </Text>
                      </View>
                    )}
                    {analysis.goalAlignment.goal.sessionsPerWeek && (
                      <View style={styles.goalMetaPill}>
                        <Ionicons name="fitness-outline" size={11} color={colors.textMuted} />
                        <Text style={styles.goalMetaText}>
                          Lịch tập: {analysis.goalAlignment.goal.sessionsPerWeek} buổi/tuần
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* 2. InBody Score Highlight */}
            {record.inbodyScore != null && (
              <View style={styles.scoreCard}>
                <View style={styles.scoreLeft}>
                  <Text style={styles.scoreCardTitle}>Điểm Thể Thao InBody</Text>
                  <Text style={styles.scoreCardDesc}>
                    {analysis?.classifications.inbodyScore?.description ||
                      'Đánh giá tổng hợp cân nặng, cơ xương và tỷ lệ mỡ.'}
                  </Text>
                </View>
                <View style={styles.scoreCircle}>
                  <Text style={styles.scoreNumber}>{record.inbodyScore}</Text>
                  <Text style={styles.scoreLabel}>
                    {analysis?.classifications.inbodyScore?.label || 'Điểm'}
                  </Text>
                </View>
              </View>
            )}

            {/* 3. Core Metrics Grid */}
            <InBodyMetricsGrid record={record} analysis={analysis} />

            {/* 4. Segmental Muscle & Fat Analysis */}
            <InBodySegmentalView
              segmentalMuscle={record.segmentalMuscle}
              segmentalFat={record.segmentalFat}
              analysis={analysis}
            />

            {/* 5. Health Alerts, Consultation Guide & PT Notes */}
            <InBodyConsultationGuide
              analysis={analysis}
              consultationNotes={record.consultationNotes}
            />

            {/* 6. Evolution Chart across history */}
            {customerHistory && customerHistory.length >= 2 && (
              <View style={{ marginTop: 12 }}>
                <InBodyEvolutionChart
                  records={customerHistory}
                  title="Tiến trình thay đổi thể chất"
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      <AppAlertModal {...alertConfig} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceIce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: colors.primaryNavy,
  },
  dateAndBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dateSubtitle: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontWeight: '600',
    fontSize: 10,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
  },
  actionBarScroll: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    maxHeight: 52,
  },
  actionBarContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  actionBtnPublish: {
    backgroundColor: '#0284C7',
  },
  actionBtnPublished: {
    backgroundColor: '#64748B',
  },
  actionBtnCopy: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  actionBtnSuccess: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  actionBtnSecondary: {
    backgroundColor: colors.surfaceIce,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  actionBtnDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
  },
  actionBtnText: {
    fontWeight: '600',
    fontSize: 12,
    color: '#FFFFFF',
  },
  contentScroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  scoreLeft: {
    flex: 1,
    paddingRight: spacing.md,
  },
  scoreCardTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: colors.primaryNavy,
    marginBottom: 4,
  },
  scoreCardDesc: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  scoreCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  scoreNumber: {
    fontWeight: '700',
    fontSize: 22,
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontWeight: '600',
    fontSize: 9,
    color: 'rgba(255,255,255,0.9)',
    marginTop: -2,
  },
  goalCard: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  goalCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  goalIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  goalTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primaryNavy,
    flex: 1,
  },
  goalTypeBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  goalTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  goalSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
    lineHeight: 16,
  },
  goalMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0F2FE',
  },
  goalMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  goalMetaText: {
    fontSize: 11,
    color: colors.primaryNavy,
    fontWeight: '500',
  },
});
