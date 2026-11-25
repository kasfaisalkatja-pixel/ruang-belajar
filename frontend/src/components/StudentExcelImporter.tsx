import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  Users,
  Trash2,
  SlidersHorizontal,
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

function colLetter(idx: number): string {
  let s = '';
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function isGenderValue(val: string): boolean {
  const v = val.trim().toLowerCase();
  return v === 'laki-laki' || v === 'laki - laki' || v === 'perempuan' || v === 'l' || v === 'p';
}

export function StudentExcelImporter({ onImportComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawGrid, setRawGrid] = useState<unknown[][]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [colMap, setColMap] = useState({
    nomor: 0,
    nama: 1,
    gender: 2,
    nisn: 3,
    kelas: 4,
  });

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
        Kelas: 'Kelas VII',
      },
      {
        Nomor: 2,
        Nama: 'Siti Aisyah Putri',
        'Jenis Kelamin': 'Perempuan',
        NISN: '0098123452',
        Kelas: 'Kelas VII',
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
        const grid = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
          header: 1,
          defval: '',
          raw: false,
        });

        if (grid.length < 2) {
          setError('File Excel kosong atau belum memiliki baris data siswa.');
          setRawGrid([]);
          return;
        }

        // 1. Scan up to first 20 rows to locate header row
        let detectedHeaderIdx = 0;
        for (let rIdx = 0; rIdx < Math.min(grid.length, 20); rIdx++) {
          const cells = (grid[rIdx] as unknown[]).map((c) =>
            String(c ?? '')
              .trim()
              .toLowerCase()
          );
          const hasNama = cells.some((c) => c.includes('nama'));
          const hasOther = cells.some(
            (c) => c.includes('kelamin') || c.includes('kelas') || c.replace(/[^a-z]/g, '') === 'nisn'
          );
          if (hasNama && hasOther) {
            detectedHeaderIdx = rIdx;
            break;
          }
        }

        const headerCells = (grid[detectedHeaderIdx] as unknown[]).map((cell) =>
          String(cell ?? '').trim()
        );
        const maxCols = Math.max(
          headerCells.length,
          ...grid.slice(detectedHeaderIdx + 1, detectedHeaderIdx + 10).map((r) => (r as unknown[]).length)
        );

        const used = new Set<number>();
        const pickCol = (predicate: (rawLower: string, cleanAlphaNum: string) => boolean): number => {
          for (let c = 0; c < maxCols; c++) {
            if (used.has(c)) continue;
            const rawLower = String(headerCells[c] ?? '')
              .trim()
              .toLowerCase();
            const clean = rawLower.replace(/[^a-z0-9]/g, '');
            if (!rawLower) continue;
            if (predicate(rawLower, clean)) {
              used.add(c);
              return c;
            }
          }
          return -1;
        };

        // Match in strict order so "Jenis Kelamin" is claimed BEFORE anything else, and NISN never touches "jenis"!
        let idxNomor = pickCol((_, clean) => clean === 'nomor' || clean === 'no' || clean === 'nourut');
        let idxNama = pickCol((raw) => raw.includes('nama') && !raw.includes('kelas'));
        let idxGender = pickCol(
          (raw, clean) =>
            raw.includes('kelamin') || clean === 'jk' || clean === 'lp' || clean === 'gender'
        );
        let idxKelas = pickCol((raw) => raw.includes('kelas') || raw.includes('rombel'));
        let idxNisn = pickCol(
          (raw, clean) =>
            !raw.includes('jenis') &&
            (clean === 'nisn' ||
              clean === 'nis' ||
              clean.includes('nisn') ||
              raw.includes('no induk') ||
              raw.includes('nomor induk'))
        );

        // Smart data-driven detection if NISN header was unusual or blank:
        // Look at sample data rows for an unused column containing 4-15 digit numbers!
        const sampleRows = grid.slice(detectedHeaderIdx + 1, detectedHeaderIdx + 12) as unknown[][];
        if (idxNisn === -1) {
          let bestCol = -1;
          let bestNumericHits = 0;
          for (let c = 0; c < maxCols; c++) {
            if (used.has(c)) continue;
            let hits = 0;
            for (const sr of sampleRows) {
              const val = String(sr?.[c] ?? '').trim().replace(/\s+/g, '');
              if (/^\d{4,15}$/.test(val)) hits++;
            }
            if (hits > bestNumericHits) {
              bestNumericHits = hits;
              bestCol = c;
            }
          }
          if (bestCol !== -1) {
            idxNisn = bestCol;
            used.add(bestCol);
          }
        }

        // Assign safe non-overlapping fallbacks for any remaining -1 indices
        const nextUnused = () => {
          for (let c = 0; c < Math.max(maxCols, 5); c++) {
            if (!used.has(c)) {
              used.add(c);
              return c;
            }
          }
          return 0;
        };

        if (idxNomor === -1) idxNomor = nextUnused();
        if (idxNama === -1) idxNama = nextUnused();
        if (idxGender === -1) idxGender = nextUnused();
        if (idxNisn === -1) idxNisn = nextUnused();
        if (idxKelas === -1) idxKelas = nextUnused();

        setHeaderRowIndex(detectedHeaderIdx);
        setColMap({
          nomor: idxNomor,
          nama: idxNama,
          gender: idxGender,
          nisn: idxNisn,
          kelas: idxKelas,
        });
        setRawGrid(grid);
      } catch {
        setError('Gagal membaca file Excel. Pastikan format file adalah .xlsx, .xls, atau .csv.');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  const columnOptions = useMemo(() => {
    if (rawGrid.length === 0) return [];
    const headerCells = (rawGrid[headerRowIndex] as unknown[]) || [];
    const firstData = (rawGrid[headerRowIndex + 1] as unknown[]) || [];
    const maxLen = Math.max(headerCells.length, firstData.length, 5);
    const opts: Array<{ index: number; label: string }> = [];
    for (let c = 0; c < maxLen; c++) {
      const h = String(headerCells[c] ?? '').trim();
      const sample = String(firstData[c] ?? '').trim();
      opts.push({
        index: c,
        label: `Kolom ${colLetter(c)}: ${h || '(Tanpa Judul)'}${sample ? ` [Contoh: ${sample}]` : ''}`,
      });
    }
    return opts;
  }, [rawGrid, headerRowIndex]);

  const rows = useMemo<ParsedStudentRow[]>(() => {
    if (rawGrid.length === 0) return [];
    const parsed: ParsedStudentRow[] = [];
    for (let i = headerRowIndex + 1; i < rawGrid.length; i++) {
      const r = rawGrid[i] as unknown[];
      if (!r || r.length === 0) continue;

      const name = String(r[colMap.nama] ?? '').trim();
      const nisn = String(r[colMap.nisn] ?? '')
        .trim()
        .replace(/\s+/g, '');
      const gender = String(r[colMap.gender] ?? '').trim();
      const className = String(r[colMap.kelas] ?? '').trim();
      const nomor = String(r[colMap.nomor] ?? parsed.length + 1).trim();

      if (!name && !nisn) continue;
      if (!name) continue;

      parsed.push({ nomor, name, gender, nisn, className });
    }
    return parsed;
  }, [rawGrid, headerRowIndex, colMap]);

  const invalidNisnRows = rows.filter((r) => !r.nisn || isGenderValue(r.nisn));

  async function handleRunImport() {
    if (rows.length === 0) return;
    if (invalidNisnRows.length > 0) {
      setError(
        `Kolom NISN masih berisi teks kosong atau Jenis Kelamin ("${invalidNisnRows[0].nisn}"). Silakan sesuaikan pilihan "Kolom NISN" di bawah atau isi angka NISN di file Excel Anda.`
      );
      return;
    }

    setImporting(true);
    setError('');
    setResultMsg('');
    setProgress({ current: 0, total: rows.length });

    let totalCreated = 0;
    let totalUpdated = 0;
    const BATCH_SIZE = 5;

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
        `Selesai! ${totalCreated + totalUpdated} siswa berhasil disimpan (${totalCreated} akun baru dibuat, ${totalUpdated} diperbarui).`
      );
      setRawGrid([]);
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
                Format kolom standar: <strong>Nomor | Nama | Jenis Kelamin | NISN | Kelas</strong>
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
              className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition ${dragging
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

        {/* Interactive Column Mapping Selector so Admin can verify or switch any column immediately */}
        {rawGrid.length > 0 && !importing && (
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-indigo-950">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" /> Pencocokan Kolom Excel
              (Otomatis Terdeteksi — Bisa Disesuaikan Jika Posisi Kolom Berbeda)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kolom Nama Siswa
                </label>
                <select
                  value={colMap.nama}
                  onChange={(e) => setColMap({ ...colMap, nama: Number(e.target.value) })}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {columnOptions.map((o) => (
                    <option key={o.index} value={o.index}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kolom Jenis Kelamin
                </label>
                <select
                  value={colMap.gender}
                  onChange={(e) => setColMap({ ...colMap, gender: Number(e.target.value) })}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {columnOptions.map((o) => (
                    <option key={o.index} value={o.index}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-indigo-700 mb-1">
                  Kolom NISN (Password Awal) *
                </label>
                <select
                  value={colMap.nisn}
                  onChange={(e) => setColMap({ ...colMap, nisn: Number(e.target.value) })}
                  className={`w-full px-2.5 py-2 bg-white border rounded-xl text-xs font-bold ${
                    invalidNisnRows.length > 0
                      ? 'border-rose-500 ring-2 ring-rose-200 text-rose-700'
                      : 'border-indigo-400 text-indigo-800'
                  }`}
                >
                  {columnOptions.map((o) => (
                    <option key={o.index} value={o.index}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kolom Kelas
                </label>
                <select
                  value={colMap.kelas}
                  onChange={(e) => setColMap({ ...colMap, kelas: Number(e.target.value) })}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {columnOptions.map((o) => (
                    <option key={o.index} value={o.index}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {invalidNisnRows.length > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Kolom NISN saat ini masih terbaca kosong atau berisi Jenis Kelamin (
              {invalidNisnRows[0].nisn || 'Kosong'}). Silakan pilih kolom yang berisi angka NISN pada
              pilihan <strong>"Kolom NISN (Password Awal)"</strong> di atas (atau pastikan kolom NISN
              di Excel Anda sudah terisi angka NISN).
            </span>
          </div>
        )}

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
              <span>Menyimpan data siswa ke database...</span>
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
                    setRawGrid([]);
                    setFileName('');
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Batal
                </button>
                <button
                  type="button"
                  disabled={invalidNisnRows.length > 0}
                  onClick={handleRunImport}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer"
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
                  {rows.map((r, i) => {
                    const badNisn = !r.nisn || isGenderValue(r.nisn);
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-500">{r.nomor}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{r.name}</td>
                        <td className="px-3 py-2 text-slate-600">{r.gender || '-'}</td>
                        <td
                          className={`px-3 py-2 font-mono font-bold ${
                            badNisn ? 'text-rose-600 bg-rose-50' : 'text-indigo-700'
                          }`}
                        >
                          {r.nisn || '(Kosong)'}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold">
                            {r.className || 'Tanpa Kelas'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
