import { clamp } from '../lib/formulas';

export function XpRing({
  progress,
  level,
  size = 96,
}: {
  progress: number;
  level: number;
  size?: number;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = clamp(progress, 0, 1);

  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          className="stroke-line"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
        />
      </svg>
      <div className="absolute grid place-items-center leading-none">
        <span className="text-[10px] font-bold text-muted">المستوى</span>
        <span className="text-xl font-black">{level}</span>
      </div>
    </div>
  );
}
