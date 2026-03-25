'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: '\u25A6' },
  { label: 'Forecast', href: '/forecast', icon: '\u2197' },
  { label: 'Labor', href: '/labor', icon: '\u2693' },
  { label: 'Schedule', href: '/schedule', icon: '\u2630' },
  { label: 'Pace Monitor', href: '/pace', icon: '\u23F1' },
  { label: 'Settings', href: '/settings', icon: '\u2699' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-slate-200 bg-white p-2 shadow-sm lg:hidden"
        aria-label="Open sidebar"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white
          transition-transform duration-200
          lg:static lg:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-lg text-white">
            {'\uD83C\uDF7D'}
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Helixo
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-600">
              Revenue & Labor
            </p>
          </div>
          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded p-1 text-slate-400 hover:text-slate-600 lg:hidden"
            aria-label="Close sidebar"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-colors
                  ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }
                `}
              >
                <span
                  className={`
                    flex h-7 w-7 items-center justify-center rounded-md text-base
                    ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }
                  `}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4">
          <p className="text-xs text-slate-400">
            Helixo v3.5.0-alpha.1
          </p>
          <p className="text-[10px] text-slate-300">
            Powered by Claude Flow
          </p>
        </div>
      </aside>
    </>
  );
}
