"use client";

import { currency } from "@/lib/format";

// ---------------------------------------------------------------------------
// Demo data -- dinner service at 7:15 PM, 108% of pace
// ---------------------------------------------------------------------------

const NOW = "7:15 PM";
const ACTUAL_SALES = 9_450;
const FORECAST_SALES = 8_750;
const PROJECTED_TOTAL = 14_250;
const FORECAST_TOTAL = 13_200;
const ACTUAL_COVERS = 74;
const PROJECTED_COVERS = 85;
const SERVICE_PROGRESS = 65;

const INTERVALS = [
  { time: "5:00 - 5:15", forecast: 320, actual: 290, status: "done" as const },
  { time: "5:15 - 5:30", forecast: 410, actual: 430, status: "done" as const },
  { time: "5:30 - 5:45", forecast: 580, actual: 620, status: "done" as const },
  { time: "5:45 - 6:00", forecast: 720, actual: 810, status: "done" as const },
  { time: "6:00 - 6:15", forecast: 850, actual: 920, status: "done" as const },
  { time: "6:15 - 6:30", forecast: 960, actual: 1040, status: "done" as const },
  { time: "6:30 - 6:45", forecast: 1080, actual: 1170, status: "done" as const },
  { time: "6:45 - 7:00", forecast: 1120, actual: 1210, status: "done" as const },
  { time: "7:00 - 7:15", forecast: 1150, actual: 1240, status: "current" as const },
];

const RECOMMENDATIONS = [
  {
    title: "Consider extending server shifts",
    description: "Volume is 8% above forecast. Two server shifts ending at 8 PM may need coverage through close to maintain service quality.",
    tag: "Staffing",
  },
  {
    title: "Hold BOH staffing steady",
    description: "Kitchen throughput is matching pace well. Current line cook and prep coverage is sufficient for projected volume.",
    tag: "Operations",
  },
  {
    title: "Monitor bar revenue",
    description: "Cocktail sales trending 12% above forecast. Consider extending bartender shift by one hour to capture late-evening demand.",
    tag: "Revenue",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PacePage() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pace Monitor</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Live
          </span>
          <span className="text-sm text-gray-400">{NOW}</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="leo-kpi">
          <p className="leo-kpi-label">Current Pace</p>
          <p className="leo-kpi-value">108%</p>
          <p className="leo-kpi-compare"><span className="leo-delta-up">Ahead</span></p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Actual Sales</p>
          <p className="leo-kpi-value">{currency(ACTUAL_SALES)}</p>
          <p className="leo-kpi-compare">vs {currency(FORECAST_SALES)} forecast</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Projected Total</p>
          <p className="leo-kpi-value">{currency(PROJECTED_TOTAL)}</p>
          <p className="leo-kpi-compare">
            vs {currency(FORECAST_TOTAL)} forecast
            <span className="leo-delta-up ml-1.5">+8.0%</span>
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Actual Covers</p>
          <p className="leo-kpi-value">{ACTUAL_COVERS}</p>
          <p className="leo-kpi-compare">vs {PROJECTED_COVERS} projected</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Service Progress</p>
          <p className="leo-kpi-value">{SERVICE_PROGRESS}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${SERVICE_PROGRESS}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main content: Table + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interval Performance Table */}
        <div className="lg:col-span-2 leo-card p-5">
          <h2 className="leo-section-title">Interval Performance</h2>
          <table className="leo-table">
            <thead>
              <tr>
                <th>Time</th>
                <th className="text-right">Forecast</th>
                <th className="text-right">Actual</th>
                <th className="text-right">Variance ($)</th>
                <th className="text-right">Variance (%)</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {INTERVALS.map((iv, i) => {
                const variance = iv.actual - iv.forecast;
                const variancePct = iv.forecast > 0 ? ((iv.actual - iv.forecast) / iv.forecast) * 100 : 0;
                const isCurrent = iv.status === "current";
                return (
                  <tr key={i} className={isCurrent ? "bg-blue-50/60" : ""}>
                    <td className="text-gray-800 font-medium">{iv.time}</td>
                    <td className="text-right text-gray-500">{currency(iv.forecast)}</td>
                    <td className="text-right text-gray-800">{currency(iv.actual)}</td>
                    <td className={`text-right font-medium ${variance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {variance >= 0 ? "+" : ""}{currency(variance)}
                    </td>
                    <td className={`text-right font-medium ${variancePct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {variancePct >= 0 ? "+" : ""}{variancePct.toFixed(1)}%
                    </td>
                    <td className="text-center">
                      {isCurrent ? (
                        <span className="text-indigo-600 text-xs font-medium">Current</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Done</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Recommendations */}
        <div className="space-y-3">
          <h2 className="leo-section-title">Recommended Actions</h2>
          {RECOMMENDATIONS.map((rec, i) => (
            <div key={i} className="leo-intel-card">
              <div className="flex items-start gap-3">
                <span className="leo-intel-number">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{rec.title}</p>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{rec.description}</p>
                  <span className="leo-intel-tag">{rec.tag}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
