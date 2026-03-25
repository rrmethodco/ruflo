"use client";

import { useEffect, useState } from "react";
import { currency, number as fmt, percent, dayLabel } from "@/lib/format";
import type { LaborPageData } from "@/lib/api";

function Loading() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Optimizing labor plan...</p>
      </div>
    </div>
  );
}

export default function LaborPage() {
  const [data, setData] = useState<LaborPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/api").then(mod => {
      try {
        setData(mod.getLaborData());
      } catch (err) {
        setError(String(err));
      }
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="leo-card p-6 max-w-md text-center">
          <p className="text-red-500 font-medium">Error loading labor plan</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return <Loading />;

  const { laborPlan: lp, forecast, hourlyStaffing, staffingActions } = data;
  const MAX_HEADCOUNT = 20;

  // Calculate department breakdowns
  const fohHours = lp.mealPeriods.reduce((s, mp) =>
    s + mp.intervals.reduce((si, iv) => si + iv.totalFOHHeads * 0.25, 0), 0);
  const bohHours = lp.mealPeriods.reduce((s, mp) =>
    s + mp.intervals.reduce((si, iv) => si + iv.totalBOHHeads * 0.25, 0), 0);

  const fohCost = fohHours * 8.5; // blended FOH rate
  const bohCost = bohHours * 16.5; // blended BOH rate

  const revPerLaborHour = lp.totalDayLaborHours > 0
    ? forecast.totalDaySales / lp.totalDayLaborHours
    : 0;

  const coversPerLaborHour = lp.totalDayLaborHours > 0
    ? forecast.totalDayCovers / lp.totalDayLaborHours
    : 0;

  // Collect peak roles per department
  const fohRoles = new Map<string, number>();
  const bohRoles = new Map<string, number>();
  for (const mp of lp.mealPeriods) {
    for (const [role, count] of Object.entries(mp.staffingPeakByRole)) {
      const map = ['server', 'bartender', 'host', 'busser', 'runner', 'barback', 'sommelier', 'barista'].includes(role)
        ? fohRoles : bohRoles;
      map.set(role, Math.max(map.get(role) ?? 0, count));
    }
  }

  function formatRole(r: string): string {
    return r.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Labor Planning</h1>
        <div className="flex items-center gap-3">
          <div className="leo-chart-filter">{dayLabel(data.date)}</div>
          <div className="leo-chart-filter">Engine Generated</div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="leo-kpi">
          <p className="leo-kpi-label">Total Labor Cost</p>
          <p className="leo-kpi-value">{currency(lp.totalDayLaborCost)}</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Labor %</p>
          <p className="leo-kpi-value">{percent(lp.dayLaborCostPercent)}</p>
          <p className="leo-kpi-compare">
            vs 30.0% target
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Total Hours</p>
          <p className="leo-kpi-value">{Math.round(lp.totalDayLaborHours)}</p>
          <p className="leo-kpi-compare">incl. prep, sidework, breaks</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Covers / Labor Hr</p>
          <p className="leo-kpi-value">{coversPerLaborHour.toFixed(1)}</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Rev / Labor Hr</p>
          <p className="leo-kpi-value">{currency(revPerLaborHour)}</p>
        </div>
      </div>

      {/* Staffing Overview Chart */}
      <div className="leo-card p-6">
        <div className="leo-chart-header">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Staffing Levels</h2>
            <p className="text-xs text-gray-400 mt-0.5">{dayLabel(data.date)}</p>
          </div>
          <div className="flex items-center gap-5 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="leo-dot leo-dot-blue" />FOH
            </span>
            <span className="flex items-center gap-1.5">
              <span className="leo-dot" style={{ backgroundColor: "#94a3b8" }} />BOH
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {hourlyStaffing.map((h) => {
            const fohPct = (h.foh / MAX_HEADCOUNT) * 100;
            const bohPct = (h.boh / MAX_HEADCOUNT) * 100;
            return (
              <div key={h.time} className="flex items-center gap-3">
                <span className="w-14 text-xs font-medium text-gray-500 text-right shrink-0">
                  {h.time}
                </span>
                <div className="flex-1 flex items-center h-6 bg-gray-100 rounded overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-l" style={{ width: `${fohPct}%` }} />
                  <div className="h-full bg-slate-400" style={{ width: `${bohPct}%` }} />
                </div>
                <span className="w-8 text-xs text-gray-500 text-right shrink-0">
                  {h.foh + h.boh}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <span className="w-14" />
          <div className="flex-1 flex justify-between text-[10px] text-gray-400 px-0.5">
            <span>0</span><span>5</span><span>10</span><span>15</span><span>20</span>
          </div>
          <span className="w-8" />
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { key: 'foh', label: 'Front of House', abbr: 'FOH', hours: fohHours, cost: fohCost, roles: fohRoles },
          { key: 'boh', label: 'Back of House', abbr: 'BOH', hours: bohHours, cost: bohCost, roles: bohRoles },
        ].map(dept => (
          <div key={dept.key} className="leo-card p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {dept.label} ({dept.abbr})
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <p className="leo-kpi-label">Hours</p>
                <p className="text-xl font-bold text-gray-900">{Math.round(dept.hours)}</p>
              </div>
              <div>
                <p className="leo-kpi-label">Cost</p>
                <p className="text-xl font-bold text-gray-900">{currency(dept.cost)}</p>
              </div>
              <div>
                <p className="leo-kpi-label">% of Revenue</p>
                <p className="text-xl font-bold text-gray-900">
                  {forecast.totalDaySales > 0 ? percent(dept.cost / forecast.totalDaySales) : '0%'}
                </p>
              </div>
            </div>
            <table className="leo-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th className="text-right">Peak Headcount</th>
                </tr>
              </thead>
              <tbody>
                {[...dept.roles.entries()]
                  .filter(([, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([role, count]) => (
                    <tr key={role}>
                      <td className="text-gray-700">{formatRole(role)}</td>
                      <td className="text-right font-semibold text-gray-900">{count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Staffing Actions Table */}
      {staffingActions.length > 0 && (
        <div className="leo-card p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Staggered Starts</h2>
          <table className="leo-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Role</th>
                <th className="text-right">Count</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {staffingActions.map((a, i) => (
                <tr key={i}>
                  <td className="font-medium text-gray-900">{a.time}</td>
                  <td>
                    <span className={`font-semibold ${a.action === "Add" ? "text-emerald-600" : "text-amber-600"}`}>
                      {a.action}
                    </span>
                  </td>
                  <td>{a.role}</td>
                  <td className="text-right font-semibold text-gray-900">{a.count}</td>
                  <td className="text-gray-500">{a.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
