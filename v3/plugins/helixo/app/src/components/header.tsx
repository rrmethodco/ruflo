'use client';

function formatDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      {/* Left: Restaurant info */}
      <div className="flex items-center gap-3 pl-10 lg:pl-0">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Downtown Bistro
          </h2>
          <p className="text-xs text-slate-400">{formatDate()}</p>
        </div>
      </div>

      {/* Right: Status indicators */}
      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600">
          {'\uD83D\uDC64'}
        </div>
      </div>
    </header>
  );
}
