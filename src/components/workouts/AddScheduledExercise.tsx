import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaModal as Modal } from '@/components/SafeAreaModal';
import { LibraryIcon } from '@/components/LibraryIcon';
import type { JsonRecord } from '@/types/domain';
import { readText } from '@/services/journey';
import { exerciseForPlan } from '@/services/exercises';
import { planPayload } from '@/services/workouts';
import { colors } from '@/theme';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { Button, Notice, Sheet, ws } from './Controls';
import { DurationPicker, TimePicker } from './TimePicker';

export function AddScheduledExercise({
  days,
  activeDay,
  scheduled,
  initial,
  onAdd,
  onClose,
}: {
  days: number;
  activeDay: number;
  scheduled: JsonRecord[];
  initial?: JsonRecord;
  onAdd: (exercise: JsonRecord) => void;
  onClose: () => void;
}) {
  const [exercise, setExercise] = useState<JsonRecord | undefined>(initial);
  const [picking, setPicking] = useState(!initial);
  const [targetDayIndex, setTargetDayIndex] = useState(activeDay);
  const week = Math.ceil(targetDayIndex / 7);
  const day = (targetDayIndex - 1) % 7 + 1;

  const [start, setStart] = useState('08:00');
  const [duration, setDuration] = useState(String(initial?.durationMinutes || 60));
  const [error, setError] = useState('');
  const submitted = useRef(false);

  function add() {
    if (submitted.current) return;
    setError('');
    try {
      if (!exercise) throw new Error('Vui lòng chọn bài tập.');
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start.trim())) {
        throw new Error('Giờ bắt đầu phải có dạng HH:mm, từ 00:00 đến 23:45.');
      }
      const [hour, minute] = start.trim().split(':').map(Number);
      if (minute % 15 !== 0) {
        throw new Error('Phút bắt đầu phải là bội số của 15 (00, 15, 30, 45).');
      }
      const durNum = Number(duration);
      if (!Number.isInteger(durNum) || durNum < 15 || durNum % 15 !== 0) {
        throw new Error('Thời lượng phải là số phút bội số của 15 (tối thiểu 15 phút).');
      }
      const startMin = hour * 60 + minute;
      if (startMin + durNum > 1440) {
        throw new Error('Bài tập phải kết thúc trước hoặc đúng 24:00.');
      }

      const item = {
        ...exercise,
        weekNumber: week,
        dayNumber: day,
        startMinute: startMin,
        durationMinutes: durNum,
        timeText: undefined,
      };

      const conflict = scheduled.find((existing) =>
        Number(existing.weekNumber ?? 1) === week && Number(existing.dayNumber) === day
        && startMin < Number(existing.startMinute) + Number(existing.durationMinutes)
        && startMin + durNum > Number(existing.startMinute),
      );
      if (conflict) {
        const formatTime = (value: number) => String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
        const conflictStart = Number(conflict.startMinute);
        throw new Error('Tuần ' + week + ', ngày ' + day + ' đã có bài “' + readText(conflict, ['name'], 'Bài tập') + '” từ ' + formatTime(conflictStart) + ' đến ' + formatTime(conflictStart + Number(conflict.durationMinutes)) + '. Vui lòng chọn giờ hoặc ngày khác.');
      }

      planPayload({
        title: 'Kiểm tra lịch',
        goal: 'Kiểm tra lịch',
        level: 'BEGINNER',
        durationDays: days,
        scheduledExercises: [...scheduled, item],
      });

      submitted.current = true;
      onAdd(item);
    } catch (cause) {
      submitted.current = false;
      setError(cause instanceof Error ? cause.message : 'Không thêm được bài tập.');
    }
  }

  if (picking) {
    return (
      <Sheet title="Chọn bài tập" onClose={() => (exercise ? setPicking(false) : onClose())}>
        <ExerciseLibrary
          onSelect={(item) => {
            setExercise(exerciseForPlan(item));
            setPicking(false);
            setError('');
          }}
        />
      </Sheet>
    );
  }

  return (
    <Sheet
      title={initial ? 'Xếp lịch bài tập' : 'Thêm bài tập vào giáo án'}
      onClose={onClose}
      footer={<Button icon="plus" label="Thêm vào lịch" onPress={add} />}
    >
      {/* Selected Exercise Summary Card */}
      {exercise ? (
        <View style={addStyles.exerciseCard}>
          <View style={addStyles.exerciseIconCircle}>
            <LibraryIcon name="activity" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={ws.badge}>
              {readText(exercise, ['trackingType'], 'STRENGTH')}
            </Text>
            <Text numberOfLines={2} ellipsizeMode="tail" style={ws.cardTitle}>
              {readText(exercise, ['name'], 'Bài tập')}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi bài tập khác"
            onPress={() => setPicking(true)}
            style={addStyles.changeBtn}
          >
            <LibraryIcon name="refresh-cw" size={16} color={colors.primary} />
            <Text style={addStyles.changeBtnText}>Đổi bài</Text>
          </Pressable>
        </View>
      ) : (
        <Button icon="book-open" label="Chọn bài tập từ thư viện" onPress={() => setPicking(true)} />
      )}

      {/* Target Day Selector */}
      <View style={{ gap: 8 }}>
        <Text style={ws.muted}>Xếp vào ngày</Text>
        <View style={addStyles.daySelectorBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ngày trước"
            disabled={targetDayIndex <= 1}
            onPress={() => setTargetDayIndex((d) => Math.max(1, d - 1))}
            style={[addStyles.arrowBtn, targetDayIndex <= 1 && { opacity: 0.3 }]}
          >
            <LibraryIcon name="chevron-left" size={20} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={addStyles.daySelectorTitle}>
              Tuần {week} · Ngày {day}
            </Text>
            <Text style={[ws.muted, { fontSize: 12 }]}>
              (Ngày {targetDayIndex} / {days} ngày)
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ngày tiếp theo"
            disabled={targetDayIndex >= days}
            onPress={() => setTargetDayIndex((d) => Math.min(days, d + 1))}
            style={[addStyles.arrowBtn, targetDayIndex >= days && { opacity: 0.3 }]}
          >
            <LibraryIcon name="chevron-right" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      {/* Interactive Time Picker */}
      <TimePicker
        label="Giờ bắt đầu tập"
        value={start}
        onChange={(t) => {
          setStart(t);
          setError('');
        }}
      />

      {/* Interactive Duration Picker */}
      <DurationPicker
        label="Thời lượng bài tập"
        value={duration}
        onChange={(dur) => {
          setDuration(String(dur));
          setError('');
        }}
      />

      <Notice text="Giờ bắt đầu và thời lượng theo bước 15 phút. Bài tập phải kết thúc trước 24:00 và không trùng lịch." />

      <Modal visible={Boolean(error)} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setError('')}>
        <View style={addStyles.errorOverlay}>
          <View accessibilityViewIsModal style={addStyles.errorDialog}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <LibraryIcon name="alert-circle" size={24} color={colors.danger} />
              <Text style={[ws.cardTitle, { flex: 1 }]}>Không thể thêm bài tập</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={() => setError('')} style={addStyles.arrowBtn}>
                <LibraryIcon name="x" size={20} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={{ flexShrink: 1 }}><Text accessibilityRole="alert" style={ws.text}>{error}</Text></ScrollView>
            <Button label="Đã hiểu" onPress={() => setError('')} />
          </View>
        </View>
      </Modal>
    </Sheet>
  );
}

const addStyles = StyleSheet.create({
  errorOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  errorDialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  changeBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: colors.primary,
  },
  daySelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 8,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  daySelectorTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.text,
  },
});
