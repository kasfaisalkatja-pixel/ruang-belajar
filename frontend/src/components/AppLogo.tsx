interface Props {
  className?: string;
}

export function AppLogo({ className = 'w-11 h-11' }: Props) {
  return (
    <img
      src="/logo.svg"
      alt="Logo Ruang Belajar"
      className={`${className} select-none object-contain drop-shadow-md`}
    />
  );
}

/**
 * Exports `/logo.svg` as a crisp high-resolution PNG (e.g., 1024x1024 or 512x512)
 * ready to be uploaded directly into Android APK builders (WebIntoApp, PWABuilder, Kodular, Android Studio).
 */
export async function downloadApkLogoPng(size = 1024) {
  const res = await fetch('/logo.svg');
  const svgText = await res.text();
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.width = size;
  img.height = size;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Gagal memuat logo SVG'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(img, 0, 0, size, size);
  URL.revokeObjectURL(url);

  canvas.toBlob((pngBlob) => {
    if (!pngBlob) return;
    const pngUrl = URL.createObjectURL(pngBlob);
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `Logo_Ruang_Belajar_${size}x${size}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(pngUrl), 3000);
  }, 'image/png');
}
