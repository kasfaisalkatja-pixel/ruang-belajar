import { useEffect, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  FileUp,
  Send,
  ArrowLeft,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { apiFetch, downloadProtectedFile } from '../lib/api';

interface TeacherSubject {
  id: string;
  name: string;
  description?: string | null;
  className: string;
  academicYear: string;
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

export function TeacherDashboard() {
  const [subjects, setSubjects] = useState<TeacherSubject[]>([]);
  const [activeSubject, setActiveSubject] = useState<TeacherSubject | null>(null);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [tab, setTab] = useState<'materials' | 'assignments'>('materials');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form Materi
  const [mTitle, setMTitle] = useState('');
  const [mContent, setMContent] = useState('');
  const [mVideo, setMVideo] = useState('');
  const [mFile, setMFile] = useState<File | null>(null);

  // Form Tugas
  const [aTitle, setATitle] = useState('');
  const [aDesc, setADesc] = useState('');
  const [aDue, setADue] = useState('');
  const [aMax, setAMax] = useState(100);
  const [aFile, setAFile] = useState<File | null>(null);

  // Penilaian Tugas
  const [gradingAssignment, setGradingAssignment] = useState<AssignmentItem | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [scores, setScores] = useState<Record<string, { score: string; feedback: string }>>({});

  async function loadDashboard() {
    const res = await apiFetch<{ subjects: TeacherSubject[] }>('/api/learning/dashboard');
    setSubjects(res.subjects);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function openSubject(subj: TeacherSubject) {
    setActiveSubject(subj);
    setGradingAssignment(null);
    const res = await apiFetch<{
      totalStudents: number;
      materials: MaterialItem[];
      assignments: AssignmentItem[];
    }>(`/api/learning/subjects/${subj.id}`);
    setTotalStudents(res.totalStudents);
    setMaterials(res.materials);
    setAssignments(res.assignments);
  }

  async function handleSendMaterial(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSubject) return;
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('title', mTitle);
      fd.append('content', mContent);
      if (mVideo) fd.append('videoUrl', mVideo);
      if (mFile) fd.append('file', mFile);

      await apiFetch(`/api/learning/subjects/${activeSubject.id}/materials`, {
        method: 'POST',
        body: fd,
      });
      setMTitle('');
      setMContent('');
      setMVideo('');
      setMFile(null);
      setSuccess('Materi berhasil dikirim ke seluruh siswa di kelas!');
      openSubject(activeSubject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim materi');
    }
  }

  async function handleSendAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!activeSubject) return;
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('title', aTitle);
      fd.append('description', aDesc);
      fd.append('dueDate', aDue);
      fd.append('maxScore', String(aMax));
      if (aFile) fd.append('file', aFile);

      await apiFetch(`/api/learning/subjects/${activeSubject.id}/assignments`, {
        method: 'POST',
        body: fd,
      });
      setATitle('');
      setADesc('');
      setADue('');
      setAFile(null);
      setSuccess('Tugas berhasil dikirim ke seluruh siswa di kelas!');
      openSubject(activeSubject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim tugas');
    }
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
    if (!entry) return;
    await apiFetch(`/api/learning/submissions/${submissionId}/grade`, {
      method: 'PATCH',
      body: JSON.stringify({
        score: Number(entry.score),
        feedback: entry.feedback,
      }),
    });
    setSuccess('Nilai berhasil disimpan');
    if (gradingAssignment) openGrading(gradingAssignment);
  }

  if (!activeSubject) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Mata Pelajaran yang Anda Ampu</h2>
          <p className="text-sm text-slate-500">
            Pilih mata pelajaran untuk mengirim materi dan tugas ke akun siswa.
          </p>
        </div>

        {subjects.length === 0 ? (
          <div className="bg-white p-6 rounded-xl border border-slate-200 text-sm text-slate-500">
            Belum ada mata pelajaran yang ditugaskan kepada Anda. Hubungi Admin sekolah.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => openSubject(s)}
                className="text-left bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-sm transition cursor-pointer"
              >
                <div className="text-xs font-semibold text-indigo-600 mb-1">
                  {s.className} • {s.academicYear}
                </div>
                <div className="text-base font-bold text-slate-900">{s.name}</div>
                {s.description && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{s.description}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => setActiveSubject(null)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Mapel
        </button>
        <div className="text-right">
          <div className="text-xs font-semibold text-indigo-600">{activeSubject.className}</div>
          <h2 className="text-lg font-bold text-slate-900">{activeSubject.name}</h2>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}

      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => {
            setTab('materials');
            setGradingAssignment(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
            tab === 'materials'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Materi Belajar ({materials.length})
        </button>
        <button
          onClick={() => setTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
            tab === 'assignments'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Tugas Siswa ({assignments.length})
        </button>
      </div>

      {tab === 'materials' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSendMaterial}
            className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 h-fit"
          >
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" /> Kirim Materi Baru
            </h3>
            <input
              required
              placeholder="Judul Materi"
              value={mTitle}
              onChange={(e) => setMTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <textarea
              required
              rows={5}
              placeholder="Isi / ringkasan materi..."
              value={mContent}
              onChange={(e) => setMContent(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <input
              placeholder="Link Video Pembelajaran (opsional)"
              value={mVideo}
              onChange={(e) => setMVideo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <label className="block text-xs text-slate-600">
              Lampiran File (PDF/PPT/Gambar, opsional):
              <input
                type="file"
                onChange={(e) => setMFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-xs text-slate-500"
              />
            </label>
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium cursor-pointer"
            >
              Kirim ke Siswa
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            {materials.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-sm text-slate-500">
                Belum ada materi yang dikirim.
              </div>
            ) : (
              materials.map((m) => (
                <div key={m.id} className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-bold text-slate-900">{m.title}</h4>
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full shrink-0">
                      Dibaca {m.readCount}/{totalStudents} siswa
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.content}</p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    {m.fileKey && (
                      <button
                        onClick={() => downloadProtectedFile(m.fileKey!, m.fileName)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> {m.fileName || 'Unduh Lampiran'}
                      </button>
                    )}
                    {m.videoUrl && (
                      <a
                        href={m.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-sky-600 hover:underline"
                      >
                        Tonton Video Pembelajaran →
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'assignments' && !gradingAssignment && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSendAssignment}
            className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 h-fit"
          >
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileUp className="w-4 h-4 text-indigo-600" /> Buat Tugas Baru
            </h3>
            <input
              required
              placeholder="Judul Tugas"
              value={aTitle}
              onChange={(e) => setATitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <textarea
              required
              rows={4}
              placeholder="Instruksi pengerjaan tugas..."
              value={aDesc}
              onChange={(e) => setADesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
            <div>
              <label className="block text-xs text-slate-600 mb-1">Tenggat Waktu</label>
              <input
                required
                type="datetime-local"
                value={aDue}
                onChange={(e) => setADue(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Nilai Maksimal</label>
              <input
                type="number"
                value={aMax}
                onChange={(e) => setAMax(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <label className="block text-xs text-slate-600">
              Lampiran Soal/Lembar Kerja (opsional):
              <input
                type="file"
                onChange={(e) => setAFile(e.target.files?.[0] || null)}
                className="mt-1 block w-full text-xs text-slate-500"
              />
            </label>
            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium cursor-pointer"
            >
              Kirim Tugas ke Siswa
            </button>
          </form>

          <div className="lg:col-span-2 space-y-3">
            {assignments.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-sm text-slate-500">
                Belum ada tugas yang dibuat.
              </div>
            ) : (
              assignments.map((a) => (
                <div key={a.id} className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900">{a.title}</h4>
                      <p className="text-xs text-slate-500">
                        Batas: {new Date(a.dueDate).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <button
                      onClick={() => openGrading(a)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Periksa & Nilai ({a.submissionCount}/{totalStudents})
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'assignments' && gradingAssignment && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-slate-900">
                Pengumpulan Tugas: {gradingAssignment.title}
              </h3>
              <p className="text-xs text-slate-500">Nilai maksimal: {gradingAssignment.maxScore}</p>
            </div>
            <button
              onClick={() => setGradingAssignment(null)}
              className="text-sm text-slate-600 hover:text-indigo-600 cursor-pointer"
            >
              ← Tutup
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {submissions.map((row) => {
              const sub = row.submission;
              return (
                <div key={row.studentId} className="py-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900">{row.studentName}</span>
                      {row.identityNumber && (
                        <span className="text-xs text-slate-500 ml-2">({row.identityNumber})</span>
                      )}
                    </div>
                    {sub ? (
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                        Dikumpulkan {new Date(sub.submittedAt).toLocaleString('id-ID')}
                      </span>
                    ) : (
                      <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                        Belum mengumpulkan
                      </span>
                    )}
                  </div>

                  {sub && (
                    <div className="bg-slate-50 p-3 rounded-lg space-y-2 text-sm">
                      {sub.content && <p className="text-slate-700 whitespace-pre-wrap">{sub.content}</p>}
                      {sub.fileKey && (
                        <button
                          onClick={() => downloadProtectedFile(sub.fileKey!, sub.fileName)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> {sub.fileName || 'Unduh Jawaban'}
                        </button>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
                        <input
                          type="number"
                          placeholder="Nilai"
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
                          className="w-24 px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                        />
                        <input
                          placeholder="Catatan / umpan balik guru"
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
                          className="flex-1 min-w-[200px] px-2.5 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
                        />
                        <button
                          onClick={() => saveGrade(sub.id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
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
    </div>
  );
}
