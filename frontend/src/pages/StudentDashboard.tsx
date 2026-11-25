import { useEffect, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  CheckCircle2,
  Clock,
  Download,
  ArrowLeft,
  Send,
} from 'lucide-react';
import { apiFetch, downloadProtectedFile } from '../lib/api';

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
  title: string;
  description: string;
  fileKey?: string | null;
  fileName?: string | null;
  dueDate: string;
  maxScore: number;
  submission: SubmissionItem | null;
}

export function StudentDashboard() {
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [recentMaterials, setRecentMaterials] = useState<MaterialItem[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<AssignmentItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<StudentSubject | null>(null);
  const [subjectMaterials, setSubjectMaterials] = useState<MaterialItem[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<AssignmentItem[]>([]);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadDashboard() {
    const res = await apiFetch<{
      subjects: StudentSubject[];
      recentMaterials: MaterialItem[];
      activeAssignments: AssignmentItem[];
    }>('/api/learning/dashboard');
    setSubjects(res.subjects);
    setRecentMaterials(res.recentMaterials);
    setActiveAssignments(res.activeAssignments);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function openSubject(subj: StudentSubject) {
    setSelectedSubject(subj);
    const res = await apiFetch<{
      materials: MaterialItem[];
      assignments: AssignmentItem[];
    }>(`/api/learning/subjects/${subj.id}`);
    setSubjectMaterials(res.materials);
    setSubjectAssignments(res.assignments);
  }

  async function markAsRead(materialId: string) {
    await apiFetch(`/api/learning/materials/${materialId}/read`, { method: 'POST' });
    if (selectedSubject) {
      openSubject(selectedSubject);
    } else {
      loadDashboard();
    }
  }

  async function handleSubmitAssignment(e: React.FormEvent, assignmentId: string) {
    e.preventDefault();
    setError('');
    setMessage('');
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
      setMessage('Tugas berhasil dikumpulkan!');
      if (selectedSubject) openSubject(selectedSubject);
      else loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengumpulkan tugas');
    }
  }

  const renderMaterialCard = (m: MaterialItem) => (
    <div key={m.id} className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          {m.subjectName && (
            <span className="text-xs font-semibold text-indigo-600">{m.subjectName}</span>
          )}
          <h4 className="font-bold text-slate-900">{m.title}</h4>
        </div>
        {m.isRead ? (
          <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Dibaca
          </span>
        ) : (
          <button
            onClick={() => markAsRead(m.id)}
            className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium shrink-0 cursor-pointer"
          >
            Tandai Sudah Dibaca
          </button>
        )}
      </div>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{m.content}</p>
      <div className="flex flex-wrap gap-3 pt-2">
        {m.fileKey && (
          <button
            onClick={() => downloadProtectedFile(m.fileKey!, m.fileName)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> {m.fileName || 'Unduh Materi'}
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
  );

  const renderAssignmentCard = (a: AssignmentItem) => {
    const sub = a.submission;
    return (
      <div key={a.id} className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            {a.subjectName && (
              <span className="text-xs font-semibold text-indigo-600">{a.subjectName}</span>
            )}
            <h4 className="font-bold text-slate-900">{a.title}</h4>
            <p className="text-xs text-slate-500">
              Tenggat: {new Date(a.dueDate).toLocaleString('id-ID')}
            </p>
          </div>

          {sub ? (
            sub.score != null ? (
              <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">
                Nilai: {sub.score}/{a.maxScore}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Dikumpulkan
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
              <Clock className="w-3.5 h-3.5" /> Belum Dikerjakan
            </span>
          )}
        </div>

        <p className="text-sm text-slate-700 whitespace-pre-wrap">{a.description}</p>

        {a.fileKey && (
          <button
            onClick={() => downloadProtectedFile(a.fileKey!, a.fileName)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> {a.fileName || 'Unduh Lampiran Soal'}
          </button>
        )}

        {sub?.feedback && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            <strong>Catatan Guru:</strong> {sub.feedback}
          </div>
        )}

        {submittingId === a.id ? (
          <form
            onSubmit={(e) => handleSubmitAssignment(e, a.id)}
            className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3"
          >
            <textarea
              rows={3}
              placeholder="Tulis jawaban Anda di sini (atau unggah file di bawah)..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
            />
            <input
              type="file"
              onChange={(e) => setAnswerFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Kirim Jawaban
              </button>
              <button
                type="button"
                onClick={() => setSubmittingId(null)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-600 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <div>
            <button
              onClick={() => {
                setSubmittingId(a.id);
                setAnswerText(sub?.content || '');
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
            >
              {sub ? 'Perbarui Jawaban' : 'Kerjakan / Kumpulkan Tugas'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {message}
        </div>
      )}

      {selectedSubject ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedSubject(null)}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
            </button>
            <div className="text-right">
              <div className="text-xs font-semibold text-indigo-600">
                {selectedSubject.className} • {selectedSubject.teacherName}
              </div>
              <h2 className="text-lg font-bold text-slate-900">{selectedSubject.name}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" /> Materi Pembelajaran
              </h3>
              {subjectMaterials.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada materi.</p>
              ) : (
                subjectMaterials.map(renderMaterialCard)
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" /> Daftar Tugas
              </h3>
              {subjectAssignments.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada tugas.</p>
              ) : (
                subjectAssignments.map(renderAssignmentCard)
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">Mata Pelajaran Kelas Anda</h2>
            {subjects.length === 0 ? (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-sm text-slate-500">
                Anda belum terdaftar di kelas mana pun. Hubungi Admin sekolah.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openSubject(s)}
                    className="text-left bg-white p-5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-sm transition cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-indigo-600 mb-1">{s.className}</div>
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500 mt-1">Guru: {s.teacherName}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" /> Materi Terbaru dari Guru
              </h3>
              {recentMaterials.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada materi terbaru.</p>
              ) : (
                recentMaterials.map(renderMaterialCard)
              )}
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-indigo-600" /> Tugas Anda
              </h3>
              {activeAssignments.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada tugas aktif.</p>
              ) : (
                activeAssignments.map(renderAssignmentCard)
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
