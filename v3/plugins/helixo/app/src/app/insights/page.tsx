"use client";

import { useEffect, useState } from "react";
import { currency, number as fmt, percent } from "@/lib/format";
import type { InsightsPageData } from "@/lib/api";

function Loading() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Generating insights...</p>
      </div>
    </div>
  );
}

function impactColor(impact: string): string {
  if (impact === "positive") return "bg-emerald-50 border-emerald-200";
  if (impact === "negative") return "bg-red-50 border-red-200";
  return "bg-gray-50 border-gray-200";
}

function impactDot(impact: string): string {
  if (impact === "positive") return "leo-dot leo-dot-green";
  if (impact === "negative") return "leo-dot leo-dot-red";
  return "leo-dot leo-dot-amber";
}

function categoryTag(category: string): string {
  const map: Record<string, string> = {
    revenue: "bg-indigo-100 text-indigo-700",
    labor: "bg-amber-100 text-amber-700",
    forecast: "bg-sky-100 text-sky-700",
    operations: "bg-gray-100 text-gray-600",
  };
  return map[category] ?? "bg-gray-100 text-gray-600";
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightsPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/api").then(mod => {
      try {
        setData(mod.getInsightsData());
      } catch (err) {
        setError(String(err));
      }
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="leo-card p-6 max-w-md text-center">
          <p className="text-red-500 font-medium">Error loading insights</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return <Loading />;

  const kpis = [
    {
      label: "Forecast Accuracy",
      value: percent(data.forecastAccuracy),
      compare: "Trailing 8-week average",
    },
    {
      label: "Labor Efficiency",
      value: percent(data.laborEfficiency),
      compare: "Labor cost as % of revenue",
    },
    {
      label: "Covers / Labor Hr",
      value: fmt(data.coversPerLaborHour),
      compare: "Weekly average",
    },
    {
      label: "Avg Check Trend",
      value: `${data.avgCheckTrend >= 0 ? "+" : ""}${data.avgCheckTrend.toFixed(1)}%`,
      compare: "vs prior week",
    },
  ];

  const maxTrendRevenue = Math.max(...data.weekTrends.map(w => w.revenue));

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Intelligence & Insights</h1>
        <div className="flex items-center gap-3">
          <div className="leo-chart-filter">This Week</div>
          <div className="leo-chart-filter">Engine Generated</div>
        </div>
      </div>

      {/* KPI Row */}
      <section className="grid grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="leo-kpi">
            <p className="leo-kpi-label">{k.label}</p>
            <p className="leo-kpi-value text-2xl">{k.value}</p>
            <p className="leo-kpi-compare">{k.compare}</p>
          </div>
        ))}
      </section>

      {/* Key Insights */}
      <div className="leo-card p-6">
        <div className="leo-chart-header">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Key Insights</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Smart observations generated from forecast, labor, and revenue data
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {data.insights.map((insight) => (
            <div
              key={insight.id}
              className={`leo-intel-card border ${impactColor(insight.impact)}`}
            >
              <div className="flex items-start gap-3">
                <div className="leo-intel-number">{insight.id}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={impactDot(insight.impact)} />
                    <h3 className="text-sm font-semibold text-gray-900">{insight.title}</h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{insight.description}</p>
                  <span
                    className={`leo-intel-tag ${categoryTag(insight.category)}`}
                  >
                    {insight.category}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast vs Actual */}
      <div className="leo-card p-6">
        <div className="leo-chart-header">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Forecast vs Actual</h2>
            <p className="text-xs text-gray-400 mt-0.5">Simulated comparison for current week</p>
          </div>
        </div>

        <table className="leo-table">
          <thead>
            <tr>
              <th>Day</th>
              <th className="text-right">Forecast</th>
              <th className="text-right">Actual</th>
              <th className="text-right">Variance</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {data.forecastVsActual.map((d) => {
              const absVariance = Math.abs(d.variance);
              const isPositive = d.variance >= 0;
              return (
                <tr key={d.day}>
                  <td className="font-medium text-gray-900">{d.day}</td>
                  <td className="text-right">{currency(d.forecast)}</td>
                  <td className="text-right">{currency(d.actual)}</td>
                  <td className="text-right">
                    <span className={`text-xs font-medium ${isPositive ? "leo-delta-up" : "leo-delta-down"}`}>
                      {isPositive ? "+" : ""}{d.variance.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 h-2 rounded overflow-hidden">
                        <div
                          className={`h-2 rounded ${absVariance <= 3 ? "bg-emerald-500" : absVariance <= 5 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${Math.max(100 - absVariance * 10, 10)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {(100 - absVariance).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Revenue Trend — Week over Week */}
      <div className="leo-card p-6">
        <div className="leo-chart-header">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Revenue Trend</h2>
            <p className="text-xs text-gray-400 mt-0.5">Week-over-Week Comparison</p>
          </div>
        </div>

        <div className="flex items-end gap-6 h-48 px-4">
          {data.weekTrends.map((w) => {
            const pct = maxTrendRevenue > 0 ? (w.revenue / maxTrendRevenue) * 100 : 0;
            return (
              <div key={w.label} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">{currency(w.revenue)}</span>
                <div className="w-full flex items-end justify-center h-36">
                  <div
                    className="w-10 rounded-t bg-indigo-500"
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 text-center">{w.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
