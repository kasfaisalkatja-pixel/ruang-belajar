import { Sparkles } from 'lucide-react';

interface Props {
  items: string[];
  variant?: 'student' | 'teacher' | 'admin';
}

export function RunningBanner({ items, variant = 'student' }: Props) {
  const bgClass =
    variant === 'student'
      ? 'from-indigo-600 via-violet-600 to-fuchsia-600'
      : variant === 'teacher'
        ? 'from-indigo-700 via-blue-600 to-cyan-600'
        : 'from-slate-800 via-indigo-900 to-violet-900';

  // Duplicate items twice so `-50%` translateX creates an endless seamless marquee loop
  const loopItems = [...items, ...items];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${bgClass} text-white py-2.5 px-3 shadow-md border border-white/15`}
    >
      <div className="flex items-center gap-3">
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-white/20 backdrop-blur px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-xs">
          <Sparkles className="w-3.5 h-3.5 animate-twinkle text-amber-300" /> Info Berjalan
        </span>

        <div className="overflow-hidden flex-1">
          <div className="animate-marquee flex items-center gap-8 text-xs font-semibold whitespace-nowrap">
            {loopItems.map((text, idx) => (
              <span key={idx} className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 inline-block" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
