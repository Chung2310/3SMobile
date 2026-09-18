import { ErrorPopup } from './ErrorPopup';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LibraryIcon } from '@/components/LibraryIcon';
import { api } from '@/services/api/client';
import { asRecords, readText } from '@/services/journey';
import { exercisePayload, exerciseVideos, splitList, stringList } from '@/services/exercises';
import { LEVELS, TRACKING, recordId } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { colors } from '@/theme';
import { Button, Field, Notice, Picker, Sheet, ws } from '@/components/workouts/Controls';

export function ExerciseForm({
  initial,
  groups,
  onSaved,
  onClose,
  createWithAi = false,
}: {
  initial?: JsonRecord;
  createWithAi?: boolean;
  groups: string[];
  onSaved: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<JsonRecord>(() => ({
    ...initial,
    name: readText(initial, ['name']),
    muscleGroups: stringList(initial?.muscleGroups).length
      ? stringList(initial?.muscleGroups)
      : splitList(readText(initial, ['muscleGroup'])),
    level: readText(initial, ['level'], 'BEGINNER'),
    defaultTrackingType: readText(initial, ['defaultTrackingType']),
    videos: exerciseVideos(initial || {}).map((video) => ({ ...video })),
    videoUrl: '',
  }));
  const [aiOpen, setAiOpen] = useState(createWithAi);
  const [prompt, setPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<JsonRecord[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [editingSuggestion, setEditingSuggestion] = useState<number>();
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [discarded, setDiscarded] = useState(0);
  const aiLock = useRef(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [groupPicker, setGroupPicker] = useState(false);
  const lock = useRef(false);

  const update = (patch: JsonRecord) => {
    setDirty(true);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const videos = asRecords(draft.videos);
  const selectedMuscles = stringList(draft.muscleGroups);

  async function save() {
    if (lock.current) return;
    setError('');
    try {
      const payload = exercisePayload(draft);
      if (editingSuggestion !== undefined) {
        setSuggestions((items) => items.map((item, index) => index === editingSuggestion ? payload : item));
        setEditingSuggestion(undefined);
        setDirty(false);
        setAiOpen(true);
        return;
      }
      lock.current = true;
      setBusy(true);
      if (initial) {
        const id = recordId(initial);
        if (!id) throw new Error('Không tìm thấy bài tập. Vui lòng tải lại thư viện.');
        await api.patch(`/api/exercises/${id}`, payload);
      } else await api.post('/api/exercises', payload);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được bài tập.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function generate() {
    if (aiLock.current) return;
    const value = prompt.trim();
    if (value.length < 3 || value.length > 1000) {
      setAiError('Yêu cầu cần từ 3 đến 1000 ký tự.');
      return;
    }
    aiLock.current = true;
    setAiBusy(true);
    setAiError('');
    try {
      const result = await api.post<JsonRecord>('/api/ai/exercise-generations', { prompt: value });
      const drafts = asRecords(result.drafts);
      if (!drafts.length) {
        throw new Error('AI chưa tạo được bài tập phù hợp. Hãy điều chỉnh yêu cầu và thử lại.');
      }
      setSuggestions(drafts);
      setSelected([]);
      setDiscarded(Number(result.discardedCount) || 0);
    } catch (cause) {
      setAiError(cause instanceof Error ? cause.message : 'Không tạo được bài tập bằng AI. Hãy thử lại.');
    } finally {
      aiLock.current = false;
      setAiBusy(false);
    }
  }

  async function saveSelected() {
    if (lock.current || !selected.length) return;
    lock.current = true;
    setBusy(true);
    setAiError('');
    try {
      const exercises = selected.map((index) => {
        const item = suggestions[index];
        try {
          const payload = exercisePayload({
            ...item,
            muscleGroups: stringList(item.muscleGroups).length ? stringList(item.muscleGroups) : splitList(readText(item, ['muscleGroup'])),
          });
          // The bulk API accepts reviewed AI fields, without video fields.
          delete payload.videos;
          delete payload.videoUrl;
          return payload;
        } catch (cause) {
          throw new Error(readText(item, ['name'], 'Bài tập ' + (index + 1)) + ': ' + (cause instanceof Error ? cause.message : 'Dữ liệu không hợp lệ.'));
        }
      });
      await api.post('/api/exercises/bulk', { exercises });
      onSaved();
    } catch (cause) {
      setAiError(cause instanceof Error ? cause.message : 'Không lưu được các bài tập. Hãy thử lại.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  function applySuggestion(item: JsonRecord, index: number) {
    setDraft({
      ...item,
      muscleGroups: stringList(item.muscleGroups).length ? stringList(item.muscleGroups) : splitList(readText(item, ['muscleGroup'])),
      videos: [],
      videoUrl: '',
    });
    setEditingSuggestion(index);
    setDirty(false);
    setError('');
    setAiOpen(false);
  }

  function returnToSuggestions() {
    setEditingSuggestion(undefined);
    setDirty(false);
    setDiscard(false);
    setAiOpen(true);
  }

  if (aiOpen) {
    return (
      <Sheet
        title="Tạo bài tập bằng AI"
        locked={aiBusy || busy}
        onClose={onClose}
        footer={
          <View style={{ gap: 12 }}>
            {!!suggestions.length && <Button label={'Lưu ' + selected.length + ' bài đã chọn'} icon="check" busy={busy} disabled={aiBusy || !selected.length} onPress={() => void saveSelected()} />}
            <Button
              icon="zap"
              label={suggestions.length ? 'Tạo lại bằng AI' : 'Tạo bằng AI'}
              busy={aiBusy}
              disabled={aiBusy || busy || !prompt.trim()}
              onPress={() => void generate()}
            />
            <Button secondary label="Đóng" disabled={aiBusy || busy} onPress={onClose} />
          </View>
        }
      >
        <Notice text="Mô tả bài tập, nhóm cơ, thiết bị và cấp độ mong muốn. Có thể yêu cầu 1–10 gợi ý, chọn nhiều bài, chỉnh sửa từng bài rồi lưu các bài đã chọn." />
        {!aiBusy && (
          <Field
            label="Yêu cầu của bạn"
            multiline
            placeholder="Ví dụ: Tạo bài tập chân với tạ đơn cho người mới..."
            value={prompt}
            onChange={setPrompt}
          />
        )}
        {aiBusy && <Notice text="AI đang tạo bài tập, vui lòng chờ." />}
        <ErrorPopup message={aiError} onClose={() => setAiError('')} />
        {discarded > 0 && (
          <Notice
            tone="warning"
            text={String(discarded) + ' kết quả không hợp lệ đã được loại bỏ.'}
          />
        )}
        {!!suggestions.length && <Button secondary disabled={aiBusy || busy} label={selected.length === suggestions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'} onPress={() => setSelected(selected.length === suggestions.length ? [] : suggestions.map((_, index) => index))} />}
        {suggestions.map((item, index) => (
          <View key={index} style={ws.card}>
            <Text numberOfLines={3} ellipsizeMode="tail" style={ws.cardTitle}>
              {readText(item, ['name'], 'Bài tập')}
            </Text>
            <Text numberOfLines={4} ellipsizeMode="tail" style={ws.muted}>
              {readText(item, ['description'])}
            </Text>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(index), disabled: aiBusy || busy }} disabled={aiBusy || busy} onPress={() => setSelected((values) => values.includes(index) ? values.filter((value) => value !== index) : [...values, index])} style={({ pressed }) => ({ minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.8 : 1 })}>
              <LibraryIcon name={selected.includes(index) ? 'check-square' : 'square'} size={18} color={colors.primary} />
              <Text style={ws.text}>{selected.includes(index) ? 'Đã chọn' : 'Chọn bài này'}</Text>
            </Pressable>
            <Button
              secondary
              icon="edit-2"
              label="Chỉnh sửa bản nháp"
              disabled={aiBusy || busy}
              onPress={() => applySuggestion(item, index)}
            />
          </View>
        ))}
      </Sheet>
    );
  }

  return (
    <Sheet
      title={editingSuggestion !== undefined ? 'Chỉnh sửa bản nháp' : initial ? 'Sửa bài tập' : 'Tạo bài tập'}
      locked={busy}
      onClose={() => (dirty ? setDiscard(true) : editingSuggestion !== undefined ? returnToSuggestions() : onClose())}
      footer={
        <Button label={editingSuggestion !== undefined ? "Xong, quay lại danh sách" : "Lưu bài tập"} icon="check" busy={busy} onPress={() => void save()} />
      }
    >
      <Field
        label="Tên bài tập *"
        placeholder="Ví dụ: Barbell Squat, Dumbbell Press..."
        value={String(draft.name ?? '')}
        onChange={(name) => update({ name })}
        error={error && !readText(draft, ['name']) ? 'Vui lòng nhập tên bài tập.' : undefined}
      />

      {/* Muscle groups selector with clear preview */}
      <View style={{ gap: 6 }}>
        <Text style={ws.muted}>Nhóm cơ tác động *</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chọn nhóm cơ tác động"
          onPress={() => setGroupPicker(true)}
          style={styles.pickerTrigger}
        >
          <LibraryIcon name="layers" size={18} color={colors.primary} />
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[
              styles.pickerTriggerText,
              !selectedMuscles.length && { color: colors.textMuted },
            ]}
          >
            {selectedMuscles.length ? selectedMuscles.join(', ') : 'Chạm để chọn nhóm cơ *'}
          </Text>
          <LibraryIcon name="chevron-down" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {error && !selectedMuscles.length && (
        <Notice error text="Vui lòng chọn ít nhất một nhóm cơ." />
      )}

      <Picker
        label="Cấp độ bài tập"
        value={String(draft.level ?? '')}
        options={LEVELS}
        onChange={(level) => update({ level })}
      />

      <Picker
        label="Cách ghi nhận *"
        value={String(draft.defaultTrackingType ?? '')}
        options={TRACKING}
        onChange={(defaultTrackingType) => update({ defaultTrackingType })}
      />

      <Field
        label="Thiết bị (cách nhau bằng dấu phẩy)"
        placeholder="Ví dụ: Tạ đơn, Ghế dốc, Thảm..."
        value={
          typeof draft.equipmentText === 'string'
            ? draft.equipmentText
            : stringList(draft.equipment).join(', ')
        }
        onChange={(equipmentText) =>
          update({ equipmentText, equipment: splitList(equipmentText) })
        }
      />

      {(createWithAi || !!initial) && (
        <Field
          label="Mô tả bài tập"
          multiline
          placeholder="Mô tả ngắn gọn về bài tập và mục đích..."
          value={String(draft.description ?? '')}
          onChange={(description) => update({ description })}
        />
      )}

      <Field
        label="Hướng dẫn kỹ thuật"
        multiline
        placeholder="Các bước thực hiện động tác chuẩn xác..."
        value={String(draft.technique ?? '')}
        onChange={(technique) => update({ technique })}
      />

      {(createWithAi || !!initial) &&
        ([
          ['commonMistakes', 'Lỗi thường gặp'],
          ['contraindications', 'Chống chỉ định'],
          ['variants', 'Biến thể bài tập'],
        ] as const).map(([key, label]) => (
          <Field
            key={key}
            label={`${label} (mỗi dòng một mục)`}
            multiline
            value={
              typeof draft[`${key}Text`] === 'string'
                ? String(draft[`${key}Text`])
                : stringList(draft[key]).join('\n')
            }
            onChange={(value) =>
              update({
                [`${key}Text`]: value,
                [key]: value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
          />
        ))}

      {/* Videos can be added after a batch draft has been saved. */}
      {editingSuggestion === undefined && <View style={{ gap: 10, marginTop: 4 }}>
        <Text style={ws.title}>Video hướng dẫn</Text>
        {videos.map((video, index) => (
          <View key={index} style={styles.videoCard}>
            <Field
              label={`Tên video ${index + 1}`}
              placeholder="Ví dụ: Góc quay trực diện"
              value={String(video.title ?? '')}
              onChange={(title) =>
                update({
                  videos: videos.map((v, i) => (i === index ? { ...v, title } : v)),
                })
              }
            />
            <Field
              label="Liên kết video (HTTP/HTTPS)"
              placeholder="https://..."
              value={String(video.url ?? '')}
              onChange={(url) =>
                update({
                  videos: videos.map((v, i) =>
                    i === index ? { ...v, url, source: 'LINK' } : v
                  ),
                })
              }
            />
            <Button
              secondary
              destructive
              label="Bỏ video này"
              icon="trash-2"
              onPress={() =>
                update({
                  videos: videos.filter((_, i) => i !== index),
                  videoUrl: '',
                })
              }
            />
          </View>
        ))}

        <Button
          secondary
          icon="plus"
          label="Thêm liên kết video"
          disabled={videos.length >= 20}
          onPress={() =>
            update({
              videos: [...videos, { title: '', url: '', source: 'LINK' }],
            })
          }
        />
      </View>}

      <ErrorPopup message={error} onClose={() => setError('')} />

      {groupPicker && (
        <MusclePicker
          options={[...new Set([...groups, ...selectedMuscles])]}
          value={selectedMuscles}
          onApply={(muscleGroups) => {
            update({ muscleGroups });
            setGroupPicker(false);
          }}
          onClose={() => setGroupPicker(false)}
        />
      )}

      {discard && (
        <Sheet title="Bỏ thay đổi?" onClose={() => setDiscard(false)}>
          <Notice tone="warning" text="Các thay đổi chưa lưu sẽ bị hủy bỏ." />
          <View style={{ gap: 10, marginTop: 12 }}>
            <Button label="Tiếp tục chỉnh sửa" onPress={() => setDiscard(false)} />
            <Button secondary destructive label="Bỏ thay đổi" onPress={editingSuggestion !== undefined ? returnToSuggestions : onClose} />
          </View>
        </Sheet>
      )}
    </Sheet>
  );
}

function MusclePicker({
  options,
  value,
  onApply,
  onClose,
}: {
  options: string[];
  value: string[];
  onApply: (value: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(value);
  const [query, setQuery] = useState('');

  return (
    <Sheet
      title="Chọn nhóm cơ tác động"
      onClose={onClose}
      footer={
        <View style={{ gap: 10 }}>
          <Button label={`Áp dụng (${selected.length} nhóm cơ)`} onPress={() => onApply(selected)} />
          <Button secondary label="Bỏ chọn tất cả" onPress={() => setSelected([])} />
        </View>
      }
    >
      {options.length > 6 && (
        <Field
          label="Tìm nhanh"
          placeholder="Nhập tên nhóm cơ..."
          value={query}
          onChange={setQuery}
        />
      )}
      {!options.length && (
        <Notice text="Chưa tải được nhóm cơ. Đóng form và thử tải lại thư viện." />
      )}
      <View style={{ gap: 8 }}>
        {options
          .filter((name) => name.toLowerCase().includes(query.toLowerCase()))
          .map((name) => {
            const isChecked = selected.includes(name);
            return (
              <Pressable
                key={name}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                onPress={() =>
                  setSelected((current) =>
                    current.includes(name)
                      ? current.filter((item) => item !== name)
                      : [...current, name]
                  )
                }
                style={({ pressed }) => [
                  styles.muscleOptionItem,
                  isChecked && styles.muscleOptionItemSelected,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={[
                    styles.muscleOptionText,
                    isChecked && styles.muscleOptionTextSelected,
                  ]}
                >
                  {name}
                </Text>
                <LibraryIcon
                  name={isChecked ? 'check-circle' : 'circle'}
                  size={20}
                  color={isChecked ? colors.primary : colors.textMuted}
                />
              </Pressable>
            );
          })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  pickerTrigger: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerTriggerText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
    color: colors.text,
  },
  videoCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  muscleOptionItem: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  muscleOptionItemSelected: {
    backgroundColor: '#F0F9FF',
    borderColor: colors.primary,
  },
  muscleOptionText: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: colors.text,
  },
  muscleOptionTextSelected: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.primaryDark,
  },
});
