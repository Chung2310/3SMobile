import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { api, type ApiPage } from '@/services/api/client';
import { asRecords, readText } from '@/services/journey';
import { EMPTY_EXERCISE_FILTERS, exerciseForPlan, exerciseQuery, exerciseVideos, stringList, videoLink, type ExerciseFilters } from '@/services/exercises';
import { LEVELS, TRACKING, recordId } from '@/services/workouts';
import type { JsonRecord } from '@/types/domain';
import { colors } from '@/theme';
import { Button, Busy, Empty, Field, Notice, Picker, Sheet, ws } from '@/components/workouts/Controls';
import { ExerciseForm } from './ExerciseForm';
import { MuscleGroups } from './MuscleGroups';

export function ExerciseLibrary({ onSelect }: { onSelect?: (exercise: JsonRecord) => void }) {
  const [filters, setFilters] = useState<ExerciseFilters>({ ...EMPTY_EXERCISE_FILTERS });
  const [groupRecords, setGroupRecords] = useState<JsonRecord[]>([]);
  const groups = groupRecords.map((item) => readText(item, ['name'])).filter(Boolean);
  const [groupManager, setGroupManager] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [detail, setDetail] = useState<JsonRecord>();
  const [editing, setEditing] = useState<JsonRecord | null | undefined>();
  const [deleting, setDeleting] = useState<JsonRecord>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const alive = useRef(true);
  const lock = useRef(false);
  const loadGroups = useCallback(async () => {
    setGroupError('');
    try { const result = asRecords(await api.get('/api/exercises/muscle-groups')); if (alive.current) setGroupRecords(result); }
    catch (cause) { if (alive.current) setGroupError(cause instanceof Error ? cause.message : 'Không tải được nhóm cơ.'); }
  }, []);
  useEffect(() => { const mounted = alive; mounted.current = true; const timer = setTimeout(() => void loadGroups(), 0); return () => { mounted.current = false; clearTimeout(timer); }; }, [loadGroups]);
  function openDetail(item: JsonRecord) { setActionError(''); setDetail(item); }
  function select(item: JsonRecord) {
    try { exerciseForPlan(item); onSelect?.(item); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không chọn được bài tập.'); }
  }
  async function remove() {
    if (!deleting || lock.current) return;
    lock.current = true; setBusy(true); setActionError('');
    try { await api.delete(`/api/exercises/${recordId(deleting)}`); setDeleting(undefined); setDetail(undefined); setMessage('Đã xóa bài tập khỏi thư viện.'); setRevision((value) => value + 1); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không xóa được bài tập.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const hasFilters = Object.values(filters).some(Boolean);
  return <View style={{ gap: 16 }}>
    <Field label="Tìm bài tập" placeholder="Nhập tên bài tập" value={filters.keyword} onChange={(keyword) => setFilters((current) => ({ ...current, keyword }))} />
    <View style={ws.row}><Button secondary icon="sliders" label={hasFilters ? 'Bộ lọc đang áp dụng' : 'Bộ lọc'} onPress={() => setFilterOpen(true)} />{!onSelect && <Button icon="plus" label="Tạo bài tập" onPress={() => setEditing(null)} />}</View>
    {!onSelect && <Button secondary icon="layers" label="Quản lý nhóm cơ" onPress={() => setGroupManager(true)} />}
    {groupManager && <MuscleGroups groups={groupRecords} onChanged={loadGroups} onClose={() => setGroupManager(false)} />}
    {!!message && <Notice tone="success" text={message} />}
    {!!groupError && <><Notice error text={groupError} /><Button secondary label="Tải lại nhóm cơ" onPress={() => void loadGroups()} /></>}
    <ExerciseResults key={`${JSON.stringify(filters)}:${revision}`} filters={filters} onDetail={openDetail} onSelect={onSelect ? select : undefined} onReset={() => setFilters({ ...EMPTY_EXERCISE_FILTERS })} />
    {filterOpen && <Filters initial={filters} groups={groups} onApply={(value) => { setFilters(value); setFilterOpen(false); }} onClose={() => setFilterOpen(false)} />}
    {detail && editing === undefined && !deleting && <Sheet title="Chi tiết bài tập" onClose={() => setDetail(undefined)}>
      <ExerciseDetails exercise={detail} />
      {!!actionError && <Notice error text={actionError} />}
      {onSelect && <><Button label="Thêm vào buổi tập" icon="plus" disabled={!Object.keys(TRACKING).includes(readText(detail, ['defaultTrackingType']))} onPress={() => select(detail)} /><Notice text="Thông số khởi tạo theo loại bài tập; PT có thể điều chỉnh trong giáo án." /></>}
      {!onSelect && detail.canManage === true && <><Button label="Sửa bài tập" icon="edit-2" onPress={() => setEditing(detail)} /><Button secondary destructive label="Xóa bài tập" icon="trash-2" onPress={() => { setActionError(''); setDeleting(detail); }} /></>}
    </Sheet>}
    {editing !== undefined && <ExerciseForm initial={editing || undefined} groups={groups} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); setDetail(undefined); setMessage('Đã lưu bài tập.'); setRevision((value) => value + 1); void loadGroups(); }} />}
    {deleting && <Sheet title="Xóa bài tập?" locked={busy} onClose={() => setDeleting(undefined)}><Notice tone="warning" text={`Xóa “${readText(deleting, ['name'])}” khỏi thư viện? Thao tác này không thể hoàn tác.`} />{!!actionError && <Notice error text={actionError} />}<Button destructive label="Xóa bài tập" busy={busy} onPress={() => void remove()} /><Button secondary label="Hủy" disabled={busy} onPress={() => setDeleting(undefined)} /></Sheet>}
  </View>;
}
function ExerciseResults({ filters, onDetail, onSelect, onReset }: { filters: ExerciseFilters; onDetail: (exercise: JsonRecord) => void; onSelect?: (exercise: JsonRecord) => void; onReset: () => void }) {
  const [data, setData] = useState<ApiPage<JsonRecord>>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const requestId = useRef(0);
  const retryPage = useRef(1);
  const load = useCallback(async (target: number) => {
    retryPage.current = target;
    const request = ++requestId.current; setLoading(true); setError('');
    try {
      const result = await api.getPage<JsonRecord>(exerciseQuery(filters, target));
      if (!Array.isArray(result.data) || !result.meta) throw new Error('Dữ liệu thư viện không hợp lệ.');
      if (request === requestId.current) { setData(result); setPage(target); }
    } catch (cause) { if (request === requestId.current) setError(cause instanceof Error ? cause.message : 'Không tải được bài tập.'); }
    finally { if (request === requestId.current) setLoading(false); }
  }, [filters]);
  useEffect(() => { const requests = requestId; const timer = setTimeout(() => void load(1), 300); return () => { clearTimeout(timer); requests.current++; }; }, [load]);
  const hasFilters = Object.values(filters).some(Boolean);
  return <View style={{ gap: 12 }}>
    {!!error && <><Notice error text={error} /><Button secondary label="Thử lại" onPress={() => void load(retryPage.current)} /></>}
    {loading ? <Busy /> : data && <>
      <View style={[ws.row, { justifyContent: 'space-between' }]}><Text style={ws.muted}>{data.meta.total} bài tập</Text><Button secondary icon="refresh-cw" label="Tải lại" onPress={() => void load(page)} /></View>
      {data.data.map((exercise) => {
        const kind = readText(exercise, ['defaultTrackingType']);
        const classified = Object.keys(TRACKING).includes(kind);
        return <View key={recordId(exercise)} style={ws.card}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Xem ${readText(exercise, ['name'])}`} onPress={() => onDetail(exercise)} style={({ pressed }) => [ws.row, { flexWrap: 'nowrap', opacity: pressed ? 0.8 : 1 }]}>
            <View style={[ws.thumbnail, { alignItems: 'center', justifyContent: 'center' }]}><Feather name={kind === 'CARDIO' ? 'activity' : kind === 'MOBILITY' ? 'sun' : 'target'} size={32} color={colors.primary} /></View>
            <View style={{ flex: 1, gap: 8 }}><Text numberOfLines={3} ellipsizeMode="tail" style={ws.cardTitle}>{readText(exercise, ['name'])}</Text><Text numberOfLines={2} ellipsizeMode="tail" style={ws.muted}>{stringList(exercise.muscleGroups).join(', ') || readText(exercise, ['muscleGroup'])}</Text></View>
            <View style={ws.roundAction}><Feather name="arrow-right" size={20} color="#fff" /></View>
          </Pressable>
          <Text numberOfLines={2} ellipsizeMode="tail" style={ws.badge}>{LEVELS[readText(exercise, ['level']) as keyof typeof LEVELS] || 'Chưa có cấp độ'} · {TRACKING[kind as keyof typeof TRACKING] || 'Chưa phân loại'}</Text>
          {!!stringList(exercise.equipment).length && <Text numberOfLines={2} ellipsizeMode="tail" style={ws.muted}>Thiết bị: {stringList(exercise.equipment).join(', ')}</Text>}
          {onSelect && <Button secondary icon="plus" label={classified ? 'Thêm vào buổi tập' : 'Cần phân loại trước khi thêm'} disabled={!classified} onPress={() => onSelect(exercise)} />}
        </View>;
      })}
      {!data.data.length && <Empty title={hasFilters ? 'Không có bài phù hợp' : 'Chưa có bài tập'} text={hasFilters ? 'Đổi từ khóa hoặc xóa bộ lọc để tìm bài tập.' : 'Tạo bài tập trong thư viện để sử dụng cho giáo án.'} action={hasFilters ? 'Xóa bộ lọc' : 'Tải lại'} onAction={hasFilters ? onReset : () => void load(1)} />}
      <View style={[ws.row, { justifyContent: 'space-between' }]}><Button secondary label="Trang trước" disabled={loading || page <= 1} onPress={() => void load(page - 1)} /><Text style={ws.muted}>{page} / {Math.max(data.meta.totalPages, 1)}</Text><Button secondary label="Trang sau" disabled={loading || page >= data.meta.totalPages} onPress={() => void load(page + 1)} /></View>
    </>}
  </View>;
}
function Filters({ initial, groups, onApply, onClose }: { initial: ExerciseFilters; groups: string[]; onApply: (filters: ExerciseFilters) => void; onClose: () => void }) {
  const [draft, setDraft] = useState({ ...initial });
  return <Sheet title="Lọc bài tập" onClose={onClose} footer={<><Button label="Áp dụng" onPress={() => onApply(draft)} /><Button secondary label="Đặt lại" onPress={() => setDraft({ ...EMPTY_EXERCISE_FILTERS })} /></>}>
    <Picker label="Nhóm cơ" value={draft.muscleGroup} options={{ '': 'Tất cả', ...Object.fromEntries(groups.map((name) => [name, name])) }} onChange={(muscleGroup) => setDraft((value) => ({ ...value, muscleGroup }))} />
    <Picker label="Cấp độ" value={draft.level} options={{ '': 'Tất cả', ...LEVELS }} onChange={(level) => setDraft((value) => ({ ...value, level }))} />
    <Picker label="Cách ghi nhận" value={draft.defaultTrackingType} options={{ '': 'Tất cả', ...TRACKING, UNCLASSIFIED: 'Chưa phân loại' }} onChange={(defaultTrackingType) => setDraft((value) => ({ ...value, defaultTrackingType }))} />
  </Sheet>;
}
function ExerciseDetails({ exercise }: { exercise: JsonRecord }) {
  const [error, setError] = useState('');
  async function openVideo(value: string) {
    setError('');
    const url = videoLink(value);
    if (!url) { setError('Liên kết video không hợp lệ.'); return; }
    try { await Linking.openURL(url); } catch { setError('Không mở được video. Vui lòng kiểm tra ứng dụng phát video hoặc trình duyệt.'); }
  }
  return <View style={{ gap: 16 }}>
    <Text numberOfLines={4} ellipsizeMode="tail" style={ws.display}>{readText(exercise, ['name'])}</Text>
    <Text numberOfLines={3} ellipsizeMode="tail" style={ws.badge}>{LEVELS[readText(exercise, ['level']) as keyof typeof LEVELS]} · {TRACKING[readText(exercise, ['defaultTrackingType']) as keyof typeof TRACKING] || 'Chưa phân loại'}</Text>
    {!Object.keys(TRACKING).includes(readText(exercise, ['defaultTrackingType'])) && <Notice tone="warning" text="Bài tập chưa có cách ghi nhận. Người có quyền quản lý cần cập nhật trước khi thêm vào giáo án." />}
    <View style={ws.sub}><Text numberOfLines={4} ellipsizeMode="tail" style={ws.text}>Nhóm cơ: {stringList(exercise.muscleGroups).join(', ') || readText(exercise, ['muscleGroup'], 'Chưa cập nhật')}</Text><Text numberOfLines={4} ellipsizeMode="tail" style={ws.text}>Thiết bị: {stringList(exercise.equipment).join(', ') || 'Chưa cập nhật'}</Text></View>
    {([['description', 'Mô tả'], ['technique', 'Hướng dẫn kỹ thuật']] as const).map(([key, label]) => readText(exercise, [key]) ? <View key={key} style={{ gap: 8 }}><Text style={ws.title}>{label}</Text><Text numberOfLines={30} ellipsizeMode="tail" style={ws.text}>{readText(exercise, [key])}</Text></View> : null)}
    {([['commonMistakes', 'Lỗi thường gặp'], ['contraindications', 'Chống chỉ định'], ['variants', 'Biến thể']] as const).map(([key, label]) => stringList(exercise[key]).length ? <View key={key} style={ws.sub}><Text style={ws.title}>{label}</Text>{stringList(exercise[key]).map((item, index) => <Text key={index} numberOfLines={10} ellipsizeMode="tail" style={ws.text}>{index + 1}. {item}</Text>)}</View> : null)}
    {!!error && <Notice error text={error} />}
    <Text style={ws.title}>Video hướng dẫn</Text>
    {exerciseVideos(exercise).length ? exerciseVideos(exercise).map((video, index) => <Button key={index} secondary icon="play-circle" label={readText(video, ['title'], 'Xem video hướng dẫn')} onPress={() => void openVideo(readText(video, ['url']))} />) : <Notice text="Bài tập chưa có video hướng dẫn." />}
  </View>;
}
