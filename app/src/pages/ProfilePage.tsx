import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { XpRing } from '../components/XpRing';
import { APP_NAME } from '../lib/defaults';
import { Hr, fmtEgp } from '../lib/formulas';
import { awardBadgeName } from '../lib/profile';
import { SOUND_IDS, SOUND_LABELS } from '../lib/sounds';
import { THEMES } from '../lib/themes';
import type { SoundId, SoundSettings, ThemeId } from '../lib/types';
import { useApp } from '../state/context';

const SOUND_ROLES: { key: keyof SoundSettings; label: string }[] = [
  { key: 'pomodoro', label: 'نهاية البومودورو' },
  { key: 'countdown', label: 'نهاية العدّاد' },
  { key: 'reward', label: 'الحصول على مكافأة' },
];

export default function ProfilePage() {
  const {
    profile,
    stats,
    config,
    sounds,
    setSounds,
    soundVolume,
    setSoundVolume,
    notifyOn,
    setNotifyOn,
    theme,
    setTheme,
    saveProfile,
    uploadAvatar,
    exportBackup,
    importBackup,
    previewSound,
    signOut,
    cloud,
    user,
    isAdmin,
  } = useApp();

  const [name, setName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);

  const save = async () => {
    await saveProfile({ displayName: name.trim() || profile.displayName, username: username.trim() || profile.username });
  };

  return (
    <div className="space-y-3">
      <section className="card overflow-hidden p-0">
        <div
          className="h-28 w-full bg-surface2"
          style={
            profile.coverUrl
              ? { backgroundImage: `url(${profile.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: `linear-gradient(135deg, ${profile.avatarColor}, transparent)` }
          }
        />
        <div className="-mt-10 px-4 pb-4">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-3">
              <div className="rounded-full border-4 border-surface">
                <Avatar name={profile.displayName} url={profile.avatarUrl} color={profile.avatarColor} size={72} />
              </div>
              <div className="pb-1">
                <div className="font-black">{profile.displayName}</div>
                <div className="muted ltr">@{profile.username}</div>
                <span className="chip mt-1 border-gold/40 text-gold">🏅 {awardBadgeName(profile.level)}</span>
              </div>
            </div>
            <XpRing progress={stats.progress} level={profile.level} size={84} />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="XP" value={`${profile.xp}/${stats.need}`} />
            <MiniStat label="رصيد" value={fmtEgp(profile.egp)} />
            <MiniStat label="سلسلة" value={`🔥 ${profile.streak}`} />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <MiniStat label="مهام كلها" value={String(profile.totalTasks)} />
            <MiniStat label="تركيز كلها" value={Hr(profile.totalFocusMin)} />
            <MiniStat label="تركيز الأسبوع" value={Hr(profile.weeklyFocusMin)} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-ghost text-xs" onClick={() => avatarInput.current?.click()}>
              🖼️ صورة شخصية
            </button>
            <button type="button" className="btn-ghost text-xs" onClick={() => coverInput.current?.click()}>
              🌄 غلاف
            </button>
            <input
              ref={avatarInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAvatar(f, 'avatar');
                e.target.value = '';
              }}
            />
            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadAvatar(f, 'cover');
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="title">بيانات الحساب</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">الاسم المعروض</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">اسم المستخدم</label>
            <input className="input ltr" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
        </div>
        <div className="muted">
          {user?.email ? `البريد: ${user.email}` : 'الوضع المحلي — بياناتك محفوظة على جهازك فقط.'}
        </div>
        <button type="button" className="btn-primary" onClick={() => void save()}>
          💾 حفظ البيانات
        </button>
      </section>

      <section className="card space-y-3">
        <h2 className="title">الثيمات الستة</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id as ThemeId)}
              className={`rounded-xl border p-3 text-right transition ${
                theme === t.id ? 'border-primary bg-primary/10' : 'border-line bg-surface2 hover:bg-surface'
              }`}
            >
              <div className="mb-2 flex gap-1">
                {t.swatch.map((c) => (
                  <span key={c} className="h-4 w-4 rounded-full border border-line" style={{ background: c }} />
                ))}
              </div>
              <div className="text-sm font-black">{t.name}</div>
              <div className="muted">{t.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="title">الأصوات</h2>
        <div>
          <label className="label">مستوى الصوت ({Math.round(soundVolume * 100)}%)</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={soundVolume}
            onChange={(e) => setSoundVolume(Number(e.target.value))}
            className="w-full accent-[rgb(var(--c-primary))]"
          />
        </div>
        {SOUND_ROLES.map((role) => (
          <div key={role.key}>
            <label className="label">{role.label}</label>
            <div className="flex flex-wrap gap-1">
              {SOUND_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setSounds({ ...sounds, [role.key]: id as SoundId });
                    previewSound(id as SoundId);
                  }}
                  className={`chip ${sounds[role.key] === id ? 'border-primary text-fg' : ''}`}
                >
                  {SOUND_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            previewSound(sounds.pomodoro);
            window.setTimeout(() => previewSound(sounds.countdown), 600);
            window.setTimeout(() => previewSound(sounds.reward), 1300);
          }}
        >
          🔊 تجربة كل النغمات
        </button>

        <button
          type="button"
          onClick={() => setNotifyOn(!notifyOn)}
          className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-bold transition ${
            notifyOn ? 'border-primary bg-primary/10 text-primary' : 'border-line bg-surface2 text-muted'
          }`}
        >
          <span>🔔 تنبيهات المتصفح عند نهاية المؤقت</span>
          <span className={`h-5 w-9 rounded-full p-0.5 transition ${notifyOn ? 'bg-primary' : 'bg-line'}`}>
            <span className={`block h-4 w-4 rounded-full bg-white transition ${notifyOn ? 'translate-x-0' : '-translate-x-4'}`} />
          </span>
        </button>
      </section>

      <section className="card space-y-2">
        <h2 className="title">النسخ الاحتياطي</h2>
        <p className="muted">
          نزّل نسخة من مشاريعك ومهامك وحقيبتك، تقدر ترجّعها في أي وقت أو على أي جهاز.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => void exportBackup()}>
            📤 تصدير نسخة
          </button>
          <button type="button" className="btn-ghost" onClick={() => backupInput.current?.click()}>
            📥 استيراد نسخة
          </button>
          <input
            ref={backupInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importBackup(f);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <section className="card space-y-2">
        <h2 className="title">معلومات</h2>
        <div className="muted">التطبيق: {APP_NAME}</div>
        <div className="muted">معدّل التركيز: {fmtEgp(config.egpPerMinute)} / دقيقة · {config.xpPerMinute} XP / دقيقة</div>
        <div className="flex flex-wrap gap-2 pt-1">
          {isAdmin && (
            <Link to="/admin" className="btn-gold">
              🛡️ لوحة السوبر أدمن
            </Link>
          )}
          {cloud && (
            <button type="button" className="btn-danger" onClick={() => void signOut()}>
              🚪 خروج
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface2 py-2">
      <div className="text-sm font-black">{value}</div>
      <div className="muted">{label}</div>
    </div>
  );
}
