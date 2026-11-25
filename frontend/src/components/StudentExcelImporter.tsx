import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  Users,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '../lib/api';

export interface ParsedStudentRow {
  nomor: string;
  name: string;
  gender: string;
  nisn: string;
  className: string;
}

interface Props {
  onImportComplete: () => void;
}

export function StudentExcelImporter({ onImportComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedStudentRow[]>([]);
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');
  const [resultMsg, setResultMsg] = useState('');

  function downloadTemplate() {
    const sampleData = [
      {
        Nomor: 1,
        Nama: 'Ahmad Fauzan',
        'Jenis Kelamin': 'Laki-laki',
        NISN: '0098123451',
        Kelas: 'Kelas 6A',
      },
      {
        Nomor: 2,
        Nama: 'Siti Aisyah Putri',
        'Jenis Kelamin': 'Perempuan',
        NISN: '0098123452',
        Kelas: 'Kelas 6A',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(wb, 'Template_Import_Siswa_RuangBelajar.xlsx');
  }

  function parseExcelFile(file: File) {
    setError('');
    setResultMsg('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawGrid = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
          header: 1,
          defval: '',
        });

        if (rawGrid.length < 2) {
          setError('File Excel kosong atau belum memiliki baris data siswa.');
          setRows([]);
          return;
        }

        // Detect header row (matching Nomor | Nama | Jenis Kelamin | NISN | Kelas)
        const headerRow = (rawGrid[0] as unknown[]).map((cell) =>
          String(cell ?? '')
            .trim()
            .toLowerCase()
        );

        const findIdx = (keywords: string[], fallbackIdx: number) => {
          const idx = headerRow.findIndex((h) => keywords.some((k) => h.includes(k)));
          return idx >= 0 ? idx : fallbackIdx;
        };

        const idxNomor = findIdx(['nomor', 'no'], 0);
        const idxNama = findIdx(['nama'], 1);
        const idxGender = findIdx(['jenis kelamin', 'kelamin', 'jk', 'gender'], 2);
        const idxNisn = findIdx(['nisn', 'nis'], 3);
        const idxKelas = findIdx(['kelas', 'rombel'], 4);

        const parsed: ParsedStudentRow[] = [];
        for (let i = 1; i < rawGrid.length; i++) {
          const r = rawGrid[i] as unknown[];
          if (!r || r.length === 0) continue;

          const name = String(r[idxNama] ?? '').trim();
          const nisn = String(r[idxNisn] ?? '').trim();
          const gender = String(r[idxGender] ?? '').trim();
          const className = String(r[idxKelas] ?? '').trim();
          const nomor = String(r[idxNomor] ?? i).trim();

          if (!name && !nisn) continue;
          if (!name || !nisn) continue;

          parsed.push({ nomor, name, gender, nisn, className });
        }

        if (parsed.length === 0) {
          setError(
            'Tidak ditemukan baris valid. Pastikan kolom berisi: Nomor, Nama, Jenis Kelamin, NISN, Kelas.'
          );
          setRows([]);
          return;
        }

        setRows(parsed);
      } catch {
        setError('Gagal membaca file Excel. Pastikan format file adalah .xlsx, .xls, atau .csv.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleRunImport() {
    if (rows.length === 0) return;
    setImporting(true);
    setError('');
    setResultMsg('');
    setProgress({ current: 0, total: rows.length });

    let totalCreated = 0;
    let totalUpdated = 0;
    const BATCH_SIZE = 5; // Safe batch size for Cloudflare Workers PBKDF2 hashing

    try {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const slice = rows.slice(i, i + BATCH_SIZE);
        const res = await apiFetch<{ created: number; updated: number }>(
          '/api/admin/students/import',
          {
            method: 'POST',
            body: JSON.stringify({
              academicYear,
              students: slice.map((s) => ({
                name: s.name,
                gender: s.gender,
                nisn: s.nisn,
                className: s.className,
              })),
            }),
          }
        );
        totalCreated += res.created;
        totalUpdated += res.updated;
        setProgress({ current: Math.min(i + slice.length, rows.length), total: rows.length });
      }

      setResultMsg(
        `Berhasil mengimpor ${rows.length} siswa (${totalCreated} akun baru dibuat, ${totalUpdated} diperbarui)! Siswa dapat langsung login menggunakan Nama & NISN.`
      );
      setRows([]);
      setFileName('');
      onImportComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengimpor sebagian data siswa');
    } finally {
      setImporting(false);
    }
  }

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Import Data Siswa dari Excel (.xlsx)
              </h2>
              <p className="text-xs text-slate-500">
                Format kolom sesuai standar: <strong>Nomor | Nama | Jenis Kelamin | NISN | Kelas</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" /> Unduh Template Excel (.xlsx)
          </button>
        </div>

        {/* Visual Column Format Preview */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
          <div className="text-xs font-bold text-slate-700">
            Contoh Susunan Baris Pertama (Header) di Excel Anda:
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse bg-white rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-emerald-50 text-emerald-900 font-bold border border-emerald-200">
                  <th className="border border-emerald-200 px-3 py-2 text-left">Nomor</th>
                  <th className="border border-emerald-200 px-3 py-2 text-left">Nama</th>
                  <th className="border border-emerald-200 px-3 py-2 text-left">Jenis Kelamin</th>
                  <th className="border border-emerald-200 px-3 py-2 text-left">NISN</th>
                  <th className="border border-emerald-200 px-3 py-2 text-left">Kelas</th>
                </tr>
              </thead>
              <tbody className="text-slate-600">
                <tr>
                  <td className="border border-slate-200 px-3 py-1.5">1</td>
                  <td className="border border-slate-200 px-3 py-1.5">Ahmad Fauzan</td>
                  <td className="border border-slate-200 px-3 py-1.5">Laki-laki</td>
                  <td className="border border-slate-200 px-3 py-1.5 font-mono">0098123451</td>
                  <td className="border border-slate-200 px-3 py-1.5">Kelas 6A</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500">
            * Kelas yang tertulis di kolom <strong>Kelas</strong> akan otomatis dibuatkan (jika belum
            ada) dan siswa otomatis dimasukkan ke kelas tersebut. Password awal siswa otomatis diset ke{' '}
            <strong>NISN</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tahun Ajaran (untuk Kelas Baru)
            </label>
            <input
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="2026/2027"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) parseExcelFile(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition ${
                dragging
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-300 bg-slate-50/60 hover:border-emerald-400 hover:bg-emerald-50/40'
              }`}
            >
              <UploadCloud className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
              <div className="text-xs font-bold text-slate-800">
                {fileName
                  ? `File terpilih: ${fileName}`
                  : 'Klik untuk pilih File Excel (.xlsx / .xls / .csv) atau seret ke sini'}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) parseExcelFile(f);
              }}
              className="hidden"
            />
          </div>
        </div>

        {error && (
          <div className="animate-scale-in p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {resultMsg && (
          <div className="animate-scale-in p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> {resultMsg}
          </div>
        )}

        {importing && (
          <div className="space-y-2 bg-indigo-50 p-4 rounded-xl border border-indigo-200">
            <div className="flex justify-between text-xs font-bold text-indigo-900">
              <span>Membuat akun siswa & mengenkripsi NISN...</span>
              <span>
                {progress.current} / {progress.total} ({pct}%)
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-indigo-200 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 transition-all duration-300 relative overflow-hidden"
                style={{ width: `${pct}%` }}
              >
                <div className="absolute inset-0 w-1/2 bg-white/30 skew-x-12 animate-shimmer" />
              </div>
            </div>
          </div>
        )}

        {rows.length > 0 && !importing && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Users className="w-4 h-4 text-emerald-600" /> Pratinjau {rows.length} Siswa Siap
                Diimpor
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRows([]);
                    setFileName('');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Batal
                </button>
                <button
                  type="button"
                  onClick={handleRunImport}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Proses Import {rows.length} Siswa Sekarang
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5">Nomor</th>
                    <th className="px-3 py-2.5">Nama</th>
                    <th className="px-3 py-2.5">Jenis Kelamin</th>
                    <th className="px-3 py-2.5">NISN (Password Awal)</th>
                    <th className="px-3 py-2.5">Kelas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-500">{r.nomor}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{r.name}</td>
                      <td className="px-3 py-2 text-slate-600">{r.gender || '-'}</td>
                      <td className="px-3 py-2 font-mono font-semibold text-indigo-700">{r.nisn}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                          {r.className || 'Tanpa Kelas'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
