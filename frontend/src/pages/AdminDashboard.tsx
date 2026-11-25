import { useEffect, useState } from 'react';
import { Users, GraduationCap, BookMarked, Plus, Trash2, UserPlus } from 'lucide-react';
import { apiFetch, UserRole } from '../lib/api';

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

export function AdminDashboard() {
  const [tab, setTab] = useState<'users' | 'classes' | 'subjects'>('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [error, setError] = useState('');

  // Form states
  const [uName, setUName] = useState('');
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState<UserRole>('student');
  const [uIdentity, setUIdentity] = useState('');

  const [cName, setCName] = useState('');
  const [cYear, setCYear] = useState('2026/2027');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const [sName, setSName] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sClassId, setSClassId] = useState('');
  const [sTeacherId, setSTeacherId] = useState('');

  async function loadAll() {
    try {
      const [uRes, cRes, sRes] = await Promise.all([
        apiFetch<{ users: UserRow[] }>('/api/admin/users'),
        apiFetch<{ classes: ClassRow[] }>('/api/admin/classes'),
        apiFetch<{ subjects: SubjectRow[] }>('/api/admin/subjects'),
      ]);
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
    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: uName,
          username: uUsername,
          password: uPassword,
          role: uRole,
          identityNumber: uIdentity,
        }),
      });
      setUName('');
      setUUsername('');
      setUPassword('');
      setUIdentity('');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat akun');
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm('Hapus pengguna ini?')) return;
    await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    loadAll();
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
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat kelas');
    }
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
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat mata pelajaran');
    }
  }

  const teachers = users.filter((u) => u.role === 'teacher');
  const students = users.filter((u) => u.role === 'student');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
            tab === 'users' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Akun Guru & Siswa
        </button>
        <button
          onClick={() => setTab('classes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
            tab === 'classes' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> Kelas & Anggota
        </button>
        <button
          onClick={() => setTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
            tab === 'subjects' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <BookMarked className="w-4 h-4" /> Mata Pelajaran
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleCreateUser}
            className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 h-fit"
          >
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" /> Tambah Akun Baru
            </h2>
            <input
              required
              placeholder="Nama Lengkap"
              value={uName}
              onChange={(e) => setUName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <input
              required
              placeholder="Username (untuk login)"
              value={uUsername}
              onChange={(e) => setUUsername(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <input
              required
              type="password"
              placeholder="Password"
              value={uPassword}
              onChange={(e) => setUPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <select
              value={uRole}
              onChange={(e) => setURole(e.target.value as UserRole)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="student">Siswa</option>
              <option value="teacher">Guru</option>
              <option value="admin">Admin</option>
            </select>
            <input
              placeholder="NIS / NIP (opsional)"
              value={uIdentity}
              onChange={(e) => setUIdentity(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium cursor-pointer"
            >
              Simpan Akun
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 font-semibold text-slate-900">
              Daftar Pengguna ({users.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600">
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
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-slate-600">{u.username}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{u.identityNumber || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
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
              className="bg-white p-5 rounded-xl border border-slate-200 space-y-3"
            >
              <h2 className="font-semibold text-slate-900">Buat Kelas Baru</h2>
              <input
                required
                placeholder="Nama Kelas (mis. X IPA 1)"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <input
                required
                placeholder="Tahun Ajaran"
                value={cYear}
                onChange={(e) => setCYear(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium cursor-pointer"
              >
                Tambah Kelas
              </button>
            </form>

            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => loadMembers(cls)}
                  className={`w-full text-left p-4 hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                    selectedClass?.id === cls.id ? 'bg-indigo-50/60' : ''
                  }`}
                >
                  <div>
                    <div className="font-medium text-slate-900">{cls.name}</div>
                    <div className="text-xs text-slate-500">{cls.academicYear}</div>
                  </div>
                  <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-700">
                    {cls.studentCount} siswa
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            {selectedClass ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Anggota Kelas {selectedClass.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Siswa yang terdaftar di kelas ini akan otomatis menerima materi & tugas.
                    </p>
                  </div>
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <select
                      required
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                    >
                      <option value="">-- Pilih Siswa --</option>
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.username})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" /> Tambah
                    </button>
                  </form>
                </div>

                <div className="divide-y divide-slate-100">
                  {members.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">Belum ada siswa di kelas ini.</p>
                  ) : (
                    members.map((m) => (
                      <div key={m.memberId} className="py-2.5 flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-slate-900">{m.name}</span>
                          <span className="text-slate-500 ml-2">({m.username})</span>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(m.studentId)}
                          className="text-red-500 hover:text-red-700 text-xs cursor-pointer"
                        >
                          Keluarkan
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Pilih kelas di sebelah kiri untuk mengelola daftar siswa.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'subjects' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleCreateSubject}
            className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 h-fit"
          >
            <h2 className="font-semibold text-slate-900">Tambah Mata Pelajaran</h2>
            <input
              required
              placeholder="Nama Mata Pelajaran (mis. Matematika)"
              value={sName}
              onChange={(e) => setSName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <textarea
              placeholder="Deskripsi singkat (opsional)"
              value={sDesc}
              onChange={(e) => setSDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              rows={2}
            />
            <select
              required
              value={sClassId}
              onChange={(e) => setSClassId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">-- Pilih Guru Pengampu --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium cursor-pointer"
            >
              Simpan Mata Pelajaran
            </button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
            {subjects.map((s) => (
              <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
                <div className="text-xs font-medium text-indigo-600">{s.className}</div>
                <div className="font-semibold text-slate-900">{s.name}</div>
                <div className="text-xs text-slate-500">Pengampu: {s.teacherName}</div>
                {s.description && <p className="text-sm text-slate-600 pt-1">{s.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
