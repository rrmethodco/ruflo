"use client";

import { useState } from "react";
import { currency, percent, shortCurrency, dayLabel, timeRange } from "@/lib/format";

/* ─── Demo Data ─────────────────────────────────────────────────── */

interface MealPeriod {
  sales: number;
  covers: number;
  avgCheck: number;
  bars: number[]; // 15-min interval projected sales
  peakIndex: number;
  peakLabel: string;
  confidenceBars: number[]; // upper band
}

interface DayForecast {
  date: Date;
  lunch: MealPeriod;
  dinner: MealPeriod;
  totalSales: number;
  totalCovers: number;
  confidence: number;
  lastYearSales: number;
  trailing4wAvg: number;
  budgetTarget: number;
}

function meal(
  sales: number, covers: number,
  bars: number[], peakIdx: number, peakLabel: string,
  band: number[],
): MealPeriod {
  return { sales, covers, avgCheck: Math.round(sales / covers), bars, peakIndex: peakIdx, peakLabel, confidenceBars: band };
}

const WEEK_START = new Date(2026, 2, 23); // Mon Mar 23 2026

function d(offset: number) {
  const dt = new Date(WEEK_START);
  dt.setDate(dt.getDate() + offset);
  return dt;
}

const DAYS: DayForecast[] = [
  { date: d(0), confidence: 0.88,
    lunch: meal(4200, 78, [180,260,380,520,620,680,540,420,280,200,120,80], 5, "12:15p", [220,310,440,590,700,760,610,480,330,250,160,110]),
    dinner: meal(9800, 142, [320,480,680,920,1100,1240,1180,1020,860,680,520,380,260,180], 5, "7:30p", [380,550,760,1020,1220,1380,1310,1140,960,760,590,440,310,220]),
    totalSales: 14000, totalCovers: 220, lastYearSales: 13200, trailing4wAvg: 13600, budgetTarget: 13800 },
  { date: d(1), confidence: 0.85,
    lunch: meal(3800, 70, [160,240,350,480,580,640,500,400,260,180,110,70], 5, "12:15p", [200,290,410,550,660,720,570,460,310,230,150,100]),
    dinner: meal(9200, 134, [300,450,640,880,1060,1200,1140,980,820,650,490,360,240,160], 5, "7:30p", [360,520,720,980,1180,1340,1270,1100,920,730,560,420,290,200]),
    totalSales: 13000, totalCovers: 204, lastYearSales: 12500, trailing4wAvg: 12800, budgetTarget: 13200 },
  { date: d(2), confidence: 0.90,
    lunch: meal(4500, 82, [200,280,400,540,650,720,560,440,300,220,140,90], 5, "12:15p", [240,330,460,610,730,800,630,500,350,270,180,120]),
    dinner: meal(10500, 152, [340,500,720,960,1140,1280,1220,1060,900,720,540,400,280,200], 5, "7:15p", [400,570,800,1060,1260,1420,1360,1180,1000,800,610,460,330,240]),
    totalSales: 15000, totalCovers: 234, lastYearSales: 14100, trailing4wAvg: 14400, budgetTarget: 14600 },
  { date: d(3), confidence: 0.92,
    lunch: meal(5200, 95, [220,310,440,600,720,800,620,500,340,240,160,100], 5, "12:00p", [260,360,500,670,800,880,700,570,400,290,200,130]),
    dinner: meal(11800, 168, [380,560,780,1040,1220,1380,1320,1140,960,760,580,420,300,210], 5, "7:30p", [440,630,860,1140,1340,1520,1460,1260,1060,840,650,480,350,250]),
    totalSales: 17000, totalCovers: 263, lastYearSales: 15800, trailing4wAvg: 16200, budgetTarget: 16500 },
  { date: d(4), confidence: 0.87,
    lunch: meal(5500, 100, [240,340,480,640,760,840,660,520,360,260,170,110], 5, "12:15p", [280,390,540,710,840,920,740,590,420,310,210,140]),
    dinner: meal(12000, 172, [400,580,800,1060,1240,1400,1340,1160,980,780,600,440,310,220], 5, "7:30p", [460,650,880,1160,1360,1540,1480,1280,1080,860,670,500,360,260]),
    totalSales: 17500, totalCovers: 272, lastYearSales: 16400, trailing4wAvg: 16800, budgetTarget: 17000 },
  { date: d(5), confidence: 0.82,
    lunch: meal(7800, 138, [340,480,660,880,1020,1140,920,740,520,380,260,180], 5, "12:30p", [400,550,740,980,1140,1280,1040,840,590,440,310,220]),
    dinner: meal(17200, 248, [560,780,1060,1380,1600,1800,1720,1500,1280,1020,800,600,420,300], 5, "7:45p", [640,880,1180,1520,1760,1980,1900,1660,1420,1140,900,680,480,350]),
    totalSales: 25000, totalCovers: 386, lastYearSales: 23500, trailing4wAvg: 24200, budgetTarget: 24000 },
  { date: d(6), confidence: 0.78,
    lunch: meal(6200, 112, [280,400,560,740,860,960,780,620,440,320,220,150], 5, "12:30p", [330,460,630,830,960,1080,880,700,500,380,270,190]),
    dinner: meal(15500, 224, [480,680,940,1240,1440,1620,1540,1340,1140,900,700,520,360,260], 5, "7:30p", [550,770,1060,1380,1600,1800,1720,1500,1280,1020,790,590,420,300]),
    totalSales: 21700, totalCovers: 336, lastYearSales: 20800, trailing4wAvg: 21000, budgetTarget: 21200 },
];

const TODAY = new Date(2026, 2, 25); // Wed Mar 25

function isToday(date: Date) {
  return date.toDateString() === TODAY.toDateString();
}

function fmtDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function confidenceColor(c: number) {
  if (c >= 0.85) return "bg-emerald-400";
  if (c >= 0.80) return "bg-amber-400";
  return "bg-red-400";
}

function varianceColor(pct: number) {
  return pct >= 0 ? "text-emerald-400" : "text-red-400";
}

function varianceStr(current: number, baseline: number) {
  const pct = ((current - baseline) / baseline) * 100;
  const sign = pct >= 0 ? "+" : "";
  return { pct, label: `${sign}${pct.toFixed(1)}%` };
}

/* ─── Bar Chart ─────────────────────────────────────────────────── */

function BarChart({ bars, confidenceBars, peakIndex, peakLabel }: {
  bars: number[]; confidenceBars: number[]; peakIndex: number; peakLabel: string;
}) {
  const max = Math.max(...confidenceBars);
  return (
    <div className="mt-3">
      <div className="flex items-end gap-[3px] h-24">
        {bars.map((v, i) => {
          const h = (v / max) * 100;
          const ch = (confidenceBars[i] / max) * 100;
          return (
            <div key={i} className="flex-1 relative flex flex-col justify-end h-full">
              <div
                className="absolute bottom-0 w-full rounded-sm bg-emerald-500/20"
                style={{ height: `${ch}%` }}
              />
              <div
                className={`relative w-full rounded-sm ${i === peakIndex ? "bg-emerald-400" : "bg-emerald-500/70"}`}
                style={{ height: `${h}%` }}
              />
              {i === peakIndex && (
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-emerald-300 whitespace-nowrap">
                  {peakLabel}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Page Component ────────────────────────────────────────────── */

export default function ForecastPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(2); // default to today (Wed)

  const weekStart = new Date(WEEK_START);
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekLabel = `${fmtDate(weekStart)} \u2013 ${fmtDate(weekEnd)}`;

  const day = DAYS[selectedIdx];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Revenue Forecast</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition"
          >
            &larr; Prev
          </button>
          <span className="text-sm text-gray-300 font-medium min-w-[180px] text-center">
            {weekLabel}
          </span>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition"
          >
            Next &rarr;
          </button>
        </div>
      </div>

      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-7 gap-3">
        {DAYS.map((d, i) => {
          const today = isToday(d.date);
          const selected = i === selectedIdx;
          return (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`glass-card rounded-xl p-3 text-left transition-all ${
                today ? "ring-2 ring-emerald-400/60" : ""
              } ${selected ? "bg-white/10" : "bg-white/[0.03] hover:bg-white/[0.06]"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400 font-medium">
                  {dayLabel(d.date)} {fmtDate(d.date)}
                </span>
                <span className={`w-2 h-2 rounded-full ${confidenceColor(d.confidence)}`} />
              </div>
              <div className="text-lg font-bold text-white">{currency(d.totalSales)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{d.totalCovers} covers</div>
            </button>
          );
        })}
      </div>

      {/* Daily Detail Panel */}
      <div className="grid grid-cols-2 gap-4">
        {(["lunch", "dinner"] as const).map((period) => {
          const m = day[period];
          const label = period === "lunch" ? "Lunch" : "Dinner";
          const range = period === "lunch" ? timeRange("11:00a", "2:00p") : timeRange("5:00p", "10:00p");
          return (
            <div key={period} className="glass-card rounded-xl p-5 bg-white/[0.03]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold">{label}</h3>
                  <span className="text-xs text-gray-500">{range}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${confidenceColor(day.confidence)} text-gray-900 font-medium`}>
                  {percent(day.confidence * 100)} conf
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div>
                  <div className="text-xs text-gray-400">Proj. Sales</div>
                  <div className="text-lg font-bold text-emerald-400">{currency(m.sales)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Covers</div>
                  <div className="text-lg font-bold">{m.covers}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Avg Check</div>
                  <div className="text-lg font-bold">{currency(m.avgCheck)}</div>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 mb-1">15-min interval projection</div>
              <BarChart
                bars={m.bars}
                confidenceBars={m.confidenceBars}
                peakIndex={m.peakIndex}
                peakLabel={m.peakLabel}
              />
            </div>
          );
        })}
      </div>

      {/* Comparison Panel */}
      <div className="glass-card rounded-xl p-5 bg-white/[0.03]">
        <h3 className="text-base font-semibold mb-4">
          Comparison &mdash; {dayLabel(day.date)} {fmtDate(day.date)}
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left pb-2 font-medium">Benchmark</th>
              <th className="text-right pb-2 font-medium">Sales</th>
              <th className="text-right pb-2 font-medium">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {(() => {
              const rows = [
                { label: "Projected (this day)", value: day.totalSales, variance: null },
                { label: "Same week last year", value: day.lastYearSales, variance: varianceStr(day.totalSales, day.lastYearSales) },
                { label: "Trailing 4-week avg", value: day.trailing4wAvg, variance: varianceStr(day.totalSales, day.trailing4wAvg) },
                { label: "Budget target", value: day.budgetTarget, variance: varianceStr(day.totalSales, day.budgetTarget) },
              ];
              return rows.map((r, i) => (
                <tr key={i} className={i === 0 ? "font-semibold" : ""}>
                  <td className="py-2 text-gray-300">{r.label}</td>
                  <td className="py-2 text-right">{currency(r.value)}</td>
                  <td className={`py-2 text-right font-medium ${r.variance ? varianceColor(r.variance.pct) : ""}`}>
                    {r.variance ? r.variance.label : "\u2014"}
                  </td>
                </tr>
              ));
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
