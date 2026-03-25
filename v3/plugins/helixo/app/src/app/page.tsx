"use client";

import { useEffect, useState } from "react";
import { currency, number as fmt, percent } from "@/lib/format";
import type { DashboardData } from "@/lib/api";

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

function Loading() {
  return (
    <main className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Loading dashboard...</p>
      </div>
    </main>
  );
}

/* ---------- Page ---------- */

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/api").then(mod => {
      try {
        setData(mod.getDashboardData());
      } catch (err) {
        setError(String(err));
      }
    });
  }, []);

  if (error) {
    return (
      <main className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="leo-card p-6 max-w-md text-center">
          <p className="text-red-500 font-medium">Error loading dashboard</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) return <Loading />;

  const revDelta = data.priorWeekRevenue > 0
    ? ((data.weeklyRevenue - data.priorWeekRevenue) / data.priorWeekRevenue) * 100
    : 0;
  const coverDelta = data.priorWeekCoverage > 0
    ? ((data.weeklyCoverage - data.priorWeekCoverage) / data.priorWeekCoverage) * 100
    : 0;
  const checkDelta = data.priorAvgCheck > 0
    ? ((data.avgCheck - data.priorAvgCheck) / data.priorAvgCheck) * 100
    : 0;
  const laborDelta = data.priorLaborCostPercent > 0
    ? ((data.laborCostPercent - data.priorLaborCostPercent) / data.priorLaborCostPercent) * 100
    : 0;
  const revLaborDelta = data.priorRevPerLaborHour > 0
    ? ((data.revPerLaborHour - data.priorRevPerLaborHour) / data.priorRevPerLaborHour) * 100
    : 0;

  const kpis = [
    { label: "Total Revenue", value: currency(data.weeklyRevenue), delta: Math.abs(revDelta), up: revDelta > 0, prior: currency(data.priorWeekRevenue), period: "Last 7 Days" },
    { label: "Covers", value: fmt(data.weeklyCoverage), delta: Math.abs(coverDelta), up: coverDelta > 0, prior: fmt(data.priorWeekCoverage), period: "Last 7 Days" },
    { label: "Avg Check", value: currency(data.avgCheck), delta: Math.abs(checkDelta), up: checkDelta > 0, prior: currency(data.priorAvgCheck), period: "Last 7 Days" },
    { label: "Labor Cost %", value: percent(data.laborCostPercent), delta: Math.abs(laborDelta), up: laborDelta > 0, prior: percent(data.priorLaborCostPercent), period: "Last 7 Days", invertColor: true },
    { label: "Rev/Labor Hour", value: currency(data.revPerLaborHour), delta: Math.abs(revLaborDelta), up: revLaborDelta > 0, prior: currency(data.priorRevPerLaborHour), period: "Last 7 Days" },
  ];

  const maxRevenue = Math.max(...data.dailyBreakdown.map(d => d.total));

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
              <p className="text-xs text-gray-400 mt-0.5">Last 7 Days — Engine Generated</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 mb-4 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-300" />
              Lunch/Brunch
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-600" />
              Dinner
            </span>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end justify-around gap-3 pl-12 pt-2" style={{ height: 220 }}>
            {data.dailyBreakdown.map((d) => {
              const total = d.lunch + d.dinner;
              const barH = maxRevenue > 0 ? (total / maxRevenue) * 190 : 0;
              const lunchH = total > 0 ? (d.lunch / total) * barH : 0;
              const dinnerH = total > 0 ? (d.dinner / total) * barH : 0;
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
                  <span className="text-[10px] text-gray-400">{d.date}</span>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </main>
  );
}
