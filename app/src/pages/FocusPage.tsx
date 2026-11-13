import { useEffect, useMemo, useState } from 'react';
import { clock, fmtEgp, timeAgo } from '../lib/formulas';
import { SOUND_IDS, SOUND_LABELS } from '../lib/sounds';
import type { TimerMode } from '../lib/types';
import { useApp } from '../state/context';

const MODE_LABELS: Record<TimerMode, string> = {
  pomodoro: 'بومودورو',
  countdown: 'عدّاد',
  stopwatch: 'ساعة إيقاف',
};

export default function FocusPage() {
  const { timer, setTimer, tasks, commitFocus, previewSound, logs, config, toast } = useApp();

  const mode = timer.mode;
  const [phase, setPhase] = useState<'focus' | 'break'>('focus');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const selectedTask = tasks.find((t) => t.id === timer.selectedTaskId) ?? null;

  const total = useMemo(() => {
    if (mode === 'stopwatch') return 0;
    if (mode === 'countdown') return Math.max(1, Math.round(timer.countdownMin)) * 60;
    const minutes = phase === 'focus' ? timer.pomo.focus : timer.pomo.short;
    return Math.max(1, Math.round(minutes)) * 60;
  }, [mode, phase, timer.countdownMin, timer.pomo.focus, timer.pomo.short]);

  // reset the clock whenever the configuration / phase changes
  useEffect(() => {
    setElapsed(0);
    setRunning(false);
  }, [mode, phase]);

  useEffect(() => {
    if (!running) return;
    const handle = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(handle);
  }, [running]);

  // completion handler
  useEffect(() => {
    if (!running || total <= 0 || elapsed < total) return;
    setRunning(false);

    if (mode === 'countdown') {
      previewSound(timer.mode === 'countdown' ? 'radar' : 'alarm');
      void commitFocus(Math.round(total / 60), { mode, taskId: selectedTask?.id ?? null });
      return;
    }

    if (phase === 'focus') {
      previewSound('alarm');
      void commitFocus(Math.round(total / 60), { mode, taskId: selectedTask?.id ?? null });
      if (timer.autoBreak) {
        setPhase('break');
        if (timer.autoNext) setRunning(true);
      }
    } else {
      previewSound('radar');
      if (timer.autoNext) {
        setPhase('focus');
        setRunning(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, running, total, mode, phase]);

  const remaining = total > 0 ? Math.max(0, total - elapsed) : elapsed;
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0;

  const toggle = () => {
    if (mode === 'stopwatch' && running) {
      const mins = Math.round(elapsed / 60);
      setRunning(false);
      if (mins >= 1) void commitFocus(mins, { mode, taskId: selectedTask?.id ?? null });
      else toast('الجلسة قصيرة جدًا — لازم دقيقة على الأقل', 'warn');
      return;
    }
    setRunning((r) => !r);
  };

  const reset = () => {
    setRunning(false);
    setElapsed(0);
  };

  const recent = logs.slice(0, 12);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-xl bg-surface2 p-1">
        {(Object.keys(MODE_LABELS) as TimerMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setTimer({ mode: m })}
            className={`btn flex-1 ${mode === m ? 'bg-primary text-onprimary' : 'text-muted'}`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <section className="card text-center">
        {mode === 'pomodoro' && (
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className={`chip ${phase === 'focus' ? 'border-primary text-primary' : 'border-good text-good'}`}>
              {phase === 'focus' ? '🎯 وقت التركيز' : '☕ وقت الراحة'}
            </span>
          </div>
        )}

        <div className="relative mx-auto grid h-56 w-56 place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="44" strokeWidth="7" className="stroke-line" fill="none" />
            <circle
              cx="50"
              cy="50"
              r="44"
              strokeWidth="7"
              strokeLinecap="round"
              className="stroke-primary transition-[stroke-dashoffset] duration-300"
              fill="none"
              strokeDasharray={2 * Math.PI * 44}
              strokeDashoffset={2 * Math.PI * 44 * (1 - progress)}
            />
          </svg>
          <div className="z-10">
            <div className="ltr text-4xl font-black tabular-nums">{clock(remaining)}</div>
            <div className="muted mt-1">
              {mode === 'stopwatch' ? 'بيعدّ لفوق' : `الهدف ${Math.round(total / 60)} دقيقة`}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2">
          <button type="button" className={running ? 'btn-gold' : 'btn-primary'} onClick={toggle}>
            {running ? '⏸️ إيقاف مؤقت' : '▶️ ابدأ'}
          </button>
          <button type="button" className="btn-ghost" onClick={reset}>
            ↺ تصفير
          </button>
        </div>
      </section>

      <section className="card space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black">المهمة المرتبطة</span>
          <span className="muted">معدّل التركيز: {fmtEgp(config.egpPerMinute)} / دقيقة</span>
        </div>
        <select
          className="input"
          value={timer.selectedTaskId ?? ''}
          onChange={(e) => setTimer({ selectedTaskId: e.target.value || null })}
        >
          <option value="">بدون مهمة</option>
          {tasks
            .filter((t) => !t.done)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.icon} {t.title} — {t.listName}
              </option>
            ))}
        </select>
      </section>

      {mode === 'pomodoro' && (
        <section className="card grid grid-cols-2 gap-3">
          <NumberField
            label="تركيز (د)"
            value={timer.pomo.focus}
            onChange={(v) => setTimer({ pomo: { ...timer.pomo, focus: v } })}
          />
          <NumberField
            label="راحة قصيرة (د)"
            value={timer.pomo.short}
            onChange={(v) => setTimer({ pomo: { ...timer.pomo, short: v } })}
          />
          <NumberField
            label="راحة طويلة (د)"
            value={timer.pomo.long}
            onChange={(v) => setTimer({ pomo: { ...timer.pomo, long: v } })}
          />
          <NumberField
            label="عدد الجلسات"
            value={timer.pomo.sessions}
            onChange={(v) => setTimer({ pomo: { ...timer.pomo, sessions: v } })}
          />
          <Toggle
            label="راحة تلقائية"
            value={timer.autoBreak}
            onChange={(v) => setTimer({ autoBreak: v })}
          />
          <Toggle label="الجلسة التالية تلقائيًا" value={timer.autoNext} onChange={(v) => setTimer({ autoNext: v })} />
        </section>
      )}

      {mode === 'countdown' && (
        <section className="card">
          <NumberField
            label="مدة العدّاد (دقيقة)"
            value={timer.countdownMin}
            onChange={(v) => setTimer({ countdownMin: v })}
          />
        </section>
      )}

      <section className="card space-y-2">
        <div className="text-sm font-black">نغمة النهاية</div>
        <select
          className="input"
          value={timer.mode === 'countdown' ? 'radar' : 'alarm'}
          onChange={(e) => previewSound(e.target.value as (typeof SOUND_IDS)[number])}
        >
          {SOUND_IDS.map((id) => (
            <option key={id} value={id}>
              {SOUND_LABELS[id]}
            </option>
          ))}
        </select>
        <p className="muted">اختر نغمة لتسمعها مباشرة.</p>
      </section>

      <section className="card space-y-2">
        <div className="text-sm font-black">آخر جلسات التركيز</div>
        {recent.length === 0 && <p className="muted">لسه مفيش جلسات — ابدأ أول جلسة تركيز.</p>}
        <ul className="space-y-1.5">
          {recent.map((l) => (
            <li key={l.id} className="flex items-center justify-between rounded-xl border border-line bg-surface2 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{l.taskTitle || 'جلسة حرة'}</div>
                <div className="muted">
                  {MODE_LABELS[l.mode]} · {timeAgo(l.at)}
                </div>
              </div>
              <div className="text-left leading-tight">
                <div className="text-sm font-black">{l.minutes} د</div>
                <div className="muted">
                  {fmtEgp(l.egp)} · {l.xp} XP
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input ltr"
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-bold transition ${
        value ? 'border-primary bg-primary/10 text-primary' : 'border-line bg-surface2 text-muted'
      }`}
    >
      <span>{label}</span>
      <span className={`h-5 w-9 rounded-full p-0.5 transition ${value ? 'bg-primary' : 'bg-line'}`}>
        <span className={`block h-4 w-4 rounded-full bg-white transition ${value ? 'translate-x-0' : '-translate-x-4'}`} />
      </span>
    </button>
  );
}
