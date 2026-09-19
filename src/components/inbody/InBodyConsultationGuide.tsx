import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!analysis && !consultationNotes) return null;

  const handleCopy = async (key: string, text?: string) => {
    if (!text) return;
    try {
      await Clipboard.setStringAsync(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2500);
    } catch (err) {
      console.warn('[InBodyConsultationGuide] Copy failed:', err);
    }
  };

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

      {/* 2. PT Consultation Guide & Quick Message Script */}
      {(analysis?.consultationGuide || analysis?.quickMessage) && (
        <View style={styles.sectionBox}>
          <Text style={styles.sectionHeader}>Gợi ý tư vấn & Lộ trình tập</Text>

          {/* Kịch bản tư vấn nhanh (Zalo / SMS) */}
          {analysis?.quickMessage ? (
            <View style={styles.scriptCard}>
              <View style={styles.scriptCardHeader}>
                <View style={styles.scriptHeaderLeft}>
                  <Ionicons name="chatbubbles" size={16} color="#0284C7" />
                  <Text style={styles.scriptCardTitle}>Kịch bản tư vấn nhanh (Zalo / SMS)</Text>
                </View>
                <Pressable
                  onPress={() => handleCopy('quickMessage', analysis.quickMessage)}
                  style={[
                    styles.copyPillBtn,
                    copiedKey === 'quickMessage' && styles.copyPillBtnSuccess,
                  ]}
                  hitSlop={6}
                >
                  <Ionicons
                    name={copiedKey === 'quickMessage' ? 'checkmark-circle' : 'copy-outline'}
                    size={13}
                    color={copiedKey === 'quickMessage' ? '#15803D' : '#0284C7'}
                  />
                  <Text
                    style={[
                      styles.copyPillBtnText,
                      copiedKey === 'quickMessage' && styles.copyPillBtnTextSuccess,
                    ]}
                  >
                    {copiedKey === 'quickMessage' ? 'Đã sao chép' : 'Sao chép tư vấn'}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.scriptPreviewText} numberOfLines={5}>
                {analysis.quickMessage}
              </Text>
            </View>
          ) : null}

          {/* Nutrition Advice */}
          {analysis?.consultationGuide?.nutritionAdvice ? (
            <View style={styles.guideCard}>
              <View style={styles.guideCardHeader}>
                <View style={styles.guideHeaderTitleRow}>
                  <Ionicons name="nutrition-outline" size={16} color={colors.primary} />
                  <Text style={styles.guideCardTitle}>Dinh dưỡng đề xuất</Text>
                </View>
                <Pressable
                  onPress={() =>
                    handleCopy('nutrition', analysis.consultationGuide!.nutritionAdvice)
                  }
                  style={styles.miniCopyBtn}
                  hitSlop={6}
                >
                  <Ionicons
                    name={copiedKey === 'nutrition' ? 'checkmark' : 'copy-outline'}
                    size={13}
                    color={copiedKey === 'nutrition' ? '#15803D' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.miniCopyText,
                      copiedKey === 'nutrition' && styles.miniCopyTextSuccess,
                    ]}
                  >
                    {copiedKey === 'nutrition' ? 'Đã chép' : 'Chép'}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.guideCardContent}>
                {analysis.consultationGuide.nutritionAdvice}
              </Text>
            </View>
          ) : null}

          {/* Workout Advice */}
          {analysis?.consultationGuide?.workoutAdvice ? (
            <View style={styles.guideCard}>
              <View style={styles.guideCardHeader}>
                <View style={styles.guideHeaderTitleRow}>
                  <Ionicons name="barbell-outline" size={16} color={colors.primaryNavy} />
                  <Text style={styles.guideCardTitle}>Lộ trình tập luyện</Text>
                </View>
                <Pressable
                  onPress={() =>
                    handleCopy('workout', analysis.consultationGuide!.workoutAdvice)
                  }
                  style={styles.miniCopyBtn}
                  hitSlop={6}
                >
                  <Ionicons
                    name={copiedKey === 'workout' ? 'checkmark' : 'copy-outline'}
                    size={13}
                    color={copiedKey === 'workout' ? '#15803D' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.miniCopyText,
                      copiedKey === 'workout' && styles.miniCopyTextSuccess,
                    ]}
                  >
                    {copiedKey === 'workout' ? 'Đã chép' : 'Chép'}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.guideCardContent}>
                {analysis.consultationGuide.workoutAdvice}
              </Text>
            </View>
          ) : null}

          {/* Talking points */}
          {analysis?.consultationGuide?.talkingPoints &&
          analysis.consultationGuide.talkingPoints.length > 0 ? (
            <View style={styles.guideCard}>
              <View style={styles.guideCardHeader}>
                <View style={styles.guideHeaderTitleRow}>
                  <Ionicons name="chatbubbles-outline" size={16} color="#16A34A" />
                  <Text style={styles.guideCardTitle}>Kịch bản trao đổi với học viên</Text>
                </View>
                <Pressable
                  onPress={() =>
                    handleCopy(
                      'talkingPoints',
                      analysis.consultationGuide!.talkingPoints.map((pt) => '• ' + pt).join('\n')
                    )
                  }
                  style={styles.miniCopyBtn}
                  hitSlop={6}
                >
                  <Ionicons
                    name={copiedKey === 'talkingPoints' ? 'checkmark' : 'copy-outline'}
                    size={13}
                    color={copiedKey === 'talkingPoints' ? '#15803D' : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.miniCopyText,
                      copiedKey === 'talkingPoints' && styles.miniCopyTextSuccess,
                    ]}
                  >
                    {copiedKey === 'talkingPoints' ? 'Đã chép' : 'Chép'}
                  </Text>
                </Pressable>
              </View>
              {analysis.consultationGuide.talkingPoints.map((pt, idx) => (
                <Text key={idx} style={styles.talkingPointItem}>
                  • {pt}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      )}

      {/* 3. PT Custom Notes */}
      {consultationNotes ? (
        <View style={styles.sectionBox}>
          <View style={styles.notesHeaderRow}>
            <Text style={styles.sectionHeader}>Ghi chú chuyên môn từ PT</Text>
            <Pressable
              onPress={() => handleCopy('notes', consultationNotes)}
              style={styles.miniCopyBtn}
              hitSlop={6}
            >
              <Ionicons
                name={copiedKey === 'notes' ? 'checkmark' : 'copy-outline'}
                size={13}
                color={copiedKey === 'notes' ? '#15803D' : colors.textMuted}
              />
              <Text
                style={[
                  styles.miniCopyText,
                  copiedKey === 'notes' && styles.miniCopyTextSuccess,
                ]}
              >
                {copiedKey === 'notes' ? 'Đã chép' : 'Chép'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.notesBox}>
            <Text style={styles.notesText}>{consultationNotes}</Text>
          </View>
        </View>
      ) : null}
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
  scriptCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  scriptCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scriptHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  scriptCardTitle: {
    fontWeight: '700',
    fontSize: 12.5,
    color: '#0369A1',
  },
  scriptPreviewText: {
    fontWeight: '400',
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  copyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  copyPillBtnSuccess: {
    backgroundColor: '#DCFCE7',
  },
  copyPillBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  copyPillBtnTextSuccess: {
    color: '#15803D',
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
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  guideHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
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
  miniCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  miniCopyText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  miniCopyTextSuccess: {
    color: '#15803D',
    fontWeight: '600',
  },
  notesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
    marginTop: 4,
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

