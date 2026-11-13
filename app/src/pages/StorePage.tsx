import { useState } from 'react';
import { EmojiPicker } from '../components/EmojiPicker';
import { Modal } from '../components/Modal';
import { clock, fmtEgp } from '../lib/formulas';
import type { StoreItem } from '../lib/types';
import { useApp } from '../state/context';

const STATUS_LABEL: Record<string, string> = {
  ready: 'جاهزة',
  active: 'شغّالة',
  used: 'اتستخدمت',
};

export default function StorePage() {
  const {
    storeItems,
    inventory,
    requests,
    profile,
    buyItem,
    inventoryAction,
    suggestReward,
    refresh,
    cloud,
  } = useApp();

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [form, setForm] = useState({ name: '', desc: '', icon: '🎁', egp: 50, durationMin: 30 });

  const activeItems = storeItems.filter((i) => i.active !== false);
  const myRequests = requests.filter((r) => r.userId === profile.id).slice(0, 8);

  const submitSuggestion = async () => {
    if (!form.name.trim()) return;
    await suggestReward(form);
    setForm({ name: '', desc: '', icon: '🎁', egp: 50, durationMin: 30 });
    setSuggestOpen(false);
  };

  return (
    <div className="space-y-3">
      <section className="card flex items-center justify-between">
        <div>
          <div className="muted">رصيدك المتاح</div>
          <div className="text-xl font-black text-gold">{fmtEgp(profile.egp)}</div>
        </div>
        <div className="flex items-center gap-2">
          {cloud && (
            <button type="button" className="btn-ghost" onClick={() => void refresh()}>
              ↻ تحديث
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => setSuggestOpen(true)}>
            ＋ اقترح مكافأة
          </button>
        </div>
      </section>

      <h2 className="title">متجر المكافآت</h2>
      {activeItems.length === 0 && (
        <div className="card text-center text-sm text-muted">
          المتجر فاضي لسه. اقترح مكافأة وخلّي الأدمن يوافق عليها.
        </div>
      )}
      <section className="grid gap-2 sm:grid-cols-2">
        {activeItems.map((item: StoreItem) => {
          const affordable = profile.egp >= item.egp;
          return (
            <div key={item.id} className="card-2 flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface text-2xl">
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-black">{item.name}</div>
                {item.desc && <div className="muted truncate">{item.desc}</div>}
                <div className="mt-1 flex items-center gap-2">
                  <span className="chip border-gold/40 text-gold">{fmtEgp(item.egp)}</span>
                  <span className="chip">⏳ {item.durationMin} د</span>
                </div>
              </div>
              <button
                type="button"
                className={affordable ? 'btn-primary' : 'btn-ghost'}
                disabled={!affordable}
                onClick={() => void buyItem(item)}
              >
                {affordable ? 'اشترِ' : 'مش كفاية'}
              </button>
            </div>
          );
        })}
      </section>

      <h2 className="title">حقيبتك</h2>
      {inventory.length === 0 && (
        <div className="card text-center text-sm text-muted">حقيبتك فاضية — اشتري أول مكافأة.</div>
      )}
      <section className="grid gap-2 sm:grid-cols-2">
        {inventory.map((it) => {
          const remaining = it.running && it.endsAt ? Math.max(0, it.endsAt - Date.now()) : it.remainingMs;
          const mins = Math.ceil(remaining / 60000);
          return (
            <div key={it.id} className="card-2 space-y-2">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-2xl">
                  {it.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-black">{it.name}</div>
                  <div className="muted flex items-center gap-2">
                    <span className={`chip ${it.running ? 'border-good/40 text-good' : ''}`}>
                      {STATUS_LABEL[it.status] ?? it.status}
                    </span>
                    {it.status !== 'used' && <span className="ltr">{clock(Math.max(0, mins * 60))}</span>}
                  </div>
                </div>
              </div>
              {it.status !== 'used' && (
                <div className="flex gap-2">
                  {it.running ? (
                    <button type="button" className="btn-gold flex-1" onClick={() => void inventoryAction(it.id, 'pause')}>
                      ⏸️ وقف
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-good flex-1"
                      onClick={() => void inventoryAction(it.id, it.remainingMs < it.durationMin * 60000 ? 'resume' : 'activate')}
                    >
                      ▶️ شغّل
                    </button>
                  )}
                  <button type="button" className="btn-ghost" onClick={() => void inventoryAction(it.id, 'use')}>
                    استخدم
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <h2 className="title">طلباتك المقترحة</h2>
      {myRequests.length === 0 && <div className="card text-center text-sm text-muted">مفيش طلبات لسه.</div>}
      <section className="space-y-2">
        {myRequests.map((r) => (
          <div key={r.id} className="card-2 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-xl">{r.icon}</span>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{r.name}</div>
                <div className="muted">
                  {fmtEgp(r.egp)} · {r.durationMin} د
                </div>
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
              {r.status === 'approved' ? 'اتوافق' : r.status === 'rejected' ? 'اترفض' : 'قيد المراجعة'}
            </span>
          </div>
        ))}
      </section>

      <Modal open={suggestOpen} onClose={() => setSuggestOpen(false)} title="اقترح مكافأة">
        <div className="space-y-3">
          <div>
            <label className="label">اسم المكافأة</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثال: ساعة سينما"
            />
          </div>
          <div>
            <label className="label">وصف مختصر</label>
            <input
              className="input"
              value={form.desc}
              onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
              placeholder="اتفرج على فيلمك المفضل"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">السعر (ج.م)</label>
              <input
                className="input ltr"
                type="number"
                min={0}
                value={form.egp}
                onChange={(e) => setForm((f) => ({ ...f, egp: Math.max(0, Number(e.target.value) || 0) }))}
              />
            </div>
            <div>
              <label className="label">المدة (دقيقة)</label>
              <input
                className="input ltr"
                type="number"
                min={1}
                value={form.durationMin}
                onChange={(e) => setForm((f) => ({ ...f, durationMin: Math.max(1, Number(e.target.value) || 1) }))}
              />
            </div>
          </div>
          <div>
            <label className="label">الأيقونة</label>
            <EmojiPicker value={form.icon} onChange={(icon) => setForm((f) => ({ ...f, icon }))} />
          </div>
          <button type="button" className="btn-primary w-full" onClick={() => void submitSuggestion()}>
            ابعت الاقتراح
          </button>
        </div>
      </Modal>
    </div>
  );
}
