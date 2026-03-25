"use client";

import { percent } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Static settings data                                                */
/* ------------------------------------------------------------------ */

const RESTAURANT = {
  name: "The Modern Table",
  type: "Casual Dining",
  seats: 120,
  hours: [
    { label: "Mon–Thu", value: "11:00 AM – 10:00 PM" },
    { label: "Fri–Sat", value: "11:00 AM – 11:00 PM" },
    { label: "Sunday", value: "10:00 AM – 9:00 PM (Brunch 10–2)" },
  ],
};

const LABOR = {
  totalPct: 30,
  fohPct: 13,
  bohPct: 13,
  mgmtPct: 4,
  otThreshold: 40,
};

const INTEGRATIONS = [
  {
    name: "Toast POS",
    connected: true,
    detail: "Restaurant GUID",
    value: "a1b2c3d4-****-****-****-ef5678901234",
  },
  {
    name: "RESY",
    connected: true,
    detail: "Venue ID",
    value: "tmtable-nyc-****-7890",
  },
];

const FORECAST_SETTINGS = [
  { label: "Trailing Weeks", value: "8" },
  { label: "Interval", value: "15 min" },
  { label: "Confidence Level", value: "80%" },
  { label: "Weather Enabled", value: "Yes" },
  { label: "Reservation Pace", value: "Yes" },
];

/* ------------------------------------------------------------------ */
/* Reusable card wrapper                                               */
/* ------------------------------------------------------------------ */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-medium ${accent ? "text-emerald-400" : "text-slate-200"}`}>{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      {/* Restaurant Profile */}
      <Card title="Restaurant Profile">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 text-xl font-bold shrink-0">
            MT
          </div>
          <div className="space-y-1 flex-1">
            <p className="text-lg font-semibold text-slate-100">{RESTAURANT.name}</p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5">{RESTAURANT.type}</span>
              <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5">{RESTAURANT.seats} seats</span>
            </div>
          </div>
        </div>
        <div className="pt-2 space-y-1">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Operating Hours</p>
          {RESTAURANT.hours.map((h) => (
            <div key={h.label} className="flex justify-between text-sm">
              <span className="text-slate-400">{h.label}</span>
              <span className="text-slate-300">{h.value}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Labor Targets */}
      <Card title="Labor Targets">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Labor", value: LABOR.totalPct },
            { label: "FOH", value: LABOR.fohPct },
            { label: "BOH", value: LABOR.bohPct },
            { label: "Mgmt", value: LABOR.mgmtPct },
          ].map((t) => (
            <div key={t.label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center space-y-1">
              <p className="text-2xl font-bold text-emerald-400">{percent(t.value)}</p>
              <p className="text-xs text-slate-400">{t.label}</p>
            </div>
          ))}
        </div>
        <Row label="OT Threshold" value={`${LABOR.otThreshold} hrs / week`} />
      </Card>

      {/* Integrations */}
      <Card title="Integrations">
        <div className="space-y-4">
          {INTEGRATIONS.map((intg) => (
            <div key={intg.name} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-200">{intg.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                    intg.connected
                      ? "text-emerald-400 bg-emerald-500/20 border-emerald-500/30"
                      : "text-red-400 bg-red-500/20 border-red-500/30"
                  }`}>
                    {intg.connected ? "Connected" : "Disconnected"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {intg.detail}: <span className="text-slate-400 font-mono">{intg.value}</span>
                </p>
              </div>
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors cursor-default"
              >
                Configure
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Forecast Settings */}
      <Card title="Forecast Settings">
        {FORECAST_SETTINGS.map((s) => (
          <Row key={s.label} label={s.label} value={s.value} accent={s.value === "Yes"} />
        ))}
      </Card>
    </div>
  );
}
