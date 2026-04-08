"use client";

import { currency } from "@/lib/format";

// ---------------------------------------------------------------------------
// Static settings data
// ---------------------------------------------------------------------------

const RESTAURANT = {
  name: "The Modern Table",
  type: "Casual Dining",
  seats: 120,
  hours: [
    { label: "Mon - Thu", value: "11:00 AM - 10:00 PM" },
    { label: "Fri - Sat", value: "11:00 AM - 11:00 PM" },
    { label: "Sunday", value: "10:00 AM - 9:00 PM (Brunch 10-2)" },
  ],
};

const LABOR_TARGETS = [
  { target: "Total Labor", foh: "13%", boh: "13%", mgmt: "4%" },
];

const INTEGRATIONS = [
  { name: "Toast POS", status: "Connected", id: "a1b2c3d4-****-****-****-ef5678901234" },
  { name: "RESY", status: "Connected", id: "tmtable-nyc-****-7890" },
];

const FORECAST_CONFIG = [
  { label: "Trailing Weeks", value: "8" },
  { label: "Interval", value: "15 min" },
  { label: "Confidence Level", value: "80%" },
  { label: "Weather Enabled", value: "Yes" },
  { label: "Reservation Pace", value: "Yes" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Restaurant Profile */}
      <div className="leo-card p-6">
        <h2 className="leo-section-title">Restaurant Profile</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm font-medium text-gray-900">{RESTAURANT.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Type</span>
            <span className="text-sm font-medium text-gray-900">{RESTAURANT.type}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-500">Seats</span>
            <span className="text-sm font-medium text-gray-900">{RESTAURANT.seats}</span>
          </div>
          {RESTAURANT.hours.map((h) => (
            <div key={h.label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500">{h.label}</span>
              <span className="text-sm font-medium text-gray-900">{h.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Labor Targets */}
      <div className="leo-card p-6">
        <h2 className="leo-section-title">Labor Targets</h2>
        <table className="leo-table">
          <thead>
            <tr>
              <th>Target</th>
              <th className="text-right">FOH</th>
              <th className="text-right">BOH</th>
              <th className="text-right">Management</th>
            </tr>
          </thead>
          <tbody>
            {LABOR_TARGETS.map((row) => (
              <tr key={row.target}>
                <td className="font-medium text-gray-900">{row.target}</td>
                <td className="text-right">{row.foh}</td>
                <td className="text-right">{row.boh}</td>
                <td className="text-right">{row.mgmt}</td>
              </tr>
            ))}
            <tr>
              <td className="font-medium text-gray-900">OT Threshold</td>
              <td colSpan={3} className="text-right">40 hrs / week</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Integrations */}
      <div className="leo-card p-6">
        <h2 className="leo-section-title">Integrations</h2>
        <div className="space-y-3">
          {INTEGRATIONS.map((intg) => (
            <div key={intg.name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{intg.name}</span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                    {intg.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono">{intg.id}</p>
              </div>
              <button
                type="button"
                className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-default"
              >
                Configure
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast Configuration */}
      <div className="leo-card p-6">
        <h2 className="leo-section-title">Forecast Configuration</h2>
        <div className="space-y-1">
          {FORECAST_CONFIG.map((item) => (
            <div key={item.label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500">{item.label}</span>
              <span className="text-sm font-medium text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
