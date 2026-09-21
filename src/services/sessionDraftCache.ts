import AsyncStorage from '@react-native-async-storage/async-storage';
import type { JsonRecord } from '@/types/domain';
import type { SessionDraft } from './sessionDrafts';

export interface CachedSessionDraft {
  form: JsonRecord;
  plan: JsonRecord;
  idempotencyKey: string;
  revision: number;
  updatedAt: string;
}

const cacheKey = (ownerId: string, customerId: string) => `progress-session-cache:${ownerId}:${customerId}`;
const pending = new Map<string, Promise<void>>();

function enqueue(key: string, operation: () => Promise<void>) {
  const next = (pending.get(key) || Promise.resolve()).catch(() => {}).then(operation);
  pending.set(key, next);
  void next.finally(() => { if (pending.get(key) === next) pending.delete(key); }).catch(() => {});
  return next;
}

export async function readSessionDraftCache(ownerId: string, customerId: string): Promise<CachedSessionDraft | null> {
  const key = cacheKey(ownerId, customerId);
  await pending.get(key)?.catch(() => {});
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as CachedSessionDraft;
    if (!value || typeof value.idempotencyKey !== 'string' || typeof value.updatedAt !== 'string' ||
      !value.form || typeof value.form !== 'object' || !value.plan || typeof value.plan !== 'object' ||
      !Number.isInteger(value.revision)) return null;
    return value;
  } catch { return null; }
}

export function writeSessionDraftCache(ownerId: string, customerId: string, draft: CachedSessionDraft) {
  const key = cacheKey(ownerId, customerId);
  return enqueue(key, () => AsyncStorage.setItem(key, JSON.stringify(draft)));
}

export function clearSessionDraftCache(ownerId: string, customerId: string) {
  const key = cacheKey(ownerId, customerId);
  return enqueue(key, () => AsyncStorage.removeItem(key));
}

export function restoreSessionDraft(server: SessionDraft | null, cached: CachedSessionDraft | null) {
  if (!cached) return { draft: server, restored: false };
  if (server && (cached.idempotencyKey !== server.idempotencyKey ||
    Date.parse(cached.updatedAt) <= Date.parse(server.updatedAt))) return { draft: server, restored: false };
  return {
    draft: {
      ...server,
      _id: server?._id || '',
      form: cached.form,
      plan: cached.plan,
      idempotencyKey: cached.idempotencyKey,
      revision: server?.revision ?? cached.revision,
      pendingPayload: server?.pendingPayload || null,
      updatedAt: cached.updatedAt,
    } satisfies SessionDraft,
    restored: true,
  };
}
