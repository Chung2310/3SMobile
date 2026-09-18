export function isAdminRole(role?: string): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}
export function canAccessAdmin(user?: { role?: string; isAdmin?: boolean; [key: string]: unknown } | null): boolean {
  if (!user) return false;
  return isAdminRole(user.role) || user.role === 'SUPERADMIN' || Boolean(user.isAdmin);
}
export function homeForRole(role?: string) {
  return isAdminRole(role) ? '/(app)/admin' as const : '/(app)/(tabs)' as const;
}
interface Identity { id?: string; _id?: string; role?: string }
export function canEditAccount(actor: Identity, target: Identity): boolean {
  if (!isAdminRole(actor.role)) return false;
  if (target.role === 'SUPER_ADMIN') return actor.role === 'SUPER_ADMIN' && Boolean(actor._id || actor.id) && (actor._id || actor.id) === (target._id || target.id);
  if (target.role === 'ADMIN') return actor.role === 'SUPER_ADMIN';
  return target.role === 'PT' || target.role === 'CUSTOMER';
}
export function canDeleteAccount(actor: Identity, target: Identity): boolean {
  return target.role !== 'SUPER_ADMIN' && canEditAccount(actor, target);
}
