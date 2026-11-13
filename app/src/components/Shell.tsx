import { useEffect, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { APP_NAME } from '../lib/defaults';
import { fmtEgp } from '../lib/formulas';
import { unlockAudio } from '../lib/sounds';
import { useApp } from '../state/context';

const TABS = [
  { to: '/', label: 'المهام', icon: '📋' },
  { to: '/focus', label: 'التركيز', icon: '⏱️' },
  { to: '/store', label: 'المتجر', icon: '🛍️' },
  { to: '/social', label: 'الأصحاب', icon: '👥' },
  { to: '/profile', label: 'حسابي', icon: '🙂' },
];

function SyncChip() {
  const { cloud, sync } = useApp();
  if (!cloud) return <span className="chip">💾 محلي</span>;
  if (sync.syncing) return <span className="chip pulse">⟳ مزامنة</span>;
  if (!sync.online) return <span className="chip">📴 أوفلاين</span>;
  if (sync.pending > 0) return <span className="chip">⏳ {sync.pending}</span>;
  return <span className="chip">☁️ متزامن</span>;
}

export function Shell({ children }: { children: ReactNode }) {
  const { profile, stats, isAdmin } = useApp();

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 px-3 py-2 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏅</span>
            <div className="leading-tight">
              <div className="text-sm font-black">{APP_NAME}</div>
              <div className="muted">
                المستوى {profile.level} · {fmtEgp(profile.egp)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {profile.streak > 1 && <span className="chip">🔥 {profile.streak}</span>}
            <SyncChip />
          </div>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.round(stats.progress * 100)}%` }}
          />
        </div>
      </header>

      <main className="flex-1 px-3 pb-24 pt-3">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-stretch justify-between px-1 py-1">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold transition ${
                  isActive ? 'bg-primary/15 text-primary' : 'text-muted hover:text-fg'
                }`
              }
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold transition ${
                  isActive ? 'bg-gold/15 text-gold' : 'text-muted hover:text-fg'
                }`
              }
            >
              <span className="text-lg">🛡️</span>
              الإدارة
            </NavLink>
          )}
        </div>
      </nav>
    </div>
  );
}
