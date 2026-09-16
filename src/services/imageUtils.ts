import { API_BASE_URL } from '@/services/config';

/**
 * Chuan hoa duong dan anh:
 * - Neu la null/undefined/rong -> tra ve null
 * - Neu da la URL tuyet doi (http://, https://, data:, blob:) -> giu nguyen
 * - Neu la duong dan tuong doi (/uploads/...) -> ghep voi API_BASE_URL
 */
export function resolveImageUrl(url?: string | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
