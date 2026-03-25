"use client";

import { useEffect, useState } from "react";
import { currency, number as fmt, dayLabel } from "@/lib/format";
import type { SchedulePageData } from "@/lib/api";

type Dept = "foh" | "boh" | "mgmt";

function Loading() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Generating schedule...</p>
      </div>
    </div>
  );
}

function deptBorder(d: Dept) {
  return d === "foh" ? "border-l-indigo-500" : d === "boh" ? "border-l-slate-400" : "border-l-purple-500";
}

function severityBadge(s: "critical" | "warning" | "info") {
  if (s === "critical") return "bg-red-50 text-red-600 border border-red-200";
  if (s === "warning") return "bg-amber-50 text-amber-600 border border-amber-200";
  return "bg-blue-50 text-blue-600 border border-blue-200";
}

function roleToDept(role: string): Dept {
  const fohRoles = ['server', 'bartender', 'host', 'busser', 'runner', 'barback', 'sommelier', 'barista'];
  if (fohRoles.includes(role)) return 'foh';
  if (role === 'manager') return 'mgmt';
  return 'boh';
}

function formatRole(r: string): string {
  return r.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function formatShiftTime(start: string, end: string): string {
  function to12(hhmm: string): string {
    const [h] = hhmm.split(':').map(Number);
    if (h === 0) return '12A';
    if (h === 12) return '12P';
    return h < 12 ? `${h}A` : `${h - 12}P`;
  }
  return `${to12(start)}-${to12(end)}`;
}

export default function SchedulePage() {
  const [data, setData] = useState<SchedulePageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/api").then(mod => {
      try {
        setData(mod.getScheduleData());
      } catch (err) {
        setError(String(err));
      }
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="leo-card p-6 max-w-md text-center">
          <p className="text-red-500 font-medium">Error loading schedule</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return <Loading />;

  const { schedule } = data;
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

  // Build employee-centric view from shifts
  type EmpRow = {
    name: string;
    role: string;
    dept: Dept;
    shifts: Array<{ time: string; role: string; dept: Dept } | null>;
    hrs: number;
  };

  const empMap = new Map<string, EmpRow>();
  for (let dayIdx = 0; dayIdx < schedule.days.length; dayIdx++) {
    const day = schedule.days[dayIdx];
    for (const shift of day.shifts) {
      if (shift.isOpen || !shift.employeeId) continue;
      if (!empMap.has(shift.employeeId)) {
        empMap.set(shift.employeeId, {
          name: shift.employeeName,
          role: formatRole(shift.role),
          dept: roleToDept(shift.role),
          shifts: Array(7).fill(null),
          hrs: 0,
        });
      }
      const emp = empMap.get(shift.employeeId)!;
      emp.shifts[dayIdx] = {
        time: formatShiftTime(shift.startTime, shift.endTime),
        role: formatRole(shift.role),
        dept: roleToDept(shift.role),
      };
      emp.hrs += shift.totalHours;
    }
  }

  const employees = [...empMap.values()].sort((a, b) => {
    const deptOrder: Record<Dept, number> = { foh: 0, boh: 1, mgmt: 2 };
    return deptOrder[a.dept] - deptOrder[b.dept] || a.name.localeCompare(b.name);
  });

  // Collect open shifts and overtime alerts
  const openShifts = schedule.days.flatMap((day, i) =>
    day.openShifts.map(s => ({
      role: formatRole(s.role),
      date: `${DAYS[i]} ${new Date(day.date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'UTC' })}`,
      time: formatShiftTime(s.startTime, s.endTime),
      severity: 'warning' as const,
    }))
  );

  const overtimeAlerts = schedule.overtimeAlerts.map(a => ({
    name: a.employeeName,
    projected: Math.round(a.projectedHours),
    threshold: a.threshold,
    costImpact: currency(a.additionalCost),
  }));

  const totalOpenShifts = schedule.days.reduce((s, d) => s + d.openShifts.length, 0);

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {dayLabel(schedule.weekStartDate)} — {dayLabel(schedule.weekEndDate)}
          </p>
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
          <p className="leo-kpi-value">{Math.round(schedule.totalWeeklyHours)}</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Total Cost</p>
          <p className="leo-kpi-value">{currency(schedule.totalWeeklyCost)}</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Open Shifts</p>
          <p className={`leo-kpi-value ${totalOpenShifts > 0 ? 'text-amber-600' : ''}`}>{totalOpenShifts}</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">OT Alerts</p>
          <p className={`leo-kpi-value ${overtimeAlerts.length > 0 ? 'text-red-500' : ''}`}>{overtimeAlerts.length}</p>
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
                  <div className="text-[10px] text-gray-400 font-normal normal-case tracking-normal">
                    {schedule.days[i] ? new Date(schedule.days[i].date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'UTC' }) : ''}
                  </div>
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
                      <div className={`rounded border-l-2 ${deptBorder(shift.dept)} bg-gray-50 px-1.5 py-1 text-[10px] leading-tight`}>
                        <div className="font-medium text-gray-800">{shift.time}</div>
                        <div className="text-gray-400">{shift.role}</div>
                      </div>
                    ) : (
                      <span className="text-gray-300 text-xs">OFF</span>
                    )}
                  </td>
                ))}
                <td className="text-center">
                  <span className={`font-semibold text-sm ${Math.round(emp.hrs) >= 40 ? "text-amber-600 bg-amber-50 px-2 py-0.5 rounded" : "text-gray-900"}`}>
                    {Math.round(emp.hrs)}
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
          {openShifts.length === 0 ? (
            <p className="text-sm text-gray-400">All shifts are covered.</p>
          ) : (
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
          )}
        </div>

        {/* Overtime Risks */}
        <div className="leo-card p-5">
          <h3 className="leo-section-title">Overtime Risks</h3>
          {overtimeAlerts.length === 0 ? (
            <p className="text-sm text-gray-400">No overtime risks detected.</p>
          ) : (
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
                {overtimeAlerts.map((a, i) => (
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
          )}
        </div>
      </div>
    </div>
  );
}
