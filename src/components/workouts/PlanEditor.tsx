import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LibraryIcon } from '@/components/LibraryIcon';
import { Stack } from 'expo-router';
import { Screen } from '@/components/Screen';
import { colors } from '@/theme';
import { AddScheduledExercise } from './AddScheduledExercise';
import { StudioTimeline } from './StudioTimeline';
import { asRecord, asRecords, readText } from '@/services/journey';
import { LEVELS, TRACKING, PRESCRIPTIONS, planPayload, prepareDraft } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { ExerciseLibrary } from '@/components/exercises/ExerciseLibrary';
import { exerciseForPlan } from '@/services/exercises';
import { Button, Field, Notice, Picker, Sheet, ws } from './Controls';
import { DurationPicker, TimePicker } from './TimePicker';

export function PlanEditor({
  initial,
  seed,
  onSave,
  onClose,
}: {
  initial?: JsonRecord;
  seed?: JsonRecord;
  onSave: (payload: JsonRecord) => Promise<void>;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [selected, setSelected] = useState<number>();
  const [saved, setSaved] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string }>();
  const [draft, setDraft] = useState<JsonRecord>(() =>
    initial
      ? prepareDraft(initial)
      : {
          title: '',
          goal: '',
          level: 'BEGINNER',
          durationDays: 7,
          scheduledExercises: [],
          unscheduledExercises: [],
          ...seed,
        }
  );
  const [librarySession, setLibrarySession] = useState<number | 'unscheduled' | 'scheduled'>();
  const [adding, setAdding] = useState<{ item?: JsonRecord; fromUnscheduled?: number }>();
  const [activeDay, setActiveDay] = useState('1');
  const [durationChange, setDurationChange] = useState<number>();
  const [busy, setBusy] = useState(false);
  const saveLock = useRef(false);
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const [dirty, setDirty] = useState(Boolean(seed) && !initial);

  function change(patch: JsonRecord) {
    setSaved(false);
    setDirty(true);
    setDraft((old) => ({ ...old, ...patch }));
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (dirty) {
        setDiscard(true);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [busy, dirty]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const sessions = asRecords(draft.sessions);
  const scheduled = asRecords(draft.scheduledExercises);
  const unscheduled = asRecords(draft.unscheduledExercises);
  const studio = !initial || (Array.isArray(initial.scheduledExercises) && initial.scheduledExercises.length > 0);
  const days = Math.max(1, Math.min(365, Math.floor(Number(draft.durationDays)) || 7));
  const dayIndex = Math.min(Number(activeDay), days);
  const week = Math.ceil(dayIndex / 7);
  const day = (dayIndex - 1) % 7 + 1;
  const dayItems = scheduled
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => Number(item.weekNumber || 1) === week && Number(item.dayNumber) === day)
    .sort((a, b) => Number(a.item.startMinute) - Number(b.item.startMinute));

  function applyDuration(value: number) {
    const outside = (item: JsonRecord) => (Number(item.weekNumber || 1) - 1) * 7 + Number(item.dayNumber) > value;
    change({
      durationDays: value,
      scheduledExercises: scheduled.filter((item) => !outside(item)),
      unscheduledExercises: [...unscheduled, ...scheduled.filter(outside)],
    });
    setActiveDay(String(Math.min(dayIndex, value)));
    setDurationChange(undefined);
  }

  function place(item?: JsonRecord, fromUnscheduled?: number) {
    setAdding({ item, fromUnscheduled });
    setLibrarySession(undefined);
  }

  function updateSession(index: number, patch: JsonRecord) {
    change({ sessions: sessions.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  }

  async function save() {
    if (saveLock.current) return;
    saveLock.current = true;
    setError('');
    setSaved(false);
    setSaveResult(undefined);
    try {
      if (studio && !scheduled.length) {
        throw new Error('Vui lòng xếp ít nhất một bài tập vào lịch.');
      }
      const payload = planPayload(draft);
      setBusy(true);
      await onSave(payload);
      setDirty(false);
      setSaved(true);
      setSaveResult({ success: true, message: 'Giáo án đã được lưu thành công. Bạn có thể tiếp tục chỉnh sửa hoặc quay lại danh sách.' });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không lưu được giáo án.';
      setError(message);
      setSaveResult({ success: false, message });
    } finally {
      saveLock.current = false;
      setBusy(false);
    }
  }

  if (librarySession !== undefined) {
    return (
      <Sheet title="Chọn từ thư viện" onClose={() => setLibrarySession(undefined)}>
        <ExerciseLibrary
          onSelect={(exercise) => {
            const selectedExercise = exerciseForPlan(exercise);
            if (librarySession === 'scheduled') {
              place(selectedExercise);
              return;
            }
            if (librarySession === 'unscheduled') {
              change({ unscheduledExercises: [...unscheduled, { ...selectedExercise, durationMinutes: 15 }] });
            } else {
              updateSession(librarySession, {
                exercises: [...asRecords(sessions[librarySession]?.exercises), selectedExercise],
              });
            }
            setLibrarySession(undefined);
          }}
        />
      </Sheet>
    );
  }

  // Selected scheduled exercise object
  const selectedExercise = selected !== undefined ? scheduled[selected] : undefined;

  return (
    <Screen
      title="Workout Studio"
      scroll={false}
      onBack={() => {
        if (!busy) {
          if (dirty) setDiscard(true);
          else onClose();
        }
      }}
    >
      <Stack.Screen options={{ gestureEnabled: !dirty && !busy }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 10 }}>
            {!!error && <Notice error text={error} />}
            {saved && <Notice tone="success" text="Đã lưu giáo án thành công." />}

            {/* Plan Info Hero Card */}
            <View style={editorStyles.planHeroCard}>
              <View style={editorStyles.planHeroTop}>
                <View style={editorStyles.badgeRow}>
                  <View style={editorStyles.levelBadge}>
                    <Text style={editorStyles.levelBadgeText}>
                      {readText(draft, ['level'], 'BEGINNER')}
                    </Text>
                  </View>
                  <View style={editorStyles.durationBadge}>
                    <Text style={editorStyles.durationBadgeText}>{days} NGÀY</Text>
                  </View>
                </View>
                {!propertiesOpen && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sửa thuộc tính giáo án"
                    onPress={() => setPropertiesOpen(true)}
                    style={editorStyles.quickEditBtn}
                  >
                    <LibraryIcon name="sliders" size={16} color={colors.primary} />
                    <Text style={editorStyles.quickEditBtnText}>Cài đặt</Text>
                  </Pressable>
                )}
              </View>

              <Text numberOfLines={2} ellipsizeMode="tail" style={editorStyles.planTitle}>
                {readText(draft, ['title'], 'Giáo án mới')}
              </Text>

              <View style={editorStyles.statsRow}>
                <LibraryIcon name="calendar" size={14} color={colors.textMuted} />
                <Text style={ws.muted}>
                  {studio
                    ? `Tuần ${week} · Ngày ${day} (${dayItems.length} bài tập)`
                    : `${sessions.length} buổi tập`}
                </Text>
                {studio && (
                  <>
                    <Text style={ws.muted}>·</Text>
                    <Text style={ws.muted}>{scheduled.length} bài đã xếp lịch</Text>
                  </>
                )}
              </View>
            </View>

            {/* Day Switcher Component for Mobile (Visible on schedule tab) */}
            {studio && (
              <View style={editorStyles.daySwitcherContainer}>
                {/* Week & Arrow Navigation Bar */}
                <View style={editorStyles.dayNavBar}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ngày trước"
                    disabled={dayIndex <= 1}
                    onPress={() => setActiveDay(String(dayIndex - 1))}
                    style={[editorStyles.navArrowBtn, dayIndex <= 1 && { opacity: 0.3 }]}
                  >
                    <LibraryIcon name="chevron-left" size={20} color={colors.text} />
                  </Pressable>

                  <View style={{ alignItems: 'center' }}>
                    <Text style={editorStyles.currentDayText}>
                      Tuần {week} · Ngày {day}
                    </Text>
                    <Text style={editorStyles.dayIndexSubtext}>
                      Ngày thứ {dayIndex} trên {days} ngày
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ngày tiếp theo"
                    disabled={dayIndex >= days}
                    onPress={() => setActiveDay(String(dayIndex + 1))}
                    style={[editorStyles.navArrowBtn, dayIndex >= days && { opacity: 0.3 }]}
                  >
                    <LibraryIcon name="chevron-right" size={20} color={colors.text} />
                  </Pressable>
                </View>

                {/* Horizontal Scrollable Day Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={editorStyles.dayChipsScroll}
                >
                  {Array.from({ length: days }, (_, i) => {
                    const d = i + 1;
                    const isSelected = d === dayIndex;
                    const dWeek = Math.ceil(d / 7);
                    const dDay = (d - 1) % 7 + 1;
                    const hasItems = scheduled.some(
                      (item) => Number(item.weekNumber || 1) === dWeek && Number(item.dayNumber) === dDay
                    );

                    return (
                      <Pressable
                        key={d}
                        accessibilityRole="button"
                        accessibilityLabel={`Ngày ${d}`}
                        onPress={() => setActiveDay(String(d))}
                        style={({ pressed }) => [
                          editorStyles.dayChip,
                          isSelected && editorStyles.dayChipSelected,
                          { opacity: pressed ? 0.8 : 1 },
                        ]}
                      >
                        <Text
                          style={[
                            editorStyles.dayChipText,
                            isSelected && editorStyles.dayChipTextSelected,
                          ]}
                        >
                          Ngày {d}
                        </Text>
                        {hasItems && (
                          <View
                            style={[
                              editorStyles.dayChipDot,
                              isSelected && editorStyles.dayChipDotSelected,
                            ]}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* TAB: SCHEDULE (Lịch tập) */}
            {studio && (
              <StudioTimeline
                items={dayItems}
                onSelect={(index) => setSelected(index)}
                onAdd={() => place()}
              />
            )}

            {/* TAB: LIBRARY & UNSCHEDULED (Bài tập) */}
            {unscheduled.length > 0 && (
              <View style={{ gap: 16 }}>
                {studio && (
                  <Button
                    icon="plus"
                    label="Thêm bài từ thư viện vào danh sách"
                    onPress={() => setLibrarySession('unscheduled')}
                  />
                )}

                {!studio && (
                  <Picker
                    label="Buổi tập"
                    value={String(Math.min(Number(activeDay) - 1, Math.max(0, sessions.length - 1)))}
                    options={Object.fromEntries(
                      sessions.map((session, i) => [String(i), readText(session, ['name'], 'Buổi ' + (i + 1))])
                    )}
                    onChange={(value) => setActiveDay(String(Number(value) + 1))}
                  />
                )}

                {/* Unscheduled exercises list */}
                <View style={{ gap: 12 }}>
                  <Text style={ws.title}>
                    Bài tập chưa xếp lịch ({unscheduled.length})
                  </Text>

                  {unscheduled.length === 0 ? (
                    <View style={editorStyles.emptySubCard}>
                      <LibraryIcon name="inbox" size={32} color={colors.textMuted} />
                      <Text style={[ws.muted, { textAlign: 'center' }]}>
                        Không có bài tập nào chưa xếp lịch. Nhấn nút bên trên để chọn bài từ thư viện.
                      </Text>
                    </View>
                  ) : (
                    unscheduled.map((exercise, index) => (
                      <View key={index} style={ws.card}>
                        <View style={editorStyles.unscheduledTop}>
                          <View style={{ flex: 1 }}>
                            <Text numberOfLines={1} ellipsizeMode="tail" style={ws.badge}>
                              {readText(exercise, ['trackingType'], 'STRENGTH')}
                            </Text>
                            <Text numberOfLines={2} ellipsizeMode="tail" style={ws.cardTitle}>
                              {readText(exercise, ['name'], 'Bài tập')}
                            </Text>
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Bỏ bài ${readText(exercise, ['name'])}`}
                            onPress={() =>
                              change({ unscheduledExercises: unscheduled.filter((_, i) => i !== index) })
                            }
                            style={editorStyles.deleteCircleBtn}
                          >
                            <LibraryIcon name="trash-2" size={18} color={colors.danger} />
                          </Pressable>
                        </View>

                        {studio && (
                          <Button
                            icon="calendar"
                            label="Xếp bài vào lịch"
                            onPress={() => place(exercise, index)}
                          />
                        )}

                        <ExerciseEditor
                          exercise={exercise}
                          onChange={(patch) =>
                            change({
                              unscheduledExercises: unscheduled.map((e, i) =>
                                i === index ? { ...e, ...patch } : e
                              ),
                            })
                          }
                        />
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            {/* Non-studio mode session cards (for legacy plans) */}
            {!studio && (
              <View style={{ gap: 16 }}>
                {sessions.map((session, index) => (
                  <View key={index} style={ws.card}>
                    <Field
                      label={`Tên buổi ${index + 1}`}
                      value={String(session.name ?? '')}
                      onChange={(name) => updateSession(index, { name })}
                    />
                    {asRecords(session.exercises).map((exercise, exerciseIndex) => (
                      <View key={exerciseIndex} style={ws.sub}>
                        <ExerciseEditor
                          exercise={exercise}
                          onChange={(patch) =>
                            updateSession(index, {
                              exercises: asRecords(session.exercises).map((e, i) =>
                                i === exerciseIndex ? { ...e, ...patch } : e
                              ),
                            })
                          }
                        />
                        <Button
                          secondary
                          destructive
                          icon="trash-2"
                          label="Bỏ bài tập"
                          onPress={() =>
                            updateSession(index, {
                              exercises: asRecords(session.exercises).filter((_, i) => i !== exerciseIndex),
                            })
                          }
                        />
                      </View>
                    ))}
                    <Button
                      icon="book-open"
                      label="Chọn từ thư viện"
                      onPress={() => setLibrarySession(index)}
                    />
                    <Button
                      secondary
                      icon="plus"
                      label="Nhập bài thủ công"
                      onPress={() =>
                        updateSession(index, {
                          exercises: [
                            ...asRecords(session.exercises),
                            {
                              name: '',
                              trackingType: 'STRENGTH',
                              prescription: { sets: 3, reps: '10', restSeconds: 60 },
                            },
                          ],
                        })
                      }
                    />
                    <Button
                      secondary
                      destructive
                      label="Bỏ buổi tập"
                      onPress={() => change({ sessions: sessions.filter((_, i) => i !== index) })}
                    />
                  </View>
                ))}
                <Button
                  secondary
                  icon="plus"
                  label="Thêm buổi tập"
                  onPress={() =>
                    change({ sessions: [...sessions, { name: `Buổi ${sessions.length + 1}`, exercises: [] }] })
                  }
                />
              </View>
            )}
          </View>
        </ScrollView>

        {/* Sticky Bottom Save Action Bar */}
        <View
          style={[
            editorStyles.saveBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Button label="Lưu giáo án" icon="check" busy={busy} onPress={() => void save()} />
        </View>

        {propertiesOpen && <Sheet title="Thông tin giáo án" onClose={() => setPropertiesOpen(false)} footer={<Button label="Hoàn tất" onPress={() => setPropertiesOpen(false)} />}>
              <View style={{ gap: 16 }}>
                {/* Card 1: Basic info */}
                <View style={ws.card}>
                  <Text style={ws.title}>Thông tin cơ bản</Text>
                  <Field
                    label="Tên giáo án *"
                    error={error && !readText(draft, ['title']) ? 'Vui lòng nhập tên giáo án.' : undefined}
                    value={String(draft.title ?? '')}
                    onChange={(title) => change({ title })}
                  />
                  <Field
                    label="Mục tiêu *"
                    error={error && !readText(draft, ['goal']) ? 'Vui lòng nhập mục tiêu.' : undefined}
                    value={String(draft.goal ?? '')}
                    onChange={(goal) => change({ goal })}
                  />

                  {/* Level selection chips */}
                  <View style={{ gap: 8 }}>
                    <Text style={ws.muted}>Cấp độ</Text>
                    <View style={editorStyles.levelRow}>
                      {Object.entries(LEVELS).map(([key, label]) => {
                        const isSelected = draft.level === key;
                        return (
                          <Pressable
                            key={key}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: isSelected }}
                            onPress={() => change({ level: key })}
                            style={[
                              editorStyles.levelChip,
                              isSelected && editorStyles.levelChipSelected,
                            ]}
                          >
                            <Text
                              style={[
                                editorStyles.levelChipText,
                                isSelected && editorStyles.levelChipTextSelected,
                              ]}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <Field
                    label="Số ngày lộ trình (1–365)"
                    numeric
                    value={String(draft.durationDays ?? '')}
                    onChange={(durationDays) => {
                      const value = Number(durationDays);
                      if (!studio || !Number.isInteger(value) || value < 1 || value > 365) {
                        change({ durationDays });
                        return;
                      }
                      if (
                        scheduled.some(
                          (item) => (Number(item.weekNumber || 1) - 1) * 7 + Number(item.dayNumber) > value
                        )
                      ) {
                        setDurationChange(value);
                      } else {
                        applyDuration(value);
                      }
                    }}
                  />
                </View>

              </View>

        </Sheet>}
        {/* Modal: Edit Scheduled Exercise via Bottom Sheet */}
        {selected !== undefined && selectedExercise && (
          <Sheet
            title="Chỉnh sửa bài tập"
            onClose={() => setSelected(undefined)}
            footer={
              <Button
                label="Hoàn tất"
                onPress={() => setSelected(undefined)}
              />
            }
          >
            {/* Target Day Picker */}
            <Picker
              label="Chuyển sang ngày"
              value={String(
                (Number(selectedExercise.weekNumber || 1) - 1) * 7 + Number(selectedExercise.dayNumber)
              )}
              options={Object.fromEntries(
                Array.from({ length: days }, (_, i) => [
                  String(i + 1),
                  'Tuần ' + Math.ceil((i + 1) / 7) + ' · Ngày ' + (i % 7 + 1),
                ])
              )}
              onChange={(value) => {
                const target = Number(value);
                const candidate: JsonRecord = {
                  ...selectedExercise,
                  weekNumber: Math.ceil(target / 7),
                  dayNumber: (target - 1) % 7 + 1,
                };
                const overlap = scheduled.some(
                  (e, i) =>
                    i !== selected &&
                    Number(e.weekNumber || 1) === Number(candidate.weekNumber) &&
                    Number(e.dayNumber) === Number(candidate.dayNumber) &&
                    Number(e.startMinute) < Number(candidate.startMinute) + Number(candidate.durationMinutes) &&
                    Number(candidate.startMinute) < Number(e.startMinute) + Number(e.durationMinutes)
                );
                if (overlap) {
                  setError('Ngày đích đã có bài tập trong khung giờ này.');
                  return;
                }
                change({
                  scheduledExercises: scheduled.map((e, i) => (i === selected ? candidate : e)),
                });
                setActiveDay(value);
                setError('');
              }}
            />

            {/* Start Time with Interactive TimePicker */}
            <TimePicker
              label="Giờ bắt đầu tập"
              value={
                typeof selectedExercise.timeText === 'string'
                  ? selectedExercise.timeText
                  : String(Math.floor(Number(selectedExercise.startMinute) / 60)).padStart(2, '0') +
                    ':' +
                    String(Number(selectedExercise.startMinute) % 60).padStart(2, '0')
              }
              onChange={(timeText) => {
                const parts = timeText.split(':').map(Number);
                change({
                  scheduledExercises: scheduled.map((e, i) =>
                    i === selected
                      ? { ...e, timeText, startMinute: parts[0] * 60 + parts[1] }
                      : e
                  ),
                });
              }}
            />

            {/* Duration with Interactive DurationPicker */}
            <DurationPicker
              label="Thời lượng bài tập"
              value={Number(selectedExercise.durationMinutes) || 15}
              onChange={(dur) =>
                change({
                  scheduledExercises: scheduled.map((e, i) =>
                    i === selected ? { ...e, durationMinutes: dur } : e
                  ),
                })
              }
            />

            {/* Exercise Prescriptions (Sets, Reps, etc.) */}
            <ExerciseEditor
              exercise={selectedExercise}
              onChange={(patch) =>
                change({
                  scheduledExercises: scheduled.map((e, i) => (i === selected ? { ...e, ...patch } : e)),
                })
              }
            />

            {/* Secondary actions */}
            <View style={{ gap: 8, marginTop: 8 }}>
              <Button
                secondary
                destructive
                icon="trash-2"
                label="Bỏ bài tập khỏi giáo án"
                onPress={() => {
                  change({ scheduledExercises: scheduled.filter((_, i) => i !== selected) });
                  setSelected(undefined);
                }}
              />
            </View>
          </Sheet>
        )}

        {/* Modal: Add Scheduled Exercise */}
        {adding && (
          <AddScheduledExercise
            days={days}
            activeDay={dayIndex}
            scheduled={scheduled}
            initial={adding.item}
            onClose={() => setAdding(undefined)}
            onAdd={(item) => {
              change({
                scheduledExercises: [...scheduled, item],
                ...(adding.fromUnscheduled === undefined
                  ? {}
                  : { unscheduledExercises: unscheduled.filter((_, index) => index !== adding.fromUnscheduled) }),
              });
              setActiveDay(String((Number(item.weekNumber) - 1) * 7 + Number(item.dayNumber)));
              setSelected(undefined);
              setPropertiesOpen(false);
              setError('');
              setAdding(undefined);
            }}
          />
        )}

        <Modal visible={!!saveResult} transparent animationType="fade" onRequestClose={() => setSaveResult(undefined)}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24, paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }}>
            <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 420, maxHeight: '90%', backgroundColor: colors.surface, borderRadius: 24, padding: 24, gap: 16 }}>
              <LibraryIcon name={saveResult?.success ? 'check-circle' : 'x-circle'} size={32} color={saveResult?.success ? colors.success : colors.danger} />
              <Text accessibilityRole="header" style={ws.title}>{saveResult?.success ? 'Lưu giáo án thành công' : 'Không lưu được giáo án'}</Text>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: 12 }}>
                <Text accessibilityRole="alert" style={ws.text}>{saveResult?.message}</Text>
                {saveResult && !saveResult.success && <Text style={ws.muted}>Thông tin đang chỉnh sửa vẫn được giữ nguyên. Đóng thông báo để kiểm tra và lưu lại.</Text>}
              </ScrollView>
              <Button label={saveResult?.success ? 'Tiếp tục chỉnh sửa' : 'Đã hiểu'} onPress={() => setSaveResult(undefined)} />
              {saveResult?.success && <Button secondary label="Về danh sách giáo án" onPress={() => { setSaveResult(undefined); onClose(); }} />}
            </View>
          </View>
        </Modal>

        {/* Confirmation Modal: Duration reduction */}
        {durationChange !== undefined && (
          <Sheet title="Giảm số ngày giáo án?" onClose={() => setDurationChange(undefined)}>
            <Notice text="Các bài tập ngoài số ngày mới sẽ được chuyển về danh sách chưa xếp lịch." />
            <Button label="Tiếp tục" onPress={() => applyDuration(durationChange)} />
            <Button secondary label="Hủy" onPress={() => setDurationChange(undefined)} />
          </Sheet>
        )}

        {/* Confirmation Modal: Discard changes */}
        {discard && (
          <Sheet title="Bỏ thay đổi?" onClose={() => setDiscard(false)}>
            <Notice text="Các thay đổi chưa lưu sẽ bị mất." />
            <Button label="Tiếp tục sửa" onPress={() => setDiscard(false)} />
            <Button secondary label="Bỏ thay đổi" onPress={onClose} />
          </Sheet>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function ExerciseEditor({ exercise, onChange }: { exercise: JsonRecord; onChange: (patch: JsonRecord) => void }) {
  const [picking, setPicking] = useState(false);
  const kind = readText(exercise, ['trackingType'], 'STRENGTH');
  const prescription = asRecord(exercise.prescription);

  return (
    <View style={editorStyles.exerciseEditorCard}>
      <Button
        secondary
        icon="refresh-cw"
        label="Thay bài khác từ thư viện"
        onPress={() => setPicking(true)}
      />

      {picking && (
        <Sheet title="Chọn bài thay thế" onClose={() => setPicking(false)}>
          <ExerciseLibrary
            onSelect={(item) => {
              onChange({
                sets: undefined,
                reps: undefined,
                weight: undefined,
                rpe: undefined,
                rir: undefined,
                restSeconds: undefined,
                rest: undefined,
                ...exerciseForPlan(item),
              });
              setPicking(false);
            }}
          />
        </Sheet>
      )}

      <Field
        label="Tên bài tập *"
        value={String(exercise.name ?? '')}
        onChange={(name) => onChange({ name })}
      />

      <Picker
        label="Cách ghi nhận"
        value={kind}
        options={TRACKING}
        onChange={(trackingType) =>
          onChange({
            trackingType,
            prescription: {},
            sets: undefined,
            reps: undefined,
            weight: undefined,
            rpe: undefined,
            rir: undefined,
            restSeconds: undefined,
            rest: undefined,
          })
        }
      />

      {(PRESCRIPTIONS[kind] || []).map(([key, label, unit]) => (
        <Field
          key={key}
          label={`${label}${unit ? ` (${unit})` : ''}`}
          value={String(prescription[key] ?? '')}
          numeric={key !== 'side' && !(key === 'reps' && kind !== 'MOBILITY')}
          onChange={(value) => onChange({ prescription: { ...prescription, [key]: value } })}
        />
      ))}

      <Field
        label="Tempo (e.g. 3-0-1-0)"
        value={String(exercise.tempo ?? '')}
        onChange={(tempo) => onChange({ tempo })}
      />

      <Field
        label="Ghi chú bài tập"
        multiline
        value={String(exercise.notes ?? '')}
        onChange={(notes) => onChange({ notes })}
      />
    </View>
  );
}

const editorStyles = StyleSheet.create({
  planHeroCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 6,
  },
  planHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  levelBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  levelBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.primaryDark,
  },
  durationBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  durationBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: colors.primary,
  },
  quickEditBtn: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  quickEditBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.primary,
  },
  planTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14.5,
    lineHeight: 19,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  daySwitcherContainer: {
    gap: 6,
  },
  dayNavBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.surfaceMuted,
  },
  currentDayText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: colors.text,
  },
  dayIndexSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
    color: colors.textMuted,
  },
  dayChipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  dayChip: {
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  dayChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: colors.text,
  },
  dayChipTextSelected: {
    color: '#FFFFFF',
  },
  dayChipDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  dayChipDotSelected: {
    backgroundColor: '#FFFFFF',
  },
  emptySubCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
    gap: 8,
  },
  unscheduledTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  deleteCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRow: {
    flexDirection: 'row',
    gap: 6,
  },
  levelChip: {
    flex: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  levelChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  levelChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: colors.text,
  },
  levelChipTextSelected: {
    color: '#FFFFFF',
  },
  exerciseEditorCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  saveBar: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
});
