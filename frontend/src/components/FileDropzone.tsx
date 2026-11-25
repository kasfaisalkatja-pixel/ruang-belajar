import { useRef, useState } from 'react';
import { UploadCloud, FileText, X, CheckCircle2 } from 'lucide-react';
import { getFileBadgeMeta } from '../lib/api';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  label?: string;
  helperText?: string;
}

export function FileDropzone({
  file,
  onChange,
  label = 'Lampiran Dokumen (PDF, Word, PPT, Gambar)',
  helperText = 'Mendukung .pdf, .doc, .docx, .ppt, .pptx, .jpg, .png (Maks. 10 MB)',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onChange(dropped);
  }

  const badge = file ? getFileBadgeMeta(file.name) : null;
  const sizeText = file
    ? file.size >= 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`
    : '';

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700">{label}</label>

      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`group cursor-pointer rounded-xl border-2 border-dashed p-4 text-center transition-all duration-200 ${
            dragging
              ? 'border-indigo-500 bg-indigo-50/80 scale-[1.01]'
              : 'border-slate-300 bg-slate-50/70 hover:border-indigo-400 hover:bg-indigo-50/40'
          }`}
        >
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200 text-indigo-600 group-hover:scale-110 transition-transform">
            <UploadCloud className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold text-slate-700">
            Klik untuk pilih file atau <span className="text-indigo-600">seret PDF / Word ke sini</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-700">
              PDF
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700">
              WORD (.DOCX)
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-700">
              PPT
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-700">
              GAMBAR
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">{helperText}</p>
        </div>
      ) : (
        <div className="animate-scale-in flex items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-indigo-100 text-indigo-600 shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {badge && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${badge.colorClass}`}
                  >
                    {badge.label}
                  </span>
                )}
                <span className="truncate text-xs font-semibold text-slate-800">{file.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 mt-0.5">
                <CheckCircle2 className="h-3 w-3" /> Siap diunggah ({sizeText})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
            title="Hapus file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="hidden"
      />
    </div>
  );
}
