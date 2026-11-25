import { useEffect, useState } from 'react';
import {
  BookOpen,
  Lock,
  User as UserIcon,
  ShieldCheck,
  FileText,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { apiFetch, setToken, User } from '../lib/api';

interface Props {
  onSuccess: (user: User) => void;
  sessionMessage?: string;
}

export function LoginPage({ onSuccess, sessionMessage }: Props) {
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(sessionMessage || '');
  const [info, setInfo] = useState('');

  useEffect(() => {
    apiFetch<{ initialized: boolean }>('/api/auth/status')
      .then((res) => {
        setInitialized(res.initialized);
        if (!res.initialized) setMode('setup');
      })
      .catch(() => setInitialized(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (mode === 'setup') {
        const res = await apiFetch<{ username: string }>('/api/auth/setup', {
          method: 'POST',
          body: JSON.stringify({ name, username, password }),
        });
        setInfo(`Akun Admin (@${res.username}) berhasil dibuat! Silakan masuk.`);
        setInitialized(true);
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
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-900 p-4">
      {/* Animated floating background orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl animate-float-reverse" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-5 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-fade-up">
        {/* Left Hero Column */}
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-600 p-8 text-white flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Portal Belajar Digital
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Ruang Belajar</h1>
                <p className="text-xs text-indigo-100">Materi, Tugas & Progres Siswa</p>
              </div>
            </div>
            <p className="text-sm text-indigo-100/90 leading-relaxed mt-4">
              Kirim modul belajar dan lembar tugas dalam format <strong>PDF</strong> maupun{' '}
              <strong>Microsoft Word</strong> langsung ke akun masing-masing siswa dengan mudah.
            </p>
          </div>

          <div className="space-y-3 mt-8 pt-6 border-t border-white/15 text-xs">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-sky-200 shrink-0" />
              <span>Dukungan penuh dokumen PDF, Word (.docx), PPT & Video</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Notifikasi tugas otomatis masuk ke akun tiap siswa</span>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-3 p-8 sm:p-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {mode === 'setup' ? 'Setup Admin Pertama' : 'Selamat Datang Kembali'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'setup'
                  ? 'Buat akun Operator/Admin utama untuk mengelola sekolah'
                  : 'Masuk menggunakan akun Siswa, Guru, atau Admin'}
              </p>
            </div>
          </div>

          {initialized === false && (
            <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                }}
                className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                  mode === 'login' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
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
                className={`flex-1 py-2 rounded-lg transition cursor-pointer ${
                  mode === 'setup' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                Setup Admin Awal
              </button>
            </div>
          )}

          {error && (
            <div className="animate-scale-in mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}
          {info && (
            <div className="animate-scale-in mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'setup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap Admin
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Operator Sekolah"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                'Memproses...'
              ) : (
                <>
                  {mode === 'setup' ? 'Buat Akun Admin' : 'Masuk ke Ruang Belajar'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {initialized && mode === 'login' && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setMode('setup')}
                className="text-[11px] text-slate-400 hover:text-indigo-600 cursor-pointer"
              >
                Belum pernah membuat Admin sama sekali? Klik untuk Setup Awal
              </button>
            </div>
          )}
          {mode === 'setup' && initialized && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs font-medium text-indigo-600 hover:underline cursor-pointer"
              >
                ← Kembali ke Halaman Masuk
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
