import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'Helixo - Restaurant Revenue Forecasting & Labor Optimization',
  description:
    'AI-powered revenue forecasting and labor optimization dashboard for restaurants.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex h-screen overflow-hidden">
          {/* Left: Sidebar (220px fixed) */}
          <Sidebar />

          {/* Center + Right wrapper */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <div className="flex flex-1 overflow-hidden">
              {/* Main content (scrollable) */}
              <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
                {children}
              </main>

              {/* Right: Intelligence panel (340px, optional) */}
              <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white p-5 xl:block">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Intelligence
                </p>
                <p className="text-sm text-slate-400">
                  Insights and recommendations will appear here.
                </p>
              </aside>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
