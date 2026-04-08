"use client";

import { useEffect, useState } from "react";
import { currency, number as fmt, percent } from "@/lib/format";
import type { RevenuePageData } from "@/lib/api";

function Loading() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Loading revenue analysis...</p>
      </div>
    </div>
  );
}

function DeltaArrow({ delta, up }: { delta: number; up: boolean }) {
  const cls = up ? "leo-delta-up" : "leo-delta-down";
  const arrow = up ? "\u2197" : "\u2198";
  const sign = up ? "+" : "";
  return (
    <span className={`text-xs ${cls}`}>
      {arrow} {sign}{delta.toFixed(1)}%
    </span>
  );
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenuePageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/api").then(mod => {
      try {
        setData(mod.getRevenueData());
      } catch (err) {
        setError(String(err));
      }
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="leo-card p-6 max-w-md text-center">
          <p className="text-red-500 font-medium">Error loading revenue data</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return <Loading />;

  const kpis = [
    { label: "Weekly Revenue", value: currency(data.weeklyRevenue) },
    { label: "Avg Daily Revenue", value: currency(data.avgDaily) },
    { label: "Peak Day", value: `${data.peakDay.day} — ${currency(data.peakDay.revenue)}` },
    { label: "Rev / Seat / Day", value: currency(data.revenuePerSeat) },
  ];

  const maxMealTotal = Math.max(...data.mealPeriodBreakdown.map(d => d.total));

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Revenue Analysis</h1>
        <div className="flex items-center gap-3">
          <div className="leo-chart-filter">This Week</div>
          <div className="leo-chart-filter">vs Prior Week</div>
        </div>
      </div>

      {/* KPI Row */}
      <section className="grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="leo-kpi">
            <p className="leo-kpi-label">{k.label}</p>
            <p className="leo-kpi-value text-2xl">{k.value}</p>
          </div>
        ))}
      </section>

      {/* Revenue by Meal Period */}
      <div className="leo-card p-6">
        <div className="leo-chart-header">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Revenue by Meal Period</h2>
            <p className="text-xs text-gray-400 mt-0.5">Lunch/Brunch vs Dinner — Weekly Breakdown</p>
          </div>
        </div>

        <div className="flex items-center gap-5 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="leo-dot leo-dot-blue" />Lunch / Brunch
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block mr-1.5 bg-indigo-800" />Dinner
          </span>
        </div>

        <table className="leo-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Date</th>
              <th className="text-right">Lunch</th>
              <th className="text-right">Dinner</th>
              <th className="text-right">Total</th>
              <th className="text-right">Mix</th>
              <th>Distribution</th>
            </tr>
          </thead>
          <tbody>
            {data.mealPeriodBreakdown.map((d) => {
              const lunchPct = d.total > 0 ? (d.lunch / d.total) * 100 : 0;
              const dinnerPct = d.total > 0 ? (d.dinner / d.total) * 100 : 0;
              return (
                <tr key={d.day}>
                  <td className="font-medium text-gray-900">{d.day}</td>
                  <td>{d.date}</td>
                  <td className="text-right">{currency(d.lunch)}</td>
                  <td className="text-right">{currency(d.dinner)}</td>
                  <td className="text-right font-semibold text-gray-900">{currency(d.total)}</td>
                  <td className="text-right text-xs text-gray-500">
                    {lunchPct.toFixed(0)}% / {dinnerPct.toFixed(0)}%
                  </td>
                  <td>
                    <div className="flex h-3 w-full rounded overflow-hidden">
                      <div className="bg-indigo-400" style={{ width: `${lunchPct}%` }} />
                      <div className="bg-indigo-800" style={{ width: `${dinnerPct}%` }} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td className="font-bold text-gray-900 py-3">Total</td>
              <td className="py-3" />
              <td className="text-right font-bold text-gray-900 py-3">
                {currency(data.mealPeriodBreakdown.reduce((s, d) => s + d.lunch, 0))}
              </td>
              <td className="text-right font-bold text-gray-900 py-3">
                {currency(data.mealPeriodBreakdown.reduce((s, d) => s + d.dinner, 0))}
              </td>
              <td className="text-right font-bold text-gray-900 py-3">
                {currency(data.weeklyRevenue)}
              </td>
              <td className="py-3" />
              <td className="py-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Day-over-Day Comparison */}
      <div className="leo-card p-6">
        <div className="leo-chart-header">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Day-over-Day Comparison</h2>
            <p className="text-xs text-gray-400 mt-0.5">This Week vs Prior Week Equivalent</p>
          </div>
        </div>

        <table className="leo-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Date</th>
              <th className="text-right">This Week</th>
              <th className="text-right">Prior Week</th>
              <th className="text-right">Change</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {data.dayComparisons.map((d) => (
              <tr key={d.day}>
                <td className="font-medium text-gray-900">{d.day}</td>
                <td>{d.date}</td>
                <td className="text-right">{currency(d.current)}</td>
                <td className="text-right text-gray-500">{currency(d.priorWeek)}</td>
                <td className="text-right">
                  <DeltaArrow delta={d.delta} up={d.delta >= 0} />
                </td>
                <td>
                  <div className="w-full bg-gray-100 h-2 rounded overflow-hidden">
                    <div
                      className={`h-2 rounded ${d.delta >= 0 ? 'bg-emerald-500' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(Math.abs(d.delta) * 5, 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Menu Mix / Revenue by Category */}
      <div className="leo-card p-6">
        <div className="leo-chart-header">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Revenue by Category</h2>
            <p className="text-xs text-gray-400 mt-0.5">Menu Mix Breakdown — Weekly Total</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Table */}
          <table className="leo-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Revenue</th>
                <th className="text-right">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {data.menuMix.map((m) => (
                <tr key={m.category}>
                  <td className="font-medium text-gray-900">{m.category}</td>
                  <td className="text-right">{currency(m.amount)}</td>
                  <td className="text-right">{(m.pct * 100).toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Visual bars */}
          <div className="space-y-3 pt-8">
            {data.menuMix.map((m) => (
              <div key={m.category} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 text-right">{m.category}</span>
                <div className="flex-1 bg-gray-100 h-4 rounded overflow-hidden">
                  <div
                    className="h-4 rounded bg-indigo-500"
                    style={{ width: `${m.pct * 100 * 2.2}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 w-12 text-right">
                  {(m.pct * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
