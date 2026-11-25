import { useState } from 'react';
import { BookOpen, Lock, User as UserIcon, ShieldCheck } from 'lucide-react';
import { apiFetch, setToken, User } from '../lib/api';

interface Props {
  onSuccess: (user: User) => void;
}

export function LoginPage({ onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'setup') {
        await apiFetch('/api/auth/setup', {
          method: 'POST',
          body: JSON.stringify({ name, username, password }),
        });
        setInfo('Akun Admin awal berhasil dibuat! Silakan masuk.');
        setMode('login');
      } else {
        const res = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        });
        setToken(res.token);
        onSuccess(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Ruang Belajar</h1>
            <p className="text-sm text-slate-500">Portal Materi & Tugas Sekolah</p>
          </div>
        </div>

        <div className="flex rounded-lg bg-slate-100 p-1 mb-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`flex-1 py-2 rounded-md transition ${
              mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('setup');
              setError('');
            }}
            className={`flex-1 py-2 rounded-md transition ${
              mode === 'setup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
            }`}
          >
            Setup Admin Awal
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'setup' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nama Lengkap Admin
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Operator Sekolah"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition cursor-pointer"
          >
            {loading ? 'Memproses...' : mode === 'setup' ? 'Buat Akun Admin' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
