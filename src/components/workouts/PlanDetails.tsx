import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LibraryIcon } from '@/components/LibraryIcon';
import { asRecords, readText, readNumber, formatDate } from '@/services/journey';
import { exerciseMetrics, LEVELS, workoutDays } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { colors } from '@/theme';
import { Notice, Sheet } from './Controls';

const COACH = require('../../../assets/public/3s-coach.png');
const RUNNER = require('../../../assets/public/3s-run.png');

export function PlanDetails({ plan }: { plan: JsonRecord }) {
  const days = workoutDays(plan);
  const [dayKey, setDayKey] = useState<string>();
  const day = days.find((item) => item.key === dayKey);
  const level = readText(plan, ['level']);
  const archived = plan.lifecycleStatus === 'ARCHIVED' || plan.status === 'ARCHIVED';
  const status = archived
    ? 'ĐÃ LƯU TRỮ'
    : plan.status === 'DRAFT'
    ? 'BẢN NHÁP'
    : plan.status === 'PUBLISHED'
    ? 'ĐÃ CÔNG BỐ'
    : 'GIÁO ÁN MẪU';
  const duration = readNumber(plan, ['durationDays']);
  const exercisesCount = days.reduce((sum, item) => sum + item.exercises.length, 0);
  const levelLabel = LEVELS[level as keyof typeof LEVELS] || level || 'Cá nhân hóa';

  return (
    <View style={styles.container}>
      {/* 5.2. Hero Plan Card chuẩn UI Rules */}
      <View style={styles.heroCard}>
        {/* Top: Duration Badge + Title + Coach Image */}
        <View style={styles.heroTopRow}>
          <View style={styles.heroHeaderInfo}>
            <View style={styles.durationBadge}>
              <LibraryIcon name="calendar" size={12} color="#FFFFFF" />
              <Text style={styles.durationBadgeText}>
                {duration ? `${duration} NGÀY` : 'CÁ NHÂN HÓA'}
              </Text>
            </View>

            <Text numberOfLines={3} ellipsizeMode="tail" style={styles.heroTitle}>
              {readText(plan, ['title'], 'Giáo án')}
            </Text>
          </View>

          <Image
            source={COACH}
            accessibilityIgnoresInvertColors
            accessible={false}
            style={styles.coachImage}
            resizeMode="contain"
          />
        </View>

        {/* Goal / Description */}
        {!!readText(plan, ['goal', 'description']) && (
          <Text numberOfLines={4} ellipsizeMode="tail" style={styles.heroDescription}>
            {readText(plan, ['goal', 'description'])}
          </Text>
        )}

        {/* Nested Sub-card: Stats Counter & Level */}
        <View style={styles.nestedSubCard}>
          <View style={styles.subCardHeader}>
            <View style={styles.levelTag}>
              <LibraryIcon name="award" size={13} color={colors.primary} />
              <Text style={styles.levelTagText}>{levelLabel}</Text>
            </View>

            <View style={styles.statusTag}>
              <LibraryIcon
                name={archived ? 'archive' : plan.status === 'PUBLISHED' ? 'check-circle' : 'file-text'}
                size={13}
                color={plan.status === 'PUBLISHED' && !archived ? colors.success : colors.textMuted}
              />
              <Text
                style={[
                  styles.statusTagText,
                  plan.status === 'PUBLISHED' && !archived && { color: colors.success },
                ]}
              >
                {status}
              </Text>
            </View>
          </View>

          {/* 3 Metric Columns */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{days.length}</Text>
              <Text style={styles.statLabel}>Buổi tập</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{exercisesCount}</Text>
              <Text style={styles.statLabel}>Bài tập</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statNumber}>{duration || '-'}</Text>
              <Text style={styles.statLabel}>Ngày lộ trình</Text>
            </View>
          </View>
        </View>

        {/* Plan meta tags */}
        <View style={styles.planMetaSection}>
          {!!readText(plan, ['assignedAt', 'startDate']) && (
            <View style={styles.metaItem}>
              <LibraryIcon name="clock" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>
                Bắt đầu: {formatDate(readText(plan, ['assignedAt', 'startDate']))}
              </Text>
            </View>
          )}

          {!!readText(plan, ['version']) && (
            <View style={styles.metaItem}>
              <LibraryIcon name="tag" size={13} color={colors.textMuted} />
              <Text style={styles.metaText}>Phiên bản {readText(plan, ['version'])}</Text>
            </View>
          )}

          {Array.isArray(plan.muscleGroups) && plan.muscleGroups.length > 0 && (
            <View style={styles.metaItem}>
              <LibraryIcon name="layers" size={13} color={colors.primaryDark} />
              <Text numberOfLines={2} ellipsizeMode="tail" style={styles.metaText}>
                Nhóm cơ: {plan.muscleGroups.join(', ')}
              </Text>
            </View>
          )}
        </View>

        {!!readText(plan, ['technicalNotes']) && (
          <Notice text={`Dặn dò của PT: ${readText(plan, ['technicalNotes'])}`} />
        )}
      </View>

      {/* 5.3. Day Workout Cards Section */}
      <View style={styles.sectionHeader}>
        <LibraryIcon name="calendar" size={16} color={colors.primary} />
        <Text style={styles.sectionTitle}>Các buổi tập trong giáo án</Text>
      </View>

      {days.map((item, idx) => {
        const minutes = item.exercises.map((exercise) => readNumber(exercise, ['durationMinutes']));
        const totalMinutes = minutes.every((value) => value !== null)
          ? minutes.reduce<number>((sum, value) => sum + (value || 0), 0)
          : null;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`Xem buổi tập ${item.name}, ${item.exercises.length} bài tập`}
            onPress={() => setDayKey(item.key)}
            style={({ pressed }) => [
              styles.dayCard,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {/* Left: Thumbnail Runner */}
            <View style={styles.dayThumbnailContainer}>
              <Image source={RUNNER} accessible={false} style={styles.dayThumbnail} resizeMode="cover" />
              <View style={styles.dayIndexBadge}>
                <Text style={styles.dayIndexText}>{String(idx + 1).padStart(2, '0')}</Text>
              </View>
            </View>

            {/* Middle: Day details */}
            <View style={styles.dayInfoCol}>
              <Text numberOfLines={2} ellipsizeMode="tail" style={styles.dayTitle}>
                {item.name}
              </Text>

              <View style={styles.dayMetaRow}>
                {totalMinutes ? (
                  <View style={styles.dayMetaPill}>
                    <LibraryIcon name="clock" size={11} color={colors.textMuted} />
                    <Text style={styles.dayMetaPillText}>{totalMinutes} phút</Text>
                  </View>
                ) : null}
                <View style={styles.dayMetaPill}>
                  <LibraryIcon name="target" size={11} color={colors.primaryDark} />
                  <Text style={styles.dayMetaPillText}>{item.exercises.length} bài tập</Text>
                </View>
              </View>
            </View>

            {/* Right: Round Action Button */}
            <View style={styles.dayActionBtn}>
              <LibraryIcon name="arrow-right" size={18} color="#FFFFFF" />
            </View>
          </Pressable>
        );
      })}

      {!days.length && <Notice text="Giáo án chưa có buổi tập được xếp lịch." />}

      {/* Day Exercises Modal Sheet */}
      {day && (
        <Sheet title={day.name} onClose={() => setDayKey(undefined)}>
          <View style={styles.daySheetHeader}>
            <LibraryIcon name="info" size={16} color={colors.primary} />
            <Text style={styles.daySheetSubtitle}>
              {day.exercises.length} bài tập · Thực hiện theo thông số PT hướng dẫn.
            </Text>
          </View>

          <View style={{ gap: 12 }}>
            {day.exercises.map((exercise, index) => (
              <Exercise key={index} exercise={exercise} index={index} />
            ))}
          </View>

          {!day.exercises.length && <Notice text="Buổi tập chưa có bài tập." />}
        </Sheet>
      )}

      {/* Unscheduled exercises */}
      {asRecords(plan.unscheduledExercises).length > 0 && (
        <View style={{ gap: 12, marginTop: 8 }}>
          <View style={styles.sectionHeader}>
            <LibraryIcon name="layers" size={18} color={colors.warning} />
            <Text style={styles.sectionTitle}>BÀI TẬP CHƯA XẾP LỊCH</Text>
          </View>
          {asRecords(plan.unscheduledExercises).map((exercise, index) => (
            <Exercise key={index} exercise={exercise} index={index} />
          ))}
        </View>
      )}
    </View>
  );
}

function Exercise({ exercise, index }: { exercise: JsonRecord; index: number }) {
  const minute = readNumber(exercise, ['startMinute']);
  const metrics = exerciseMetrics(exercise);

  return (
    <View style={styles.exerciseCard}>
      {/* Exercise Header */}
      <View style={styles.exerciseHeaderRow}>
        <View style={styles.exerciseIndexBox}>
          <Text style={styles.exerciseIndexText}>{String(index + 1).padStart(2, '0')}</Text>
        </View>
        <Text numberOfLines={2} ellipsizeMode="tail" style={styles.exerciseTitle}>
          {readText(exercise, ['name'], 'Bài tập')}
        </Text>
      </View>

      {/* Start minute / duration if present */}
      {minute !== null && (
        <View style={styles.exerciseTimeRow}>
          <LibraryIcon name="clock" size={12} color={colors.textMuted} />
          <Text style={styles.exerciseTimeText}>
            {String(Math.floor(minute / 60)).padStart(2, '0')}:{String(minute % 60).padStart(2, '0')}
            {exercise.durationMinutes ? ` · ${exercise.durationMinutes} phút` : ''}
          </Text>
        </View>
      )}

      {/* Workout Prescription Metrics Chips Grid */}
      {metrics.length > 0 ? (
        <View style={styles.metricsGrid}>
          {metrics.map(([label, value]) => (
            <View key={label} style={styles.metricChip}>
              <Text style={styles.metricLabel}>{label}</Text>
              <Text numberOfLines={1} ellipsizeMode="tail" style={styles.metricValue}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noMetricsText}>Chưa có thông số bài tập.</Text>
      )}

      {/* Notes if present */}
      {!!readText(exercise, ['notes']) && (
        <View style={styles.notesBox}>
          <LibraryIcon name="edit-3" size={13} color={colors.textMuted} />
          <Text numberOfLines={10} ellipsizeMode="tail" style={styles.notesText}>
            {readText(exercise, ['notes'])}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    padding: 14,
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroHeaderInfo: {
    flex: 1,
    gap: 6,
  },
  durationBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  durationBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  heroTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  coachImage: {
    width: 70,
    height: 85,
    borderRadius: 12,
  },
  heroDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    color: '#4B5563',
  },
  nestedSubCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  subCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  levelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  levelTagText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primaryDark,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusTagText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 2,
  },
  statCol: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  statNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    lineHeight: 22,
    color: colors.text,
  },
  statLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.border,
  },
  planMetaSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: colors.textMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  sectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    color: colors.text,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  dayThumbnailContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dayThumbnail: {
    width: '100%',
    height: '100%',
  },
  dayIndexBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
  },
  dayIndexText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    color: '#FFFFFF',
  },
  dayInfoCol: {
    flex: 1,
    gap: 4,
  },
  dayTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.text,
  },
  dayMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  dayMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: colors.surfaceMuted,
  },
  dayMetaPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10.5,
    color: colors.textMuted,
  },
  dayActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 4,
  },
  daySheetSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: colors.textMuted,
    flex: 1,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseIndexBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseIndexText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: colors.primary,
  },
  exerciseTitle: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  exerciseTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseTimeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    padding: 10,
    borderRadius: 12,
  },
  metricChip: {
    minWidth: '28%',
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.text,
  },
  noMetricsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 4,
  },
  notesText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    flex: 1,
  },
});
