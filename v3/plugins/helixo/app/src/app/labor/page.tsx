"use client";

import { currency, number as fmt } from "@/lib/format";

/* ── Static Data ──────────────────────────────────────────────────── */

const HOURS = [
  { time: "11 AM", foh: 5, boh: 3 },
  { time: "12 PM", foh: 7, boh: 4 },
  { time: "1 PM",  foh: 7, boh: 4 },
  { time: "2 PM",  foh: 5, boh: 3 },
  { time: "3 PM",  foh: 4, boh: 3 },
  { time: "4 PM",  foh: 5, boh: 4 },
  { time: "5 PM",  foh: 9, boh: 6 },
  { time: "6 PM",  foh: 12, boh: 6 },
  { time: "7 PM",  foh: 12, boh: 6 },
  { time: "8 PM",  foh: 9, boh: 5 },
  { time: "9 PM",  foh: 6, boh: 3 },
  { time: "10 PM", foh: 4, boh: 2 },
];

const MAX_HEADCOUNT = 20;

const departments = {
  foh: {
    label: "Front of House",
    abbr: "FOH",
    hours: 112,
    cost: 2464,
    revPercent: 16.4,
    roles: [
      { role: "Server", count: 5 },
      { role: "Bartender", count: 2 },
      { role: "Host", count: 2 },
      { role: "Busser", count: 3 },
    ],
  },
  boh: {
    label: "Back of House",
    abbr: "BOH",
    hours: 73,
    cost: 1754,
    revPercent: 11.7,
    roles: [
      { role: "Line Cook", count: 4 },
      { role: "Prep Cook", count: 2 },
      { role: "Dishwasher", count: 2 },
    ],
  },
};

const staffingActions = [
  { time: "10:30 AM", action: "Add",    role: "Line Cook",  count: 2, reason: "Lunch prep ramp-up" },
  { time: "11:00 AM", action: "Add",    role: "Server",     count: 1, reason: "Early lunch walk-ins" },
  { time: "2:30 PM",  action: "Reduce", role: "Server",     count: 2, reason: "Post-lunch lull" },
  { time: "5:00 PM",  action: "Add",    role: "Bartender",  count: 1, reason: "Happy hour transition" },
  { time: "9:30 PM",  action: "Reduce", role: "Line Cook",  count: 1, reason: "Winding down service" },
];

/* ── Component ────────────────────────────────────────────────────── */

export default function LaborPage() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Labor Planning</h1>
        <div className="flex items-center gap-3">
          <div className="leo-chart-filter">Saturday, Mar 22</div>
          <div className="leo-chart-filter">This Week</div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="leo-kpi">
          <p className="leo-kpi-label">Total Labor Cost</p>
          <p className="leo-kpi-value">{currency(4218)}</p>
          <p className="leo-kpi-compare">
            <span className="leo-delta-down">&#8600; +2.8%</span>
            <span className="ml-2">vs {currency(4102)}</span>
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Labor %</p>
          <p className="leo-kpi-value">28.4%</p>
          <p className="leo-kpi-compare">
            <span className="leo-delta-up">&#8599; -1.6pp</span>
            <span className="ml-2">vs 30.0% target</span>
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Total Hours</p>
          <p className="leo-kpi-value">{fmt(185)}</p>
          <p className="leo-kpi-compare">vs {fmt(178)} last week</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Covers / Labor Hr</p>
          <p className="leo-kpi-value">3.8</p>
          <p className="leo-kpi-compare">
            <span className="leo-delta-up">&#8599; +8.6%</span>
            <span className="ml-2">vs 3.5</span>
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Rev / Labor Hr</p>
          <p className="leo-kpi-value">$52.30</p>
          <p className="leo-kpi-compare">
            <span className="leo-delta-up">&#8599; +7.4%</span>
            <span className="ml-2">vs $48.70</span>
          </p>
        </div>
      </div>

      {/* Staffing Overview Chart */}
      <div className="leo-card p-6">
        <div className="leo-chart-header">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Staffing Levels</h2>
            <p className="text-xs text-gray-400 mt-0.5">Saturday, Mar 22</p>
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

        {/* Horizontal Stacked Bars */}
        <div className="space-y-2">
          {HOURS.map((h) => {
            const fohPct = (h.foh / MAX_HEADCOUNT) * 100;
            const bohPct = (h.boh / MAX_HEADCOUNT) * 100;
            return (
              <div key={h.time} className="flex items-center gap-3">
                <span className="w-14 text-xs font-medium text-gray-500 text-right shrink-0">
                  {h.time}
                </span>
                <div className="flex-1 flex items-center h-6 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-l"
                    style={{ width: `${fohPct}%` }}
                  />
                  <div
                    className="h-full bg-slate-400"
                    style={{ width: `${bohPct}%` }}
                  />
                </div>
                <span className="w-8 text-xs text-gray-500 text-right shrink-0">
                  {h.foh + h.boh}
                </span>
              </div>
            );
          })}
        </div>

        {/* Axis label */}
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
        {(["foh", "boh"] as const).map((key) => {
          const dept = departments[key];
          return (
            <div key={key} className="leo-card p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                {dept.label} ({dept.abbr})
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div>
                  <p className="leo-kpi-label">Hours</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(dept.hours)}</p>
                </div>
                <div>
                  <p className="leo-kpi-label">Cost</p>
                  <p className="text-xl font-bold text-gray-900">{currency(dept.cost)}</p>
                </div>
                <div>
                  <p className="leo-kpi-label">% of Revenue</p>
                  <p className="text-xl font-bold text-gray-900">{dept.revPercent}%</p>
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
                  {dept.roles.map((r) => (
                    <tr key={r.role}>
                      <td className="text-gray-700">{r.role}</td>
                      <td className="text-right font-semibold text-gray-900">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Staffing Actions Table */}
      <div className="leo-card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Staffing Actions</h2>
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
    </div>
  );
}
