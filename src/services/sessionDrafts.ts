import type { JsonRecord } from '@/types/domain';

export interface SessionDraft {
  _id: string;
  revision: number;
  idempotencyKey: string;
  form: JsonRecord;
  plan: JsonRecord;
  pendingPayload: JsonRecord | null;
  updatedAt: string;
}
export function sessionDraftPath(customerId: string, revision?: number) {
  if (!customerId) throw new Error('Chưa chọn khách hàng.');
  return `/api/workout-session-drafts/${encodeURIComponent(customerId)}${revision === undefined ? '' : `?revision=${revision}`}`;
}
export function draftPlan(plan: JsonRecord): JsonRecord {
  return { _id: plan._id || plan.id, version: plan.version, title: plan.title, lifecycleStatus: plan.lifecycleStatus, sessions: plan.sessions || [] };
}
export function matchesDraftPlan(saved: JsonRecord, current: JsonRecord): boolean {
  const signature = (plan: JsonRecord) => JSON.stringify([plan._id || plan.id, plan.version, plan.sessions || []]);
  return signature(saved) === signature(current) && current.lifecycleStatus === 'ACTIVE';
}
export function sessionDraftBody(form: JsonRecord, plan: JsonRecord, idempotencyKey: string, revision: number, pendingPayload: JsonRecord | null = null) {
  // Keep incomplete inputs verbatim: only the final workout endpoint validates performance.
  return { revision, idempotencyKey, form, plan: draftPlan(plan), pendingPayload };
}
