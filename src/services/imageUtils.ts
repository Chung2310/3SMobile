import { API_BASE_URL } from '@/services/config';

/**
 * Chuẩn hoá đường dẫn ảnh:
 * - Nếu là null/undefined/rỗng -> trả về null
 * - Nếu bắt đầu bằng // -> thêm https:
 * - Nếu đã là URL tuyệt đối (http://, https://, data:, blob:) -> giữ nguyên hoặc chuẩn hoá host
 * - Nếu là đường dẫn tương đối (/uploads/...) -> ghép với API_BASE_URL
 */
export function resolveImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    if (trimmed.includes('localhost:3008')) {
      return trimmed.replace('http://localhost:3008', API_BASE_URL);
    }
    if (trimmed.includes('127.0.0.1:3008')) {
      return trimmed.replace('http://127.0.0.1:3008', API_BASE_URL);
    }
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
