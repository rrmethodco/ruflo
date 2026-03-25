'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavSection {
  header: string;
  items: { label: string; href: string }[];
}

const navSections: NavSection[] = [
  {
    header: 'EXECUTIVE',
    items: [
      { label: 'Dashboard', href: '/' },
    ],
  },
  {
    header: 'PERFORMANCE',
    items: [
      { label: 'Revenue', href: '/revenue' },
      { label: 'Labor', href: '/labor' },
      { label: 'Schedule', href: '/schedule' },
    ],
  },
  {
    header: 'OPERATIONS',
    items: [
      { label: 'Forecast', href: '/forecast' },
      { label: 'Pace Monitor', href: '/pace' },
    ],
  },
  {
    header: 'INTELLIGENCE',
    items: [
      { label: 'Insights', href: '/insights' },
    ],
  },
  {
    header: 'SETTINGS',
    items: [
      { label: 'Settings', href: '/settings' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [venueOpen, setVenueOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const sidebarContent = (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col
        bg-[#1e2235] transition-transform duration-200
        lg:static lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-5">
        <span className="text-lg font-bold tracking-tight text-white">
          Helixo
        </span>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="rounded p-1 text-gray-400 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="3" x2="13" y2="13" />
            <line x1="13" y1="3" x2="3" y2="13" />
          </svg>
        </button>
      </div>

      {/* Venue selector */}
      <div className="relative px-4 pb-4">
        <button
          type="button"
          onClick={() => setVenueOpen(!venueOpen)}
          className="flex w-full items-center justify-between rounded-md border border-gray-600 px-3 py-2 text-sm text-white hover:border-gray-400 transition-colors"
        >
          <span>Downtown Bistro</span>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3,4.5 6,7.5 9,4.5" />
          </svg>
        </button>
        {venueOpen && (
          <div className="absolute left-4 right-4 top-full mt-1 rounded-md border border-gray-600 bg-[#272b40] py-1 shadow-lg z-10">
            <button className="w-full px-3 py-2 text-left text-sm text-white bg-[#323754]">
              Downtown Bistro
            </button>
            <button className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-[#323754]">
              Uptown Grill
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        {navSections.map((section) => (
          <div key={section.header} className="mb-4">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              {section.header}
            </p>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    block rounded-md px-3 py-2 text-sm transition-colors
                    ${
                      active
                        ? 'border-l-2 border-indigo-400 bg-[#272b40] text-white'
                        : 'text-gray-400 hover:bg-[#272b40] hover:text-white'
                    }
                  `}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4">
        <p className="text-[10px] text-gray-600">v3.5.0-alpha.1</p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-[#1e2235] p-2 text-white shadow-md lg:hidden"
        aria-label="Open sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {sidebarContent}
    </>
  );
}
