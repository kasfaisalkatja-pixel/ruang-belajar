import { useEffect, useState } from 'react';
import { BookOpen, LogOut } from 'lucide-react';
import { apiFetch, getToken, setToken, User } from './lib/api';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { StudentDashboard } from './pages/StudentDashboard';

const ROLE_LABEL: Record<User['role'], string> = {
  admin: 'Admin / Operator Sekolah',
  teacher: 'Guru Pengajar',
  student: 'Siswa',
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-600">
        <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-bounce shadow-lg">
          <BookOpen className="w-6 h-6" />
        </div>
        <span className="text-sm font-semibold">Memuat Ruang Belajar...</span>
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

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50/80">
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-slate-900 leading-tight tracking-tight">
                Ruang Belajar
              </div>
              <div className="text-[11px] font-semibold text-indigo-600">
                {ROLE_LABEL[user.role]}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-100/80 px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                {initials}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight">{user.name}</div>
                <div className="text-[11px] text-slate-500">@{user.username}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {user.role === 'admin' && <AdminDashboard />}
        {user.role === 'teacher' && <TeacherDashboard />}
        {user.role === 'student' && <StudentDashboard user={user} />}
      </main>
    </div>
  );
}

export default App;
