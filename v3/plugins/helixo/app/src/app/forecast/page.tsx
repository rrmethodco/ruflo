"use client";

import { currency, number as fmt } from "@/lib/format";

/* ── Static Data ──────────────────────────────────────────────────── */

const DAYS = [
  { day: "Mon", date: "Mar 24", lunch: 4200, dinner: 9800, total: 14000, covers: 220, avgCheck: 63.64, vsLW: 5.2, vsLY: 6.1 },
  { day: "Tue", date: "Mar 25", lunch: 3800, dinner: 9200, total: 13000, covers: 204, avgCheck: 63.73, vsLW: 3.8, vsLY: 4.0 },
  { day: "Wed", date: "Mar 26", lunch: 4500, dinner: 10500, total: 15000, covers: 234, avgCheck: 64.10, vsLW: 4.2, vsLY: 6.4 },
  { day: "Thu", date: "Mar 27", lunch: 5200, dinner: 11800, total: 17000, covers: 263, avgCheck: 64.64, vsLW: 7.6, vsLY: 7.6 },
  { day: "Fri", date: "Mar 28", lunch: 5500, dinner: 12000, total: 17500, covers: 272, avgCheck: 64.34, vsLW: 6.5, vsLY: 6.7 },
  { day: "Sat", date: "Mar 29", lunch: 7800, dinner: 17200, total: 25000, covers: 386, avgCheck: 64.77, vsLW: 8.4, vsLY: 6.4 },
  { day: "Sun", date: "Mar 30", lunch: 6200, dinner: 15500, total: 21700, covers: 336, avgCheck: 64.58, vsLW: 3.3, vsLY: 4.3 },
];

const weekTotal = {
  lunch: DAYS.reduce((s, d) => s + d.lunch, 0),
  dinner: DAYS.reduce((s, d) => s + d.dinner, 0),
  total: DAYS.reduce((s, d) => s + d.total, 0),
  covers: DAYS.reduce((s, d) => s + d.covers, 0),
};

const BAR_HEIGHTS = [56, 52, 60, 68, 70, 100, 87]; // percentage heights for chart

/* ── Component ────────────────────────────────────────────────────── */

export default function ForecastPage() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Revenue Forecast</h1>
        <div className="flex items-center gap-3">
          <div className="leo-chart-filter">Prior Year</div>
          <div className="leo-chart-filter">Last 30 Days</div>
          <div className="leo-chart-filter">Custom Range</div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="leo-kpi">
          <p className="leo-kpi-label">Weekly Projected</p>
          <p className="leo-kpi-value">$98,450</p>
          <p className="leo-kpi-compare">
            <span className="leo-delta-up">&#8599; +6.2%</span>
            <span className="ml-2">vs $92,710</span>
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Avg Daily Revenue</p>
          <p className="leo-kpi-value">$14,064</p>
          <p className="leo-kpi-compare">
            <span className="leo-delta-up">&#8599; +5.8%</span>
            <span className="ml-2">vs $13,294</span>
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Projected Covers</p>
          <p className="leo-kpi-value">{fmt(1892)}</p>
          <p className="leo-kpi-compare">
            <span className="leo-delta-up">&#8599; +3.4%</span>
            <span className="ml-2">vs {fmt(1830)}</span>
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Forecast Confidence</p>
          <p className="leo-kpi-value">87%</p>
          <p className="leo-kpi-compare">Based on trailing 4-week accuracy</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Budget Variance</p>
          <p className="leo-kpi-value">+$2,340</p>
          <p className="leo-kpi-compare">
            <span className="leo-delta-up">&#8599; +2.4%</span>
            <span className="ml-2">vs budget</span>
          </p>
        </div>
      </div>

      {/* Weekly Forecast Chart */}
      <div className="leo-card p-6">
        <div className="leo-chart-header">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Weekly Forecast</h2>
            <p className="text-xs text-gray-400 mt-0.5">Mar 23 - Mar 29</p>
          </div>
          <div className="leo-chart-filters">
            <div className="leo-chart-filter">Revenue</div>
            <div className="leo-chart-filter">Covers</div>
            <div className="leo-chart-filter">Bar</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mb-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="leo-dot leo-dot-blue" />Forecast
          </span>
          <span className="flex items-center gap-1.5">
            <span className="leo-dot" style={{ backgroundColor: "#c7d2fe" }} />Last Week
          </span>
          <span className="flex items-center gap-1.5">
            <span className="leo-dot" style={{ backgroundColor: "#e5e7eb" }} />Last Year
          </span>
        </div>

        {/* Bar Chart */}
        <div className="flex items-end gap-6 h-48 px-4">
          {DAYS.map((d, i) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">{currency(d.total)}</span>
              <div className="w-full flex items-end justify-center gap-1 h-36">
                <div
                  className="w-5 rounded-t bg-gray-200"
                  style={{ height: `${BAR_HEIGHTS[i] * 0.85}%` }}
                />
                <div
                  className="w-5 rounded-t bg-indigo-200"
                  style={{ height: `${BAR_HEIGHTS[i] * 0.92}%` }}
                />
                <div
                  className="w-5 rounded-t bg-indigo-500"
                  style={{ height: `${BAR_HEIGHTS[i]}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="leo-card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Daily Breakdown</h2>
        <table className="leo-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Date</th>
              <th className="text-right">Lunch</th>
              <th className="text-right">Dinner</th>
              <th className="text-right">Total</th>
              <th className="text-right">Covers</th>
              <th className="text-right">Avg Check</th>
              <th className="text-right">vs LW</th>
              <th className="text-right">vs LY</th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d) => (
              <tr key={d.day}>
                <td className="font-medium text-gray-900">{d.day}</td>
                <td>{d.date}</td>
                <td className="text-right">{currency(d.lunch)}</td>
                <td className="text-right">{currency(d.dinner)}</td>
                <td className="text-right font-semibold text-gray-900">{currency(d.total)}</td>
                <td className="text-right">{fmt(d.covers)}</td>
                <td className="text-right">{currency(d.avgCheck)}</td>
                <td className={`text-right font-medium ${d.vsLW >= 0 ? "leo-delta-up" : "leo-delta-down"}`}>
                  {d.vsLW >= 0 ? "+" : ""}{d.vsLW.toFixed(1)}%
                </td>
                <td className={`text-right font-medium ${d.vsLY >= 0 ? "leo-delta-up" : "leo-delta-down"}`}>
                  {d.vsLY >= 0 ? "+" : ""}{d.vsLY.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td className="font-bold text-gray-900 py-3">Total</td>
              <td className="py-3" />
              <td className="text-right font-bold text-gray-900 py-3">{currency(weekTotal.lunch)}</td>
              <td className="text-right font-bold text-gray-900 py-3">{currency(weekTotal.dinner)}</td>
              <td className="text-right font-bold text-gray-900 py-3">{currency(weekTotal.total)}</td>
              <td className="text-right font-bold text-gray-900 py-3">{fmt(weekTotal.covers)}</td>
              <td className="text-right font-bold text-gray-900 py-3">
                {currency(weekTotal.total / weekTotal.covers)}
              </td>
              <td className="text-right font-bold leo-delta-up py-3">+5.6%</td>
              <td className="text-right font-bold leo-delta-up py-3">+5.9%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
