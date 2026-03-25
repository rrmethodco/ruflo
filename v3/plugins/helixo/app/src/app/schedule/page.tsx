"use client";

import { currency, number as fmt } from "@/lib/format";

// ---------------------------------------------------------------------------
// Demo data: weekly schedule Mar 23 - Mar 29
// ---------------------------------------------------------------------------

const WEEK_LABEL = "Mar 23 - Mar 29, 2025";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DATES = ["3/23", "3/24", "3/25", "3/26", "3/27", "3/28", "3/29"];

type Dept = "foh" | "boh" | "mgmt";
type S = { t: string; r: string; d: Dept } | null;

interface Employee { name: string; role: string; dept: Dept; shifts: S[]; hrs: number }

const f = (t: string, r: string, d: Dept): S => ({ t, r, d });

const employees: Employee[] = [
  { name: "Maria Santos", role: "Server", dept: "foh", hrs: 39,
    shifts: [f("11A-7P","Server","foh"), null, f("4P-11P","Server","foh"), f("11A-7P","Server","foh"), f("4P-11P","Server","foh"), f("4P-11P","Server","foh"), null] },
  { name: "James Chen", role: "Server", dept: "foh", hrs: 37,
    shifts: [f("4P-11P","Server","foh"), f("4P-11P","Server","foh"), null, f("4P-11P","Server","foh"), f("4P-12A","Server","foh"), f("11A-8P","Server","foh"), null] },
  { name: "Aisha Johnson", role: "Bartender", dept: "foh", hrs: 39,
    shifts: [null, f("4P-12A","Bartender","foh"), f("4P-12A","Bartender","foh"), null, f("4P-12A","Bartender","foh"), f("4P-12A","Bartender","foh"), f("4P-11P","Bartender","foh")] },
  { name: "Tyler Brooks", role: "Host", dept: "foh", hrs: 28,
    shifts: [f("11A-4P","Host","foh"), f("11A-4P","Host","foh"), null, f("4P-10P","Host","foh"), f("4P-10P","Host","foh"), f("11A-5P","Host","foh"), null] },
  { name: "Rosa Gutierrez", role: "Busser", dept: "foh", hrs: 31,
    shifts: [f("11A-5P","Busser","foh"), null, f("5P-11P","Busser","foh"), f("5P-11P","Busser","foh"), f("5P-11P","Busser","foh"), f("4P-11P","Busser","foh"), null] },
  { name: "Marcus Williams", role: "Line Cook", dept: "boh", hrs: 40,
    shifts: [f("10A-6P","Line Cook","boh"), f("10A-6P","Line Cook","boh"), f("2P-10P","Line Cook","boh"), null, f("2P-10P","Line Cook","boh"), f("10A-6P","Line Cook","boh"), null] },
  { name: "David Park", role: "Line Cook", dept: "boh", hrs: 41,
    shifts: [null, f("2P-10P","Line Cook","boh"), f("10A-6P","Line Cook","boh"), f("2P-10P","Line Cook","boh"), f("2P-10P","Line Cook","boh"), f("2P-11P","Line Cook","boh"), null] },
  { name: "Sam Nguyen", role: "Dishwasher", dept: "boh", hrs: 32,
    shifts: [f("10A-4P","Dishwasher","boh"), null, f("4P-10P","Dishwasher","boh"), f("4P-10P","Dishwasher","boh"), f("4P-10P","Dishwasher","boh"), f("10A-6P","Dishwasher","boh"), null] },
  { name: "Karen Mitchell", role: "Manager", dept: "mgmt", hrs: 40,
    shifts: [f("10A-6P","Manager","mgmt"), f("10A-6P","Manager","mgmt"), f("3P-11P","Manager","mgmt"), f("3P-11P","Manager","mgmt"), f("3P-11P","Manager","mgmt"), null, null] },
  { name: "Luis Fernandez", role: "Line Cook", dept: "boh", hrs: 40,
    shifts: [f("6A-2P","Prep Cook","boh"), f("6A-2P","Prep Cook","boh"), null, f("6A-2P","Prep Cook","boh"), f("6A-2P","Prep Cook","boh"), f("6A-2P","Prep Cook","boh"), null] },
];

const summary = {
  totalHours: employees.reduce((s, e) => s + e.hrs, 0),
  totalCost: 8_435, openShifts: 4, overtimeAlerts: 2,
};

const openShifts = [
  { role: "Server", date: "Fri 3/27", time: "11:00 AM - 4:00 PM", severity: "critical" as const },
  { role: "Line Cook", date: "Sat 3/28", time: "6:00 PM - 11:00 PM", severity: "critical" as const },
  { role: "Busser", date: "Sun 3/29", time: "4:00 PM - 10:00 PM", severity: "warning" as const },
  { role: "Dishwasher", date: "Sun 3/29", time: "4:00 PM - 10:00 PM", severity: "warning" as const },
];

const overtimeRisks = [
  { name: "David Park", projected: 41, threshold: 40, costImpact: "$36" },
  { name: "Marcus Williams", projected: 40, threshold: 40, costImpact: "$0" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deptBorder(d: Dept) {
  return d === "foh" ? "border-l-indigo-500" : d === "boh" ? "border-l-slate-400" : "border-l-purple-500";
}

function severityBadge(s: "critical" | "warning") {
  return s === "critical"
    ? "bg-red-50 text-red-600 border border-red-200"
    : "bg-amber-50 text-amber-600 border border-amber-200";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">{WEEK_LABEL}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-indigo-500 rounded" /> FOH</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-slate-400 rounded" /> BOH</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-purple-500 rounded" /> Mgmt</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="leo-kpi">
          <p className="leo-kpi-label">Total Hours</p>
          <p className="leo-kpi-value">{fmt(summary.totalHours)}</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Total Cost</p>
          <p className="leo-kpi-value">{currency(summary.totalCost)}</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Open Shifts</p>
          <p className="leo-kpi-value text-amber-600">{summary.openShifts}</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">OT Alerts</p>
          <p className="leo-kpi-value text-red-500">{summary.overtimeAlerts}</p>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="leo-card p-5 overflow-x-auto">
        <h2 className="leo-section-title">Staff Schedule</h2>
        <table className="leo-table">
          <thead>
            <tr>
              <th className="w-44">Employee</th>
              {DAYS.map((d, i) => (
                <th key={d} className="text-center">
                  <div>{d}</div>
                  <div className="text-[10px] text-gray-400 font-normal normal-case tracking-normal">{DATES[i]}</div>
                </th>
              ))}
              <th className="text-center">Hours</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.name}>
                <td>
                  <p className="font-medium text-gray-900 text-xs">{emp.name}</p>
                  <p className="text-[10px] text-gray-400">{emp.role}</p>
                </td>
                {emp.shifts.map((shift, si) => (
                  <td key={si} className="text-center !px-1">
                    {shift ? (
                      <div className={`rounded border-l-2 ${deptBorder(shift.d)} bg-gray-50 px-1.5 py-1 text-[10px] leading-tight`}>
                        <div className="font-medium text-gray-800">{shift.t}</div>
                        <div className="text-gray-400">{shift.r}</div>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">OFF</span>
                    )}
                  </td>
                ))}
                <td className="text-center">
                  <span className={`font-semibold text-sm ${emp.hrs >= 40 ? "text-amber-600 bg-amber-50 px-2 py-0.5 rounded" : "text-gray-900"}`}>
                    {emp.hrs}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom panels */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Open Shifts */}
        <div className="leo-card p-5">
          <h3 className="leo-section-title">Open Shifts</h3>
          <table className="leo-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Day</th>
                <th>Time</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {openShifts.map((s, i) => (
                <tr key={i}>
                  <td className="font-medium text-gray-900">{s.role}</td>
                  <td>{s.date}</td>
                  <td>{s.time}</td>
                  <td>
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${severityBadge(s.severity)}`}>
                      {s.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Overtime Risks */}
        <div className="leo-card p-5">
          <h3 className="leo-section-title">Overtime Risks</h3>
          <table className="leo-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th className="text-right">Projected</th>
                <th className="text-right">Threshold</th>
                <th className="text-right">Cost Impact</th>
              </tr>
            </thead>
            <tbody>
              {overtimeRisks.map((a, i) => (
                <tr key={i}>
                  <td className="font-medium text-gray-900">{a.name}</td>
                  <td className={`text-right font-medium ${a.projected > a.threshold ? "text-amber-600" : "text-gray-700"}`}>
                    {a.projected}h
                  </td>
                  <td className="text-right">{a.threshold}h</td>
                  <td className="text-right">{a.costImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
