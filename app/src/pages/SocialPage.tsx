import { useMemo, useState } from 'react';
import { Avatar } from '../components/Avatar';
import { CHEER_TEMPLATES } from '../lib/demo';
import { fmtEgp, timeAgo } from '../lib/formulas';
import { invitationLink } from '../lib/profile';
import { useApp } from '../state/context';

export default function SocialPage() {
  const {
    profile,
    people,
    friends,
    cheers,
    cloud,
    sendFriendRequest,
    respondFriend,
    removeFriend,
    sendCheer,
  } = useApp();

  const [username, setUsername] = useState('');
  const [cheerFor, setCheerFor] = useState<string | null>(null);
  const [cheerText, setCheerText] = useState('');

  const leaderboard = useMemo(
    () =>
      [...people].sort((a, b) =>
        b.level === a.level ? b.xp + b.totalTasks * 5 - (a.xp + a.totalTasks * 5) : b.level - a.level
      ),
    [people]
  );

  const accepted = friends.filter((f) => f.status === 'accepted' && (f.fromId === profile.id || f.toId === profile.id));
  const incoming = friends.filter((f) => f.status === 'pending' && f.toId === profile.id);
  const outgoing = friends.filter((f) => f.status === 'pending' && f.fromId === profile.id);
  const myCheers = cheers.filter((c) => c.toId === profile.id).slice(0, 10);

  const friendIds = new Set(
    accepted.map((f) => (f.fromId === profile.id ? f.toId : f.fromId))
  );

  const addFriend = async () => {
    if (!username.trim()) return;
    await sendFriendRequest(username);
    setUsername('');
  };

  const sendNow = async () => {
    if (!cheerFor) return;
    await sendCheer(cheerFor, cheerText);
    setCheerFor(null);
    setCheerText('');
  };

  const me = leaderboard.findIndex((p) => p.id === profile.id) + 1;

  return (
    <div className="space-y-3">
      <section className="card">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="muted">ترتيبك</div>
            <div className="text-xl font-black">
              #{me} من {leaderboard.length}
            </div>
          </div>
          <div className="text-right">
            <div className="muted">دعوة الأصحاب</div>
            <button
              type="button"
              className="btn-ghost mt-1 text-xs"
              onClick={() => {
                void navigator.clipboard?.writeText(invitationLink(profile.username));
              }}
            >
              📋 انسخ لينك الدعوة
            </button>
          </div>
        </div>
        <div className="muted mt-2 ltr">@{profile.username}</div>
      </section>

      <section className="card space-y-2">
        <div className="text-sm font-black">أضف صاحب</div>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="اسم المستخدم بدون @"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button type="button" className="btn-primary" onClick={() => void addFriend()}>
            إرسال
          </button>
        </div>
        {!cloud && <p className="muted">في الوضع المحلي فيه خصوم تجريبيين جاهزين للتجربة.</p>}
      </section>

      {incoming.length > 0 && (
        <section className="card space-y-2">
          <div className="text-sm font-black">طلبات صداقة واصلة</div>
          {incoming.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface2 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{f.fromName}</div>
                <div className="muted ltr">@{f.fromUsername}</div>
              </div>
              <div className="flex gap-1">
                <button type="button" className="btn-good" onClick={() => void respondFriend(f.id, true)}>
                  قبول
                </button>
                <button type="button" className="btn-danger" onClick={() => void respondFriend(f.id, false)}>
                  رفض
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="card space-y-2">
          <div className="text-sm font-black">طلبات بعتها</div>
          {outgoing.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface2 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{f.toName}</div>
                <div className="muted ltr">@{f.toUsername}</div>
              </div>
              <span className="chip border-gold/40 text-gold">منتظر</span>
            </div>
          ))}
        </section>
      )}

      {myCheers.length > 0 && (
        <section className="card space-y-2">
          <div className="text-sm font-black">تشجيعات وصلتك</div>
          {myCheers.map((c) => (
            <div key={c.id} className="rounded-xl border border-good/30 bg-good/10 px-3 py-2">
              <div className="text-sm font-bold">{c.text}</div>
              <div className="muted">
                من {c.fromName} · {timeAgo(c.at)}
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="title">الترتيب</h2>
        {leaderboard.map((p, i) => {
          const isMe = p.id === profile.id;
          const isFriend = friendIds.has(p.id);
          return (
            <div
              key={p.id}
              className={`card-2 flex items-center gap-3 ${isMe ? 'border-primary/50 bg-primary/10' : ''}`}
            >
              <span className="w-6 text-center text-sm font-black text-muted">{i + 1}</span>
              <Avatar name={p.displayName} url={p.avatarUrl} color={p.avatarColor} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-bold">{p.displayName}</span>
                  {isMe && <span className="chip border-primary/40 text-primary">أنا</span>}
                  {isFriend && <span className="chip border-good/40 text-good">صاحب</span>}
                </div>
                <div className="muted">
                  المستوى {p.level} · 🔥 {p.streak} · {p.totalTasks} مهمة
                </div>
              </div>
              <div className="text-left">
                <div className="text-sm font-black text-gold">{fmtEgp(p.egp)}</div>
                <div className="flex justify-end gap-1">
                  {!isMe && (
                    <button
                      type="button"
                      className="chip hover:text-fg"
                      onClick={() => {
                        setCheerFor(p.id);
                        setCheerText(CHEER_TEMPLATES[0]);
                      }}
                    >
                      📣 شجّع
                    </button>
                  )}
                  {isFriend && (
                    <button
                      type="button"
                      className="chip hover:text-bad"
                      onClick={() => {
                        const f = accepted.find(
                          (x) => (x.fromId === profile.id && x.toId === p.id) || (x.toId === profile.id && x.fromId === p.id)
                        );
                        if (f && window.confirm('نفكّ الصداقة؟')) void removeFriend(f.id);
                      }}
                    >
                      فكّ
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {cheerFor && (
        <div className="fixed inset-0 z-[95] grid place-items-end bg-black/60 sm:place-items-center sm:p-4" onClick={() => setCheerFor(null)}>
          <div
            className="animate-slide-up w-full max-w-md rounded-t-2xl border border-line bg-surface p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="title">ابعت تشجيع</h3>
              <button type="button" className="icon-btn" onClick={() => setCheerFor(null)}>
                ✕
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-1">
              {CHEER_TEMPLATES.map((t) => (
                <button key={t} type="button" className="chip hover:text-fg" onClick={() => setCheerText(t)}>
                  {t}
                </button>
              ))}
            </div>
            <textarea
              className="input min-h-20"
              value={cheerText}
              onChange={(e) => setCheerText(e.target.value)}
              placeholder="اكتب رسالة تشجيع قصيرة…"
            />
            <button type="button" className="btn-primary mt-3 w-full" onClick={() => void sendNow()}>
              ابعت
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
