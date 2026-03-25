"use client";

import { useEffect, useState } from "react";
import { currency, number as fmt, dayLabel } from "@/lib/format";
import type { ForecastPageData } from "@/lib/api";

function Loading() {
  return (
    <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-gray-500">Generating forecast...</p>
      </div>
    </div>
  );
}

export default function ForecastPage() {
  const [data, setData] = useState<ForecastPageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/api").then(mod => {
      try {
        setData(mod.getForecastData());
      } catch (err) {
        setError(String(err));
      }
    });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f6fa] flex items-center justify-center">
        <div className="leo-card p-6 max-w-md text-center">
          <p className="text-red-500 font-medium">Error loading forecast</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return <Loading />;

  const { weeklyForecast: wf, confidence } = data;
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxTotal = Math.max(...wf.days.map(d => d.totalDaySales));

  return (
    <div className="min-h-screen bg-[#f5f6fa] p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Revenue Forecast</h1>
        <div className="flex items-center gap-3">
          <div className="leo-chart-filter">Engine Generated</div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-4">
        <div className="leo-kpi">
          <p className="leo-kpi-label">Weekly Projected</p>
          <p className="leo-kpi-value">{currency(wf.totalWeekSales)}</p>
          <p className="leo-kpi-compare">
            {wf.compToLastWeek >= 0 ? (
              <span className="leo-delta-up">&#8599; +{wf.compToLastWeek.toFixed(1)}%</span>
            ) : (
              <span className="leo-delta-down">&#8600; {wf.compToLastWeek.toFixed(1)}%</span>
            )}
            <span className="ml-2">vs last week</span>
          </p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Avg Daily Revenue</p>
          <p className="leo-kpi-value">{currency(wf.totalWeekSales / 7)}</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Projected Covers</p>
          <p className="leo-kpi-value">{fmt(wf.totalWeekCovers)}</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">Forecast Confidence</p>
          <p className="leo-kpi-value">{confidence}%</p>
          <p className="leo-kpi-compare">Based on trailing 8-week accuracy</p>
        </div>
        <div className="leo-kpi">
          <p className="leo-kpi-label">vs Last Year</p>
          <p className="leo-kpi-value">
            {wf.compToLastYear >= 0 ? '+' : ''}{wf.compToLastYear.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Weekly Forecast Chart */}
      <div className="leo-card p-6">
        <div className="leo-chart-header">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Weekly Forecast</h2>
            <p className="text-xs text-gray-400 mt-0.5">{dayLabel(data.weekStartDate)} — {dayLabel(data.weekEndDate)}</p>
          </div>
        </div>

        <div className="flex items-center gap-5 mb-5 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="leo-dot leo-dot-blue" />Forecast
          </span>
        </div>

        <div className="flex items-end gap-6 h-48 px-4">
          {wf.days.map((d, i) => {
            const pct = maxTotal > 0 ? (d.totalDaySales / maxTotal) * 100 : 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">{currency(d.totalDaySales)}</span>
                <div className="w-full flex items-end justify-center h-36">
                  <div
                    className="w-8 rounded-t bg-indigo-500"
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500">{dayNames[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Breakdown Table */}
      <div className="leo-card p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Daily Breakdown</h2>
        <table className="leo-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Date</th>
              {['lunch', 'brunch', 'dinner'].map(mp => (
                <th key={mp} className="text-right capitalize">{mp}</th>
              ))}
              <th className="text-right">Total</th>
              <th className="text-right">Covers</th>
              <th className="text-right">Avg Check</th>
            </tr>
          </thead>
          <tbody>
            {wf.days.map((d, i) => {
              const lunch = d.mealPeriods.find(mp => mp.mealPeriod === 'lunch')?.totalProjectedSales ?? 0;
              const brunch = d.mealPeriods.find(mp => mp.mealPeriod === 'brunch')?.totalProjectedSales ?? 0;
              const dinner = d.mealPeriods.find(mp => mp.mealPeriod === 'dinner')?.totalProjectedSales ?? 0;
              const avgCheck = d.totalDayCovers > 0 ? d.totalDaySales / d.totalDayCovers : 0;
              return (
                <tr key={d.date}>
                  <td className="font-medium text-gray-900">{dayNames[i]}</td>
                  <td>{dayLabel(d.date)}</td>
                  <td className="text-right">{currency(lunch)}</td>
                  <td className="text-right">{currency(brunch)}</td>
                  <td className="text-right">{currency(dinner)}</td>
                  <td className="text-right font-semibold text-gray-900">{currency(d.totalDaySales)}</td>
                  <td className="text-right">{fmt(d.totalDayCovers)}</td>
                  <td className="text-right">{currency(avgCheck)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td className="font-bold text-gray-900 py-3">Total</td>
              <td className="py-3" />
              <td className="py-3" />
              <td className="py-3" />
              <td className="py-3" />
              <td className="text-right font-bold text-gray-900 py-3">{currency(wf.totalWeekSales)}</td>
              <td className="text-right font-bold text-gray-900 py-3">{fmt(wf.totalWeekCovers)}</td>
              <td className="text-right font-bold text-gray-900 py-3">
                {currency(wf.totalWeekCovers > 0 ? wf.totalWeekSales / wf.totalWeekCovers : 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
