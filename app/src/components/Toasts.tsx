import { useApp } from '../state/context';
import type { Tone } from '../lib/types';

const TONE: Record<Tone, string> = {
  info: 'border-line bg-surface text-fg',
  ok: 'border-good/50 bg-good/15 text-good',
  warn: 'border-gold/50 bg-gold/15 text-gold',
  bad: 'border-bad/50 bg-bad/15 text-bad',
};

export function Toasts() {
  const { toasts, dismissToast } = useApp();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className={`animate-pop-in pointer-events-auto max-w-[92vw] rounded-xl border px-4 py-2 text-sm font-bold shadow-lg ${TONE[t.tone]}`}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
