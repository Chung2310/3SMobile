type RecordData = Record<string, unknown>;
type TrainerPage = { data: RecordData[]; meta?: { totalPages?: number } };
const trainerFields = ['fromPtId', 'toPtId'] as const;
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const object = (value: unknown): RecordData => value && typeof value === 'object' ? value as RecordData : {};
const idOf = (value: unknown) => typeof value === 'string' ? value : text(object(value)._id) || text(object(value).id);

/** Resolve unpopulated trainer references without exposing database IDs as names. */
export async function resolveTransferTrainers<T extends RecordData>(
  transfers: T[],
  fetchPage: (page: number) => Promise<TrainerPage>,
): Promise<T[]> {
  const missing = new Set<string>();
  const trainers = new Map<string, RecordData>();
  for (const transfer of transfers) {
    for (const field of trainerFields) {
      const value = transfer[field];
      const id = idOf(value);
      if (id && text(object(value).fullName)) trainers.set(id, object(value));
      else if (id) missing.add(id);
    }
  }
  for (const id of trainers.keys()) missing.delete(id);
  let page = 1;
  let pages = 1;
  while (missing.size && page <= pages) {
    try {
      const result = await fetchPage(page);
      for (const trainer of result.data || []) {
        const id = idOf(trainer);
        if (id) {
          trainers.set(id, trainer);
          missing.delete(id);
        }
      }
      pages = result.meta?.totalPages || 1;
      page += 1;
    } catch {
      // Keep transfer history available even when the directory is unavailable.
      break;
    }
  }
  return transfers.map((transfer) => {
    const resolved = { ...transfer };
    for (const field of trainerFields) {
      const value = transfer[field];
      if (!value) continue;
      const existing = object(value);
      const trainer = trainers.get(idOf(value));
      Object.assign(resolved, { [field]: {
        ...trainer,
        ...existing,
        _id: idOf(value),
        fullName: text(existing.fullName) || text(trainer?.fullName)
          || text(existing.username) || text(trainer?.username) || 'Chưa có thông tin HLV',
      } });
    }
    return resolved;
  });
}
