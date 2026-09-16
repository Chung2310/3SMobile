import { ErrorPopup, SuccessPopup } from './ErrorPopup';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LibraryIcon } from '@/components/LibraryIcon';
import { api } from '@/services/api/client';
import { readNumber, readText } from '@/services/journey';
import { recordId } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { colors } from '@/theme';
import { Button, Field, Notice, Sheet, ws } from '@/components/workouts/Controls';

export function MuscleGroups({
  groups,
  onChanged,
  onClose,
}: {
  groups: JsonRecord[];
  onChanged: () => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<JsonRecord>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const lock = useRef(false);

  async function save() {
    if (lock.current) return;
    if (!deleting && (!name.trim() || name.trim().length > 100)) {
      setError('Tên nhóm cơ cần từ 1 đến 100 ký tự.');
      return;
    }
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (deleting) await api.delete(`/api/exercises/muscle-groups/${recordId(deleting)}`);
      else await api.post('/api/exercises/muscle-groups', { name: name.trim() });
      setMessage(deleting ? 'Đã xóa nhóm cơ.' : 'Đã thêm nhóm cơ.');
      setDeleting(undefined);
      setName('');
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không cập nhật được nhóm cơ.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const filteredGroups = groups.filter((group) =>
    readText(group, ['name']).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet title="Quản lý nhóm cơ" locked={busy} onClose={onClose}>
      <SuccessPopup message={message} onClose={() => setMessage('')} />
      <ErrorPopup message={error} onClose={() => setError('')} />

      {deleting ? (
        <View style={{ gap: 12 }}>
          <Notice
            tone="warning"
            text={`Xóa nhóm cơ “${readText(deleting, ['name'])}”? Thao tác này sẽ xóa vĩnh viễn.`}
          />
          <Button destructive label="Xác nhận xóa" busy={busy} onPress={() => void save()} />
          <Button secondary label="Hủy" disabled={busy} onPress={() => setDeleting(undefined)} />
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {/* Add group form */}
          <View style={styles.addCard}>
            <Field
              label="Tên nhóm cơ mới"
              placeholder="Ví dụ: Cơ xô, Cơ đùi trước..."
              value={name}
              onChange={setName}
            />
            <Button
              label="Thêm nhóm cơ"
              icon="plus"
              busy={busy}
              disabled={!name.trim()}
              onPress={() => void save()}
            />
          </View>

          {/* Search groups if many */}
          {groups.length > 6 && (
            <Field
              label="Tìm nhóm cơ"
              placeholder="Nhập tên nhóm cơ cần tìm..."
              value={search}
              onChange={setSearch}
            />
          )}

          {/* Groups list */}
          <View style={{ gap: 8 }}>
            <Text style={ws.muted}>{filteredGroups.length} nhóm cơ trong hệ thống</Text>
            {filteredGroups.map((group) => {
              const count = readNumber(group, ['exerciseCount']) ?? 0;
              const canDelete = !group.isDefault && count === 0;

              return (
                <View key={recordId(group)} style={styles.groupCard}>
                  <View style={styles.groupIconWrapper}>
                    <LibraryIcon name="layers" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.groupInfo}>
                    <Text numberOfLines={2} ellipsizeMode="tail" style={styles.groupName}>
                      {readText(group, ['name'])}
                    </Text>
                    <Text style={styles.groupCount}>
                      {count} bài tập{group.isDefault ? ' · Mặc định' : ''}
                    </Text>
                  </View>
                  {canDelete && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa nhóm cơ ${readText(group, ['name'])}`}
                      disabled={busy}
                      onPress={() => {
                        setError('');
                        setDeleting(group);
                      }}
                      style={({ pressed }) => [
                        styles.deleteBtn,
                        pressed && { backgroundColor: '#FEE2E2' },
                      ]}
                    >
                      <LibraryIcon name="trash-2" size={18} color={colors.danger} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  addCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  groupInfo: {
    flex: 1,
    gap: 4,
  },
  groupName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    color: colors.text,
  },
  groupCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
});
