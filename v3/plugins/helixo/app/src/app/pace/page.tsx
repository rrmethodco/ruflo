"use client";

import { useEffect, useState } from "react";
import { currency, paceStatusLabel, paceStatusColor } from "@/lib/format";
import type { PacePageData } from "@/lib/api";

function Loading() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Calculating pace...</p>
      </div>
    </div>
  );
}

export default function PacePage() {
  const [data, setData] = useState<PacePageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/api").then(mod => {
      try {
        setData(mod.getPaceData());
      } catch (err) {
        setError(String(err));
      }
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="leo-card p-6 max-w-md text-center">
          <p className="text-red-500 font-medium">Error loading pace data</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return <Loading />;

  const { snapshot, forecast } = data;
  const pctComplete = snapshot.elapsedIntervals + snapshot.remainingIntervals > 0
    ? Math.round((snapshot.elapsedIntervals / (snapshot.elapsedIntervals + snapshot.remainingIntervals)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pace Monitor</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Simulated Live
          </span>
          <span className="text-sm text-gray-400">{snapshot.currentInterval}</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="leo-kpi">
          <p className="leo-kpi-label">Current Pace</p>
          <p className={`leo-kpi-value ${paceStatusColor(snapshot.paceStatus)}`}>
            {Math.round(snapshot.pacePercent * 100)}%
          </p>
          <p className="leo-kpi-compare">
            <span className={paceStatusColor(snapshot.paceStatus)}>
              {paceStatusLabel(snapshot.paceStatus)}
            </span>
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Actual Sales</p>
          <p className="leo-kpi-value">{currency(snapshot.actualSalesSoFar)}</p>
          <p className="leo-kpi-compare">
            vs {currency(snapshot.originalForecast * (pctComplete / 100))} expected
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Projected Total</p>
          <p className="leo-kpi-value">{currency(snapshot.projectedSalesAtPace)}</p>
          <p className="leo-kpi-compare">
            vs {currency(snapshot.originalForecast)} forecast
            {snapshot.projectedSalesAtPace > snapshot.originalForecast ? (
              <span className="leo-delta-up ml-1.5">
                +{((snapshot.projectedSalesAtPace - snapshot.originalForecast) / snapshot.originalForecast * 100).toFixed(1)}%
              </span>
            ) : (
              <span className="leo-delta-down ml-1.5">
                {((snapshot.projectedSalesAtPace - snapshot.originalForecast) / snapshot.originalForecast * 100).toFixed(1)}%
              </span>
            )}
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Actual Covers</p>
          <p className="leo-kpi-value">{snapshot.actualCoversSoFar}</p>
          <p className="leo-kpi-compare">
            vs {snapshot.projectedCoversAtPace} projected
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Service Progress</p>
          <p className="leo-kpi-value">{pctComplete}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${pctComplete}%` }}
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
                <th className="text-right">Variance</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.intervalDetails.map((iv, i) => {
                const isCurrent = iv.status === 'current';
                return (
                  <tr key={i} className={isCurrent ? "bg-blue-50/60" : ""}>
                    <td className="text-gray-800 font-medium">
                      {iv.intervalStart} - {iv.intervalEnd}
                    </td>
                    <td className="text-right text-gray-500">{currency(iv.forecastedSales)}</td>
                    <td className="text-right text-gray-800">
                      {iv.status === 'upcoming' ? '—' : currency(iv.actualSales)}
                    </td>
                    <td className={`text-right font-medium ${iv.variance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {iv.status === 'upcoming' ? '—' : (
                        <>{iv.variance >= 0 ? '+' : ''}{currency(iv.variance)}</>
                      )}
                    </td>
                    <td className="text-center">
                      {isCurrent ? (
                        <span className="text-indigo-600 text-xs font-medium">Current</span>
                      ) : iv.status === 'completed' ? (
                        <span className="text-gray-400 text-xs">Done</span>
                      ) : (
                        <span className="text-gray-300 text-xs">Upcoming</span>
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
          {snapshot.recommendations.length === 0 ? (
            <div className="leo-intel-card">
              <p className="text-sm text-gray-500">No recommendations at this time.</p>
            </div>
          ) : (
            snapshot.recommendations.map((rec, i) => (
              <div key={i} className="leo-intel-card">
                <div className="flex items-start gap-3">
                  <span className="leo-intel-number">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{rec.description}</p>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">{rec.reasoning}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="leo-intel-tag">{rec.type.replace(/_/g, ' ')}</span>
                      <span className="leo-intel-tag">{rec.urgency.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
