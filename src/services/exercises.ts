import type { JsonRecord } from '../types/domain';
import { asRecords, readText } from './journey';
import { LEVELS, TRACKING, recordId } from './workouts';

export interface ExerciseFilters { keyword: string; muscleGroup: string; level: string; defaultTrackingType: string }
export const EMPTY_EXERCISE_FILTERS: ExerciseFilters = { keyword: '', muscleGroup: '', level: '', defaultTrackingType: '' };
export function exerciseQuery(filters: ExerciseFilters, page = 1) {
  const query = new URLSearchParams({ page: String(page), limit: '12' });
  for (const [key, value] of Object.entries(filters)) if (value.trim()) query.set(key, value.trim());
  return `/api/exercises?${query}`;
}
export function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];
}
export function splitList(value: string): string[] { return [...new Set(value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean))]; }
export function videoLink(value: string): string | null {
  try { const url = new URL(value.trim()); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function exerciseVideos(exercise: JsonRecord): JsonRecord[] {
  const videos = asRecords(exercise.videos);
  const legacy = readText(exercise, ['videoUrl']);
  return videos.length ? videos : legacy ? [{ title: 'Video hướng dẫn', url: legacy, source: 'LINK' }] : [];
}
export function exercisePayload(draft: JsonRecord): JsonRecord {
  const name = readText(draft, ['name']);
  if (!name) throw new Error('Vui lòng nhập tên bài tập.');
  const muscleGroups = stringList(draft.muscleGroups);
  if (!muscleGroups.length) throw new Error('Vui lòng chọn ít nhất một nhóm cơ.');
  const level = readText(draft, ['level']);
  if (!Object.keys(LEVELS).includes(level)) throw new Error('Vui lòng chọn cấp độ.');
  const defaultTrackingType = readText(draft, ['defaultTrackingType']);
  if (!Object.keys(TRACKING).includes(defaultTrackingType)) throw new Error('Vui lòng chọn cách ghi nhận.');
  const videos = exerciseVideos(draft).map((video) => {
    const title = readText(video, ['title']); const url = videoLink(readText(video, ['url']));
    if (!title || title.length > 120 || !url || url.length > 2048) throw new Error('Video cần tên tối đa 120 ký tự và liên kết HTTP/HTTPS hợp lệ.');
    return { title, url, source: video.source === 'UPLOAD' ? 'UPLOAD' : 'LINK' };
  });
  if (videos.length > 20) throw new Error('Mỗi bài tập có tối đa 20 video.');
  return { name, muscleGroups, muscleGroup: muscleGroups.join(', '), level, defaultTrackingType, videos, videoUrl: videos[0]?.url || '', equipment: stringList(draft.equipment), description: readText(draft, ['description']), technique: readText(draft, ['technique']), commonMistakes: stringList(draft.commonMistakes), contraindications: stringList(draft.contraindications), variants: stringList(draft.variants) };
}
const DEFAULT_PRESCRIPTIONS: Record<string, JsonRecord> = {
  STRENGTH: { sets: 3, reps: '8-12', targetWeight: 0, targetRpe: 7, targetRir: 3, restSeconds: 90 },
  BODYWEIGHT: { sets: 3, reps: '10-15', addedWeight: 0, targetRpe: 7, targetRir: 3, restSeconds: 60 },
  CARDIO: { durationMinutes: 20, targetRpe: 6 },
  INTERVAL: { rounds: 6, workSeconds: 30, restSeconds: 30, targetRpe: 8 },
  MOBILITY: { durationMinutes: 5, reps: 10, side: 'BOTH', targetDiscomfort: 2 },
};
export function exerciseForPlan(exercise: JsonRecord): JsonRecord {
  const trackingType = readText(exercise, ['defaultTrackingType']);
  if (!recordId(exercise) || !DEFAULT_PRESCRIPTIONS[trackingType]) throw new Error('Bài tập chưa có cách ghi nhận. Hãy cập nhật bài tập trước khi thêm vào giáo án.');
  return { exerciseId: recordId(exercise), name: readText(exercise, ['name']), trackingType, prescription: { ...DEFAULT_PRESCRIPTIONS[trackingType] } };
}
