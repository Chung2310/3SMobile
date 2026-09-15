import type { CustomerJourney, JsonRecord, User } from '@/types/domain';

export type JourneyRecord = JsonRecord;

export function asRecord(value: unknown): JourneyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JourneyRecord) : {};
}

export function asRecords(value: unknown): JourneyRecord[] {
  return Array.isArray(value) ? (value.filter((item) => item && typeof item === 'object') as JourneyRecord[]) : [];
}

export function nestedRecords(value: unknown, ...keys: string[]): JourneyRecord[] {
  let current = value;
  for (const key of keys) current = asRecord(current)[key];
  return asRecords(current);
}

export function readText(record: unknown, keys: string[], fallback = ''): string {
  const source = asRecord(record);
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return fallback;
}

export function readNumber(record: unknown, keys: string[]): number | null {
  const source = asRecord(record);
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

export function readBoolean(record: unknown, keys: string[]): boolean {
  const source = asRecord(record);
  return keys.some((key) => source[key] === true || source[key] === 'true');
}

export function readDate(record: unknown): string {
  return readText(record, ['scheduledAt', 'startsAt', 'sessionDate', 'performedAt', 'measuredAt', 'takenDate', 'date', 'startAt', 'periodEnd', 'createdAt', 'updatedAt']);
}

export function formatDate(value: string, includeTime = false): string {
  if (!value) return 'Chưa cập nhật';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('vi-VN', includeTime ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getDisplayName(journey?: CustomerJourney | null, user?: User | null): string {
  const customer = journey?.customer;
  return readText(customer, ['fullName', 'name', 'customerName'], readText(user, ['fullName', 'name', 'username'], 'bạn'));
}

export function getPlanRecords(journey: CustomerJourney, bucket: string): JourneyRecord[] {
  const plans = journey.plans;
  if (Array.isArray(plans)) return asRecords(plans);
  const selected = asRecord(plans)[bucket];
  if (Array.isArray(selected)) return asRecords(selected);
  return selected && typeof selected === 'object' ? [asRecord(selected)] : [];
}

export function getLatestRecord(records: JourneyRecord[]): JourneyRecord | null {
  if (!records.length) return null;
  return [...records].sort((a, b) => readDate(b).localeCompare(readDate(a)))[0] || null;
}
