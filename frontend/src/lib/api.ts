const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

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
    if (res.status === 401 && path !== '/api/auth/login') {
      setToken(null);
      window.dispatchEvent(new CustomEvent('rb:unauthorized'));
    }
    throw new Error(data.error || `Terjadi kesalahan (${res.status})`);
  }
  return data as T;
}

export async function fetchProtectedBlob(fileKey: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/learning/files/${encodeURIComponent(fileKey)}?inline=1`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new Error('Gagal memuat file lampiran');
  }
  return res.blob();
}

export async function downloadProtectedFile(fileKey: string, fileName?: string | null) {
  const blob = await fetchProtectedBlob(fileKey);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'dokumen';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export interface FileBadgeMeta {
  label: string;
  colorClass: string;
  isPdf: boolean;
  isImage: boolean;
}

export function getFileBadgeMeta(fileName?: string | null): FileBadgeMeta {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) {
    return {
      label: 'PDF',
      colorClass: 'bg-rose-100 text-rose-700 border-rose-200',
      isPdf: true,
      isImage: false,
    };
  }
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
    return {
      label: 'WORD',
      colorClass: 'bg-blue-100 text-blue-700 border-blue-200',
      isPdf: false,
      isImage: false,
    };
  }
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
    return {
      label: 'PPT',
      colorClass: 'bg-amber-100 text-amber-700 border-amber-200',
      isPdf: false,
      isImage: false,
    };
  }
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) {
    return {
      label: 'EXCEL',
      colorClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      isPdf: false,
      isImage: false,
    };
  }
  if (/\.(png|jpg|jpeg|webp|gif)$/.test(lower)) {
    return {
      label: 'GAMBAR',
      colorClass: 'bg-purple-100 text-purple-700 border-purple-200',
      isPdf: false,
      isImage: true,
    };
  }
  return {
    label: 'DOKUMEN',
    colorClass: 'bg-slate-100 text-slate-700 border-slate-200',
    isPdf: false,
    isImage: false,
  };
}
