import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, radius } from '@/theme';
import type { RoadmapPhase } from '@/types/roadmap';
import { cleanPhaseName, formatPhaseDuration } from '@/services/roadmap';

interface RoadmapPhasesAccordionProps {
  phases?: RoadmapPhase[];
}

export function RoadmapPhasesAccordion({ phases = [] }: RoadmapPhasesAccordionProps) {
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>(() => {
    if (phases.length > 0) {
      const sorted = [...phases].sort((a, b) => a.order - b.order);
      return { [sorted[0].order]: true };
    }
    return {};
  });

  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

  const togglePhase = (order: number) => {
    setExpandedOrders((prev) => ({ ...prev, [order]: !prev[order] }));
  };

  const expandAll = () => {
    const map: Record<number, boolean> = {};
    sortedPhases.forEach((p) => {
      map[p.order] = true;
    });
    setExpandedOrders(map);
  };

  const collapseAll = () => {
    setExpandedOrders({});
  };

  if (sortedPhases.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header bar with Expand / Collapse all */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>
          Kế hoạch các Phase ({sortedPhases.length})
        </Text>

        <View style={styles.actionsWrap}>
          <Pressable onPress={expandAll} hitSlop={6} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Mở tất cả</Text>
          </Pressable>
          <Text style={styles.actionDivider}>·</Text>
          <Pressable onPress={collapseAll} hitSlop={6} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Thu gọn</Text>
          </Pressable>
        </View>
      </View>

      {/* List of Phases */}
      <View style={styles.phasesList}>
        {sortedPhases.map((phase) => {
          const isExpanded = Boolean(expandedOrders[phase.order]);
          const displayName = cleanPhaseName(phase.name, phase.order);
          const durationStr = formatPhaseDuration(phase.durationWeeks, phase.weeks?.length || 0);

          return (
            <View key={phase.order} style={styles.phaseCard}>
              {/* Phase Header */}
              <Pressable
                onPress={() => togglePhase(phase.order)}
                style={({ pressed }) => [
                  styles.phaseHeader,
                  isExpanded && styles.phaseHeaderActive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.phaseHeaderTopRow}>
                  <View style={styles.phaseBadge}>
                    <Text style={styles.phaseBadgeText}>Phase {phase.order}</Text>
                  </View>
                  <Text style={styles.durationText}>{durationStr}</Text>
                  <Feather
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textMuted}
                  />
                </View>

                <Text style={styles.phaseNameText}>{displayName}</Text>
              </Pressable>

              {/* Phase Body */}
              {isExpanded && (
                <View style={styles.phaseBody}>
                  {/* Phase Goals */}
                  {phase.goals && phase.goals.length > 0 && (
                    <View style={styles.goalsBox}>
                      <Text style={styles.goalsBoxTitle}>Mục tiêu giai đoạn:</Text>
                      <View style={styles.goalsList}>
                        {phase.goals.map((goal, gIdx) => (
                          <View key={gIdx} style={styles.goalItem}>
                            <Text style={styles.goalBullet}>•</Text>
                            <Text style={styles.goalText}>{goal}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Weeks list */}
                  {phase.weeks && phase.weeks.length > 0 && (
                    <View style={styles.weeksWrap}>
                      <Text style={styles.weeksSectionTitle}>Nội dung từng tuần:</Text>
                      <View style={styles.weeksList}>
                        {phase.weeks.map((w, wIdx) => (
                          <View key={wIdx} style={styles.weekCard}>
                            <View style={styles.weekHeaderRow}>
                              <Text style={styles.weekBadgeText}>Tuần {w.week}</Text>
                              <Text style={styles.weekTargetPillText}>
                                {w.sessionTargets || 3} buổi / tuần
                              </Text>
                            </View>

                            <Text style={styles.weekFocusText}>{w.focus}</Text>

                            {/* Optional Sessions detail */}
                            {w.sessions && w.sessions.length > 0 && (
                              <View style={styles.sessionsSubList}>
                                {w.sessions.map((s, sIdx) => (
                                  <View key={sIdx} style={styles.sessionItem}>
                                    <Text style={styles.sessionName}>
                                      Buổi {s.sessionNumber || sIdx + 1}: {s.name || s.focus || 'Buổi tập'}
                                    </Text>
                                    {s.exercises && s.exercises.length > 0 && (
                                      <Text style={styles.sessionExercises} numberOfLines={2}>
                                        {s.exercises.join(', ')}
                                      </Text>
                                    )}
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    gap: 6,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  topTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryNavy,
  },
  actionsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  actionDivider: {
    color: colors.textMuted,
    fontSize: 11,
  },
  phasesList: {
    gap: 6,
  },
  phaseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  phaseHeader: {
    padding: 10,
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  phaseHeaderActive: {
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  phaseHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  phaseBadge: {
    backgroundColor: colors.primaryNavy,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  phaseBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    flex: 1,
  },
  phaseNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
  },
  phaseBody: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  goalsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  goalsBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryNavy,
    marginBottom: 1,
  },
  goalsList: {
    gap: 2,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  goalBullet: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  goalText: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    lineHeight: 15,
  },
  weeksWrap: {
    gap: 4,
  },
  weeksSectionTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  weeksList: {
    gap: 6,
  },
  weekCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  weekTargetPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textMuted,
  },
  weekFocusText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: colors.text,
    lineHeight: 16,
  },
  sessionsSubList: {
    marginTop: 2,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 2,
  },
  sessionItem: {
    backgroundColor: '#FFFFFF',
    padding: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  sessionName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primaryNavy,
  },
  sessionExercises: {
    fontSize: 9.5,
    color: colors.textMuted,
    marginTop: 1,
  },
});
