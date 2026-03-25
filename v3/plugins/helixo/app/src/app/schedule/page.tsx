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

const overtimeAlerts = [
  { name: "David Park", projected: 41, threshold: 40, overtime: 1, costImpact: 36, note: "" },
  { name: "Marcus Williams", projected: 40, threshold: 40, overtime: 0, costImpact: 0, note: "At threshold - monitor closely" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deptColor(d: Dept) {
  return d === "foh" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
    : d === "boh" ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
    : "bg-purple-500/20 text-purple-300 border-purple-500/30";
}

function deptDot(d: Dept) {
  return d === "foh" ? "bg-emerald-400" : d === "boh" ? "bg-blue-400" : "bg-purple-400";
}

function severityBadge(s: "critical" | "warning") {
  return s === "critical"
    ? "bg-red-500/20 text-red-400 border-red-500/30"
    : "bg-amber-500/20 text-amber-400 border-amber-500/30";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weekly Schedule</h1>
          <p className="text-sm text-gray-400 mt-1">{WEEK_LABEL}</p>
        </div>
        <div className="flex items-center gap-3">
          {(["foh", "boh", "mgmt"] as Dept[]).map((d) => (
            <span key={d} className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className={`w-2.5 h-2.5 rounded-full ${deptDot(d)}`} />
              {d === "mgmt" ? "Mgmt" : d.toUpperCase()}
            </span>
          ))}
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Hours", value: fmt(summary.totalHours), alert: false },
          { label: "Total Cost", value: currency(summary.totalCost), alert: false },
          { label: "Open Shifts", value: String(summary.openShifts), alert: true },
          { label: "OT Alerts", value: String(summary.overtimeAlerts), alert: true },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.alert ? "text-amber-400" : "text-white"}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Schedule Calendar Grid */}
      <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Staff Schedule</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase tracking-wider">
              <th className="text-left py-2 pr-3 font-medium w-40">Employee</th>
              {DAYS.map((d, i) => (
                <th key={d} className="py-2 px-2 font-medium text-center">
                  <div>{d}</div>
                  <div className="text-[10px] text-gray-500 font-normal">{DATES[i]}</div>
                </th>
              ))}
              <th className="py-2 px-2 font-medium text-center">Hours</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.name} className="border-t border-white/5">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${deptDot(emp.dept)}`} />
                    <div>
                      <p className="font-medium text-white text-xs">{emp.name}</p>
                      <p className="text-[10px] text-gray-500">{emp.role}</p>
                    </div>
                  </div>
                </td>
                {emp.shifts.map((shift, si) => (
                  <td key={si} className="py-2 px-1 text-center">
                    {shift ? (
                      <div className={`rounded-lg border px-1.5 py-1 text-[10px] leading-tight ${deptColor(shift.d)}`}>
                        <div className="font-medium">{shift.t}</div>
                        <div className="opacity-70">{shift.r}</div>
                      </div>
                    ) : (
                      <span className="text-gray-600 text-xs">OFF</span>
                    )}
                  </td>
                ))}
                <td className="py-2 px-2 text-center">
                  <span className={`font-semibold text-sm ${emp.hrs >= 40 ? "text-amber-400" : "text-white"}`}>
                    {emp.hrs}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Bottom panels */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Open Shifts */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <h3 className="text-lg font-semibold mb-3">Open Shifts</h3>
          <div className="space-y-3">
            {openShifts.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <div>
                  <p className="text-sm font-medium">{s.role}</p>
                  <p className="text-xs text-gray-400">{s.date} &middot; {s.time}</p>
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${severityBadge(s.severity)}`}>
                  {s.severity}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Overtime Alerts */}
        <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5">
          <h3 className="text-lg font-semibold mb-3">Overtime Alerts</h3>
          <div className="space-y-3">
            {overtimeAlerts.map((a, i) => (
              <div key={i} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{a.name}</p>
                  <span className="text-xs font-semibold text-amber-400">{a.projected}h / {a.threshold}h</span>
                </div>
                {a.overtime > 0 && (
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>Overtime: {a.overtime}h</span>
                    <span>Cost impact: +{currency(a.costImpact)}</span>
                  </div>
                )}
                {a.note && <p className="text-xs text-amber-400/70 mt-1">{a.note}</p>}
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${a.projected > a.threshold ? "bg-amber-400" : "bg-emerald-400"}`}
                    style={{ width: `${Math.min((a.projected / a.threshold) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
