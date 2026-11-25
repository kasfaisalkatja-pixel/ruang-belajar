import { useEffect, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Send,
  Award,
  Video,
  Sparkles,
  Layers,
} from 'lucide-react';
import { apiFetch, downloadProtectedFile, getFileBadgeMeta, User } from '../lib/api';
import { FileDropzone } from '../components/FileDropzone';
import { FileViewerModal } from '../components/FileViewerModal';

interface StudentSubject {
  id: string;
  name: string;
  description?: string | null;
  className: string;
  teacherName: string;
}

interface MaterialItem {
  id: string;
  subjectId: string;
  subjectName?: string;
  teacherName?: string;
  title: string;
  content: string;
  fileKey?: string | null;
  fileName?: string | null;
  videoUrl?: string | null;
  createdAt: string;
  isRead: boolean;
}

interface SubmissionItem {
  id: string;
  content?: string | null;
  fileKey?: string | null;
  fileName?: string | null;
  score?: number | null;
  feedback?: string | null;
  submittedAt: string;
}

interface AssignmentItem {
  id: string;
  subjectId: string;
  subjectName?: string;
  teacherName?: string;
  title: string;
  description: string;
  fileKey?: string | null;
  fileName?: string | null;
  dueDate: string;
  maxScore: number;
  submission: SubmissionItem | null;
}

interface Props {
  user: User;
}

export function StudentDashboard({ user }: Props) {
  const [tab, setTab] = useState<'home' | 'materials' | 'assignments' | 'grades'>('home');
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');

  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  const [previewFile, setPreviewFile] = useState<{ key: string; name?: string | null } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadDashboard() {
    try {
      const res = await apiFetch<{
        subjects: StudentSubject[];
        recentMaterials: MaterialItem[];
        activeAssignments: AssignmentItem[];
      }>('/api/learning/dashboard');
      setSubjects(res.subjects);
      setMaterials(res.recentMaterials);
      setAssignments(res.activeAssignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat ruang belajar');
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function markAsRead(materialId: string) {
    await apiFetch(`/api/learning/materials/${materialId}/read`, { method: 'POST' });
    loadDashboard();
  }

  async function openMaterialAttachment(m: MaterialItem) {
    if (!m.isRead) {
      apiFetch(`/api/learning/materials/${m.id}/read`, { method: 'POST' }).then(() =>
        loadDashboard()
      );
    }
    if (m.fileKey) {
      setPreviewFile({ key: m.fileKey, name: m.fileName });
    }
  }

  async function handleSubmitAssignment(e: React.FormEvent, assignmentId: string) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSending(true);
    try {
      const fd = new FormData();
      if (answerText) fd.append('content', answerText);
      if (answerFile) fd.append('file', answerFile);

      await apiFetch(`/api/learning/assignments/${assignmentId}/submit`, {
        method: 'POST',
        body: fd,
      });
      setSubmittingId(null);
      setAnswerText('');
      setAnswerFile(null);
      setMessage('Jawaban tugas berhasil dikirim ke Guru!');
      loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengumpulkan tugas');
    } finally {
      setSending(false);
    }
  }

  const unreadCount = materials.filter((m) => !m.isRead).length;
  const pendingAssignments = assignments.filter((a) => !a.submission).length;
  const gradedList = assignments.filter((a) => a.submission?.score != null);
  const avgScore =
    gradedList.length > 0
      ? Math.round(
          gradedList.reduce((acc, a) => acc + (a.submission?.score ?? 0), 0) / gradedList.length
        )
      : null;

  const filteredMaterials =
    filterSubjectId === 'all'
      ? materials
      : materials.filter((m) => m.subjectId === filterSubjectId);

  const filteredAssignments =
    filterSubjectId === 'all'
      ? assignments
      : assignments.filter((a) => a.subjectId === filterSubjectId);

  const renderMaterialCard = (m: MaterialItem) => {
    const badge = m.fileName ? getFileBadgeMeta(m.fileName) : null;
    return (
      <div
        key={m.id}
        className="card-interactive bg-white p-5 rounded-2xl border border-slate-200 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            {m.subjectName && (
              <span className="inline-block text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full mb-1">
                {m.subjectName}
              </span>
            )}
            <h4 className="font-bold text-slate-900 text-base">{m.title}</h4>
            {m.teacherName && <p className="text-xs text-slate-400">Oleh {m.teacherName}</p>}
          </div>

          {m.isRead ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Dibaca
            </span>
          ) : (
            <button
              onClick={() => markAsRead(m.id)}
              className="text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1 rounded-full shrink-0 cursor-pointer"
            >
              Tandai Selesai Baca
            </button>
          )}
        </div>

        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{m.content}</p>

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
                  onClick={() => openMaterialAttachment(m)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> {badge.isPdf ? 'Baca Modul PDF' : 'Buka Dokumen'}{' '}
                  ({m.fileName})
                </button>
                <button
                  onClick={() => downloadProtectedFile(m.fileKey!, m.fileName)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold"
              >
                <Video className="w-3.5 h-3.5" /> Tonton Video Materi
              </a>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAssignmentCard = (a: AssignmentItem) => {
    const sub = a.submission;
    const badge = a.fileName ? getFileBadgeMeta(a.fileName) : null;
    const isOverdue = new Date(a.dueDate).getTime() < Date.now() && !sub;

    return (
      <div
        key={a.id}
        className="card-interactive bg-white p-5 rounded-2xl border border-slate-200 space-y-3"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {a.subjectName && (
              <span className="inline-block text-[11px] font-bold text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-full mb-1">
                {a.subjectName}
              </span>
            )}
            <h4 className="font-bold text-slate-900 text-base">{a.title}</h4>
            <p className={`text-xs mt-0.5 ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
              Batas Pengumpulan: {new Date(a.dueDate).toLocaleString('id-ID')}
              {isOverdue ? ' (Melewati Tenggat)' : ''}
            </p>
          </div>

          {sub ? (
            sub.score != null ? (
              <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-3.5 py-1 rounded-full">
                Nilai: {sub.score}/{a.maxScore}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-sky-50 text-sky-700 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Dikumpulkan
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5" /> Belum Dikerjakan
            </span>
          )}
        </div>

        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{a.description}</p>

        {a.fileKey && badge && (
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${badge.colorClass}`}>
              {badge.label}
            </span>
            <button
              onClick={() => setPreviewFile({ key: a.fileKey!, name: a.fileName })}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> Buka Lampiran Soal ({a.fileName})
            </button>
            <button
              onClick={() => downloadProtectedFile(a.fileKey!, a.fileName)}
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-600 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Unduh Soal
            </button>
          </div>
        )}

        {sub?.feedback && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <strong>Umpan Balik Guru:</strong> {sub.feedback}
          </div>
        )}

        {submittingId === a.id ? (
          <form
            onSubmit={(e) => handleSubmitAssignment(e, a.id)}
            className="animate-scale-in bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3"
          >
            <textarea
              rows={3}
              placeholder="Ketik jawaban langsung di sini (opsional jika mengunggah file)..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm bg-white"
            />
            <FileDropzone
              file={answerFile}
              onChange={setAnswerFile}
              label="Unggah File Jawaban (PDF / Microsoft Word / Foto Tugas)"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> {sending ? 'Mengirim...' : 'Kirim Jawaban'}
              </button>
              <button
                type="button"
                onClick={() => setSubmittingId(null)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <div className="pt-1">
            <button
              onClick={() => {
                setSubmittingId(a.id);
                setAnswerText(sub?.content || '');
                setAnswerFile(null);
              }}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              {sub ? 'Perbarui Jawaban / File' : 'Kerjakan & Unggah Tugas'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 px-3 py-1 rounded-full mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Ruang Belajar Siswa
            </div>
            <h2 className="text-2xl font-extrabold">Halo, {user.name}!</h2>
            <p className="text-xs text-indigo-100 mt-1">
              Semua materi modul (PDF/Word) dan tugas dari Bapak/Ibu Guru kelasmu tersedia di sini.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2.5">
              <div className="text-xl font-extrabold">{unreadCount}</div>
              <div className="text-[11px] text-indigo-100">Materi Baru</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2.5">
              <div className="text-xl font-extrabold">{pendingAssignments}</div>
              <div className="text-[11px] text-indigo-100">Tugas Aktif</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2.5">
              <div className="text-xl font-extrabold">{avgScore ?? '-'}</div>
              <div className="text-[11px] text-indigo-100">Rata Nilai</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'home', label: 'Beranda Kelas', icon: Layers },
            { id: 'materials', label: `Materi (${materials.length})`, icon: BookOpen },
            { id: 'assignments', label: `Tugas (${assignments.length})`, icon: ClipboardList },
            { id: 'grades', label: 'Rekap Nilai', icon: Award },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id as typeof tab)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  tab === item.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'
                }`}
              >
                <Icon className="w-4 h-4" /> {item.label}
              </button>
            );
          })}
        </div>

        {subjects.length > 0 && tab !== 'grades' && (
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="all">Semua Mata Pelajaran</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.teacherName})
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="animate-scale-in p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {message}
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
          Akun Anda belum dimasukkan ke dalam kelas oleh Admin sekolah.
        </div>
      ) : (
        <>
          {tab === 'home' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setFilterSubjectId(s.id);
                      setTab('materials');
                    }}
                    className="card-interactive text-left bg-white p-5 rounded-2xl border border-slate-200 cursor-pointer"
                  >
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                      {s.className}
                    </span>
                    <div className="font-bold text-slate-900 text-base mt-2">{s.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Guru: {s.teacherName}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" /> Materi Terbaru
                  </h3>
                  {filteredMaterials.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada materi.</p>
                  ) : (
                    filteredMaterials.slice(0, 5).map(renderMaterialCard)
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-violet-600" /> Tugas Terbaru
                  </h3>
                  {filteredAssignments.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada tugas.</p>
                  ) : (
                    filteredAssignments.slice(0, 5).map(renderAssignmentCard)
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'materials' && (
            <div className="space-y-4">
              {filteredMaterials.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
                  Belum ada materi pembelajaran untuk pilihan ini.
                </div>
              ) : (
                filteredMaterials.map(renderMaterialCard)
              )}
            </div>
          )}

          {tab === 'assignments' && (
            <div className="space-y-4">
              {filteredAssignments.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
                  Belum ada tugas untuk pilihan ini.
                </div>
              ) : (
                filteredAssignments.map(renderAssignmentCard)
              )}
            </div>
          )}

          {tab === 'grades' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-200 font-bold text-slate-900">
                Rekap Nilai & Umpan Balik Tugas
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3">Mata Pelajaran</th>
                      <th className="px-4 py-3">Judul Tugas</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Nilai</th>
                      <th className="px-4 py-3">Catatan Guru</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-3 font-semibold text-indigo-700">
                          {a.subjectName}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{a.title}</td>
                        <td className="px-4 py-3">
                          {a.submission ? (
                            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">
                              Terkumpul
                            </span>
                          ) : (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold">
                              Belum
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {a.submission?.score != null
                            ? `${a.submission.score} / ${a.maxScore}`
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {a.submission?.feedback || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
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
