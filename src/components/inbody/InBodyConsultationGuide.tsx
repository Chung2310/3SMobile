import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '@/theme';
import type { InBodyAnalysisResult } from '@/types/inbody';

interface InBodyConsultationGuideProps {
  analysis: InBodyAnalysisResult | null;
  consultationNotes?: string;
}

export function InBodyConsultationGuide({
  analysis,
  consultationNotes,
}: InBodyConsultationGuideProps) {
  if (!analysis && !consultationNotes) return null;

  return (
    <View>
      {/* 1. Health Alerts */}
      {analysis?.alerts && analysis.alerts.length > 0 && (
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeader}>Cảnh báo sức khỏe</Text>
          {analysis.alerts.map((al) => (
            <View
              key={al.id}
              style={[
                styles.alertCard,
                {
                  backgroundColor: al.level === 'danger' ? '#FEF2F2' : '#FFFBEB',
                  borderColor: al.level === 'danger' ? '#FECACA' : '#FDE68A',
                },
              ]}
            >
              <Ionicons
                name={al.level === 'danger' ? 'alert-circle' : 'warning'}
                size={18}
                color={al.level === 'danger' ? '#EF4444' : '#D97706'}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.alertTitle,
                    { color: al.level === 'danger' ? '#B91C1C' : '#92400E' },
                  ]}
                >
                  {al.title}
                </Text>
                <Text style={styles.alertDesc}>{al.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 2. PT Consultation Guide & Talking Points */}
      {analysis?.consultationGuide && (
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeader}>Gợi ý tư vấn & Lộ trình tập</Text>

          {/* Nutrition Advice */}
          <View style={styles.guideCard}>
            <View style={styles.guideCardHeader}>
              <Ionicons name="nutrition-outline" size={16} color={colors.primary} />
              <Text style={styles.guideCardTitle}>Dinh dưỡng đề xuất</Text>
            </View>
            <Text style={styles.guideCardContent}>
              {analysis.consultationGuide.nutritionAdvice}
            </Text>
          </View>

          {/* Workout Advice */}
          <View style={styles.guideCard}>
            <View style={styles.guideCardHeader}>
              <Ionicons name="barbell-outline" size={16} color={colors.primaryNavy} />
              <Text style={styles.guideCardTitle}>Lộ trình tập luyện</Text>
            </View>
            <Text style={styles.guideCardContent}>
              {analysis.consultationGuide.workoutAdvice}
            </Text>
          </View>

          {/* Talking points */}
          {analysis.consultationGuide.talkingPoints.length > 0 && (
            <View style={styles.guideCard}>
              <View style={styles.guideCardHeader}>
                <Ionicons name="chatbubbles-outline" size={16} color="#16A34A" />
                <Text style={styles.guideCardTitle}>Kịch bản trao đổi với học viên</Text>
              </View>
              {analysis.consultationGuide.talkingPoints.map((pt, idx) => (
                <Text key={idx} style={styles.talkingPointItem}>
                  • {pt}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* 3. PT Custom Notes */}
      {consultationNotes && (
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeader}>Ghi chú chuyên môn từ PT</Text>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{consultationNotes}</Text>
          </View>
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
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 6,
  },
  alertTitle: {
    fontWeight: '600',
    fontSize: 12,
    marginBottom: 2,
  },
  alertDesc: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.text,
    lineHeight: 15,
  },
  guideCard: {
    backgroundColor: colors.surfaceIce,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  guideCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  guideCardTitle: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.primaryNavy,
  },
  guideCardContent: {
    fontWeight: '400',
    fontSize: 11.5,
    color: colors.text,
    lineHeight: 16,
  },
  talkingPointItem: {
    fontWeight: '400',
    fontSize: 11.5,
    color: colors.text,
    lineHeight: 16,
    marginTop: 3,
  },
  notesBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesText: {
    fontWeight: '400',
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
});
