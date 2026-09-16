import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type { InBodyAnalysisResult, InBodyRecordData } from '@/types/inbody';

interface InBodyMetricsGridProps {
  record: InBodyRecordData;
  analysis: InBodyAnalysisResult | null;
}

export function InBodyMetricsGrid({ record, analysis }: InBodyMetricsGridProps) {
  return (
    <View>
      <Text style={styles.sectionHeader}>Chỉ số cơ thể chính</Text>
      <View style={styles.metricsGrid}>
        {/* Weight */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Cân nặng</Text>
          <Text style={styles.metricValue}>
            {record.weight} <Text style={styles.metricUnit}>kg</Text>
          </Text>
          {analysis?.classifications.bmi && (
            <View
              style={[
                styles.metricBadge,
                { backgroundColor: `${analysis.classifications.bmi.color}15` },
              ]}
            >
              <Text
                style={[
                  styles.metricBadgeText,
                  { color: analysis.classifications.bmi.color },
                ]}
              >
                BMI: {record.bmi || '—'} ({analysis.classifications.bmi.label})
              </Text>
            </View>
          )}
        </View>

        {/* Body Fat Percentage */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Tỷ lệ mỡ</Text>
          <Text style={styles.metricValue}>
            {record.bodyFatPercentage != null ? `${record.bodyFatPercentage}%` : '—'}
          </Text>
          {analysis?.classifications.bodyFat && (
            <View
              style={[
                styles.metricBadge,
                { backgroundColor: `${analysis.classifications.bodyFat.color}15` },
              ]}
            >
              <Text
                style={[
                  styles.metricBadgeText,
                  { color: analysis.classifications.bodyFat.color },
                ]}
              >
                {analysis.classifications.bodyFat.label}
              </Text>
            </View>
          )}
        </View>

        {/* Muscle Mass */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Cơ xương (SMM)</Text>
          <Text style={styles.metricValue}>
            {record.muscleMass != null ? `${record.muscleMass}` : '—'}{' '}
            <Text style={styles.metricUnit}>kg</Text>
          </Text>
          {record.weight > 0 && record.muscleMass != null && (
            <Text style={styles.subtext}>
              ~{((record.muscleMass / record.weight) * 100).toFixed(1)}% cơ thể
            </Text>
          )}
        </View>

        {/* Visceral Fat Level */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Mỡ nội tạng</Text>
          <Text style={styles.metricValue}>
            Level {record.visceralFatLevel != null ? record.visceralFatLevel : '—'}
          </Text>
          {analysis?.classifications.visceralFat && (
            <View
              style={[
                styles.metricBadge,
                { backgroundColor: `${analysis.classifications.visceralFat.color}15` },
              ]}
            >
              <Text
                style={[
                  styles.metricBadgeText,
                  { color: analysis.classifications.visceralFat.color },
                ]}
              >
                {analysis.classifications.visceralFat.label}
              </Text>
            </View>
          )}
        </View>

        {/* BMR */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Trao đổi chất (BMR)</Text>
          <Text style={styles.metricValue}>
            {record.bmr != null ? `${record.bmr}` : '—'}{' '}
            <Text style={styles.metricUnit}>kcal</Text>
          </Text>
          <Text style={styles.subtext}>Năng lượng tiêu hao nền</Text>
        </View>

        {/* Fat Mass */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Khối lượng mỡ</Text>
          <Text style={styles.metricValue}>
            {record.bodyFatMass != null ? `${record.bodyFatMass}` : '—'}{' '}
            <Text style={styles.metricUnit}>kg</Text>
          </Text>
          <Text style={styles.subtext}>Tổng mỡ toàn thân</Text>
        </View>
      </View>

      {/* Secondary Metrics (Water, WHR, Bone) */}
      {(record.bodyWater != null || record.waistHipRatio != null || record.boneMineral != null) && (
        <View style={styles.secondaryMetricsRow}>
          {record.bodyWater != null && (
            <View style={styles.secondaryPill}>
              <Ionicons name="water-outline" size={14} color="#0284C7" />
              <Text style={styles.secondaryPillText}>
                Nước: <Text style={styles.boldVal}>{record.bodyWater}L</Text>
              </Text>
            </View>
          )}
          {record.waistHipRatio != null && (
            <View style={styles.secondaryPill}>
              <Ionicons name="resize-outline" size={14} color="#003B70" />
              <Text style={styles.secondaryPillText}>
                WHR: <Text style={styles.boldVal}>{record.waistHipRatio}</Text>
              </Text>
            </View>
          )}
          {record.boneMineral != null && (
            <View style={styles.secondaryPill}>
              <Ionicons name="shield-outline" size={14} color="#16A34A" />
              <Text style={styles.secondaryPillText}>
                Khoáng: <Text style={styles.boldVal}>{record.boneMineral}kg</Text>
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    fontWeight: '700',
    fontSize: 13.5,
    color: colors.primaryNavy,
    marginBottom: spacing.xs,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  metricCard: {
    width: '48.5%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontWeight: '700',
    fontSize: 18,
    color: colors.text,
  },
  metricUnit: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.textMuted,
  },
  metricBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  metricBadgeText: {
    fontWeight: '600',
    fontSize: 9.5,
  },
  subtext: {
    fontWeight: '400',
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
  },
  secondaryMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  secondaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceIce,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  secondaryPillText: {
    fontWeight: '400',
    fontSize: 11.5,
    color: colors.text,
  },
  boldVal: {
    fontWeight: '600',
  },
});
