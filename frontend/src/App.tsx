import { useEffect, useState } from 'react';
import { Rocket, LogOut } from 'lucide-react';
import { apiFetch, getToken, setToken, User } from './lib/api';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { ChangePasswordScreen } from './components/ChangePasswordScreen';

const ROLE_LABEL: Record<User['role'], string> = {
  admin: 'Admin / Operator Sekolah',
  teacher: 'Guru Pengajar',
  student: 'Siswa Aktif',
};

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionMessage, setSessionMessage] = useState('');

  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setSessionMessage('Sesi Anda sebelumnya telah berakhir. Silakan masuk kembali.');
    };
    window.addEventListener('rb:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('rb:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }
    apiFetch<{ user: User }>('/api/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  function handleLogout() {
    setToken(null);
    setUser(null);
    setSessionMessage('');
  }

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-50 via-white to-violet-50 text-slate-700">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center animate-rocket shadow-xl">
          <Rocket className="w-7 h-7" />
        </div>
        <span className="text-sm font-bold">Menyiapkan Ruang Belajar...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onSuccess={(u) => {
          setSessionMessage('');
          setUser(u);
        }}
        sessionMessage={sessionMessage}
      />
    );
  }

  // Redirect student on first login (or after Admin resets password back to NISN) to create a new password
  if (user.mustChangePassword) {
    return (
      <ChangePasswordScreen
        user={user}
        onPasswordChanged={(updated) => setUser(updated)}
        onLogout={handleLogout}
      />
    );
  }

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-indigo-50/50 via-slate-50 to-sky-50/40 overflow-x-hidden">
      {/* Subtle animated ambient blobs inside the app */}
      <div className="pointer-events-none fixed top-20 -left-24 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl animate-float-slow" />
      <div className="pointer-events-none fixed bottom-10 -right-24 h-80 w-80 rounded-full bg-fuchsia-400/10 blur-3xl animate-float-reverse" />

      <header className="bg-white/85 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-20 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 animate-rocket">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 leading-tight tracking-tight flex items-center gap-2">
                Ruang Belajar
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Aktif
                </span>
              </div>
              <div className="text-[11px] font-semibold text-indigo-600">
                {ROLE_LABEL[user.role]}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-indigo-50/70 border border-indigo-100 px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center justify-center">
                {initials}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">{user.name}</div>
                <div className="text-[11px] text-slate-500">
                  {user.role === 'student'
                    ? `NISN: ${user.identityNumber || user.username}`
                    : `@${user.username}`}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 py-6">
        {user.role === 'admin' && <AdminDashboard />}
        {user.role === 'teacher' && <TeacherDashboard />}
        {user.role === 'student' && <StudentDashboard user={user} />}
      </main>
    </div>
  );
}

export default App;
