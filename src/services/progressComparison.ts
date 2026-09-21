import { asRecord, asRecords, readNumber, readText } from './journey';
import { recordId } from './workouts';
import type { JsonRecord } from '../types/domain';

export function priorRecords(records: JsonRecord[], before: string, customerId: string, excludeId = '') {
  const cutoff = Date.parse(before);
  return records.filter(record => {
    const owner = readText(record, ['customerId']) || recordId(asRecord(record.customerId));
    const time = Date.parse(readText(record, ['performedAt', 'measuredAt', 'measurementDate']));
    return (!owner || owner === customerId) && (!excludeId || recordId(record) !== excludeId)
      && Number.isFinite(time) && time < cutoff;
  }).sort((a, b) => Date.parse(readText(b, ['performedAt', 'measuredAt', 'measurementDate']))
    - Date.parse(readText(a, ['performedAt', 'measuredAt', 'measurementDate']))
    || (Date.parse(readText(b, ['createdAt'])) || 0) - (Date.parse(readText(a, ['createdAt'])) || 0)
    || recordId(b).localeCompare(recordId(a)));
}

export function lastExerciseResult(records: JsonRecord[], exercise: JsonRecord, plan: JsonRecord, sessionIndex: number, exerciseIndex: number) {
  const id = readText(exercise, ['exerciseId']) || recordId(asRecord(exercise.exerciseId));
  const type = readText(exercise, ['trackingType']);
  for (const session of records) {
    if (!['PRESENT', 'LATE'].includes(readText(session, ['attendance']))) continue;
    const snapshot = asRecord(session.planSnapshot);
    const sameSlot = Boolean(recordId(plan)) && readNumber(plan, ['version']) !== null && readText(session, ['workoutPlanId']) === recordId(plan)
      && readNumber(session, ['workoutPlanVersion']) === readNumber(plan, ['version'])
      && (readNumber(session, ['sessionIndex']) ?? readNumber(snapshot, ['sessionIndex'])) === sessionIndex;
    const logs: JsonRecord[] = Array.isArray(session.exerciseLogs) ? asRecords(session.exerciseLogs).map((entry, index) => ({ ...entry, exerciseIndex: index })) : asRecords(session.exerciseResults);
    const matches = logs.filter(entry => {
      const index = readNumber(entry, ['exerciseIndex']);
      const stored = index === null ? {} : asRecords(asRecord(snapshot.session).exercises)[index] || {};
      const storedId = readText(entry, ['exerciseId']) || recordId(asRecord(entry.exerciseId)) || readText(stored, ['exerciseId']);
      const storedType = readText(entry, ['trackingType']) || readText(stored, ['trackingType']);
      if (storedType && storedType !== type) return false;
      if (!storedType && !sameSlot) return false;
      return id && storedId ? id === storedId : sameSlot && index === exerciseIndex;
    });
    const entry = matches.length === 1 ? matches[0] : sameSlot ? matches.find(item => readNumber(item, ['exerciseIndex']) === exerciseIndex) : undefined;
    if (entry) return { date: readText(session, ['performedAt']), result: asRecord(entry.result) };
  }
  return null;
}

export function comparisonValue(current: unknown, previous: unknown, unit = '') {
  const value = (raw: unknown) => typeof raw === 'number' || typeof raw === 'string'
    ? readNumber({ value: raw }, ['value']) : null;
  const now = value(current), old = value(previous);
  if (old === null) return 'Lần trước: chưa có dữ liệu';
  const baseline = `Lần trước: ${old}${unit ? ` ${unit}` : ''}`;
  if (now === null || now < 0) return baseline;
  const difference = Number((now - old).toFixed(2));
  return `${baseline} · ${difference === 0 ? 'Không đổi' : `${difference > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(difference)}${unit ? ` ${unit === '%' ? 'điểm %' : unit}` : ''}`}`;
}
