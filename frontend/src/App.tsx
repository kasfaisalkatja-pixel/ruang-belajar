import { useEffect, useState } from 'react';
import { BookOpen, LogOut } from 'lucide-react';
import { apiFetch, getToken, setToken, User } from './lib/api';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { StudentDashboard } from './pages/StudentDashboard';

const ROLE_LABEL: Record<User['role'], string> = {
  admin: 'Admin / Operator',
  teacher: 'Guru',
  student: 'Siswa',
};

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setChecking(false);
      return;
    }
    apiFetch<{ user: User }>('/api/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  function handleLogout() {
    setToken(null);
    setUser(null);
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Memuat Ruang Belajar...
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSuccess={setUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-slate-900 leading-tight">Ruang Belajar</div>
              <div className="text-xs text-slate-500">{ROLE_LABEL[user.role]}</div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-500">@{user.username}</div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {user.role === 'admin' && <AdminDashboard />}
        {user.role === 'teacher' && <TeacherDashboard />}
        {user.role === 'student' && <StudentDashboard />}
      </main>
    </div>
  );
}
export default App;
