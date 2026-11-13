import { useState } from 'react';
import { EmojiPicker } from '../components/EmojiPicker';
import { Modal } from '../components/Modal';
import { SUPER_ADMIN_EMAIL } from '../lib/defaults';
import { fmtEgp, r2, uid, Vr } from '../lib/formulas';
import type { RewardUnit, StoreItem } from '../lib/types';
import { useApp } from '../state/context';

const TABS = [
  { id: 'curve', label: 'منحنى الخبرة' },
  { id: 'units', label: 'وحدات المكافأة' },
  { id: 'store', label: 'المتجر' },
  { id: 'requests', label: 'الطلبات' },
  { id: 'users', label: 'المستخدمون' },
  { id: 'broadcast', label: 'الإعلان والنصيحة' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminPage() {
  const {
    config,
    saveConfig,
    units,
    saveUnit,
    removeUnit,
    storeItems,
    saveStoreItem,
    removeStoreItem,
    requests,
    decideRequest,
    people,
    profile,
    adminUpdateUser,
    postAnnouncement,
    saveTip,
    tip,
    announcement,
  } = useApp();

  const [tab, setTab] = useState<TabId>('curve');
  const [announcementText, setAnnouncementText] = useState('');
  const [tipText, setTipText] = useState(tip);

  // curve editor
  const [curve, setCurve] = useState(config);
  const [overrideLevel, setOverrideLevel] = useState(5);
  const [overrideXp, setOverrideXp] = useState(() => Vr(5, config));

  // unit editor
  const [unitDraft, setUnitDraft] = useState<RewardUnit | null>(null);

  // store editor
  const [storeDraft, setStoreDraft] = useState<(Partial<StoreItem> & { id?: string }) | null>(null);

  const saveCurve = async () => {
    await saveConfig(curve);
    setOverrideXp(Vr(overrideLevel, curve));
  };

  return (
    <div className="space-y-3">
      <section className="card border-gold/40 bg-gold/10">
        <div className="text-sm font-black text-gold">🛡️ لوحة السوبر أدمن</div>
        <p className="muted mt-1">
          الدخول مخصص لحساب <span className="ltr">{SUPER_ADMIN_EMAIL}</span> فقط، وبدون أي كلمة سر إضافية.
          {profile.email && profile.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
            ? ' — إنت داخل بصلاحيات كاملة.'
            : ''}
        </p>
      </section>

      <div className="flex flex-wrap gap-1 rounded-xl bg-surface2 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`btn flex-1 whitespace-nowrap text-xs ${tab === t.id ? 'bg-primary text-onprimary' : 'text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'curve' && (
        <section className="card space-y-3">
          <h2 className="title">منحنى الخبرة (Vr)</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="خبرة المستوى الأول (XP)"
              value={curve.baseXp}
              onChange={(v) => setCurve((c) => ({ ...c, baseXp: v }))}
            />
            <div>
              <label className="label">طريقة الزيادة</label>
              <select
                className="input"
                value={curve.scalingMode}
                onChange={(e) =>
                  setCurve((c) => ({ ...c, scalingMode: e.target.value as 'increment' | 'multiplier' }))
                }
              >
                <option value="increment">زيادة ثابتة</option>
                <option value="multiplier">مضاعف</option>
              </select>
            </div>
            {curve.scalingMode === 'increment' ? (
              <Field label="مقدار الزيادة لكل مستوى" value={curve.increment} onChange={(v) => setCurve((c) => ({ ...c, increment: v }))} />
            ) : (
              <Field
                label="المضاعف"
                step={0.05}
                value={curve.multiplier}
                onChange={(v) => setCurve((c) => ({ ...c, multiplier: v }))}
              />
            )}
            <Field label="ج.م لكل دقيقة تركيز" step={0.05} value={curve.egpPerMinute} onChange={(v) => setCurve((c) => ({ ...c, egpPerMinute: v }))} />
            <Field label="XP لكل دقيقة تركيز" step={1} value={curve.xpPerMinute} onChange={(v) => setCurve((c) => ({ ...c, xpPerMinute: v }))} />
          </div>

          <button
            type="button"
            onClick={() => setCurve((c) => ({ ...c, autoApprove: !c.autoApprove }))}
            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-bold transition ${
              curve.autoApprove ? 'border-primary bg-primary/10 text-primary' : 'border-line bg-surface2 text-muted'
            }`}
          >
            <span>الموافقة التلقائية على مكافآت المستخدمين</span>
            <span className={`h-5 w-9 rounded-full p-0.5 transition ${curve.autoApprove ? 'bg-primary' : 'bg-line'}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition ${curve.autoApprove ? 'translate-x-0' : '-translate-x-4'}`} />
            </span>
          </button>

          <div className="rounded-xl border border-line bg-surface2 p-3">
            <div className="label">جدول الخبرة المطلوبة لكل مستوى</div>
            <div className="grid grid-cols-3 gap-1 text-xs sm:grid-cols-5">
              {Array.from({ length: 15 }, (_, i) => i + 1).map((lv) => (
                <div key={lv} className="rounded-lg border border-line bg-surface px-2 py-1 text-center">
                  <div className="muted">مستوى {lv}</div>
                  <div className="font-black">{Vr(lv, curve)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface2 p-3">
            <div className="label">تجاوز يدوي لمستوى معيّن</div>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="المستوى" value={overrideLevel} onChange={setOverrideLevel} className="w-24" />
              <Field label="XP المطلوب" value={overrideXp} onChange={setOverrideXp} className="w-28" />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCurve((c) => ({ ...c, overrides: { ...c.overrides, [String(overrideLevel)]: overrideXp } }))}
              >
                إضافة
              </button>
            </div>
            {Object.keys(curve.overrides).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(curve.overrides).map(([lv, xp]) => (
                  <button
                    key={lv}
                    type="button"
                    className="chip hover:text-bad"
                    onClick={() =>
                      setCurve((c) => {
                        const next = { ...c.overrides };
                        delete next[lv];
                        return { ...c, overrides: next };
                      })
                    }
                  >
                    مستوى {lv}: {xp} ✕
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="btn-primary w-full" onClick={() => void saveCurve()}>
            💾 حفظ المنحنى
          </button>
        </section>
      )}

      {tab === 'units' && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="title">وحدات المكافأة</h2>
            <button
              type="button"
              className="btn-primary"
              onClick={() =>
                setUnitDraft({
                  id: uid('unit_'),
                  name: '',
                  egp: 10,
                  xp: 15,
                  icon: '⭐',
                  active: true,
                  order: units.length + 1,
                })
              }
            >
              ＋ وحدة
            </button>
          </div>
          <div className="space-y-2">
            {units.map((u) => (
              <div key={u.id} className="card-2 flex items-center gap-3">
                <span className="text-2xl">{u.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{u.name}</div>
                  <div className="muted">
                    {fmtEgp(u.egp)} · {u.xp} XP · ترتيب {u.order} {u.active ? '' : '· موقوفة'}
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={() => setUnitDraft(u)}>
                  ✏️
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    if (window.confirm(`نمسح وحدة «${u.name}»؟`)) void removeUnit(u.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
            {units.length === 0 && <p className="muted">مفيش وحدات.</p>}
          </div>
        </section>
      )}

      {tab === 'store' && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="title">عناصر المتجر</h2>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStoreDraft({ name: '', desc: '', egp: 50, icon: '🎁', durationMin: 30, active: true })}
            >
              ＋ عنصر
            </button>
          </div>
          <div className="space-y-2">
            {storeItems.map((s) => (
              <div key={s.id} className="card-2 flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{s.name}</div>
                  <div className="muted">
                    {fmtEgp(s.egp)} · {s.durationMin} د {s.requestedBy ? `· طلبها @${s.requestedBy}` : ''}
                    {s.active === false ? ' · موقوف' : ''}
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={() => setStoreDraft(s)}>
                  ✏️
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    if (window.confirm(`نمسح «${s.name}» من المتجر؟`)) void removeStoreItem(s.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
            {storeItems.length === 0 && <p className="muted">المتجر فاضي.</p>}
          </div>
        </section>
      )}

      {tab === 'requests' && (
        <section className="card space-y-3">
          <h2 className="title">طلبات المكافآت</h2>
          {requests.length === 0 && <p className="muted">مفيش طلبات.</p>}
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="card-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{r.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{r.name}</div>
                    <div className="muted">
                      {fmtEgp(r.egp)} · {r.durationMin} د · @{r.username}
                    </div>
                  </div>
                  <span
                    className={`chip ${
                      r.status === 'approved'
                        ? 'border-good/40 text-good'
                        : r.status === 'rejected'
                          ? 'border-bad/40 text-bad'
                          : 'border-gold/40 text-gold'
                    }`}
                  >
                    {r.status === 'approved' ? 'مقبول' : r.status === 'rejected' ? 'مرفوض' : 'جديد'}
                  </span>
                </div>
                {r.status === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-good" onClick={() => void decideRequest(r.id, 'approve')}>
                      ✅ انشر في المتجر
                    </button>
                    <button type="button" className="btn-primary" onClick={() => void decideRequest(r.id, 'personal')}>
                      🔒 موافقة شخصية
                    </button>
                    <button type="button" className="btn-danger" onClick={() => void decideRequest(r.id, 'reject')}>
                      ❌ ارفض
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'users' && (
        <section className="card space-y-3">
          <h2 className="title">المستخدمون ({people.length})</h2>
          <div className="space-y-2">
            {people.map((p) => (
              <UserRow
                key={p.id}
                id={p.id}
                name={p.displayName}
                username={p.username}
                level={p.level}
                xp={p.xp}
                egp={p.egp}
                blocked={p.blocked}
                isSelf={p.id === profile.id}
                onPatch={adminUpdateUser}
              />
            ))}
          </div>
        </section>
      )}

      {tab === 'broadcast' && (
        <section className="card space-y-3">
          <h2 className="title">إعلان عام</h2>
          {announcement && <div className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-sm">{announcement.text}</div>}
          <textarea
            className="input min-h-20"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="اكتب إعلان يظهر لكل المستخدمين…"
          />
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              void postAnnouncement(announcementText);
              setAnnouncementText('');
            }}
          >
            📢 انشر الإعلان
          </button>

          <h2 className="title pt-2">نصيحة اليوم</h2>
          <textarea className="input min-h-16" value={tipText} onChange={(e) => setTipText(e.target.value)} />
          <button type="button" className="btn-ghost" onClick={() => void saveTip(tipText)}>
            💡 حدّث النصيحة
          </button>
        </section>
      )}

      {/* unit modal */}
      <Modal open={unitDraft !== null} onClose={() => setUnitDraft(null)} title="وحدة مكافأة">
        {unitDraft && (
          <div className="space-y-3">
            <div>
              <label className="label">الاسم</label>
              <input className="input" value={unitDraft.name} onChange={(e) => setUnitDraft({ ...unitDraft, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ج.م" step={1} value={unitDraft.egp} onChange={(v) => setUnitDraft({ ...unitDraft, egp: v })} />
              <Field label="XP" step={1} value={unitDraft.xp} onChange={(v) => setUnitDraft({ ...unitDraft, xp: v })} />
              <Field label="الترتيب" step={1} value={unitDraft.order} onChange={(v) => setUnitDraft({ ...unitDraft, order: v })} />
              <button
                type="button"
                onClick={() => setUnitDraft({ ...unitDraft, active: !unitDraft.active })}
                className={`mt-5 rounded-xl border px-3 py-2 text-sm font-bold ${
                  unitDraft.active ? 'border-good/40 bg-good/10 text-good' : 'border-line bg-surface2 text-muted'
                }`}
              >
                {unitDraft.active ? 'فعّالة' : 'موقوفة'}
              </button>
            </div>
            <div>
              <label className="label">الأيقونة</label>
              <EmojiPicker value={unitDraft.icon} onChange={(icon) => setUnitDraft({ ...unitDraft, icon })} />
            </div>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => {
                void saveUnit({ ...unitDraft, egp: r2(unitDraft.egp), xp: r2(unitDraft.xp) });
                setUnitDraft(null);
              }}
            >
              حفظ الوحدة
            </button>
          </div>
        )}
      </Modal>

      {/* store modal */}
      <Modal open={storeDraft !== null} onClose={() => setStoreDraft(null)} title="عنصر المتجر">
        {storeDraft && (
          <div className="space-y-3">
            <div>
              <label className="label">الاسم</label>
              <input
                className="input"
                value={storeDraft.name ?? ''}
                onChange={(e) => setStoreDraft({ ...storeDraft, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">الوصف</label>
              <input
                className="input"
                value={storeDraft.desc ?? ''}
                onChange={(e) => setStoreDraft({ ...storeDraft, desc: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="السعر (ج.م)" step={1} value={storeDraft.egp ?? 0} onChange={(v) => setStoreDraft({ ...storeDraft, egp: v })} />
              <Field
                label="المدة (دقيقة)"
                step={1}
                value={storeDraft.durationMin ?? 30}
                onChange={(v) => setStoreDraft({ ...storeDraft, durationMin: v })}
              />
            </div>
            <button
              type="button"
              onClick={() => setStoreDraft({ ...storeDraft, active: !(storeDraft.active ?? true) })}
              className={`w-full rounded-xl border px-3 py-2 text-sm font-bold ${
                storeDraft.active ?? true ? 'border-good/40 bg-good/10 text-good' : 'border-line bg-surface2 text-muted'
              }`}
            >
              {storeDraft.active ?? true ? 'ظاهر في المتجر' : 'موقوف'}
            </button>
            <div>
              <label className="label">الأيقونة</label>
              <EmojiPicker value={storeDraft.icon ?? '🎁'} onChange={(icon) => setStoreDraft({ ...storeDraft, icon })} />
            </div>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => {
                void saveStoreItem(storeDraft);
                setStoreDraft(null);
              }}
            >
              حفظ العنصر
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  step = 1,
  className = '',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input
        className="input ltr"
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}

function UserRow({
  id,
  name,
  username,
  level,
  xp,
  egp,
  blocked,
  isSelf,
  onPatch,
}: {
  id: string;
  name: string;
  username: string;
  level: number;
  xp: number;
  egp: number;
  blocked: boolean;
  isSelf: boolean;
  onPatch: (id: string, patch: { level?: number; xp?: number; egp?: number; blocked?: boolean }) => Promise<void>;
}) {
  const [draft, setDraft] = useState({ level, xp, egp });

  return (
    <div className="card-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-bold">
            {name} {isSelf && <span className="chip border-primary/40 text-primary">أنا</span>}
          </div>
          <div className="muted ltr">@{username}</div>
        </div>
        <button
          type="button"
          className={blocked ? 'btn-danger' : 'btn-ghost'}
          onClick={() => void onPatch(id, { blocked: !blocked })}
        >
          {blocked ? '🚫 موقوف' : 'حظر'}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="المستوى" value={draft.level} onChange={(v) => setDraft((d) => ({ ...d, level: v }))} />
        <Field label="XP" value={draft.xp} onChange={(v) => setDraft((d) => ({ ...d, xp: v }))} />
        <Field label="ج.م" value={draft.egp} onChange={(v) => setDraft((d) => ({ ...d, egp: v }))} />
      </div>
      <button type="button" className="btn-ghost w-full" onClick={() => void onPatch(id, draft)}>
        حفظ تعديلات المستخدم
      </button>
    </div>
  );
}
