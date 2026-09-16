import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type { InBodyAnalysisResult, SegmentalMap } from '@/types/inbody';

interface InBodySegmentalViewProps {
  segmentalMuscle?: SegmentalMap | null;
  segmentalFat?: SegmentalMap | null;
  analysis?: InBodyAnalysisResult | null;
}

export function InBodySegmentalView({
  segmentalMuscle,
  segmentalFat,
  analysis,
}: InBodySegmentalViewProps) {
  if (!segmentalMuscle && !segmentalFat) return null;

  const rows = [
    { label: 'Tay Phải', m: segmentalMuscle?.rightArm, f: segmentalFat?.rightArm },
    { label: 'Tay Trái', m: segmentalMuscle?.leftArm, f: segmentalFat?.leftArm },
    { label: 'Thân mình', m: segmentalMuscle?.trunk, f: segmentalFat?.trunk },
    { label: 'Chân Phải', m: segmentalMuscle?.rightLeg, f: segmentalFat?.rightLeg },
    { label: 'Chân Trái', m: segmentalMuscle?.leftLeg, f: segmentalFat?.leftLeg },
  ];

  return (
    <View style={styles.sectionBox}>
      <Text style={styles.sectionHeader}>Phân tích phân bố cơ & mỡ 5 vùng</Text>
      <View style={styles.segmentalTable}>
        <View style={styles.segmentalHeaderRow}>
          <Text style={[styles.segmentalColHeader, { flex: 1.2 }]}>Vùng cơ thể</Text>
          <Text style={[styles.segmentalColHeader, { flex: 1, textAlign: 'center' }]}>Cơ (kg)</Text>
          <Text style={[styles.segmentalColHeader, { flex: 1, textAlign: 'center' }]}>Mỡ (kg)</Text>
        </View>

        {rows.map((row, idx) => (
          <View key={idx} style={[styles.segmentalRow, idx % 2 === 1 && styles.segmentalRowAlt]}>
            <Text style={[styles.segmentalCellLabel, { flex: 1.2 }]}>{row.label}</Text>
            <Text style={[styles.segmentalCellVal, { flex: 1, textAlign: 'center' }]}>
              {row.m != null ? `${row.m}` : '—'}
            </Text>
            <Text style={[styles.segmentalCellVal, { flex: 1, textAlign: 'center', color: '#D97706' }]}>
              {row.f != null ? `${row.f}` : '—'}
            </Text>
          </View>
        ))}
      </View>

      {/* Imbalance alert if any */}
      {analysis?.segmentalAnalysis.muscleImbalanceArm.hasImbalance && (
        <View style={styles.imbalanceNotice}>
          <Ionicons name="warning-outline" size={14} color="#D97706" />
          <Text style={styles.imbalanceText}>
            {analysis.segmentalAnalysis.muscleImbalanceArm.note}
          </Text>
        </View>
      )}
      {analysis?.segmentalAnalysis.muscleImbalanceLeg.hasImbalance && (
        <View style={styles.imbalanceNotice}>
          <Ionicons name="warning-outline" size={14} color="#D97706" />
          <Text style={styles.imbalanceText}>
            {analysis.segmentalAnalysis.muscleImbalanceLeg.note}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBox: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    fontWeight: '700',
    fontSize: 13.5,
    color: colors.primaryNavy,
    marginBottom: spacing.xs,
    marginTop: 4,
  },
  segmentalTable: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  segmentalHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  segmentalColHeader: {
    fontWeight: '600',
    fontSize: 11,
    color: colors.textMuted,
  },
  segmentalRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
  segmentalRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  segmentalCellLabel: {
    fontWeight: '500',
    fontSize: 12,
    color: colors.text,
  },
  segmentalCellVal: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.primaryNavy,
  },
  imbalanceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: radius.sm,
    marginTop: 6,
  },
  imbalanceText: {
    fontWeight: '400',
    fontSize: 11,
    color: '#92400E',
    flex: 1,
  },
});
