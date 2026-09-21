import { api } from '@/services/api/client';

export interface AdminUserParty {
  _id?: string;
  id?: string;
  fullName?: string;
  username?: string;
  phone?: string;
  email?: string;
  role?: string;
  status?: string;
  avatarUrl?: string;
}

// In-memory cache of resolved users to avoid duplicate network calls
const userCache = new Map<string, AdminUserParty>();

export const isMongoObjectId = (val: unknown): boolean =>
  typeof val === 'string' && /^[a-f0-9]{24}$/i.test(val.trim());

export const idOfUser = (value: unknown): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const id = obj._id || obj.id;
    return typeof id === 'string' ? id.trim() : '';
  }
  return '';
};

export const getUserInitials = (name?: string, fallback = 'U'): string => {
  if (!name || typeof name !== 'string') return fallback;
  const clean = name.trim();
  if (!clean) return fallback;
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getUserParty = (value: unknown): AdminUserParty => {
  if (!value) return {};
  if (typeof value === 'object') {
    const obj = value as AdminUserParty;
    const id = idOfUser(obj);
    if (id && userCache.has(id)) {
      return { ...userCache.get(id), ...obj };
    }
    return obj;
  }
  if (typeof value === 'string') {
    const id = value.trim();
    if (userCache.has(id)) {
      return userCache.get(id)!;
    }
    return { _id: id };
  }
  return {};
};

export const formatUserDisplay = (
  value: unknown,
  fallback = 'Tài khoản người dùng',
): string => {
  if (!value) return fallback;
  const party = getUserParty(value);
  const name = (party.fullName || '').trim();
  const user = (party.username || '').trim();
  const phone = (party.phone || '').trim();

  if (name && user && name.toLowerCase() !== user.toLowerCase()) {
    return `${name} (@${user})`;
  }
  if (name) return name;
  if (user) return `@${user}`;
  if (phone) return phone;

  const id = idOfUser(value);
  if (id && isMongoObjectId(id)) {
    return `${fallback} #${id.slice(-4)}`;
  }
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  return fallback;
};

export const formatUserSubtext = (value: unknown): string => {
  const party = getUserParty(value);
  const parts: string[] = [];
  if (party.phone) parts.push(party.phone);
  if (party.username && party.fullName) parts.push(`@${party.username}`);
  if (party.role) {
    const roleLabels: Record<string, string> = {
      ADMIN: 'Admin',
      SUPER_ADMIN: 'Super Admin',
      PT: 'HLV',
      CUSTOMER: 'Học viên',
    };
    parts.push(roleLabels[party.role] || party.role);
  }
  return parts.join(' · ');
};

/**
 * Asynchronously resolves unpopulated user references (e.g. userId, actorUserId)
 * across an array of records by querying /api/users in batch and caching results.
 */
export async function resolveAdminUsers<T extends Record<string, unknown>>(
  records: T[],
  userFields: (keyof T | string)[] = ['userId', 'actorUserId'],
): Promise<T[]> {
  const missingIds = new Set<string>();

  for (const record of records) {
    for (const field of userFields) {
      const val = record[field as string];
      const id = idOfUser(val);
      if (!id) continue;

      if (typeof val === 'object' && val !== null) {
        const obj = val as AdminUserParty;
        if (obj.fullName || obj.username || obj.phone) {
          userCache.set(id, obj);
          continue;
        }
      }

      if (userCache.has(id)) {
        continue;
      }
      missingIds.add(id);
    }
  }

  if (missingIds.size > 0) {
    try {
      let page = 1;
      let totalPages = 1;
      while (missingIds.size > 0 && page <= totalPages && page <= 5) {
        const res = await api.getPage<AdminUserParty>(
          `/api/users?page=${page}&limit=100`
        );
        for (const user of res.data || []) {
          const uId = idOfUser(user);
          if (uId) {
            userCache.set(uId, user);
            missingIds.delete(uId);
          }
        }
        totalPages = res.meta?.totalPages || 1;
        page += 1;
      }
    } catch {
      // Gracefully return records even if users endpoint fails
    }
  }

  // Populate records from cache
  return records.map((record) => {
    const updated = { ...record };
    for (const field of userFields) {
      const val = record[field as string];
      const id = idOfUser(val);
      if (id && userCache.has(id)) {
        const cached = userCache.get(id)!;
        const existingObj =
          typeof val === 'object' && val !== null
            ? (val as AdminUserParty)
            : {};
        (updated as Record<string, unknown>)[field as string] = {
          ...cached,
          ...existingObj,
          _id: id,
          fullName: existingObj.fullName || cached.fullName,
          username: existingObj.username || cached.username,
          phone: existingObj.phone || cached.phone,
          email: existingObj.email || cached.email,
          role: existingObj.role || cached.role,
        };
      }
    }
    return updated;
  });
}
