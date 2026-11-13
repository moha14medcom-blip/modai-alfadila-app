import { APP_NAME } from '../lib/defaults';

export function BootScreen() {
  return (
    <div className="grid min-h-full place-items-center bg-bg px-6 text-center text-fg">
      <div className="animate-pop-in">
        <div className="mb-3 text-5xl">🏅</div>
        <div className="text-xl font-black">{APP_NAME}</div>
        <div className="mt-2 text-sm text-muted pulse">بنفتح خزنتك…</div>
      </div>
    </div>
  );
}
