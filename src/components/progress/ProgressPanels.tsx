import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { asRecord, asRecords, readText, formatDate } from '@/services/journey';
import { dayKey, MEASUREMENTS, sessionTitle } from '@/services/progress';
import { recordId } from '@/services/workouts';
import { resolveImageUrl } from '@/services/imageUtils';
import { colors, typography } from '@/theme';
import type { JsonRecord } from '@/types/domain';
import { Button, Notice, Picker, Sheet } from '../workouts/Controls';
import { PlanDetails } from '../workouts/PlanDetails';

const GROUPS: [string, string, [string, string][]][] = [
  ['strength', 'Sức mạnh', [
    ['totalVolumeKg', 'Tổng khối lượng (kg)'],
    ['maxWeightKg', 'Tạ cao nhất (kg)'],
    ['maxReps', 'Số lần cao nhất'],
    ['estimated1RmKg', '1RM ước tính (kg)'],
  ]],
  ['bodyweight', 'Trọng lượng cơ thể', [
    ['totalReps', 'Tổng số lần'],
    ['maxReps', 'Số lần cao nhất'],
    ['maxAddedWeightKg', 'Tạ thêm cao nhất (kg)'],
  ]],
  ['cardio', 'Cardio', [
    ['durationMinutes', 'Thời lượng (phút)'],
    ['distanceKm', 'Quãng đường (km)'],
    ['bestPaceSecondsPerKm', 'Pace tốt nhất (giây/km)'],
    ['averageHeartRate', 'Nhịp tim trung bình (bpm)'],
  ]],
  ['interval', 'Ngắt quãng', [
    ['totalRounds', 'Tổng số vòng'],
    ['workSeconds', 'Tập (giây)'],
    ['restSeconds', 'Nghỉ (giây)'],
  ]],
  ['mobility', 'Linh hoạt', [
    ['durationMinutes', 'Thời lượng (phút)'],
    ['completedReps', 'Số lần hoàn thành'],
    ['averageDiscomfort', 'Mức khó chịu trung bình'],
  ]],
];

const ANGLE_LABELS: Record<string, string> = {
  FRONT: 'Mặt trước',
  SIDE: 'Mặt bên',
  BACK: 'Mặt sau',
  OTHER: 'Góc khác',
};

export function TrackingSummary({ analytics }: { analytics: JsonRecord }) {
  const tracking = asRecord(analytics.tracking);
  const quality = asRecord(analytics.dataQuality);
  const bodyDeltas = asRecord(analytics.bodyDeltas);

  return (
    <View style={styles.container}>
      {Array.isArray(quality.reasons) &&
        quality.reasons.map((reason, i) => (
          <Notice key={i} tone="warning" text={String(reason)} />
        ))}

      {Object.keys(bodyDeltas).length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thay đổi số đo trong kỳ</Text>
          <View style={styles.deltasGrid}>
            {MEASUREMENTS.map(([key, label, unit]) => {
              const value = bodyDeltas[key];
              if (value == null) return null;
              const num = Number(value);
              return (
                <View key={key} style={styles.deltaItem}>
                  <Text style={styles.deltaLabel}>{label}</Text>
                  <Text style={[styles.deltaValue, num < 0 ? styles.deltaNegative : styles.deltaPositive]}>
                    {num > 0 ? `+${num}` : `${num}`} {unit}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {GROUPS.map(([key, title, fields]) => (
        <View key={key} style={styles.card}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={styles.fieldsList}>
            {fields.map(([field, label]) => {
              const val = asRecord(tracking[key])[field];
              return (
                <View key={field} style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <Text style={styles.fieldValue}>
                    {val == null ? 'Chưa có' : String(val)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

export function JourneyPlans({ plans, staff }: { plans: JsonRecord; staff: boolean }) {
  const [selected, setSelected] = useState<JsonRecord>();
  const seen = new Set<string>();
  const rows = [
    asRecord(plans.active),
    ...asRecords(plans.published),
    ...asRecords(plans.history),
  ].filter((p) => {
    const id = recordId(p);
    if (!id || seen.has(id) || (!staff && p.status !== 'PUBLISHED')) return false;
    seen.add(id);
    return true;
  });

  return (
    <View style={styles.container}>
      {!rows.length ? (
        <Notice text="Chưa có giáo án để hiển thị." />
      ) : (
        rows.map((p) => {
          const isActive = p.lifecycleStatus === 'ACTIVE';
          return (
            <View key={recordId(p)} style={styles.card}>
              <View style={styles.planHeader}>
                <View style={[styles.planBadge, isActive ? styles.planBadgeActive : styles.planBadgeHistory]}>
                  <Text style={[styles.planBadgeText, isActive ? styles.planBadgeTextActive : styles.planBadgeTextHistory]}>
                    {isActive ? 'Đang áp dụng' : 'Lịch sử'}
                  </Text>
                </View>
                <Text numberOfLines={2} style={styles.planTitle}>
                  {readText(p, ['title'], 'Giáo án tập luyện')}
                </Text>
              </View>
              <Button secondary label="Xem chi tiết giáo án" onPress={() => setSelected(p)} />
            </View>
          );
        })
      )}
      {selected && (
        <Sheet title="Giáo án học viên" onClose={() => setSelected(undefined)}>
          <PlanDetails plan={selected} />
        </Sheet>
      )}
    </View>
  );
}

export function DailyRecords({
  journey,
  onSession,
}: {
  journey: JsonRecord;
  onSession: (record: JsonRecord) => void;
}) {
  const sessions = asRecords(journey.sessions);
  const measurements = asRecords(journey.measurements);
  const photos = asRecords(journey.photos);
  const days = [...new Set(sessions.map((s) => dayKey(readText(s, ['performedAt']))).filter(Boolean))]
    .sort()
    .reverse();

  return (
    <View style={styles.container}>
      {!days.length ? (
        <Notice text="Chưa có buổi tập nào được ghi nhận." />
      ) : (
        days.map((day) => {
          const daySessions = sessions.filter((s) => dayKey(readText(s, ['performedAt'])) === day);
          const dayMeasurements = measurements.filter((m) => dayKey(readText(m, ['measuredAt'])) === day);
          const dayPhotos = photos.filter((p) => dayKey(readText(p, ['takenDate', 'takenAt'])) === day);

          return (
            <View key={day} style={styles.card}>
              <View style={styles.dayHeader}>
                <Feather name="calendar" size={18} color={colors.primary} />
                <Text style={styles.dayTitle}>{formatDate(day)}</Text>
              </View>

              {daySessions.map((s) => (
                <Button
                  key={recordId(s)}
                  secondary
                  icon="activity"
                  label={sessionTitle(s)}
                  onPress={() => onSession(s)}
                />
              ))}

              {dayMeasurements.map((m) => (
                <View key={recordId(m)} style={styles.subCard}>
                  <Text style={styles.subCardTitle}>Số đo ghi nhận:</Text>
                  {MEASUREMENTS.map(([key, label, unit]) => {
                    const value = m[key] ?? asRecord(m.measurements)[key];
                    if (value == null) return null;
                    return (
                      <Text key={key} style={styles.subCardText}>
                        {label}: {String(value)} {unit}
                      </Text>
                    );
                  })}
                </View>
              ))}

              {dayPhotos.map((p, i) => {
                const imgUri = resolveImageUrl(readText(p, ['photoUrl'])) || '';
                return (
                  <View key={recordId(p) || i} style={styles.photoThumbWrapper}>
                    <Image
                      source={{ uri: imgUri }}
                      accessibilityLabel="Ảnh tiến độ cùng ngày"
                      style={styles.dailyPhoto}
                      resizeMode="cover"
                    />
                  </View>
                );
              })}
            </View>
          );
        })
      )}
    </View>
  );
}

export function PhotoGallery({ photos }: { photos: JsonRecord[] }) {
  const [angle, setAngle] = useState('');
  const [selected, setSelected] = useState<JsonRecord>();
  const [compare, setCompare] = useState('');

  const rows = photos.filter((p) => !angle || p.angle === angle);

  const renderPhoto = (p: JsonRecord, height = 280) => {
    const uri = resolveImageUrl(readText(p, ['photoUrl'])) || '';
    return (
      <Image
        source={{ uri }}
        style={[styles.galleryImage, { height }]}
        resizeMode="cover"
        accessibilityLabel="Ảnh tiến độ"
      />
    );
  };

  return (
    <View style={styles.container}>
      <Picker
        label="Góc chụp"
        value={angle}
        options={{
          '': 'Tất cả các góc',
          FRONT: 'Mặt trước',
          SIDE: 'Mặt bên',
          BACK: 'Mặt sau',
          OTHER: 'Khác',
        }}
        onChange={setAngle}
      />

      {!rows.length ? (
        <Notice text="Chưa có ảnh tiến độ phù hợp." />
      ) : (
        <View style={styles.photoGrid}>
          {rows.map((p, i) => {
            const angleKey = readText(p, ['angle', 'category', 'view']);
            const angleLabel = ANGLE_LABELS[angleKey] || 'Tiến độ';
            const dateStr = formatDate(readText(p, ['takenDate', 'takenAt', 'createdAt']));

            return (
              <Pressable
                key={recordId(p) || i}
                accessibilityRole="button"
                accessibilityLabel="Xem chi tiết ảnh tiến độ"
                style={styles.photoGridItem}
                onPress={() => {
                  setSelected(p);
                  setCompare('');
                }}
              >
                {renderPhoto(p, 190)}
                <View style={styles.photoOverlayInfo}>
                  <View style={styles.anglePill}>
                    <Text style={styles.anglePillText}>{angleLabel}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.photoDateText}>{dateStr}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {selected && (
        <Sheet title="So sánh ảnh tiến độ" onClose={() => setSelected(undefined)}>
          <View style={styles.compareContainer}>
            <View style={styles.photoCompareBox}>
              {renderPhoto(selected, 240)}
              <View style={styles.compareMeta}>
                <Text style={styles.compareDate}>
                  {formatDate(readText(selected, ['takenDate', 'takenAt']))}
                </Text>
                <View style={styles.anglePill}>
                  <Text style={styles.anglePillText}>
                    {ANGLE_LABELS[readText(selected, ['angle'])] || 'Góc hiện tại'}
                  </Text>
                </View>
              </View>
            </View>

            <Picker
              label="Chọn ảnh đối chiếu"
              value={compare}
              options={{
                '': 'Chọn ảnh để so sánh song song',
                ...Object.fromEntries(
                  photos
                    .filter((p) => recordId(p) !== recordId(selected))
                    .map((p, i) => [
                      String(i + 1),
                      `${formatDate(readText(p, ['takenDate', 'takenAt']))} · ${ANGLE_LABELS[readText(p, ['angle'])] || 'Khác'}`,
                    ])
                ),
              }}
              onChange={setCompare}
            />

            {compare && photos[Number(compare) - 1] && (
              <View style={styles.photoCompareBox}>
                {renderPhoto(photos[Number(compare) - 1], 240)}
                <View style={styles.compareMeta}>
                  <Text style={styles.compareDate}>
                    {formatDate(readText(photos[Number(compare) - 1], ['takenDate', 'takenAt']))}
                  </Text>
                  <View style={styles.anglePill}>
                    <Text style={styles.anglePillText}>
                      {ANGLE_LABELS[readText(photos[Number(compare) - 1], ['angle'])] || 'Đối chiếu'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </Sheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
  },
  deltasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  deltaItem: {
    width: '48%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  deltaLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  deltaValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  deltaPositive: {
    color: colors.primary,
  },
  deltaNegative: {
    color: colors.success,
  },
  fieldsList: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  fieldLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  planHeader: {
    gap: 6,
  },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planBadgeActive: {
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
  },
  planBadgeHistory: {
    backgroundColor: colors.surfaceMuted,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planBadgeTextActive: {
    color: colors.primary,
  },
  planBadgeTextHistory: {
    color: colors.textMuted,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  subCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  subCardText: {
    fontSize: 13,
    color: colors.text,
  },
  photoThumbWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  dailyPhoto: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceMuted,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoGridItem: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
  },
  photoOverlayInfo: {
    padding: 10,
    gap: 4,
  },
  anglePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  anglePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  photoDateText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  compareContainer: {
    gap: 16,
  },
  photoCompareBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  compareMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  compareDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});
