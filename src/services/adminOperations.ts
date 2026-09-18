import type { AdminRecord, Field } from './adminResources';

export interface FeatureConfiguration {
  key: string;
  enabled: boolean;
  roles: string[];
  pilotUserIds: string[];
}
export const featureNames: Record<string, string> = {
  OCR_INBODY: 'Quét InBody', ROADMAP: 'Lộ trình huấn luyện', EXERCISE_LIBRARY: 'Thư viện bài tập',
  PROGRESS: 'Tiến độ tập luyện', CARE: 'Chăm sóc khách hàng', DASHBOARD: 'Bảng điều khiển',
  NUTRITION_AI: 'Dinh dưỡng AI', KNOWLEDGE_BASE: 'Kho tri thức', PT_ASSISTANT: 'Trợ lý PT',
};
export function featurePayload(flag: FeatureConfiguration) {
  if (flag.roles.some(role => !['ADMIN', 'PT', 'CUSTOMER'].includes(role))) throw new Error('Vai trò không hợp lệ.');
  if (flag.pilotUserIds.some(id => !/^[a-f\d]{24}$/i.test(id))) throw new Error('Mã tài khoản thử nghiệm không hợp lệ.');
  return { enabled: flag.enabled, roles: [...new Set(flag.roles)], pilotUserIds: [...new Set(flag.pilotUserIds)] };
}
export function batchTransferPayload(customers: AdminRecord[], toPtId: string, reason: string) {
  const customerIds = [...new Set(customers.map(c => String(c._id || c.id || '')).filter(Boolean))];
  if (!customerIds.length) throw new Error('Vui lòng chọn khách hàng cần chuyển giao.');
  if (!toPtId) throw new Error('Vui lòng chọn PT nhận.');
  if (!reason.trim()) throw new Error('Vui lòng nhập lý do chuyển giao.');
  if (customers.some(c => {
    const pt = c.assignedPtId;
    return (typeof pt === 'object' && pt ? String((pt as AdminRecord)._id || (pt as AdminRecord).id) : pt) === toPtId;
  })) throw new Error('Có khách hàng đã thuộc PT nhận. Hãy bỏ chọn khách hàng đó.');
  return { customerIds, toPtId, reason: reason.trim() };
}

export interface FoodImage extends AdminRecord {
  _id: string; name: string; imageUrl: string; category?: string; keywords?: string[];
  source: 'AI' | 'UPLOAD' | 'SEED'; prompt?: string; calories?: number; protein?: number;
  carbs?: number; fat?: number; usageCount: number; createdAt?: string;
}
export const foodCategories = [
  { value: 'PROTEIN', label: 'Đạm (Protein)' }, { value: 'CARB', label: 'Tinh bột' },
  { value: 'FAT', label: 'Chất béo tốt' }, { value: 'VEGGIE', label: 'Rau củ / Salad' },
  { value: 'MEAL', label: 'Bữa chính' }, { value: 'SNACK', label: 'Bữa phụ' },
  { value: 'DRINK', label: 'Sinh tố / Nước' }, { value: 'OTHER', label: 'Khác' },
];
export const foodSources = [
  { value: 'AI', label: 'AI tạo' }, { value: 'UPLOAD', label: 'Tải lên' }, { value: 'SEED', label: 'Ảnh có sẵn' },
];
export const foodFields: Field[] = [
  { key: 'name', label: 'Tên món ăn', required: true },
  { key: 'category', label: 'Nhóm món ăn', options: foodCategories, default: 'OTHER' },
  { key: 'keywords', label: 'Từ khóa (ngăn cách bằng dấu phẩy)', multiline: true },
  { key: 'calories', label: 'Năng lượng (kcal)', numeric: true, min: 0 },
  { key: 'protein', label: 'Đạm (g)', numeric: true, min: 0 },
  { key: 'carbs', label: 'Tinh bột (g)', numeric: true, min: 0 },
  { key: 'fat', label: 'Chất béo (g)', numeric: true, min: 0 },
  { key: 'prompt', label: 'Mô tả ảnh / Gợi ý AI', multiline: true },
];
export const imageRatios = [
  { value: '4:3', label: 'Ngang 4:3' }, { value: '1:1', label: 'Vuông 1:1' },
  { value: '16:9', label: 'Ngang 16:9' }, { value: '3:4', label: 'Dọc 3:4' },
];
export function foodImagePath(page: number, search: string, source: string, category: string) {
  const params = new URLSearchParams({ page: String(page), limit: '12' });
  if (search.trim()) params.set('search', search.trim());
  if (source) params.set('source', source);
  if (category) params.set('category', category);
  return `/api/food-images?${params}`;
}
export function foodImagePayload(values: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  const name = String(values.name || '').trim();
  if (!name) throw new Error('Vui lòng nhập tên món ăn.');
  result.name = name;
  for (const key of ['category', 'prompt', 'source']) if (values[key] !== undefined) result[key] = values[key];
  if (values.keywords !== undefined) result.keywords = String(values.keywords).split(/[,;\n]/).map(s => s.trim()).filter(Boolean).join(',');
  if (values.imageUrl) {
    const url = String(values.imageUrl).trim();
    if (!/^https?:\/\//i.test(url) && !/^\/uploads\//.test(url)) throw new Error('Đường dẫn ảnh phải là URL HTTP/HTTPS hoặc ảnh đã tải lên.');
    result.imageUrl = url;
  }
  for (const key of ['calories', 'protein', 'carbs', 'fat', 'usageCount']) {
    if (values[key] === undefined || values[key] === '') continue;
    const value = Number(values[key]);
    if (!Number.isFinite(value) || value < 0 || (key === 'usageCount' && !Number.isInteger(value))) throw new Error('Chỉ số dinh dưỡng và lượt sử dụng phải là số không âm.');
    result[key] = value;
  }
  return result;
}
export const MAX_FOOD_IMAGE_BYTES = 10 * 1024 * 1024;
export function validateFoodImageFile(type: string, size?: number) {
  const normalized = type.toLowerCase().replace('image/jpg', 'image/jpeg');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(normalized)) throw new Error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP.');
  if (size !== undefined && (!Number.isFinite(size) || size <= 0 || size > MAX_FOOD_IMAGE_BYTES)) throw new Error('Ảnh phải có dung lượng lớn hơn 0 và không vượt quá 10 MB.');
  return normalized;
}
