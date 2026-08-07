export const VALID_ROLES = new Set(['user', 'agent', 'caretaker', 'houseOwner', 'admin']);

export const normalizeRole = (role) => {
  const raw = String(role || '').trim();
  const lowered = raw.toLowerCase();
  if (lowered === 'houseowner') return 'houseOwner';
  if (lowered === 'admin') return 'admin';
  if (lowered === 'agent') return 'agent';
  if (lowered === 'caretaker') return 'caretaker';
  if (lowered === 'user') return 'user';
  return raw;
};

export const normalizeRoles = (roles) => {
  if (!roles) return [];
  const raw = Array.isArray(roles) ? roles : [roles];
  return raw
    .map((value) => normalizeRole(value))
    .filter((value) => VALID_ROLES.has(value));
};

export const mergeRoles = (...sources) => {
  const set = new Set();
  sources.forEach((source) => {
    normalizeRoles(source).forEach((role) => set.add(role));
  });
  if (!set.size) set.add('user');
  if (!set.has('user')) set.add('user');
  return Array.from(set);
};

export const derivePrimaryRole = (roles, fallback = 'user') => {
  const set = new Set(normalizeRoles(roles));
  if (set.has('admin')) return 'admin';
  if (set.has('houseOwner')) return 'houseOwner';
  if (set.has('agent')) return 'agent';
  if (set.has('caretaker')) return 'caretaker';
  if (set.has('user')) return 'user';
  return fallback || 'user';
};

export const getRolesFromMetadata = (metadata) => {
  if (!metadata) return [];
  const rolesArray = normalizeRoles(metadata.roles);
  if (rolesArray.length) return rolesArray;
  return normalizeRoles(metadata.role);
};

export const getRolesFromClerkUser = (clerkUser) => {
  return getRolesFromMetadata(clerkUser?.publicMetadata);
};

export const hasRole = (user, role) => {
  const target = normalizeRole(role);
  if (!target) return false;
  const roles = mergeRoles(user?.roles, user?.role);
  return roles.includes(target);
};
