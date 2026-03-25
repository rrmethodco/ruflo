"use client";

import { currency, percent } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Demo data — dinner service at 7:15 PM, 108% of pace                */
/* ------------------------------------------------------------------ */

const NOW = "7:15 PM";
const SERVICE_START = "5:00 PM";
const SERVICE_END = "10:00 PM";
const MEAL_PERIOD = "DINNER SERVICE";
const PACE_PCT = 108;
const PACE_STATUS = "AHEAD" as const;
const PROJECTED = 14250;
const FORECAST = 13200;
const ACTUAL_COVERS = 74;
const PROJECTED_COVERS = 92;
const FORECAST_COVERS = 85;

const INTERVALS = [
  { time: "5:00–5:15", forecast: 320, actual: 290, status: "completed" as const },
  { time: "5:15–5:30", forecast: 410, actual: 430, status: "completed" as const },
  { time: "5:30–5:45", forecast: 580, actual: 620, status: "completed" as const },
  { time: "5:45–6:00", forecast: 720, actual: 810, status: "completed" as const },
  { time: "6:00–6:15", forecast: 850, actual: 920, status: "completed" as const },
  { time: "6:15–6:30", forecast: 960, actual: 1040, status: "completed" as const },
  { time: "6:30–6:45", forecast: 1080, actual: 1170, status: "completed" as const },
  { time: "6:45–7:00", forecast: 1120, actual: 1210, status: "completed" as const },
  { time: "7:00–7:15", forecast: 1150, actual: 1240, status: "current" as const },
  { time: "7:15–7:30", forecast: 1100, actual: null, status: "upcoming" as const },
];

const TIMELINE_LABELS = ["5:00 PM", "6:00 PM", "7:00 PM (now)", "8:00 PM", "9:00 PM", "10:00 PM"];
const COMPLETED_SEGMENTS = 8;
const TOTAL_SEGMENTS = 20;
const CURRENT_SEGMENT = 9;

const RECOMMENDATIONS = [
  {
    type: "extend" as const,
    icon: "clock",
    description: "Consider extending 2 server shifts — volume 8% above forecast",
    urgency: "within_30min" as const,
    costImpact: "+$84 est. labor",
  },
  {
    type: "call" as const,
    icon: "phone",
    description: "Call in 1 runner to support higher kitchen-to-table throughput",
    urgency: "within_15min" as const,
    costImpact: "+$42 est. labor",
  },
  {
    type: "hold" as const,
    icon: "check",
    description: "Hold steady on BOH — pace stabilizing around forecast",
    urgency: "informational" as const,
    costImpact: "No change",
  },
  {
    type: "extend" as const,
    icon: "clock",
    description: "Extend bartender shift by 1 hr — bar revenue trending 12% above",
    urgency: "within_30min" as const,
    costImpact: "+$22 est. labor",
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function statusColor(status: string) {
  switch (status) {
    case "AHEAD":
    case "ahead":
      return "text-emerald-400 bg-emerald-500/20 border-emerald-500/30";
    case "BEHIND":
    case "behind":
      return "text-amber-400 bg-amber-500/20 border-amber-500/30";
    case "critical_behind":
      return "text-red-400 bg-red-500/20 border-red-500/30";
    default:
      return "text-sky-400 bg-sky-500/20 border-sky-500/30";
  }
}

function urgencyBadge(urgency: string) {
  switch (urgency) {
    case "immediate":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "within_15min":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "within_30min":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  }
}

function recIcon(icon: string) {
  switch (icon) {
    case "phone":
      return "\u260E";
    case "clock":
      return "\u23F0";
    case "check":
      return "\u2714";
    default:
      return "\u2022";
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function PacePage() {
  const coverPct = Math.round((ACTUAL_COVERS / PROJECTED_COVERS) * 100);
  const circumference = 2 * Math.PI * 40;
  const strokeOffset = circumference - (coverPct / 100) * circumference;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Pace Monitor</h1>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-emerald-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            LIVE
          </span>
          <span className="text-sm text-slate-400">{NOW}</span>
        </div>
      </div>

      {/* Pace Status Hero */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center space-y-3">
        <p className="text-sm uppercase tracking-widest text-slate-400">{MEAL_PERIOD}</p>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusColor(PACE_STATUS)}`}>
          {PACE_STATUS}
        </span>
        <p className="text-6xl font-extrabold tracking-tight text-emerald-400">{PACE_PCT}%</p>
        <p className="text-sm text-slate-400">
          {currency(PROJECTED)} projected&nbsp;&nbsp;vs&nbsp;&nbsp;{currency(FORECAST)} forecast
        </p>
      </div>

      {/* Progress Timeline */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Service Progress</h2>
        <div className="flex gap-[2px] h-6 rounded overflow-hidden">
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
            const isCompleted = i < COMPLETED_SEGMENTS;
            const isCurrent = i === CURRENT_SEGMENT - 1;
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-colors ${
                  isCompleted
                    ? "bg-emerald-500"
                    : isCurrent
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-slate-700/50"
                }`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          {TIMELINE_LABELS.map((label) => (
            <span key={label} className={label.includes("now") ? "text-emerald-400 font-semibold" : ""}>
              {label}
            </span>
          ))}
        </div>
        {/* Actual vs Forecast summary beneath segments */}
        <div className="flex gap-[2px]">
          {INTERVALS.filter((iv) => iv.status !== "upcoming").map((iv, i) => (
            <div key={i} className="flex-1 text-center">
              <p className="text-[10px] text-emerald-400 font-medium">{currency(iv.actual ?? 0)}</p>
              <p className="text-[10px] text-slate-500">{currency(iv.forecast)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interval Breakdown Table */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Interval Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wider border-b border-white/10">
                <th className="text-left py-2 pr-4">Time</th>
                <th className="text-right py-2 px-4">Forecast</th>
                <th className="text-right py-2 px-4">Actual</th>
                <th className="text-right py-2 px-4">Variance</th>
                <th className="text-right py-2 pl-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {INTERVALS.filter((iv) => iv.status !== "upcoming").map((iv, i) => {
                const variance = iv.actual !== null ? iv.actual - iv.forecast : 0;
                const variancePct = iv.forecast > 0 && iv.actual !== null ? ((iv.actual - iv.forecast) / iv.forecast) * 100 : 0;
                const isCurrent = iv.status === "current";
                return (
                  <tr
                    key={i}
                    className={`border-b border-white/5 ${isCurrent ? "bg-emerald-500/10" : ""}`}
                  >
                    <td className="py-2 pr-4 text-slate-300">{iv.time}</td>
                    <td className="py-2 px-4 text-right text-slate-400">{currency(iv.forecast)}</td>
                    <td className="py-2 px-4 text-right">{iv.actual !== null ? currency(iv.actual) : "—"}</td>
                    <td className={`py-2 px-4 text-right font-medium ${variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {variance >= 0 ? "+" : ""}{currency(variance)} ({percent(variancePct)})
                    </td>
                    <td className="py-2 pl-4 text-right">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Now
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Done</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom row: Recommendations + Covers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Staffing Recommendations */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Staffing Recommendations</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {RECOMMENDATIONS.map((rec, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <span className="text-xl">{recIcon(rec.icon)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${urgencyBadge(rec.urgency)}`}>
                    {rec.urgency.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-snug">{rec.description}</p>
                <p className="text-xs text-slate-500">{rec.costImpact}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Covers Tracker */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 flex flex-col items-center justify-center space-y-3">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Covers</h2>
          {/* CSS donut */}
          <div className="relative w-28 h-28">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="rgb(51 65 85 / 0.5)" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke="rgb(16 185 129)" strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-emerald-400">{ACTUAL_COVERS}</span>
              <span className="text-[10px] text-slate-500">of {PROJECTED_COVERS}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center">
            Forecast: {FORECAST_COVERS} covers
          </p>
          <p className="text-xs text-emerald-400 font-medium">{coverPct}% of projected</p>
        </div>
      </div>
    </div>
  );
}
