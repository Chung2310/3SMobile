import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Card, EmptyState, SectionHeader } from '@/components/UI';
import { Screen } from '@/components/Screen';
import { colors, radius, spacing, typography } from '@/theme';

interface Milestone {
  id: string;
  stage: string;
  title: string;
  duration: string;
  focus: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'UPCOMING';
}

const DEFAULT_ROADMAP: Milestone[] = [
  {
    id: 'm-1',
    stage: 'Giai đoạn 1',
    title: 'Thích nghi & Nền tảng Thể lực',
    duration: 'Tuần 1 - 4',
    focus: 'Kỹ thuật động tác chuẩn, nhịp thở, kích hoạt nhóm cơ chính.',
    status: 'COMPLETED',
  },
  {
    id: 'm-2',
    stage: 'Giai đoạn 2',
    title: 'Tăng tiến Cường độ & Sức mạnh',
    duration: 'Tuần 5 - 8',
    focus: 'Tăng mức tạ lũy tiến (Progressive Overload), giảm mỡ thừa.',
    status: 'IN_PROGRESS',
  },
  {
    id: 'm-3',
    stage: 'Giai đoạn 3',
    title: 'Phát triển Cơ bắp & Siết form',
    duration: 'Tuần 9 - 12',
    focus: 'Tối ưu độ nét cơ, siết cơ vùng bụng, kiểm soát dinh dưỡng vĩ mô.',
    status: 'UPCOMING',
  },
  {
    id: 'm-4',
    stage: 'Giai đoạn 4',
    title: 'Duy trì & Phong độ Bền vững',
    duration: 'Tuần 13+',
    focus: 'Tự lập thói quen sinh hoạt khoa học, duy trì tỷ lệ mỡ lý tưởng.',
    status: 'UPCOMING',
  },
];

export default function RoadmapScreen() {
  const [milestones] = useState<Milestone[]>(DEFAULT_ROADMAP);

  function getStatusBadge(status: Milestone['status']) {
    if (status === 'COMPLETED') {
      return {
        label: 'Hoàn thành',
        bg: 'rgba(34, 197, 94, 0.12)',
        color: '#16A34A',
        icon: 'check-circle' as const,
      };
    }
    if (status === 'IN_PROGRESS') {
      return {
        label: 'Đang thực hiện',
        bg: 'rgba(59, 130, 246, 0.12)',
        color: '#2563EB',
        icon: 'play-circle' as const,
      };
    }
    return {
      label: 'Sắp tới',
      bg: '#F3F4F6',
      color: colors.textMuted,
      icon: 'clock' as const,
    };
  }

  return (
    <Screen
      title="Lộ trình huấn luyện"
      subtitle="Kế hoạch mục tiêu 12 tuần chuẩn hóa"
      onBack={() => router.navigate('/(app)/(tabs)')}
    >
      <SectionHeader title="Lộ trình 12 tuần tiêu chuẩn" />

      {milestones.map((item, idx) => {
        const badge = getStatusBadge(item.status);
        return (
          <Card key={item.id}>
            <View style={styles.cardHeader}>
              <View style={styles.stageTag}>
                <Text style={styles.stageText}>{item.stage}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Feather name={badge.icon} size={13} color={badge.color} style={{ marginRight: 4 }} />
                <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
              </View>
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.duration}>Thời gian: {item.duration}</Text>
            <Text style={styles.focus}>Trọng tâm: {item.focus}</Text>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stageTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stageText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    ...typography.heading,
    fontSize: 15,
    color: colors.text,
    marginTop: 4,
    marginBottom: 4,
  },
  duration: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 4,
  },
  focus: {
    ...typography.body,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
});
