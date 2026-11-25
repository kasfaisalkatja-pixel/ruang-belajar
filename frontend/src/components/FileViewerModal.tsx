import { useEffect, useState } from 'react';
import { X, Download, FileText, Loader2 } from 'lucide-react';
import { downloadProtectedFile, fetchProtectedBlob, getFileBadgeMeta } from '../lib/api';

interface Props {
  fileKey: string;
  fileName?: string | null;
  onClose: () => void;
}

export function FileViewerModal({ fileKey, fileName, onClose }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const badge = getFileBadgeMeta(fileName);

  useEffect(() => {
    let url: string | null = null;
    setLoading(true);
    setError('');

    if (badge.isPdf || badge.isImage) {
      fetchProtectedBlob(fileKey)
        .then((blob) => {
          const typedBlob = badge.isPdf ? new Blob([blob], { type: 'application/pdf' }) : blob;
          url = URL.createObjectURL(typedBlob);
          setBlobUrl(url);
        })
        .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat pratinjau'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [fileKey, badge.isPdf, badge.isImage]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="animate-scale-in bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`px-2 py-0.5 text-xs font-bold rounded border ${badge.colorClass}`}>
              {badge.label}
            </span>
            <h3 className="font-bold text-slate-900 text-sm truncate">
              {fileName || 'Lampiran Dokumen'}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => downloadProtectedFile(fileKey, fileName)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Unduh {badge.label}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-100 min-h-[420px] flex items-center justify-center overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-slate-500 py-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium">Memuat dokumen...</p>
            </div>
          ) : error ? (
            <div className="text-center p-8 space-y-3">
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={() => downloadProtectedFile(fileKey, fileName)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Unduh File Secara Langsung
              </button>
            </div>
          ) : badge.isPdf && blobUrl ? (
            <iframe src={blobUrl} title={fileName || 'PDF'} className="w-full h-[75vh] border-0" />
          ) : badge.isImage && blobUrl ? (
            <img
              src={blobUrl}
              alt={fileName || 'Gambar'}
              className="max-h-[72vh] max-w-full object-contain p-4"
            />
          ) : (
            <div className="text-center p-10 max-w-md space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{fileName}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Dokumen <strong>{badge.label}</strong> siap dibuka menggunakan Microsoft Word /
                  aplikasi dokumen di perangkat Anda.
                </p>
              </div>
              <button
                onClick={() => downloadProtectedFile(fileKey, fileName)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md transition cursor-pointer"
              >
                <Download className="w-4 h-4" /> Unduh Dokumen Sekarang
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
