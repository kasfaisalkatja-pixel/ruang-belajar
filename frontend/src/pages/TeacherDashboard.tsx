import { useEffect, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  Send,
  Download,
  Eye,
  CheckCircle2,
  Trash2,
  Users,
  Video,
  Award,
  Layers,
  Clock,
} from 'lucide-react';
import { apiFetch, downloadProtectedFile, getFileBadgeMeta } from '../lib/api';
import { FileDropzone } from '../components/FileDropzone';
import { FileViewerModal } from '../components/FileViewerModal';

interface TeacherSubject {
  id: string;
  name: string;
  description?: string | null;
  className: string;
  academicYear: string;
  teacherName?: string;
  studentCount: number;
  materialCount: number;
  assignmentCount: number;
}

interface MaterialItem {
  id: string;
  title: string;
  content: string;
  fileKey?: string | null;
  fileName?: string | null;
  videoUrl?: string | null;
  createdAt: string;
  readCount: number;
}

interface AssignmentItem {
  id: string;
  title: string;
  description: string;
  fileKey?: string | null;
  fileName?: string | null;
  dueDate: string;
  maxScore: number;
  submissionCount: number;
  gradedCount?: number;
}

interface SubmissionRow {
  studentId: string;
  studentName: string;
  identityNumber?: string | null;
  submission: {
    id: string;
    content?: string | null;
    fileKey?: string | null;
    fileName?: string | null;
    score?: number | null;
    feedback?: string | null;
    submittedAt: string;
  } | null;
}

interface ReadRow {
  studentId: string;
  name: string;
  identityNumber?: string | null;
  readAt: string | null;
}

export function TeacherDashboard() {
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [tab, setTab] = useState<'overview' | 'materials' | 'assignments'>('materials');

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Kirim Materi (PDF / Word / Video)
  const [mTitle, setMTitle] = useState('');
  const [mContent, setMContent] = useState('');
  const [mVideo, setMVideo] = useState('');
  const [mFile, setMFile] = useState<File | null>(null);

  // Form Buat Tugas (PDF / Word)
  const [aTitle, setATitle] = useState('');
  const [aDesc, setADesc] = useState('');
  const [aDue, setADue] = useState('');
  const [aMax, setAMax] = useState(100);
  const [aFile, setAFile] = useState<File | null>(null);

  // Modals & Detail Views
  const [previewFile, setPreviewFile] = useState<{ key: string; name?: string | null } | null>(null);
  const [gradingAssignment, setGradingAssignment] = useState<AssignmentItem | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [scores, setScores] = useState<Record<string, { score: string; feedback: string }>>({});
  const [readingMaterial, setReadingMaterial] = useState<{ title: string; rows: ReadRow[] } | null>(
    null
  );

  async function loadDashboard() {
    try {
      const res = await apiFetch<{ subjects: TeacherSubject[] }>('/api/learning/dashboard');
      setSubjects(res.subjects);
      if (res.subjects.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(res.subjects[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar kelas');
    }
  }

  async function loadSubjectDetail(subjId: string) {
    if (!subjId) return;
    try {
      const res = await apiFetch<{
        totalStudents: number;
        materials: MaterialItem[];
        assignments: AssignmentItem[];
      }>(`/api/learning/subjects/${subjId}`);
      setTotalStudents(res.totalStudents);
      setMaterials(res.materials);
      setAssignments(res.assignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail mapel');
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      setGradingAssignment(null);
      setReadingMaterial(null);
      loadSubjectDetail(selectedSubjectId);
    }
  }, [selectedSubjectId]);

  const activeSubject = subjects.find((s) => s.id === selectedSubjectId) || null;

  async function handleSendMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubjectId) return;
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('title', mTitle);
      fd.append('content', mContent);
      if (mVideo) fd.append('videoUrl', mVideo);
      if (mFile) fd.append('file', mFile);

      await apiFetch(`/api/learning/subjects/${selectedSubjectId}/materials`, {
        method: 'POST',
        body: fd,
      });
      setMTitle('');
      setMContent('');
      setMVideo('');
      setMFile(null);
      setSuccess('Materi berhasil dikirim! Seluruh siswa di kelas kini dapat membukanya.');
      loadSubjectDetail(selectedSubjectId);
      loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim materi');
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMaterial(id: string) {
    if (!confirm('Hapus materi ini?')) return;
    await apiFetch(`/api/learning/materials/${id}`, { method: 'DELETE' });
    loadSubjectDetail(selectedSubjectId);
    loadDashboard();
  }

  async function handleViewReads(mat: MaterialItem) {
    const res = await apiFetch<{ materialTitle: string; students: ReadRow[] }>(
      `/api/learning/materials/${mat.id}/reads`
    );
    setReadingMaterial({ title: res.materialTitle, rows: res.students });
  }

  async function handleSendAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubjectId) return;
    setError('');
    setSuccess('');
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('title', aTitle);
      fd.append('description', aDesc);
      fd.append('dueDate', aDue);
      fd.append('maxScore', String(aMax));
      if (aFile) fd.append('file', aFile);

      await apiFetch(`/api/learning/subjects/${selectedSubjectId}/assignments`, {
        method: 'POST',
        body: fd,
      });
      setATitle('');
      setADesc('');
      setADue('');
      setAFile(null);
      setSuccess('Tugas berhasil dibagikan ke akun masing-masing siswa!');
      loadSubjectDetail(selectedSubjectId);
      loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim tugas');
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteAssignment(id: string) {
    if (!confirm('Hapus tugas ini beserta pengumpulan siswa?')) return;
    await apiFetch(`/api/learning/assignments/${id}`, { method: 'DELETE' });
    loadSubjectDetail(selectedSubjectId);
    loadDashboard();
  }

  async function openGrading(assignment: AssignmentItem) {
    setGradingAssignment(assignment);
    const res = await apiFetch<{ submissions: SubmissionRow[] }>(
      `/api/learning/assignments/${assignment.id}/submissions`
    );
    setSubmissions(res.submissions);
    const initial: Record<string, { score: string; feedback: string }> = {};
    res.submissions.forEach((s) => {
      if (s.submission) {
        initial[s.submission.id] = {
          score: s.submission.score != null ? String(s.submission.score) : '',
          feedback: s.submission.feedback || '',
        };
      }
    });
    setScores(initial);
  }

  async function saveGrade(submissionId: string) {
    const entry = scores[submissionId];
    if (!entry || entry.score === '') return;
    await apiFetch(`/api/learning/submissions/${submissionId}/grade`, {
      method: 'PATCH',
      body: JSON.stringify({
        score: Number(entry.score),
        feedback: entry.feedback,
      }),
    });
    setSuccess('Nilai dan catatan berhasil disimpan ke akun siswa!');
    if (gradingAssignment) openGrading(gradingAssignment);
  }

  if (subjects.length === 0) {
    return (
      <div className="animate-fade-up bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-xl mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Belum Ada Mata Pelajaran</h3>
        <p className="text-sm text-slate-500 mt-1">
          Buat Kelas dan Mata Pelajaran terlebih dahulu melalui menu Admin agar Guru dapat mengirim
          materi PDF/Word dan tugas ke siswa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top Subject Selector & Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="inline-block text-xs font-semibold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full mb-2">
              Ruang Mengajar Guru
            </span>
            <h2 className="text-2xl font-extrabold">
              {activeSubject ? `${activeSubject.name} — ${activeSubject.className}` : 'Pilih Mapel'}
            </h2>
            <p className="text-xs text-indigo-100 mt-1">
              Kirim modul belajar (PDF / Word / Video) & tugas langsung ke akun {totalStudents} siswa
              di kelas ini.
            </p>
          </div>

          <div className="min-w-[250px]">
            <label className="block text-[11px] font-semibold text-indigo-100 mb-1">
              Pilih Kelas & Mata Pelajaran Aktif:
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold shadow-sm focus:outline-none"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.className} — {s.name} ({s.studentCount} Siswa)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setTab('materials');
            setGradingAssignment(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            tab === 'materials'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Kirim Materi (PDF / Word) ({materials.length})
        </button>
        <button
          onClick={() => {
            setTab('assignments');
            setReadingMaterial(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            tab === 'assignments'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Kirim & Nilai Tugas ({assignments.length})
        </button>
        <button
          onClick={() => setTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
            tab === 'overview'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
          }`}
        >
          <Layers className="w-4 h-4" /> Semua Mapel ({subjects.length})
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

      {/* TAB 1: KIRIM MATERI PDF / WORD */}
      {tab === 'materials' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSendMaterial}
            className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 h-fit"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Kirim Materi Baru</h3>
                <p className="text-[11px] text-slate-500">
                  Unggah modul PDF, Word (.docx), PPT, atau Video
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Materi</label>
              <input
                required
                placeholder="Contoh: Bab 1 - Persamaan Linear"
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ringkasan / Penjelasan Materi
              </label>
              <textarea
                required
                rows={4}
                placeholder="Tuliskan penjelasan materi atau instruksi belajar untuk siswa..."
                value={mContent}
                onChange={(e) => setMContent(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <FileDropzone
              file={mFile}
              onChange={setMFile}
              label="File Modul Materi (PDF / Microsoft Word / PPT)"
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tautan Video / Google Drive (Opsional)
              </label>
              <div className="relative">
                <Video className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  placeholder="https://youtube.com/..."
                  value={mVideo}
                  onChange={(e) => setMVideo(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-md transition cursor-pointer"
            >
              {sending ? 'Mengunggah & Mengirim...' : 'Kirim Materi ke Akun Siswa'}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-4">
            {readingMaterial && (
              <div className="animate-scale-in bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-indigo-950 text-sm">
                    Status Baca Siswa: {readingMaterial.title}
                  </h4>
                  <button
                    onClick={() => setReadingMaterial(null)}
                    className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {readingMaterial.rows.map((st) => (
                    <div
                      key={st.studentId}
                      className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-800">{st.name}</span>
                      {st.readAt ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                          Sudah Baca
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                          Belum Dibaca
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {materials.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
                Belum ada materi di mata pelajaran ini. Silakan kirim materi PDF/Word dari formulir di
                samping.
              </div>
            ) : (
              materials.map((m) => {
                const badge = m.fileName ? getFileBadgeMeta(m.fileName) : null;
                return (
                  <div
                    key={m.id}
                    className="card-interactive bg-white p-5 rounded-2xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{m.title}</h4>
                        <span className="text-[11px] text-slate-400">
                          Dikirim {new Date(m.createdAt).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleViewReads(m)}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1 rounded-full cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" /> {m.readCount}/{totalStudents} Siswa Baca
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="Hapus materi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {m.content}
                    </p>

                    {(m.fileKey || m.videoUrl) && (
                      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
                        {m.fileKey && badge && (
                          <>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded border ${badge.colorClass}`}
                            >
                              {badge.label}
                            </span>
                            <button
                              onClick={() => setPreviewFile({ key: m.fileKey!, name: m.fileName })}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />{' '}
                              {badge.isPdf ? 'Baca PDF' : 'Buka File'} ({m.fileName})
                            </button>
                            <button
                              onClick={() => downloadProtectedFile(m.fileKey!, m.fileName)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-600 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> Unduh
                            </button>
                          </>
                        )}
                        {m.videoUrl && (
                          <a
                            href={m.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold"
                          >
                            <Video className="w-3.5 h-3.5" /> Tonton Video / Tautan
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BUAT & NILAI TUGAS */}
      {tab === 'assignments' && !gradingAssignment && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSendAssignment}
            className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 h-fit"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <ClipboardList className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Buat Tugas Siswa</h3>
                <p className="text-[11px] text-slate-500">
                  Lampirkan soal PDF / Word (.docx) & tentukan tenggat waktu
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Tugas</label>
              <input
                required
                placeholder="Contoh: Latihan Soal Bab 1"
                value={aTitle}
                onChange={(e) => setATitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Instruksi Pengerjaan
              </label>
              <textarea
                required
                rows={3}
                placeholder="Jelaskan petunjuk pengerjaan tugas untuk siswa..."
                value={aDesc}
                onChange={(e) => setADesc(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batas Waktu
                </label>
                <input
                  required
                  type="datetime-local"
                  value={aDue}
                  onChange={(e) => setADue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nilai Maksimal
                </label>
                <input
                  type="number"
                  value={aMax}
                  onChange={(e) => setAMax(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <FileDropzone
              file={aFile}
              onChange={setAFile}
              label="File Soal / Lembar Kerja (PDF / Microsoft Word)"
            />

            <button
              type="submit"
              disabled={sending}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-md transition cursor-pointer"
            >
              {sending ? 'Mengunggah & Mengirim...' : 'Bagikan Tugas ke Akun Siswa'}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-4">
            {assignments.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
                Belum ada tugas yang dibuat untuk mata pelajaran ini.
              </div>
            ) : (
              assignments.map((a) => {
                const badge = a.fileName ? getFileBadgeMeta(a.fileName) : null;
                return (
                  <div
                    key={a.id}
                    className="card-interactive bg-white p-5 rounded-2xl border border-slate-200 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{a.title}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-0.5">
                          <Clock className="w-3.5 h-3.5" /> Tenggat:{' '}
                          {new Date(a.dueDate).toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openGrading(a)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                        >
                          <Award className="w-3.5 h-3.5" /> Periksa & Nilai ({a.submissionCount}/
                          {totalStudents})
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(a.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                          title="Hapus tugas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.description}</p>

                    {a.fileKey && badge && (
                      <div className="flex items-center gap-2.5 pt-2 border-t border-slate-100">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border ${badge.colorClass}`}
                        >
                          {badge.label}
                        </span>
                        <button
                          onClick={() => setPreviewFile({ key: a.fileKey!, name: a.fileName })}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Lihat Soal ({a.fileName})
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* PANEL PENILAIAN JAWABAN SISWA */}
      {tab === 'assignments' && gradingAssignment && (
        <div className="animate-fade-up bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-semibold text-indigo-600">Penilaian Tugas Siswa</span>
              <h3 className="text-lg font-bold text-slate-900">{gradingAssignment.title}</h3>
              <p className="text-xs text-slate-500">Nilai Maksimal: {gradingAssignment.maxScore}</p>
            </div>
            <button
              onClick={() => setGradingAssignment(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              ← Kembali ke Daftar Tugas
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {submissions.map((row) => {
              const sub = row.submission;
              const badge = sub?.fileName ? getFileBadgeMeta(sub.fileName) : null;
              return (
                <div key={row.studentId} className="py-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900">{row.studentName}</span>
                      {row.identityNumber && (
                        <span className="text-xs text-slate-500 ml-2">({row.identityNumber})</span>
                      )}
                    </div>
                    {sub ? (
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                        Dikumpulkan {new Date(sub.submittedAt).toLocaleString('id-ID')}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
                        Belum Mengumpulkan
                      </span>
                    )}
                  </div>

                  {sub && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      {sub.content && (
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{sub.content}</p>
                      )}
                      {sub.fileKey && badge && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border ${badge.colorClass}`}
                          >
                            {badge.label}
                          </span>
                          <button
                            onClick={() => setPreviewFile({ key: sub.fileKey!, name: sub.fileName })}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Buka File Jawaban ({sub.fileName})
                          </button>
                          <button
                            onClick={() => downloadProtectedFile(sub.fileKey!, sub.fileName)}
                            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-600 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Unduh
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200">
                        <input
                          type="number"
                          min={0}
                          max={gradingAssignment.maxScore}
                          placeholder={`0 - ${gradingAssignment.maxScore}`}
                          value={scores[sub.id]?.score ?? ''}
                          onChange={(e) =>
                            setScores({
                              ...scores,
                              [sub.id]: {
                                score: e.target.value,
                                feedback: scores[sub.id]?.feedback ?? '',
                              },
                            })
                          }
                          className="w-28 px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white font-semibold"
                        />
                        <input
                          placeholder="Tulis umpan balik / komentar guru untuk siswa..."
                          value={scores[sub.id]?.feedback ?? ''}
                          onChange={(e) =>
                            setScores({
                              ...scores,
                              [sub.id]: {
                                score: scores[sub.id]?.score ?? '',
                                feedback: e.target.value,
                              },
                            })
                          }
                          className="flex-1 min-w-[220px] px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white"
                        />
                        <button
                          onClick={() => saveGrade(sub.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                        >
                          Simpan Nilai
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: RINGKASAN SEMUA MAPEL */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedSubjectId(s.id);
                setTab('materials');
              }}
              className="card-interactive text-left bg-white p-5 rounded-2xl border border-slate-200 cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {s.className}
                </span>
                <span className="text-xs text-slate-400">{s.academicYear}</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{s.name}</h4>
                {s.teacherName && (
                  <p className="text-xs text-slate-500 mt-0.5">Guru: {s.teacherName}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
                <div>
                  <div className="text-sm font-bold text-slate-900">{s.studentCount}</div>
                  <div className="text-[10px] text-slate-500">Siswa</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-indigo-600">{s.materialCount}</div>
                  <div className="text-[10px] text-slate-500">Materi</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-violet-600">{s.assignmentCount}</div>
                  <div className="text-[10px] text-slate-500">Tugas</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {previewFile && (
        <FileViewerModal
          fileKey={previewFile.key}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
