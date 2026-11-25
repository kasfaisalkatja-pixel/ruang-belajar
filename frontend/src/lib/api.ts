const API_BASE = import.meta.env.VITE_API_URL || '';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  identityNumber?: string | null;
}

export function getToken(): string | null {
  return localStorage.getItem('rb_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('rb_token', token);
  else localStorage.removeItem('rb_token');
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Terjadi kesalahan (${res.status})`);
  }
  return data as T;
}

export async function downloadProtectedFile(fileKey: string, fileName?: string | null) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/learning/files/${encodeURIComponent(fileKey)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error('Gagal mengunduh file');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'file';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
