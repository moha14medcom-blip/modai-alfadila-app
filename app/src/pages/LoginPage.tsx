import { useState, type FormEvent } from 'react';
import { APP_NAME, SUPER_ADMIN_EMAIL } from '../lib/defaults';
import { useApp } from '../state/context';

export default function LoginPage() {
  const { signIn, signUp } = useApp();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'in') await signIn(email, password);
      else await signUp(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حصل خطأ غير متوقع');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full place-items-center bg-bg px-4 py-10 text-fg">
      <div className="animate-pop-in w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mb-2 text-5xl">🏅</div>
          <h1 className="text-xl font-black">{APP_NAME}</h1>
          <p className="mt-1 text-sm text-muted">سجّل دخولك عشان تتزامن بياناتك على كل أجهزتك.</p>
        </div>

        <form onSubmit={submit} className="card space-y-3">
          <div className="flex gap-1 rounded-xl bg-surface2 p-1">
            <button
              type="button"
              onClick={() => setMode('in')}
              className={`btn flex-1 ${mode === 'in' ? 'bg-primary text-onprimary' : 'text-muted'}`}
            >
              دخول
            </button>
            <button
              type="button"
              onClick={() => setMode('up')}
              className={`btn flex-1 ${mode === 'up' ? 'bg-primary text-onprimary' : 'text-muted'}`}
            >
              حساب جديد
            </button>
          </div>

          <div>
            <label className="label" htmlFor="email">
              البريد الإلكتروني
            </label>
            <input
              id="email"
              className="input ltr"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="label" htmlFor="password">
              كلمة السر
            </label>
            <input
              id="password"
              className="input ltr"
              type="password"
              autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-bad/40 bg-bad/10 px-3 py-2 text-xs font-bold text-bad">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? 'لحظة…' : mode === 'in' ? 'دخول' : 'إنشاء الحساب'}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-muted">
          الأدمن ({SUPER_ADMIN_EMAIL}) بيدخل لوحة الإدارة من غير أي كلمة سر إضافية.
        </p>
      </div>
    </div>
  );
}
