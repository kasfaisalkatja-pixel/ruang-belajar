import { useEffect, useState } from 'react';
import {
  Users,
  GraduationCap,
  BookMarked,
  Plus,
  Trash2,
  UserPlus,
  Send,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch, UserRole } from '../lib/api';
import { TeacherDashboard } from './TeacherDashboard';

interface UserRow {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  identityNumber?: string | null;
}

interface ClassRow {
  id: string;
  name: string;
  academicYear: string;
  studentCount: number;
}

interface SubjectRow {
  id: string;
  name: string;
  description?: string | null;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
}

interface MemberRow {
  memberId: string;
  studentId: string;
  name: string;
  username: string;
  identityNumber?: string | null;
}

interface Stats {
  teachers: number;
  students: number;
  classes: number;
  subjects: number;
  materials: number;
  assignments: number;
}

export function AdminDashboard() {
  const [tab, setTab] = useState<'users' | 'classes' | 'subjects' | 'learning'>('users');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Akun
  const [uName, setUName] = useState('');
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState<UserRole>('student');
  const [uIdentity, setUIdentity] = useState('');
  const [uClassId, setUClassId] = useState('');

  // Reset Password Modal
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Form Kelas & Mapel
  const [cName, setCName] = useState('');
  const [cYear, setCYear] = useState('2026/2027');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [sName, setSName] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sClassId, setSClassId] = useState('');
  const [sTeacherId, setSTeacherId] = useState('');

  async function loadAll() {
    try {
      const [stRes, uRes, cRes, sRes] = await Promise.all([
        apiFetch<Stats>('/api/admin/stats'),
        apiFetch<{ users: UserRow[] }>('/api/admin/users'),
        apiFetch<{ classes: ClassRow[] }>('/api/admin/classes'),
        apiFetch<{ subjects: SubjectRow[] }>('/api/admin/subjects'),
      ]);
      setStats(stRes);
      setUsers(uRes.users);
      setClasses(cRes.classes);
      setSubjects(sRes.subjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data');
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function loadMembers(cls: ClassRow) {
    setSelectedClass(cls);
    const res = await apiFetch<{ members: MemberRow[] }>(`/api/admin/classes/${cls.id}/members`);
    setMembers(res.members);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: uName,
          username: uUsername,
          password: uPassword,
          role: uRole,
          identityNumber: uIdentity,
          classId: uRole === 'student' && uClassId ? uClassId : undefined,
        }),
      });
      setUName('');
      setUUsername('');
      setUPassword('');
      setUIdentity('');
      setSuccess('Akun baru berhasil dibuat!');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat akun');
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser || !newPassword) return;
    await apiFetch(`/api/admin/users/${resetUser.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ password: newPassword }),
    });
    setResetUser(null);
    setNewPassword('');
    setSuccess(`Password untuk ${resetUser.name} berhasil diperbarui!`);
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Hapus pengguna ini?')) return;
    try {
      await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus akun');
    }
  }

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/admin/classes', {
        method: 'POST',
        body: JSON.stringify({ name: cName, academicYear: cYear }),
      });
      setCName('');
      setSuccess('Kelas baru berhasil ditambahkan!');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat kelas');
    }
  }

  async function handleDeleteClass(id: string) {
    if (!confirm('Hapus kelas ini beserta mata pelajarannya?')) return;
    await apiFetch(`/api/admin/classes/${id}`, { method: 'DELETE' });
    if (selectedClass?.id === id) setSelectedClass(null);
    loadAll();
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass || !selectedStudentId) return;
    setError('');
    try {
      await apiFetch(`/api/admin/classes/${selectedClass.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ studentId: selectedStudentId }),
      });
      setSelectedStudentId('');
      await loadMembers(selectedClass);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah siswa');
    }
  }

  async function handleRemoveMember(studentId: string) {
    if (!selectedClass) return;
    await apiFetch(`/api/admin/classes/${selectedClass.id}/members/${studentId}`, {
      method: 'DELETE',
    });
    await loadMembers(selectedClass);
    loadAll();
  }

  async function handleCreateSubject(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({
          name: sName,
          description: sDesc,
          classId: sClassId,
          teacherId: sTeacherId,
        }),
      });
      setSName('');
      setSDesc('');
      setSuccess('Mata pelajaran berhasil dibuat!');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat mata pelajaran');
    }
  }

  async function handleDeleteSubject(id: string) {
    if (!confirm('Hapus mata pelajaran ini?')) return;
    await apiFetch(`/api/admin/subjects/${id}`, { method: 'DELETE' });
    loadAll();
  }

  const teachers = users.filter((u) => u.role === 'teacher' || u.role === 'admin');
  const students = users.filter((u) => u.role === 'student');

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Animated Summary Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Guru', val: stats.teachers, color: 'from-indigo-500 to-indigo-600' },
            { label: 'Siswa', val: stats.students, color: 'from-sky-500 to-sky-600' },
            { label: 'Kelas', val: stats.classes, color: 'from-violet-500 to-violet-600' },
            { label: 'Mapel', val: stats.subjects, color: 'from-emerald-500 to-emerald-600' },
            { label: 'Materi PDF/Word', val: stats.materials, color: 'from-amber-500 to-orange-500' },
            { label: 'Tugas Aktif', val: stats.assignments, color: 'from-rose-500 to-pink-600' },
          ].map((item, idx) => (
            <div
              key={item.label}
              style={{ animationDelay: `${idx * 50}ms` }}
              className="animate-fade-up card-interactive bg-white rounded-2xl p-4 border border-slate-200 shadow-xs"
            >
              <div
                className={`inline-block text-[11px] font-bold text-white px-2.5 py-0.5 rounded-full bg-gradient-to-r ${item.color}`}
              >
                {item.label}
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">{item.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            tab === 'users'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          <Users className="w-4 h-4" /> 1. Akun Guru & Siswa
        </button>
        <button
          onClick={() => setTab('classes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            tab === 'classes'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> 2. Kelas & Anggota
        </button>
        <button
          onClick={() => setTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            tab === 'subjects'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          <BookMarked className="w-4 h-4" /> 3. Mata Pelajaran
        </button>
        <button
          onClick={() => setTab('learning')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            tab === 'learning'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
          }`}
        >
          <Send className="w-4 h-4" /> 4. Kirim Materi & Tugas (PDF / Word)
        </button>
      </div>

      {error && (
        <div className="animate-scale-in p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="animate-scale-in p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      {tab === 'learning' ? (
        <TeacherDashboard />
      ) : null}

      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleCreateUser}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 h-fit"
          >
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" /> Tambah Akun Baru
            </h2>
            <select
              value={uRole}
              onChange={(e) => setURole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold bg-slate-50"
            >
              <option value="student">Akun Siswa</option>
              <option value="teacher">Akun Guru</option>
              <option value="admin">Akun Admin</option>
            </select>
            <input
              required
              placeholder="Nama Lengkap"
              value={uName}
              onChange={(e) => setUName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
            />
            <input
              required
              placeholder="Username (untuk login)"
              value={uUsername}
              onChange={(e) => setUUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
            />
            <input
              required
              type="password"
              placeholder="Password"
              value={uPassword}
              onChange={(e) => setUPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
            />
            <input
              placeholder={uRole === 'student' ? 'NISN / NIS (opsional)' : 'NIP (opsional)'}
              value={uIdentity}
              onChange={(e) => setUIdentity(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
            />
            {uRole === 'student' && classes.length > 0 && (
              <select
                value={uClassId}
                onChange={(e) => setUClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              >
                <option value="">-- Langsung Masukkan ke Kelas (Opsional) --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.academicYear})
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-sm font-semibold shadow-sm cursor-pointer"
            >
              Simpan Akun
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 font-bold text-slate-900">
              Daftar Pengguna ({users.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Peran</th>
                    <th className="px-4 py-3">NIS/NIP</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600">@{u.username}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            u.role === 'teacher'
                              ? 'bg-violet-100 text-violet-700'
                              : u.role === 'student'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {u.role === 'teacher' ? 'Guru' : u.role === 'student' ? 'Siswa' : 'Admin'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u.identityNumber || '-'}</td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => setResetUser(u)}
                          className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg cursor-pointer"
                          title="Ubah Password"
                        >
                          <KeyRound className="w-4 h-4 inline" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <form
              onSubmit={handleCreateClass}
              className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3"
            >
              <h2 className="font-bold text-slate-900">Buat Kelas Baru</h2>
              <input
                required
                placeholder="Nama Kelas (mis. Kelas 6A / X IPA 1)"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              />
              <input
                required
                placeholder="Tahun Ajaran"
                value={cYear}
                onChange={(e) => setCYear(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              />
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold cursor-pointer"
              >
                Tambah Kelas
              </button>
            </form>

            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => loadMembers(cls)}
                  className={`p-4 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition ${
                    selectedClass?.id === cls.id ? 'bg-indigo-50/70' : ''
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900">{cls.name}</div>
                    <div className="text-xs text-slate-500">{cls.academicYear}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold bg-indigo-50 px-2.5 py-1 rounded-full text-indigo-700">
                      {cls.studentCount} siswa
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(cls.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
            {selectedClass ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Anggota Kelas {selectedClass.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Semua materi PDF/Word & tugas kelas ini otomatis masuk ke akun siswa berikut.
                    </p>
                  </div>
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <select
                      required
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    >
                      <option value="">-- Pilih Siswa --</option>
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} (@{st.username})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" /> Masukkan
                    </button>
                  </form>
                </div>

                <div className="divide-y divide-slate-100">
                  {members.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">
                      Belum ada siswa di kelas ini.
                    </p>
                  ) : (
                    members.map((m) => (
                      <div
                        key={m.memberId}
                        className="py-3 flex items-center justify-between text-sm"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">{m.name}</span>
                          <span className="text-slate-500 ml-2">(@{m.username})</span>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(m.studentId)}
                          className="text-rose-600 hover:underline text-xs font-medium cursor-pointer"
                        >
                          Keluarkan
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-8 text-center">
                Klik salah satu kelas di sebelah kiri untuk mengelola daftar siswanya.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleCreateSubject}
            className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3.5 h-fit"
          >
            <h2 className="font-bold text-slate-900">Tambah Mata Pelajaran</h2>
            <input
              required
              placeholder="Nama Mata Pelajaran (mis. Matematika)"
              value={sName}
              onChange={(e) => setSName(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
            />
            <textarea
              placeholder="Deskripsi singkat (opsional)"
              value={sDesc}
              onChange={(e) => setSDesc(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              rows={2}
            />
            <select
              required
              value={sClassId}
              onChange={(e) => setSClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
            >
              <option value="">-- Pilih Kelas --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.academicYear})
                </option>
              ))}
            </select>
            <select
              required
              value={sTeacherId}
              onChange={(e) => setSTeacherId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
            >
              <option value="">-- Pilih Guru Pengampu --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.role === 'admin' ? 'Admin' : 'Guru'})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold cursor-pointer"
            >
              Simpan Mata Pelajaran
            </button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="card-interactive bg-white p-5 rounded-2xl border border-slate-200 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                    {s.className}
                  </span>
                  <button
                    onClick={() => handleDeleteSubject(s.id)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="font-bold text-slate-900 text-base">{s.name}</div>
                <div className="text-xs text-slate-500">Guru Pengampu: {s.teacherName}</div>
                {s.description && <p className="text-xs text-slate-600">{s.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleResetPassword}
            className="animate-scale-in bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl"
          >
            <h3 className="font-bold text-slate-900">Reset Password: {resetUser.name}</h3>
            <input
              required
              type="password"
              placeholder="Masukkan password baru"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl cursor-pointer"
              >
                Simpan Password
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
