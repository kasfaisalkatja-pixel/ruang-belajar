import { useState } from 'react';
import { Sparkles, CheckCircle2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { apiFetch, User } from '../lib/api';
import { AppLogo } from './AppLogo';

interface Props {
  user: User;
  onPasswordChanged: (updatedUser: User) => void;
  onLogout: () => void;
}

export function ChangePasswordScreen({ user, onPasswordChanged, onLogout }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword.trim().length < 4) {
      setError('Password baru minimal 4 karakter agar aman.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password belum sama. Silakan periksa kembali.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<{ user: User }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      onPasswordChanged(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-900 via-violet-900 to-fuchsia-900 p-4">
      <div className="pointer-events-none absolute top-12 left-16 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute bottom-10 right-12 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl animate-float-reverse" />

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-white/30 p-8 space-y-5 animate-scale-in">
        <div className="text-center space-y-2">
          <div className="flex justify-center animate-rocket">
            <AppLogo className="w-16 h-16 rounded-2xl" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> Login Pertama Siswa
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">Halo, {user.name}!</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Demi keamanan akunmu, silakan buat <strong>Password Baru</strong> yang mudah diingat
            (menggantikan password awal NISN{' '}
            <span className="font-mono font-semibold text-indigo-600">{user.identityNumber}</span>).
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password Baru Kamu
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 4 karakter (bukan NISN)"
                className="w-full px-3.5 py-2.5 pr-10 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ulangi Password Baru
            </label>
            <input
              type={showPwd ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password baru"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Untuk login berikutnya, gunakan <strong>Nama Lengkapmu</strong> dan{' '}
              <strong>Password Baru</strong> ini. Jika suatu saat lupa password, minta Bapak/Ibu
              Admin untuk me-reset kembali ke NISN.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Menyimpan...' : 'Simpan Password & Masuk Ruang Belajar'}
          </button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-slate-400 hover:text-rose-600 cursor-pointer"
          >
            Keluar dari akun ini
          </button>
        </div>
      </div>
    </div>
  );
}
