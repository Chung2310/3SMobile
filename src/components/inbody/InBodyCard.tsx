import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type { InBodyRecordData } from '@/types/inbody';

interface InBodyCardProps {
  record: InBodyRecordData;
  onPress: (record: InBodyRecordData) => void;
  onEdit: (record: InBodyRecordData) => void;
  onDelete: (record: InBodyRecordData) => void;
}

const formatDateDisplay = (isoStr?: string): string => {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export function InBodyCard({ record, onPress, onEdit, onDelete }: InBodyCardProps) {
  const cMeta =
    typeof record.customerId === 'object' && record.customerId !== null
      ? record.customerId
      : null;
  const cName = cMeta?.fullName || 'Học viên';
  const isPublished = record.status === 'PUBLISHED';
  const isOcrReview = record.ocrStatus === 'REVIEW_REQUIRED';

  return (
    <Pressable style={styles.card} onPress={() => onPress(record)}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardIconCircle}>
            <Ionicons name="body" size={17} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.cardCustomerName} numberOfLines={1}>
              {cName}
            </Text>
            <Text style={styles.cardDateText}>
              {formatDateDisplay(record.measurementDate)}
            </Text>
          </View>
        </View>

        <View style={styles.badgesRow}>
          {isOcrReview && (
            <View style={[styles.badgePill, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="sparkles" size={11} color="#D97706" />
              <Text style={[styles.badgePillText, { color: '#B45309' }]}>
                Chờ xác nhận
              </Text>
            </View>
          )}

          <View
            style={[
              styles.badgePill,
              { backgroundColor: isPublished ? '#DCFCE7' : '#F1F5F9' },
            ]}
          >
            <Text
              style={[
                styles.badgePillText,
                { color: isPublished ? '#15803D' : '#64748B' },
              ]}
            >
              {isPublished ? 'Đã công bố' : 'Nháp'}
            </Text>
          </View>
        </View>
      </View>

      {/* Card Metrics Grid */}
      <View style={styles.cardMetricsGrid}>
        <View style={styles.cardMetricCol}>
          <Text style={styles.cardMetricLabel}>Cân nặng</Text>
          <Text style={styles.cardMetricValue}>
            {record.weight} <Text style={styles.cardMetricUnit}>kg</Text>
          </Text>
        </View>

        <View style={styles.cardMetricCol}>
          <Text style={styles.cardMetricLabel}>Tỷ lệ mỡ</Text>
          <Text style={styles.cardMetricValue}>
            {record.bodyFatPercentage != null ? `${record.bodyFatPercentage}%` : '—'}
          </Text>
        </View>

        <View style={styles.cardMetricCol}>
          <Text style={styles.cardMetricLabel}>Cơ xương</Text>
          <Text style={styles.cardMetricValue}>
            {record.muscleMass != null ? `${record.muscleMass} kg` : '—'}
          </Text>
        </View>

        <View style={styles.cardMetricCol}>
          <Text style={styles.cardMetricLabel}>Điểm</Text>
          <Text style={[styles.cardMetricValue, { color: colors.primaryNavy }]}>
            {record.inbodyScore != null ? record.inbodyScore : '—'}
          </Text>
        </View>
      </View>

      {/* Card Footer Actions */}
      <View style={styles.cardFooter}>
        <Text style={styles.sourceText}>
          {record.source === 'AI_SCAN' ? '🤖 Quét AI' : '✏️ Nhập tay'}
        </Text>

        <View style={styles.cardActionsGroup}>
          <Pressable
            hitSlop={8}
            style={styles.cardActionIcon}
            onPress={() => onEdit(record)}
          >
            <Ionicons name="create-outline" size={17} color={colors.primary} />
          </Pressable>

          <Pressable
            hitSlop={8}
            style={styles.cardActionIcon}
            onPress={() => onDelete(record)}
          >
            <Ionicons name="trash-outline" size={17} color={colors.danger} />
          </Pressable>

          <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceIce,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCustomerName: {
    fontWeight: '700',
    fontSize: 14,
    color: colors.primaryNavy,
  },
  cardDateText: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.textMuted,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgePillText: {
    fontWeight: '600',
    fontSize: 10,
  },
  cardMetricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: spacing.xs,
  },
  cardMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  cardMetricLabel: {
    fontWeight: '400',
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  cardMetricValue: {
    fontWeight: '700',
    fontSize: 13.5,
    color: colors.text,
  },
  cardMetricUnit: {
    fontWeight: '400',
    fontSize: 10,
    color: colors.textMuted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  sourceText: {
    fontWeight: '400',
    fontSize: 10.5,
    color: colors.textMuted,
  },
  cardActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardActionIcon: {
    padding: 4,
  },
});
