"use client";

import { currency, number } from "@/lib/format";

/* ---------- Data ---------- */

const kpis = [
  { label: "Total Revenue", value: "$14,820", delta: 5.3, up: true, prior: "$14,072", period: "Last 7 Days" },
  { label: "Covers", value: "1,892", delta: 3.1, up: true, prior: "1,835", period: "Last 7 Days" },
  { label: "Avg Check", value: "$48.20", delta: 2.1, up: false, prior: "$49.23", period: "Last 7 Days" },
  { label: "Labor Cost %", value: "28.4%", delta: 1.8, up: true, prior: "27.9%", period: "Last 7 Days", invertColor: true },
  { label: "Rev/Labor Hour", value: "$52.30", delta: 4.2, up: true, prior: "$50.19", period: "Last 7 Days" },
];

const chartDays = [
  { day: "Mon", lunch: 1420, dinner: 2380 },
  { day: "Tue", lunch: 1280, dinner: 2100 },
  { day: "Wed", lunch: 1510, dinner: 2540 },
  { day: "Thu", lunch: 1350, dinner: 2290 },
  { day: "Fri", lunch: 1680, dinner: 3120 },
  { day: "Sat", lunch: 1920, dinner: 3480 },
  { day: "Sun", lunch: 1560, dinner: 2640 },
];

const maxRevenue = Math.max(...chartDays.map((d) => d.lunch + d.dinner));

const bottomMetrics = [
  { label: "Avg Turn Time", value: "52 min", prior: "48 min", delta: 8.3, up: true, invertColor: true, insight: "Slightly slower", dot: "amber" },
  { label: "Table Utilization", value: "78.5%", prior: "76.2%", delta: 2.3, up: true, invertColor: false, insight: "On target", dot: "green" },
  { label: "Server Efficiency", value: "4.2 covers/hr", prior: "4.0", delta: 5.0, up: true, invertColor: false, insight: "Improving", dot: "green" },
  { label: "Food Cost %", value: "31.2%", prior: "30.8%", delta: 0.4, up: false, invertColor: true, insight: "Stable", dot: "green" },
  { label: "Guest Satisfaction", value: "4.6/5", prior: "4.5", delta: 2.2, up: true, invertColor: false, insight: "Trending up", dot: "green" },
];

/* ---------- Helpers ---------- */

function DeltaArrow({ delta, up, invert }: { delta: number; up: boolean; invert?: boolean }) {
  const positive = invert ? !up : up;
  const cls = positive ? "leo-delta-up" : "leo-delta-down";
  const arrow = up ? "\u2197" : "\u2198";
  const sign = up ? "+" : "-";
  return (
    <span className={`text-xs ${cls}`}>
      {arrow} {sign}{delta.toFixed(1)}%
    </span>
  );
}

function dotClass(color: string) {
  if (color === "green") return "leo-dot leo-dot-green";
  if (color === "red") return "leo-dot leo-dot-red";
  return "leo-dot leo-dot-amber";
}

/* ---------- Page ---------- */

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#f5f6fa] px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* ---- Header ---- */}
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Operations Overview
          </h1>
          <div className="flex items-center gap-3">
            <div className="leo-chart-filter">Prior Week</div>
            <div className="leo-chart-filter">Last 7 Days</div>
          </div>
        </header>

        {/* ---- KPI Row ---- */}
        <section className="grid grid-cols-5 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="leo-kpi">
              <p className="leo-kpi-label">{k.label}</p>
              <p className="leo-kpi-value">{k.value}</p>
              <div className="mt-2 flex items-center gap-2">
                <DeltaArrow delta={k.delta} up={k.up} invert={k.invertColor} />
                <span className="text-xs text-gray-400">vs {k.prior}</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">{k.period}</p>
            </div>
          ))}
        </section>

        {/* ---- Revenue Trend Chart ---- */}
        <section className="leo-card p-6">
          <div className="leo-chart-header">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Revenue Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">Last 7 Days</p>
            </div>
            <div className="leo-chart-filters">
              <select className="leo-chart-filter appearance-none pr-6">
                <option>Revenue</option>
              </select>
              <select className="leo-chart-filter appearance-none pr-6">
                <option>Daily</option>
              </select>
              <select className="leo-chart-filter appearance-none pr-6">
                <option>Bar</option>
              </select>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mb-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-300" />
              Lunch
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-600" />
              Dinner
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-gray-300" />
              Total
            </span>
          </div>

          {/* Bar Chart */}
          <div className="relative">
            {/* Y-axis grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[5000, 4000, 3000, 2000, 1000, 0].map((v) => (
                <div key={v} className="flex items-center">
                  <span className="text-[10px] text-gray-400 w-10 text-right pr-2">
                    {v > 0 ? `$${(v / 1000).toFixed(0)}K` : "$0"}
                  </span>
                  <div className="flex-1 border-t border-gray-100" />
                </div>
              ))}
            </div>

            {/* Bars */}
            <div className="flex items-end justify-around gap-3 pl-12 pt-2" style={{ height: 220 }}>
              {chartDays.map((d) => {
                const total = d.lunch + d.dinner;
                const barH = (total / maxRevenue) * 190;
                const lunchH = (d.lunch / total) * barH;
                const dinnerH = (d.dinner / total) * barH;
                return (
                  <div key={d.day} className="flex flex-col items-center flex-1">
                    <div className="flex flex-col justify-end" style={{ height: 190 }}>
                      <div
                        className="w-8 rounded-t bg-indigo-600"
                        style={{ height: dinnerH }}
                        title={`Dinner: ${currency(d.dinner)}`}
                      />
                      <div
                        className="w-8 bg-indigo-300"
                        style={{ height: lunchH }}
                        title={`Lunch: ${currency(d.lunch)}`}
                      />
                    </div>
                    <span className="text-[11px] text-gray-500 mt-2">{d.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---- Bottom Metrics Row ---- */}
        <section className="grid grid-cols-5 gap-4">
          {bottomMetrics.map((m) => (
            <div key={m.label} className="leo-kpi">
              <p className="leo-kpi-label">{m.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{m.value}</p>
              <div className="mt-2 flex items-center gap-2">
                <DeltaArrow delta={m.delta} up={m.up} invert={m.invertColor} />
                <span className="text-xs text-gray-400">vs {m.prior}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                <span className={dotClass(m.dot)} />
                {m.insight}
              </div>
            </div>
          ))}
        </section>

      </div>
    </main>
  );
}
