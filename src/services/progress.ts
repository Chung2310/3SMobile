import { asRecord, asRecords, readNumber, readText } from './journey';
import { recordId } from './workouts';
import type { JsonRecord } from '../types/domain';

export const ATTENDANCE = { PRESENT: 'Có mặt', LATE: 'Đi muộn', ABSENT: 'Vắng mặt' };
export const MEASUREMENTS: [string, string, string][] = [['weight', 'Cân nặng', 'kg'], ['bodyFatPercentage', 'Tỷ lệ mỡ', '%'], ['muscleMass', 'Khối lượng cơ', 'kg'], ['chest', 'Vòng ngực', 'cm'], ['waist', 'Vòng eo', 'cm'], ['hips', 'Vòng hông', 'cm'], ['arm', 'Vòng tay', 'cm'], ['thigh', 'Vòng đùi', 'cm'], ['calf', 'Vòng bắp chân', 'cm']];
export const RESULT_FIELDS: Record<string, [string, string][]> = {
  STRENGTH: [['reps', 'Số lần'], ['weight', 'Mức tạ (kg)'], ['rpe', 'RPE (0–10)'], ['rir', 'Số lần dự trữ']],
  BODYWEIGHT: [['reps', 'Số lần'], ['addedWeight', 'Tạ thêm (kg)'], ['rpe', 'RPE (0–10)'], ['rir', 'Số lần dự trữ']],
  CARDIO: [['durationMinutes', 'Thời lượng (phút)'], ['distanceKm', 'Quãng đường (km)'], ['paceSecondsPerKm', 'Pace (giây/km)'], ['averageHeartRate', 'Nhịp tim (bpm)'], ['inclinePercent', 'Độ dốc (%)'], ['calories', 'Năng lượng (kcal)'], ['rpe', 'RPE (0–10)']],
  INTERVAL: [['rounds', 'Số vòng'], ['workSeconds', 'Thời gian tập (giây)'], ['restSeconds', 'Thời gian nghỉ (giây)'], ['distanceMetersPerRound', 'Quãng đường/vòng (m)'], ['repsPerRound', 'Số lần/vòng'], ['rpe', 'RPE (0–10)']],
  MOBILITY: [['durationMinutes', 'Thời lượng (phút)'], ['reps', 'Số lần'], ['discomfort', 'Mức khó chịu (0–10)']],
};
export const ACHIEVEMENTS: Record<string, string> = { MAX_WEIGHT: 'Mức tạ cao nhất', MAX_REPS: 'Số lần cao nhất', MAX_SET_VOLUME: 'Khối lượng tập/hiệp cao nhất', ESTIMATED_1RM: '1RM ước tính', BODYWEIGHT_MAX_REPS: 'Số lần với trọng lượng cơ thể', BODYWEIGHT_MAX_ADDED_WEIGHT: 'Tạ thêm cao nhất', CARDIO_MAX_DISTANCE: 'Quãng đường dài nhất', CARDIO_MAX_DURATION: 'Thời gian cardio dài nhất', CARDIO_BEST_PACE: 'Pace tốt nhất', INTERVAL_MAX_ROUNDS: 'Số vòng cao nhất', MOBILITY_MAX_DURATION: 'Thời gian linh hoạt dài nhất' };
export function dayKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function localTime(date = new Date()): string { return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`; }
export function dateIso(day: string, time = '00:00'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) throw new Error('Nhập ngày YYYY-MM-DD và giờ HH:mm hợp lệ.');
  const [year, month, date] = day.split('-').map(Number); const [hour, minute] = time.split(':').map(Number);
  const parsed = new Date(year, month - 1, date, hour, minute);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== date || hour > 23 || minute > 59) throw new Error('Ngày hoặc giờ không hợp lệ.');
  return parsed.toISOString();
}
export function journeyPath(customerId?: string, from = '', to = ''): string {
  const query = new URLSearchParams();
  if (from) query.set('from', dateIso(from));
  if (to) { const end = new Date(dateIso(to, '23:59')); end.setSeconds(59, 999); query.set('to', end.toISOString()); }
  if (from && to && from > to) throw new Error('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
  return `${customerId ? `/api/customers/${encodeURIComponent(customerId)}/journey` : '/api/me/journey'}${query.size ? `?${query}` : ''}`;
}
function numeric(raw: unknown, label: string, max = Infinity, integer = false): number | undefined {
  if (raw === null || raw === undefined || (typeof raw === 'string' && !raw.trim())) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isInteger(value))) throw new Error(`${label} không hợp lệ.`);
  return value;
}
export function initialResult(exercise: JsonRecord): JsonRecord {
  const type = readText(exercise, ['trackingType']);
  if (type === 'STRENGTH' || type === 'BODYWEIGHT') return { sets: Array.from({ length: Math.min(100, Math.max(1, Math.floor(readNumber(asRecord(exercise.prescription), ['sets']) ?? 1))) }, () => ({ completed: false })) };
  return {};
}
export function cleanResult(type: string, draft: JsonRecord): JsonRecord {
  const fields = RESULT_FIELDS[type];
  if (!fields) throw new Error('Bài tập chưa được phân loại cách ghi nhận.');
  function clean(source: JsonRecord) {
    const result: JsonRecord = {};
    for (const [key, label] of fields) {
      const value = numeric(source[key], label, ['rpe', 'discomfort'].includes(key) ? 10 : Infinity, ['reps', 'rounds', 'repsPerRound'].includes(key));
      if (value !== undefined) result[key] = value;
    }
    return result;
  }
  if (type === 'STRENGTH' || type === 'BODYWEIGHT') {
    const sets = asRecords(draft.sets);
    if (!sets.length) throw new Error('Bài tập cần ít nhất một hiệp.');
    return { sets: sets.map((set) => { const value = clean(set); if (set.completed === true && value.reps === undefined) throw new Error('Nhập số lần thực tế cho hiệp đã hoàn thành.'); return { ...value, completed: set.completed === true }; }) };
  }
  const result = clean(draft);
  if (type === 'MOBILITY' && draft.side) { if (!['LEFT', 'RIGHT', 'BOTH'].includes(String(draft.side))) throw new Error('Bên tập không hợp lệ.'); result.side = draft.side; }
  if (!Object.keys(result).length) throw new Error('Nhập ít nhất một kết quả thực tế cho mỗi bài tập.');
  return result;
}
export function sessionPayload(customerId: string, plan: JsonRecord, draft: JsonRecord, idempotencyKey: string): JsonRecord {
  const sessionIndex = Number(draft.sessionIndex); const session = asRecords(plan.sessions)[sessionIndex];
  if (!customerId || !recordId(plan) || !Number.isInteger(sessionIndex) || !session || Number(plan.version) < 1 || !Number.isInteger(Number(plan.version)) || !idempotencyKey.trim()) throw new Error('Giáo án hoặc buổi tập không hợp lệ. Hãy tải lại.');
  if (plan.lifecycleStatus !== 'ACTIVE') throw new Error('Giáo án không còn được áp dụng.');
  const attendance = readText(draft, ['attendance']);
  if (!Object.keys(ATTENDANCE).includes(attendance)) throw new Error('Vui lòng chọn trạng thái điểm danh.');
  const results = asRecords(draft.results); const exercises = asRecords(session.exercises);
  if (attendance !== 'ABSENT' && results.length !== exercises.length) throw new Error('Kết quả không khớp với buổi tập.');
  return { ...sessionAttachments(draft), customerId, workoutPlanId: recordId(plan), workoutPlanVersion: Number(plan.version), sessionIndex, performedAt: dateIso(String(draft.date), String(draft.time)), attendance, absenceReason: attendance === 'ABSENT' ? readText(draft, ['absenceReason']) : '', feeling: readText(draft, ['feeling']), notes: readText(draft, ['notes']), idempotencyKey, exerciseResults: attendance === 'ABSENT' ? [] : exercises.map((exercise, index) => ({ exerciseIndex: index, ...(readText(exercise, ['exerciseId']) ? { exerciseId: readText(exercise, ['exerciseId']) } : {}), result: cleanResult(readText(exercise, ['trackingType']), results[index]) })) };
}
export function sessionAttachments(draft: JsonRecord): JsonRecord {
  if (draft.attendance === 'ABSENT') return {};
  const result: JsonRecord = {};
  const body = asRecord(draft.bodyMeasurement);
  if (MEASUREMENTS.some(([key]) => body[key] !== undefined && String(body[key]).trim() !== '')) {
    const measured = measurementPayload({ ...body, date: draft.date });
    delete measured.measuredAt;
    result.bodyMeasurement = measured;
  }
  const photos = asRecords(draft.progressPhotos);
  if (photos.length > 4) throw new Error('Tối đa 4 ảnh mỗi buổi tập.');
  if (photos.length) result.progressPhotos = photos.map((photo) => {
    const photoUrl = readText(photo, ['photoUrl']), angle = readText(photo, ['angle']);
    if (!/^(https?:\/\/|\/uploads\/|data:image\/(png|jpeg|webp);base64,)/i.test(photoUrl) || !['FRONT', 'SIDE', 'BACK', 'OTHER'].includes(angle)) throw new Error('Ảnh tiến độ không hợp lệ.');
    return { photoUrl, angle };
  });
  const signature = asRecord(draft.customerSignature);
  if (signature.signatureUrl) {
    const signatureUrl = readText(signature, ['signatureUrl']);
    if (!/^(https?:\/\/|data:image\/png;base64,)/i.test(signatureUrl)) throw new Error('Chữ ký không hợp lệ.');
    result.customerSignature = { signatureUrl, signedAt: signature.signedAt, signerName: readText(signature, ['signerName']) };
  }
  return result;
}
export function measurementPayload(draft: JsonRecord): JsonRecord {
  const result: JsonRecord = { measuredAt: dateIso(String(draft.date)) }; const measurements: JsonRecord = {};
  let count = 0;
  for (const [key, label] of MEASUREMENTS) {
    const value = numeric(draft[key], label, key === 'bodyFatPercentage' ? 100 : Infinity);
    if (value === undefined) continue;
    if (key === 'weight' && value === 0) throw new Error('Cân nặng phải lớn hơn 0.');
    if (['weight', 'bodyFatPercentage', 'muscleMass'].includes(key)) result[key] = value; else measurements[key] = value;
    count++;
  }
  if (!count) throw new Error('Vui lòng nhập ít nhất một số đo.');
  if (Object.keys(measurements).length) result.measurements = measurements;
  return result;
}
export function reportPayload(draft: JsonRecord): JsonRecord {
  const periodStart = dateIso(String(draft.from)); const periodEnd = dateIso(String(draft.to), '23:59');
  if (periodEnd <= periodStart) throw new Error('Ngày kết thúc phải từ ngày bắt đầu trở đi.');
  const summary = readText(draft, ['summary']); if (!summary) throw new Error('Vui lòng nhập nội dung báo cáo.');
  return { periodStart, periodEnd, summary };
}
export function metricSeries(records: JsonRecord[], key: string): { date: string; value: number }[] {
  return records.map((record) => ({ date: readText(record, ['measuredAt', 'measurementDate']), value: readNumber(record, [key]) ?? readNumber(asRecord(record.measurements), [key]) })).filter((item): item is { date: string; value: number } => item.value !== null && Number.isFinite(new Date(item.date).getTime())).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
export function sessionTitle(session: JsonRecord): string { return readText(asRecord(asRecord(session.planSnapshot).session), ['name'], readText(asRecord(session.planSnapshot), ['title'], 'Buổi tập')); }

export function calculateNextSessionIndex(plan: JsonRecord, pastSessions: JsonRecord[] = []): number {
  const planSessions = asRecords(plan.sessions);
  if (!planSessions.length) return 0;

  const validPast = asRecords(pastSessions);
  const planId = recordId(plan);

  // Filter completed sessions (exclude ABSENT)
  const attended = validPast.filter((s) => {
    const att = readText(s, ['attendance']).toUpperCase();
    return att !== 'ABSENT';
  });
  if (!attended.length) return 0;

  // Prefer sessions matching current plan if any match
  const planAttended = planId
    ? attended.filter((s) => {
        const sPlanId = readText(s, ['workoutPlanId', 'planId']) || recordId(asRecord(s.workoutPlan));
        const snapPlanId = readText(asRecord(s.planSnapshot), ['_id', 'id', 'workoutPlanId', 'planId']);
        return sPlanId === planId || snapPlanId === planId;
      })
    : [];
  const relevant = planAttended.length > 0 ? planAttended : attended;

  // Sort descending by performed date (most recent first)
  const sorted = [...relevant].sort((a, b) => {
    const timeA = new Date(readText(a, ['performedAt', 'sessionDate', 'date', 'createdAt', 'startsAt']) || 0).getTime();
    const timeB = new Date(readText(b, ['performedAt', 'sessionDate', 'date', 'createdAt', 'startsAt']) || 0).getTime();
    if (timeA !== timeB && !Number.isNaN(timeA) && !Number.isNaN(timeB)) {
      return timeB - timeA;
    }
    return readText(b, ['performedAt']).localeCompare(readText(a, ['performedAt']));
  });
  const latest = sorted[0];

  // 1. Try direct sessionIndex from the latest record or its snapshot
  const rawIdx =
    readNumber(latest, ['sessionIndex', 'sessionNumber', 'dayIndex', 'index']) ??
    readNumber(asRecord(latest.planSnapshot), ['sessionIndex', 'sessionNumber', 'dayIndex', 'index']) ??
    readNumber(asRecord(asRecord(latest.planSnapshot).session), ['sessionIndex', 'sessionNumber', 'index']);

  if (typeof rawIdx === 'number' && Number.isInteger(rawIdx) && rawIdx >= 0) {
    const nextIdx = rawIdx + 1;
    if (nextIdx < planSessions.length) return nextIdx;
    return nextIdx % planSessions.length;
  }

  // 2. Try matching by session name from the latest record or snapshot
  const lastName = (
    readText(latest, ['sessionName', 'name', 'title']) ||
    sessionTitle(latest) ||
    readText(asRecord(asRecord(latest.planSnapshot).session), ['name', 'title'])
  ).trim();

  if (lastName && lastName !== 'Buổi tập') {
    const matchedIdx = planSessions.findIndex(
      (ps) => readText(ps, ['name']).toLowerCase().trim() === lastName.toLowerCase()
    );
    if (matchedIdx !== -1) {
      const nextIdx = matchedIdx + 1;
      if (nextIdx < planSessions.length) return nextIdx;
      return nextIdx % planSessions.length;
    }

    const numMatch = lastName.match(/(?:ngày|buổi|day|session)?\s*(\d+)/i);
    if (numMatch) {
      const parsedNum = parseInt(numMatch[1], 10);
      if (parsedNum > 0) {
        const nextIdx = parsedNum; // e.g. "Ngày 3" -> 3 is 0-based index 3 (Ngày 4)
        if (nextIdx < planSessions.length) return nextIdx;
        return nextIdx % planSessions.length;
      }
    }
  }

  // 3. Fallback: use total completed count
  if (relevant.length < planSessions.length) {
    return relevant.length;
  }
  return relevant.length % planSessions.length;
}
