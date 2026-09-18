import type { CustomerJourney } from '../types/domain';
import type {
  Roadmap,
  RoadmapEvaluationCheckpoint,
  RoadmapNutritionStrategy,
  RoadmapSessionBudget,
} from '../types/roadmap';

/**
 * Trích xuất lộ trình đang hiệu lực (active) từ CustomerJourney.
 * Ưu tiên lộ trình đã PUBLISHED; fallback về lộ trình đầu tiên nếu có.
 */
export function getActiveRoadmap(journey: CustomerJourney | null | undefined): Roadmap | null {
  if (!journey?.roadmaps || !Array.isArray(journey.roadmaps) || journey.roadmaps.length === 0) {
    return null;
  }
  const roadmaps = journey.roadmaps as Roadmap[];
  const published = roadmaps.find((r: Roadmap) => r && r.status === 'PUBLISHED');
  return published || roadmaps[0] || null;
}

/**
 * Định dạng dòng tóm tắt Macros (Protein / Carbs / Fat).
 */
export function formatMacroBreakdown(nutrition?: RoadmapNutritionStrategy | null): string {
  if (!nutrition) return '';
  const p = typeof nutrition.proteinGrams === 'number' ? `${nutrition.proteinGrams}g` : '—';
  const c = typeof nutrition.carbsGrams === 'number' ? `${nutrition.carbsGrams}g` : '—';
  const f = typeof nutrition.fatGrams === 'number' ? `${nutrition.fatGrams}g` : '—';
  return `P: ${p} • C: ${c} • F: ${f}`;
}

/**
 * Làm sạch tên Phase nếu có tiền tố "Phase X:" hoặc "Phase X -"
 */
export function cleanPhaseName(name: string, order: number): string {
  if (!name) return `Giai đoạn ${order}`;
  const regex = new RegExp(`^Phase\\s*${order}\\s*[:\\-]\\s*`, 'i');
  const cleaned = name.replace(regex, '').trim();
  return cleaned || name;
}

/**
 * Định dạng chuỗi thời lượng Phase (số tuần và số tuần chi tiết).
 */
export function formatPhaseDuration(durationWeeks: number, weekItemsCount: number): string {
  const weeks = durationWeeks > 0 ? durationWeeks : weekItemsCount;
  return `${weeks} tuần • ${weekItemsCount} tuần chi tiết`;
}

/**
 * Chuẩn hóa chuỗi ngân sách thời gian một buổi tập.
 */
export function parseRoadmapSessionBudget(budget?: RoadmapSessionBudget | null): string | null {
  if (!budget) return null;
  const { warmupMinutes, strengthMinutes, cardioMinutes, cooldownMinutes } = budget;
  if (!warmupMinutes && !strengthMinutes && !cardioMinutes && !cooldownMinutes) return null;
  return `Phân bổ mỗi buổi: Khởi động ${warmupMinutes || 0}p · Kháng lực ${strengthMinutes || 0}p · Cardio ${cardioMinutes || 0}p · Hồi phục ${cooldownMinutes || 0}p`;
}

/**
 * Lấy danh sách các mốc đánh giá (Checkpoints) được sắp xếp theo số tuần.
 */
export function getRoadmapCheckpoints(roadmap: Roadmap | null | undefined): RoadmapEvaluationCheckpoint[] {
  const checkpoints = roadmap?.strategy?.checkpoints;
  if (!Array.isArray(checkpoints)) return [];
  return [...checkpoints].sort((a, b) => (a.week || 0) - (b.week || 0));
}
