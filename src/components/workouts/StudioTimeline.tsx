import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LibraryIcon } from '@/components/LibraryIcon';
import type { JsonRecord } from '@/types/domain';
import { asRecord, readText } from '@/services/journey';
import { colors } from '@/theme';
import { Button, ws } from './Controls';

const time = (minute: number) => {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
};

function formatPrescription(item: JsonRecord): string {
  const prescription = asRecord(item.prescription);
  const parts: string[] = [];
  if (prescription.sets) parts.push(`${prescription.sets} sets`);
  if (prescription.reps) parts.push(`${prescription.reps} reps`);
  if (prescription.weight) parts.push(`${prescription.weight} kg`);
  if (prescription.durationMinutes) parts.push(`${prescription.durationMinutes} min`);
  if (prescription.restSeconds) parts.push(`Rest ${prescription.restSeconds}s`);
  return parts.join(' · ');
}

export function StudioTimeline({
  items,
  onSelect,
  onAdd,
}: {
  items: { item: JsonRecord; index: number }[];
  onSelect: (index: number) => void;
  onAdd: () => void;
}) {
  const valid = items.filter(
    ({ item }) =>
      Number.isFinite(Number(item.startMinute)) &&
      Number.isFinite(Number(item.durationMinutes)) &&
      Number(item.durationMinutes) >= 15 &&
      Number(item.startMinute) >= 0 &&
      Number(item.startMinute) + Number(item.durationMinutes) <= 1440
  );
  const invalid = items.filter((entry) => !valid.includes(entry));
  const totalMinutes = valid.reduce((sum, { item }) => sum + Number(item.durationMinutes), 0);

  return (
    <View style={timelineStyles.container}>
      {/* Action header bar */}
      <View style={timelineStyles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={ws.badge}>
            {items.length} bài tập · {totalMinutes} phút
          </Text>
          <Text style={[ws.muted, { fontSize: 11 }]}>Chạm bài tập để sửa giờ hoặc thông số</Text>
        </View>
        <Button icon="plus" label="Thêm bài" onPress={onAdd} />
      </View>

      {/* Invalid items alert */}
      {invalid.map(({ item, index }) => (
        <Pressable
          key={index}
          accessibilityRole="button"
          accessibilityLabel={`Sửa giờ lỗi cho bài ${readText(item, ['name'])}`}
          onPress={() => onSelect(index)}
          style={timelineStyles.invalidCard}
        >
          <LibraryIcon name="alert-triangle" size={18} color={colors.danger} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[ws.cardTitle, { color: colors.danger, fontSize: 13.5 }]}>
              Lỗi giờ: {readText(item, ['name'])}
            </Text>
            <Text style={[ws.muted, { color: colors.danger, fontSize: 11 }]}>Chạm để định dạng lại khung giờ bắt đầu và thời lượng</Text>
          </View>
          <LibraryIcon name="chevron-right" size={18} color={colors.danger} />
        </Pressable>
      ))}

      {/* Empty State */}
      {items.length === 0 && (
        <View style={timelineStyles.emptyCard}>
          <View style={timelineStyles.emptyIconCircle}>
            <LibraryIcon name="calendar" size={22} color={colors.primary} />
          </View>
          <Text style={timelineStyles.emptyTitle}>Chưa có bài tập</Text>
          <Text style={timelineStyles.emptyDesc}>
            Ngày này chưa có bài tập nào. Hãy thêm bài tập từ thư viện hoặc xếp lịch các bài có sẵn.
          </Text>
          <Button icon="plus" label="Thêm bài tập vào ngày" onPress={onAdd} />
        </View>
      )}

      {/* Chronological Agenda */}
      {valid.length > 0 && (
        <View style={timelineStyles.agendaContainer}>
          {valid.map(({ item, index }, order) => {
            const start = Number(item.startMinute);
            const dur = Number(item.durationMinutes);
            const end = start + dur;
            const prescriptionSummary = formatPrescription(item);
            const isLast = order === valid.length - 1;

            return (
              <View key={index} style={timelineStyles.agendaRow}>
                {/* Time Indicator & Line Column */}
                <View style={timelineStyles.timelineTrack}>
                  <View style={timelineStyles.timeBadge}>
                    <LibraryIcon name="clock" size={13} color={colors.primaryDark} />
                    <Text style={timelineStyles.timeText}>{time(start)}</Text>
                  </View>
                  <Text style={timelineStyles.endTimeText}>{time(end)}</Text>
                  {!isLast && <View style={timelineStyles.timelineLine} />}
                </View>

                {/* Exercise Athletic Card */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Sửa ${readText(item, ['name'])}, ${time(start)} đến ${time(end)}`}
                  onPress={() => onSelect(index)}
                  style={({ pressed }) => [
                    timelineStyles.exerciseCard,
                    { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
                  ]}
                >
                  <View style={timelineStyles.cardTopRow}>
                    <View style={timelineStyles.durationPill}>
                      <Text style={timelineStyles.durationPillText}>{dur} PHÚT</Text>
                    </View>
                    <View style={timelineStyles.editPill}>
                      <LibraryIcon name="edit-2" size={14} color={colors.primary} />
                      <Text style={timelineStyles.editPillText}>Sửa</Text>
                    </View>
                  </View>

                  <Text numberOfLines={2} ellipsizeMode="tail" style={timelineStyles.exerciseName}>
                    {readText(item, ['name'])}
                  </Text>

                  {!!prescriptionSummary && (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={timelineStyles.prescriptionText}>
                      {prescriptionSummary}
                    </Text>
                  )}

                  {!!item.notes && (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={timelineStyles.notesText}>
                      {String(item.notes)}
                    </Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const timelineStyles = StyleSheet.create({
  container: {
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  invalidCard: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    lineHeight: 19,
    color: colors.text,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 6,
  },
  agendaContainer: {
    gap: 12,
    paddingVertical: 4,
  },
  agendaRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  timelineTrack: {
    width: 68,
    alignItems: 'center',
    paddingTop: 4,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.text,
  },
  endTimeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginTop: 8,
    marginBottom: -4,
    borderRadius: 1,
  },
  exerciseCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationPill: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.primaryDark,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
  },
  editPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  exerciseName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    lineHeight: 18,
    color: colors.text,
  },
  prescriptionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textMuted,
  },
  notesText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
