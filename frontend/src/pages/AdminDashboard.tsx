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
  FileSpreadsheet,
  RotateCcw,
  Search,
  Pencil,
} from 'lucide-react';
import { apiFetch, UserRole } from '../lib/api';
import { TeacherDashboard } from './TeacherDashboard';
import { StudentExcelImporter } from '../components/StudentExcelImporter';
import { RunningBanner } from '../components/RunningBanner';

interface UserRow {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  identityNumber?: string | null;
  gender?: string | null;
  mustChangePassword?: number;
  classId?: string | null;
  className?: string | null;
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
  gender?: string | null;
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
  const [tab, setTab] = useState<'users' | 'import' | 'classes' | 'subjects' | 'learning'>('users');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Akun Manual
  const [uName, setUName] = useState('');
  const [uUsername, setUUsername] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uRole, setURole] = useState<UserRole>('student');
  const [uIdentity, setUIdentity] = useState('');
  const [uGender, setUGender] = useState('Laki-laki');
  const [uClassId, setUClassId] = useState('');

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [euName, setEuName] = useState('');
  const [euUsername, setEuUsername] = useState('');
  const [euIdentity, setEuIdentity] = useState('');
  const [euGender, setEuGender] = useState('Laki-laki');
  const [euRole, setEuRole] = useState<UserRole>('student');
  const [euClassId, setEuClassId] = useState('');

  // Custom Password Modal (Guru/Admin)
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Form Kelas & Edit Kelas Modal
  const [cName, setCName] = useState('');
  const [cYear, setCYear] = useState('2026/2027');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [ecName, setEcName] = useState('');
  const [ecYear, setEcYear] = useState('');

  // Form Mapel & Edit Mapel Modal
  const [sName, setSName] = useState('');
  const [sDesc, setSDesc] = useState('');
  const [sClassId, setSClassId] = useState('');
  const [sTeacherId, setSTeacherId] = useState('');
  const [editingSubject, setEditingSubject] = useState<SubjectRow | null>(null);
  const [esName, setEsName] = useState('');
  const [esDesc, setEsDesc] = useState('');
  const [esClassId, setEsClassId] = useState('');
  const [esTeacherId, setEsTeacherId] = useState('');

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
          username: uRole === 'student' ? uIdentity : uUsername,
          password: uRole === 'student' ? uIdentity : uPassword,
          role: uRole,
          identityNumber: uIdentity,
          gender: uRole === 'student' ? uGender : undefined,
          classId: uRole === 'student' && uClassId ? uClassId : undefined,
        }),
      });
      setUName('');
      setUUsername('');
      setUPassword('');
      setUIdentity('');
      setSuccess(
        uRole === 'student'
          ? 'Siswa berhasil ditambahkan! Password awal diset otomatis ke NISN.'
          : 'Akun berhasil dibuat!'
      );
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat akun');
    }
  }

  function openEditUser(u: UserRow) {
    setEditingUser(u);
    setEuName(u.name);
    setEuUsername(u.username);
    setEuIdentity(u.identityNumber || '');
    setEuGender(u.gender || 'Laki-laki');
    setEuRole(u.role);
    setEuClassId(u.classId || '');
  }

  async function handleSaveEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: euName,
          username: euRole === 'student' ? euIdentity || euUsername : euUsername,
          identityNumber: euIdentity,
          gender: euRole === 'student' ? euGender : undefined,
          role: euRole,
          classId: euRole === 'student' ? euClassId || null : null,
        }),
      });
      setEditingUser(null);
      setSuccess('Data akun berhasil diperbarui!');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui akun');
    }
  }

  async function handleResetStudentToNisn(u: UserRow) {
    if (
      !confirm(
        `Reset password siswa "${u.name}" kembali ke password awal yaitu NISN (${u.identityNumber})?`
      )
    ) {
      return;
    }
    setError('');
    setSuccess('');
    try {
      const res = await apiFetch<{ message: string }>(`/api/admin/users/${u.id}/reset-nisn`, {
        method: 'POST',
      });
      setSuccess(res.message);
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mereset password ke NISN');
    }
  }

  async function handleResetCustomPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser || !newPassword) return;
    await apiFetch(`/api/admin/users/${resetUser.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ password: newPassword }),
    });
    setResetUser(null);
    setNewPassword('');
    setSuccess(`Password untuk ${resetUser.name} berhasil diperbarui!`);
    loadAll();
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

  function openEditClass(cls: ClassRow) {
    setEditingClass(cls);
    setEcName(cls.name);
    setEcYear(cls.academicYear);
  }

  async function handleSaveEditClass(e: React.FormEvent) {
    e.preventDefault();
    if (!editingClass) return;
    setError('');
    try {
      await apiFetch(`/api/admin/classes/${editingClass.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: ecName, academicYear: ecYear }),
      });
      if (selectedClass?.id === editingClass.id) {
        setSelectedClass({ ...selectedClass, name: ecName, academicYear: ecYear });
      }
      setEditingClass(null);
      setSuccess('Data kelas berhasil diperbarui!');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui kelas');
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

  function openEditSubject(subj: SubjectRow) {
    setEditingSubject(subj);
    setEsName(subj.name);
    setEsDesc(subj.description || '');
    setEsClassId(subj.classId);
    setEsTeacherId(subj.teacherId);
  }

  async function handleSaveEditSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSubject) return;
    setError('');
    try {
      await apiFetch(`/api/admin/subjects/${editingSubject.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: esName,
          description: esDesc,
          classId: esClassId,
          teacherId: esTeacherId,
        }),
      });
      setEditingSubject(null);
      setSuccess('Mata pelajaran berhasil diperbarui!');
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui mata pelajaran');
    }
  }

  async function handleDeleteSubject(id: string) {
    if (!confirm('Hapus mata pelajaran ini?')) return;
    await apiFetch(`/api/admin/subjects/${id}`, { method: 'DELETE' });
    loadAll();
  }

  const teachers = users.filter((u) => u.role === 'teacher' || u.role === 'admin');
  const students = users.filter((u) => u.role === 'student');

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.identityNumber || '').toLowerCase().includes(q) ||
      (u.className || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <RunningBanner
        variant="admin"
        items={[
          'Selamat datang di Panel Operator Ruang Belajar Sekolah',
          'Gunakan menu Import Excel Siswa untuk mengunggah Nomor, Nama, Jenis Kelamin, NISN, dan Kelas sekaligus',
          'Siswa login cukup memakai Nama Lengkap & NISN, lalu otomatis diarahkan membuat password baru',
          'Jika siswa lupa password, klik tombol Reset ke NISN pada tabel siswa untuk mengembalikan password ke NISN',
        ]}
      />

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
          <Users className="w-4 h-4" /> Akun & Reset Password
        </button>
        <button
          onClick={() => setTab('import')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            tab === 'import'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" /> Import Excel Siswa
        </button>
        <button
          onClick={() => setTab('classes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            tab === 'classes'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          <GraduationCap className="w-4 h-4" /> Kelas & Anggota
        </button>
        <button
          onClick={() => setTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            tab === 'subjects'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          <BookMarked className="w-4 h-4" /> Mata Pelajaran
        </button>
        <button
          onClick={() => setTab('learning')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            tab === 'learning'
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
          }`}
        >
          <Send className="w-4 h-4" /> Kirim Materi & Tugas (PDF / Word)
        </button>
      </div>

      {error && (
        <div className="animate-scale-in p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}
      {success && (
        <div className="animate-scale-in p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {tab === 'import' && <StudentExcelImporter onImportComplete={loadAll} />}

      {tab === 'learning' && <TeacherDashboard showBanner={false} />}

      {tab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleCreateUser}
            className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 h-fit"
          >
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" /> Tambah Akun Manual
            </h2>
            <select
              value={uRole}
              onChange={(e) => setURole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold bg-slate-50"
            >
              <option value="student">Akun Siswa (Login Nama + NISN)</option>
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

            {uRole === 'student' ? (
              <>
                <input
                  required
                  placeholder="NISN Siswa (Sekaligus Password Awal)"
                  value={uIdentity}
                  onChange={(e) => setUIdentity(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono"
                />
                <select
                  value={uGender}
                  onChange={(e) => setUGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
                {classes.length > 0 && (
                  <select
                    value={uClassId}
                    onChange={(e) => setUClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="">-- Pilih Kelas Siswa --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.academicYear})
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-slate-500">
                  * Password awal otomatis diset sama dengan <strong>NISN</strong>. Saat login
                  pertama, siswa akan diminta mengganti password.
                </p>
              </>
            ) : (
              <>
                <input
                  required
                  placeholder="Username (untuk login Guru/Admin)"
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
                  placeholder="NIP (opsional)"
                  value={uIdentity}
                  onChange={(e) => setUIdentity(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-sm font-semibold shadow-sm cursor-pointer"
            >
              Simpan Akun
            </button>
          </form>

          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="font-bold text-slate-900">
                Daftar Akun ({filteredUsers.length})
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    placeholder="Cari nama / NISN / kelas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  <option value="all">Semua Peran</option>
                  <option value="student">Siswa</option>
                  <option value="teacher">Guru</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Nama & JK</th>
                    <th className="px-4 py-3">NISN / Username</th>
                    <th className="px-4 py-3">Kelas / Peran</th>
                    <th className="px-4 py-3">Status Password</th>
                    <th className="px-4 py-3 text-right">Edit / Reset / Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-sm">{u.name}</div>
                        {u.gender && <div className="text-[11px] text-slate-500">{u.gender}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">
                        {u.role === 'student' ? u.identityNumber || u.username : `@${u.username}`}
                      </td>
                      <td className="px-4 py-3">
                        {u.role === 'student' ? (
                          <span className="px-2.5 py-0.5 rounded-full font-semibold bg-sky-100 text-sky-800">
                            {u.className || 'Siswa'}
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-semibold ${
                              u.role === 'teacher'
                                ? 'bg-violet-100 text-violet-700'
                                : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            {u.role === 'teacher' ? 'Guru' : 'Admin'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.role === 'student' ? (
                          u.mustChangePassword === 1 ? (
                            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              Password = NISN
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              Sudah Diubah Siswa
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400">Aktif</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => openEditUser(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[11px] border border-sky-200 cursor-pointer transition"
                          title="Edit data akun"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        {u.role === 'student' ? (
                          <button
                            onClick={() => handleResetStudentToNisn(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[11px] border border-amber-200 cursor-pointer transition"
                            title="Kembalikan password siswa ke NISN awal"
                          >
                            <RotateCcw className="w-3 h-3" /> Reset ke NISN
                          </button>
                        ) : (
                          <button
                            onClick={() => setResetUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] cursor-pointer"
                          >
                            <KeyRound className="w-3 h-3" /> Password
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer align-middle"
                          title="Hapus akun"
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold bg-indigo-50 px-2.5 py-1 rounded-full text-indigo-700">
                      {cls.studentCount} siswa
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditClass(cls);
                      }}
                      className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer"
                      title="Edit Kelas"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClass(cls.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Hapus Kelas"
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
                          {st.name} ({st.identityNumber || st.username})
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
                          <span className="text-slate-500 ml-2 font-mono text-xs">
                            (NISN: {m.identityNumber || m.username})
                          </span>
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditSubject(s)}
                      className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer"
                      title="Edit Mata Pelajaran"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubject(s.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Hapus Mata Pelajaran"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="font-bold text-slate-900 text-base">{s.name}</div>
                <div className="text-xs text-slate-500">Guru Pengampu: {s.teacherName}</div>
                {s.description && <p className="text-xs text-slate-600">{s.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Edit Akun Pengguna */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveEditUser}
            className="animate-scale-in bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl"
          >
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Pencil className="w-4 h-4 text-indigo-600" /> Edit Akun Pengguna
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Peran Akun</label>
              <select
                value={euRole}
                onChange={(e) => setEuRole(e.target.value as UserRole)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-slate-50 font-semibold"
              >
                <option value="student">Siswa</option>
                <option value="teacher">Guru</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
              <input
                required
                value={euName}
                onChange={(e) => setEuName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            {euRole === 'student' ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NISN Siswa</label>
                  <input
                    required
                    value={euIdentity}
                    onChange={(e) => setEuIdentity(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={euGender}
                    onChange={(e) => setEuGender(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Siswa</label>
                  <select
                    value={euClassId}
                    onChange={(e) => setEuClassId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  >
                    <option value="">-- Tanpa Kelas --</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                  <input
                    required
                    value={euUsername}
                    onChange={(e) => setEuUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIP (Opsional)
                  </label>
                  <input
                    value={euIdentity}
                    onChange={(e) => setEuIdentity(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Edit Kelas */}
      {editingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveEditClass}
            className="animate-scale-in bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl"
          >
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Pencil className="w-4 h-4 text-indigo-600" /> Edit Kelas
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Kelas</label>
              <input
                required
                value={ecName}
                onChange={(e) => setEcName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Ajaran</label>
              <input
                required
                value={ecYear}
                onChange={(e) => setEcYear(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Edit Mata Pelajaran */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveEditSubject}
            className="animate-scale-in bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl"
          >
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Pencil className="w-4 h-4 text-indigo-600" /> Edit Mata Pelajaran
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Mata Pelajaran
              </label>
              <input
                required
                value={esName}
                onChange={(e) => setEsName(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi</label>
              <textarea
                rows={2}
                value={esDesc}
                onChange={(e) => setEsDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
              <select
                required
                value={esClassId}
                onChange={(e) => setEsClassId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.academicYear})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Guru Pengampu</label>
              <select
                required
                value={esTeacherId}
                onChange={(e) => setEsTeacherId(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.role === 'admin' ? 'Admin' : 'Guru'})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSubject(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Ubah Password Guru/Admin */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleResetCustomPassword}
            className="animate-scale-in bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl"
          >
            <h3 className="font-bold text-slate-900">Ubah Password: {resetUser.name}</h3>
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
