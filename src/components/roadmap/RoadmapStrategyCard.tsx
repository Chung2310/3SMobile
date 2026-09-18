import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/theme';
import type { RoadmapStrategy } from '@/types/roadmap';
import { parseRoadmapSessionBudget } from '@/services/roadmap';

interface RoadmapStrategyCardProps {
  strategy?: RoadmapStrategy;
}

export function RoadmapStrategyCard({ strategy }: RoadmapStrategyCardProps) {
  if (!strategy) return null;

  const budgetNotice = parseRoadmapSessionBudget(strategy.sessionBudget);
  const checkpoints = strategy.checkpoints || [];
  const nutritionAdvice = strategy.nutrition?.advice || strategy.nutritionStrategy;

  return (
    <View style={styles.card}>
      {/* Title */}
      <Text style={styles.headerTitle}>Chiến lược & Định hướng</Text>

      {/* AI / Template source notice */}
      {strategy.generationSource && (
        <View style={styles.sourceNotice}>
          <Text style={styles.sourceTagText}>
            {strategy.generationSource === 'AI' ? 'Đề xuất bởi AI Huấn luyện' : 'Bản mẫu quy chuẩn'}
          </Text>
          {strategy.assumptions && strategy.assumptions.length > 0 && (
            <Text style={styles.sourceNote} numberOfLines={2}>
              {strategy.assumptions.join(' · ')}
            </Text>
          )}
        </View>
      )}

      {/* Session Budget */}
      {budgetNotice && (
        <View style={styles.budgetBox}>
          <Text style={styles.budgetText}>{budgetNotice}</Text>
        </View>
      )}

      {/* Training Method & Split */}
      {(strategy.trainingMethod || strategy.trainingSplit) && (
        <View style={styles.subBlock}>
          <Text style={styles.subBlockTitle}>Phương pháp & Lịch tập</Text>
          {strategy.trainingMethod ? (
            <Text style={styles.bodyText}>{strategy.trainingMethod}</Text>
          ) : null}
          {strategy.trainingSplit ? (
            <View style={styles.splitBox}>
              <Text style={styles.splitLabel}>Lịch chia buổi tập:</Text>
              <Text style={styles.splitText}>{strategy.trainingSplit}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Cardio Protocol */}
      {strategy.cardioProtocol && (
        <View style={styles.subBlock}>
          <Text style={[styles.subBlockTitle, { color: '#BE123C' }]}>Chiến lược Cardio</Text>
          <Text style={styles.bodyText}>{strategy.cardioProtocol}</Text>
        </View>
      )}

      {/* Nutrition Advice */}
      {nutritionAdvice && (
        <View style={[styles.subBlock, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <Text style={[styles.subBlockTitle, { color: '#166534' }]}>Lời khuyên dinh dưỡng</Text>
          <Text style={[styles.bodyText, { color: '#14532D' }]}>{nutritionAdvice}</Text>
        </View>
      )}

      {/* Checkpoints List */}
      {checkpoints.length > 0 && (
        <View style={styles.checkpointsWrap}>
          <Text style={styles.checkpointsTitle}>
            Mốc đánh giá InBody ({checkpoints.length} mốc)
          </Text>
          <View style={styles.checkpointsList}>
            {checkpoints.map((cp, idx) => (
              <View key={idx} style={styles.checkpointCard}>
                <View style={styles.checkpointWeekBadge}>
                  <Text style={styles.checkpointWeekText}>Tuần {cp.week}</Text>
                </View>
                <View style={styles.checkpointContent}>
                  <Text style={styles.checkpointTitleText}>{cp.title}</Text>
                  {cp.description ? (
                    <Text style={styles.checkpointDescText}>{cp.description}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  sourceNotice: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sourceTagText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginBottom: 2,
  },
  sourceNote: {
    fontSize: 10.5,
    color: colors.textMuted,
    lineHeight: 15,
  },
  budgetBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  budgetText: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
    lineHeight: 16,
  },
  subBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  subBlockTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  bodyText: {
    fontSize: 11.5,
    color: colors.text,
    lineHeight: 16,
  },
  splitBox: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  splitLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  splitText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.primaryNavy,
    lineHeight: 16.5,
  },
  checkpointsWrap: {
    marginTop: 2,
    gap: 4,
  },
  checkpointsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  checkpointsList: {
    gap: 4,
  },
  checkpointCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 7,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  checkpointWeekBadge: {
    backgroundColor: colors.primaryNavy,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  checkpointWeekText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  checkpointContent: {
    flex: 1,
  },
  checkpointTitleText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.text,
  },
  checkpointDescText: {
    fontSize: 10.5,
    color: colors.textMuted,
    marginTop: 1,
    lineHeight: 14,
  },
});
