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
  GraduationCap,
  Star,
} from 'lucide-react';
import { apiFetch, setToken, User } from '../lib/api';
import { AppLogo } from '../components/AppLogo';

interface Props {
  onSuccess: (user: User) => void;
  sessionMessage?: string;
}

export function LoginPage({ onSuccess, sessionMessage }: Props) {
  const [mode, setMode] = useState<'student' | 'staff' | 'setup'>('student');
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
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
          body: JSON.stringify({ name, username: identifier, password }),
        });
        setInfo(`Akun Admin (@${res.username}) berhasil dibuat! Silakan masuk.`);
        setInitialized(true);
        setMode('staff');
      } else {
        const res = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            identifier,
            password,
            loginType: mode === 'student' ? 'student' : 'staff',
          }),
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
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-violet-950 to-slate-900 p-4">
      {/* Animated floating background orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl animate-float-reverse" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-5 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden animate-fade-up">
        {/* Left Hero Column */}
        <div className="relative lg:col-span-2 animate-gradient-hero bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-8 text-white flex flex-col justify-between overflow-hidden">
          <Star className="pointer-events-none absolute top-6 right-8 w-5 h-5 text-amber-300 animate-twinkle" />
          <Star
            className="pointer-events-none absolute bottom-24 right-6 w-4 h-4 text-sky-200 animate-twinkle"
            style={{ animationDelay: '1s' }}
          />

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Ruang Belajar Interaktif
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="animate-rocket">
                <AppLogo className="w-14 h-14 rounded-2xl" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Ruang Belajar</h1>
                <p className="text-xs text-indigo-100">Portal Materi & Tugas Sekolah</p>
              </div>
            </div>
            <p className="text-sm text-indigo-100/95 leading-relaxed mt-4">
              Belajar jadi lebih seru! Siswa cukup masuk menggunakan <strong>Nama Lengkap</strong>{' '}
              dan <strong>NISN</strong> untuk membaca modul PDF/Word dan mengumpulkan tugas.
            </p>
          </div>

          <div className="space-y-3 mt-8 pt-6 border-t border-white/20 text-xs">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-4 h-4 text-amber-300 shrink-0" />
              <span>Siswa masuk dengan Nama & NISN (tanpa repot menghafal email)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-sky-200 shrink-0" />
              <span>Modul PDF, Microsoft Word (.docx), PPT & Video Pembelajaran</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Pantau progres belajar & rekap nilai langsung di akunmu</span>
            </div>
          </div>
        </div>

        {/* Right Form Column */}
        <div className="lg:col-span-3 p-8 sm:p-10">
          {mode !== 'setup' && (
            <div className="flex rounded-2xl bg-slate-100 p-1.5 mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('student');
                  setError('');
                  setIdentifier('');
                  setPassword('');
                }}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
                  mode === 'student'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4" /> Masuk Siswa
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('staff');
                  setError('');
                  setIdentifier('');
                  setPassword('');
                }}
                className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer ${
                  mode === 'staff'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4" /> Masuk Guru / Admin
              </button>
            </div>
          )}

          <div className="mb-5">
            <h2 className="text-xl font-extrabold text-slate-900">
              {mode === 'setup'
                ? 'Setup Admin Pertama'
                : mode === 'student'
                  ? 'Masuk Ruang Belajar Siswa'
                  : 'Portal Guru & Operator'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === 'setup'
                ? 'Buat akun Operator/Admin utama untuk mengelola sekolah'
                : mode === 'student'
                  ? 'Gunakan Nama Lengkap dan NISN (untuk login pertama) atau Password Barumu'
                  : 'Masuk menggunakan username dan password Guru / Admin'}
            </p>
          </div>

          {error && (
            <div className="animate-scale-in mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}
          {info && (
            <div className="animate-scale-in mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              {info}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'setup' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
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
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {mode === 'student' ? 'Nama Lengkap Siswa' : 'Username'}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    mode === 'student'
                      ? 'Ketik nama sesuai daftar kelas (atau NISN)'
                      : 'Masukkan username Anda'
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {mode === 'student' ? 'NISN / Password Siswa' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === 'student'
                      ? 'Masukkan NISN (login pertama) atau Passwordmu'
                      : '••••••••'
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {mode === 'student' && (
                <p className="text-[11px] text-slate-400 mt-1.5">
                  * Login pertama kali? Isi kolom kedua dengan <strong>NISN</strong> kamu, nanti
                  kamu akan diarahkan membuat password baru.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                'Memproses...'
              ) : (
                <>
                  {mode === 'setup' ? 'Buat Akun Admin' : 'Masuk Sekarang'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {initialized === false && mode !== 'setup' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode('setup')}
                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                Setup Admin Awal Sekolah →
              </button>
            </div>
          )}
          {mode === 'setup' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode('student')}
                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
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
