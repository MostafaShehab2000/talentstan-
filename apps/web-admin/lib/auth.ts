import Cookies from 'js-cookie';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  tenantId: string | null;
  profilePhotoUrl?: string;
}

export function getUser(): AuthUser | null {
  const raw = Cookies.get('user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setSession(accessToken: string, refreshToken: string, user: AuthUser) {
  Cookies.set('access_token', accessToken, { expires: 1 / 96 }); // 15 min
  Cookies.set('refresh_token', refreshToken, { expires: 7 });
  Cookies.set('user', JSON.stringify(user), { expires: 7 });
}

export function clearSession() {
  Cookies.remove('access_token');
  Cookies.remove('refresh_token');
  Cookies.remove('user');
}

export function isSuperAdmin(user: AuthUser | null) {
  return user?.roles.includes('super_admin') ?? false;
}

export function isHRAdmin(user: AuthUser | null) {
  return user?.roles.some((r) => ['hr_admin', 'super_admin'].includes(r)) ?? false;
}
