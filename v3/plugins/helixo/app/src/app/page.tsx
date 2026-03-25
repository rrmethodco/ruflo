"use client";

import { currency, percent, number } from "@/lib/format";

/* ---------- Demo data for a 120-seat casual dining restaurant ---------- */

const today = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const kpis = {
  revenue: { value: 14_820, lastWeek: 13_650, label: "Projected Revenue" },
  covers: { value: 274, lastWeek: 258, label: "Projected Covers" },
  laborPct: { value: 28.4, target: 30, label: "Labor Cost %" },
  pace: { status: "Ahead", delta: 8, label: "Pace Status" },
};

const mealPeriods = [
  { name: "Lunch", revenue: 5_340, pct: 36 },
  { name: "Dinner", revenue: 9_480, pct: 64 },
];

const staffing = [
  { role: "FOH", lunchHeads: 6, dinnerHeads: 10, hours: 98, cost: 2_156 },
  { role: "BOH", lunchHeads: 4, dinnerHeads: 7, hours: 74, cost: 1_998 },
];

const alerts = [
  { level: "warn", text: "2 open shifts for Friday dinner \u2014 no applicants yet" },
  { level: "warn", text: "Server overtime projected: Sarah M. at 42 hrs this week" },
  { level: "info", text: "Dinner pace 8% ahead of forecast \u2014 consider extending shifts" },
  { level: "ok", text: "All prep lists completed on time today" },
];

/* ---------- Helpers ---------- */

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const diff = ((current - previous) / previous) * 100;
  const up = diff >= 0;
  return (
    <span className={`inline-flex items-center text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
      <span className="mr-0.5">{up ? "\u25B2" : "\u25BC"}</span>
      {Math.abs(diff).toFixed(1)}% vs last week
    </span>
  );
}

function alertColor(level: string) {
  if (level === "warn") return "border-amber-500/40 bg-amber-500/5 text-amber-300";
  if (level === "ok") return "border-emerald-500/40 bg-emerald-500/5 text-emerald-300";
  return "border-sky-500/40 bg-sky-500/5 text-sky-300";
}

function alertIcon(level: string) {
  if (level === "warn") return "\u26A0";
  if (level === "ok") return "\u2713";
  return "\u2139";
}

/* ---------- Page ---------- */

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-4 py-8 sm:px-8 text-gray-100">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* ---- Header ---- */}
        <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Today&apos;s Operations</h1>
            <p className="text-sm text-gray-400">{today}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </header>

        {/* ---- KPI Cards ---- */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Revenue */}
          <div className="glass-card rounded-xl p-5 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{kpis.revenue.label}</p>
            <p className="text-2xl font-bold text-white">{currency(kpis.revenue.value)}</p>
            <DeltaBadge current={kpis.revenue.value} previous={kpis.revenue.lastWeek} />
          </div>

          {/* Covers */}
          <div className="glass-card rounded-xl p-5 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{kpis.covers.label}</p>
            <p className="text-2xl font-bold text-white">{number(kpis.covers.value)}</p>
            <DeltaBadge current={kpis.covers.value} previous={kpis.covers.lastWeek} />
          </div>

          {/* Labor Cost % */}
          <div className="glass-card rounded-xl p-5 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{kpis.laborPct.label}</p>
            <p className="text-2xl font-bold text-white">{percent(kpis.laborPct.value)}</p>
            <span className={`inline-flex items-center text-xs font-medium ${kpis.laborPct.value <= kpis.laborPct.target ? "text-emerald-400" : "text-red-400"}`}>
              Target: {percent(kpis.laborPct.target)}
              {kpis.laborPct.value <= kpis.laborPct.target ? " \u2713" : " \u2717"}
            </span>
          </div>

          {/* Pace */}
          <div className="glass-card rounded-xl p-5 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{kpis.pace.label}</p>
            <p className="text-2xl font-bold text-emerald-400">{kpis.pace.status}</p>
            <span className="text-xs font-medium text-emerald-400">+{kpis.pace.delta}% vs forecast</span>
          </div>
        </section>

        {/* ---- Revenue by Meal Period ---- */}
        <section className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Revenue by Meal Period</h2>
          <div className="space-y-3">
            {mealPeriods.map((mp) => (
              <div key={mp.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-200">{mp.name}</span>
                  <span className="font-semibold text-white">{currency(mp.revenue)}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
                    style={{ width: `${mp.pct}%` }}
                  />
                </div>
                <p className="text-right text-xs text-gray-500">{mp.pct}% of total</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Staffing Overview ---- */}
        <section className="glass-card rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Staffing Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700/50 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4 text-center">Lunch Heads</th>
                  <th className="pb-2 pr-4 text-center">Dinner Heads</th>
                  <th className="pb-2 pr-4 text-right">Total Hours</th>
                  <th className="pb-2 text-right">Labor Cost</th>
                </tr>
              </thead>
              <tbody>
                {staffing.map((row) => (
                  <tr key={row.role} className="border-b border-gray-800/40">
                    <td className="py-3 pr-4 font-medium text-gray-200">{row.role}</td>
                    <td className="py-3 pr-4 text-center text-gray-300">{row.lunchHeads}</td>
                    <td className="py-3 pr-4 text-center text-gray-300">{row.dinnerHeads}</td>
                    <td className="py-3 pr-4 text-right text-gray-300">{row.hours} hrs</td>
                    <td className="py-3 text-right font-medium text-white">{currency(row.cost)}</td>
                  </tr>
                ))}
                <tr className="text-gray-300">
                  <td className="pt-3 pr-4 font-semibold text-gray-200">Total</td>
                  <td className="pt-3 pr-4 text-center font-semibold">{staffing.reduce((s, r) => s + r.lunchHeads, 0)}</td>
                  <td className="pt-3 pr-4 text-center font-semibold">{staffing.reduce((s, r) => s + r.dinnerHeads, 0)}</td>
                  <td className="pt-3 pr-4 text-right font-semibold">{staffing.reduce((s, r) => s + r.hours, 0)} hrs</td>
                  <td className="pt-3 text-right font-semibold text-white">{currency(staffing.reduce((s, r) => s + r.cost, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- Alerts & Recommendations ---- */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Alerts &amp; Recommendations</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {alerts.map((a, i) => (
              <div key={i} className={`rounded-lg border px-4 py-3 text-sm ${alertColor(a.level)}`}>
                <span className="mr-2">{alertIcon(a.level)}</span>
                {a.text}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
