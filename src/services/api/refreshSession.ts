import { API_BASE_URL } from '@/services/config';
import { clearStoredSession, getStoredSession, updateSessionIfCurrent } from '@/services/sessionStore';
import type { Session } from '@/types/domain';

const pending = new Map<string, Promise<Session | null>>();
export function canRefresh(path: string) {
  return !['/api/auth/login', '/api/auth/register-pt', '/api/auth/refresh', '/api/auth/logout'].includes(path.split('?')[0]);
}

// Share one rotation across JSON requests, profile requests and multipart uploads.
export async function refreshRejectedSession(rejected: Session): Promise<Session | null> {
  const current = await getStoredSession();
  if (!current || current.user.id !== rejected.user.id) return null;
  if (current.token !== rejected.token) return current;
  if (!current.refreshToken) {
    await clearStoredSession(current.token);
    return null;
  }
  const existing = pending.get(current.token);
  if (existing) return existing;
  const task = (async () => {
    const response = await fetch(`${API_BASE_URL.replace(/:(8008|8089)/g, ':3008')}/api/auth/refresh`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (response.status === 401 || response.status === 403) {
      await clearStoredSession(current.token);
      return null;
    }
    if (!response.ok) throw new Error('Không thể gia hạn phiên lúc này. Vui lòng thử lại.');
    const json = await response.json();
    const payload = json?.data || json;
    if (typeof payload?.token !== 'string' || typeof payload?.refreshToken !== 'string') throw new Error('Phản hồi gia hạn phiên không hợp lệ.');
    return updateSessionIfCurrent(current.token, stored => ({
      ...stored, token: payload.token, refreshToken: payload.refreshToken,
      user: { ...stored.user, ...(payload.user?.id === stored.user.id ? payload.user : {}) },
    }));
  })();
  pending.set(current.token, task);
  try { return await task; }
  finally { if (pending.get(current.token) === task) pending.delete(current.token); }
}
