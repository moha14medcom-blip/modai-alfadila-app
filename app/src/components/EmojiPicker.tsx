import { useState } from 'react';
import { EMOJI_GROUPS } from '../lib/defaults';

export function EmojiPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (emoji: string) => void;
}) {
  const [group, setGroup] = useState(0);
  const active = EMOJI_GROUPS[group] ?? EMOJI_GROUPS[0];

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={g.label}
            type="button"
            onClick={() => setGroup(i)}
            className={`chip ${i === group ? 'border-primary text-fg' : ''}`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1">
        {active.items.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={`grid h-9 place-items-center rounded-lg border text-lg transition ${
              value === e ? 'border-primary bg-primary/15' : 'border-line bg-surface2 hover:bg-surface'
            }`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
