import { colorFromName } from '../lib/formulas';

export function Avatar({
  name,
  url,
  color,
  size = 40,
}: {
  name: string;
  url?: string;
  color?: string;
  size?: number;
}) {
  const label = (name || '؟').trim();
  const initials = label.slice(0, 2);
  if (url) {
    return (
      <img
        src={url}
        alt={label}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full border border-line object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, background: color || colorFromName(label) }}
      className="grid shrink-0 place-items-center rounded-full font-black text-white"
    >
      <span style={{ fontSize: Math.round(size * 0.36) }}>{initials}</span>
    </div>
  );
}
