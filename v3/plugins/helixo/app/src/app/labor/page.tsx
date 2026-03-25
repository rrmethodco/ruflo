"use client";

import { currency, percent, number as fmt } from "@/lib/format";

// ---------------------------------------------------------------------------
// Demo data: busy Saturday casual dining
// ---------------------------------------------------------------------------

const SELECTED_DATE = "Saturday, Mar 22, 2025";
const TOTAL_REVENUE = 15_000;

const kpis = {
  totalLaborCost: 4_218,
  laborPercent: 28.2,
  laborTarget: 30,
  totalHours: 185,
  coversPerLaborHour: 3.8,
};

const ROLES = ["Server", "Bartender", "Host", "Busser", "Line Cook", "Dishwasher"] as const;

const HOURS = [
  "11 AM", "12 PM", "1 PM", "2 PM", "3 PM",
  "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM",
] as const;

// staffingGrid[hourIndex][roleIndex] = headcount
const staffingGrid: number[][] = [
  [2, 1, 1, 1, 2, 1], // 11 AM
  [3, 1, 1, 2, 3, 1], // 12 PM
  [3, 1, 1, 2, 3, 1], // 1 PM
  [2, 1, 1, 1, 2, 1], // 2 PM
  [1, 1, 1, 1, 2, 1], // 3 PM
  [2, 1, 1, 1, 3, 1], // 4 PM
  [4, 2, 1, 2, 4, 2], // 5 PM
  [5, 2, 2, 3, 4, 2], // 6 PM - peak
  [5, 2, 2, 3, 4, 2], // 7 PM - peak
  [4, 2, 1, 2, 3, 2], // 8 PM
  [3, 1, 1, 1, 2, 1], // 9 PM
];

const departments = {
  foh: {
    label: "Front of House (FOH)",
    hours: 112,
    cost: 2_464,
    revenuePercent: 16.4,
    roles: [
      { role: "Server", peak: 5, hours: 48 },
      { role: "Bartender", peak: 2, hours: 24 },
      { role: "Host", peak: 2, hours: 20 },
      { role: "Busser", peak: 3, hours: 20 },
    ],
  },
  boh: {
    label: "Back of House (BOH)",
    hours: 73,
    cost: 1_754,
    revenuePercent: 11.7,
    roles: [
      { role: "Line Cook", peak: 4, hours: 52 },
      { role: "Dishwasher", peak: 2, hours: 21 },
    ],
  },
};

const staggerRecommendations = [
  { time: "10:30 AM", role: "Line Cook", action: "Start 2 line cooks for lunch prep" },
  { time: "11:00 AM", role: "Server", action: "Add 1 server for early lunch walk-ins" },
  { time: "5:30 PM", role: "Server", action: "Add 1 server for dinner ramp" },
  { time: "5:00 PM", role: "Bartender", action: "Add 1 bartender for happy hour transition" },
  { time: "6:00 PM", role: "Busser", action: "Add 1 busser for peak dinner volume" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cellColor(count: number): string {
  if (count === 0) return "bg-white/5";
  if (count === 1) return "bg-emerald-900/30";
  if (count === 2) return "bg-emerald-800/40";
  if (count === 3) return "bg-emerald-700/50";
  if (count === 4) return "bg-emerald-600/60";
  return "bg-emerald-500/70";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LaborPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Labor Planning</h1>
          <p className="text-sm text-gray-400 mt-1">
            Optimize staffing to revenue forecast
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 backdrop-blur px-4 py-2 text-sm">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {SELECTED_DATE}
        </div>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Labor Cost" value={currency(kpis.totalLaborCost)} sub={`of ${currency(TOTAL_REVENUE)} revenue`} />
        <KpiCard
          label="Labor %"
          value={percent(kpis.laborPercent)}
          sub={`vs ${percent(kpis.laborTarget)} target`}
          accent={kpis.laborPercent <= kpis.laborTarget}
        />
        <KpiCard label="Total Hours" value={fmt(kpis.totalHours)} sub="scheduled today" />
        <KpiCard label="Covers / Labor Hr" value={kpis.coversPerLaborHour.toFixed(1)} sub="efficiency" />
      </div>

      {/* Staffing Heatmap Grid */}
      <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Staffing Heatmap</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wider">
              <th className="text-left py-2 pr-4 font-medium">Time</th>
              {ROLES.map((r) => (
                <th key={r} className="py-2 px-3 font-medium text-center">{r}</th>
              ))}
              <th className="py-2 px-3 font-medium text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {HOURS.map((hour, hi) => {
              const row = staffingGrid[hi];
              const total = row.reduce((s, v) => s + v, 0);
              return (
                <tr key={hour} className="border-t border-white/5">
                  <td className="py-2 pr-4 font-medium text-gray-300 whitespace-nowrap">{hour}</td>
                  {row.map((count, ri) => (
                    <td key={ri} className="py-2 px-3 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-semibold ${cellColor(count)}`}>
                        {count}
                      </span>
                    </td>
                  ))}
                  <td className="py-2 px-3 text-center font-semibold text-emerald-400">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Department Breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        {(["foh", "boh"] as const).map((dept) => {
          const d = departments[dept];
          return (
            <section key={dept} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <h3 className="text-lg font-semibold mb-3">{d.label}</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <MiniStat label="Hours" value={fmt(d.hours)} />
                <MiniStat label="Cost" value={currency(d.cost)} />
                <MiniStat label="% of Rev" value={percent(d.revenuePercent)} />
              </div>
              <div className="space-y-2">
                {d.roles.map((r) => (
                  <div key={r.role} className="flex items-center justify-between text-sm border-t border-white/5 pt-2">
                    <span className="text-gray-300">{r.role}</span>
                    <div className="flex gap-4 text-gray-400">
                      <span>Peak: <span className="text-white font-medium">{r.peak}</span></span>
                      <span>Hours: <span className="text-white font-medium">{r.hours}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Staggered Starts */}
      <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
        <h2 className="text-lg font-semibold mb-4">Staggered Start Recommendations</h2>
        <div className="space-y-3">
          {staggerRecommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <div className="shrink-0 w-20 text-center">
                <span className="inline-block rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2 py-1">
                  {rec.time}
                </span>
              </div>
              <div>
                <span className="text-sm font-medium text-white">{rec.role}</span>
                <p className="text-sm text-gray-400 mt-0.5">{rec.action}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({ label, value, sub, accent }: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent === false ? "text-amber-400" : accent === true ? "text-emerald-400" : "text-white"}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
