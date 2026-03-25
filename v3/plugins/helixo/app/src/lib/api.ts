/**
 * Helixo Data API Layer
 *
 * Server-side functions that run the real engines against demo data.
 * These are imported by Next.js Server Components (or API routes)
 * and return typed domain objects ready for rendering.
 */

import {
  DEMO_RESTAURANT,
  DEMO_STAFF,
  DEMO_CONFIG,
  generateDemoHistory,
  getDemoForecast,
  getDemoLaborPlan,
  getDemoWeeklySchedule,
} from './demo-data';

import { ForecastEngine } from '../../../src/engines/forecast-engine';
import { LaborEngine } from '../../../src/engines/labor-engine';
import { PaceMonitor } from '../../../src/engines/pace-monitor';

import type {
  DailyForecast,
  DailyLaborPlan,
  WeeklyForecast,
  WeeklySchedule,
  PaceSnapshot,
  MealPeriodForecast,
} from '../../../src/types';

// ============================================================================
// Date Helpers
// ============================================================================

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function getMondayOfWeek(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z');
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ============================================================================
// Cached History (generated once per process)
// ============================================================================

let _history: ReturnType<typeof generateDemoHistory> | null = null;

function getHistory() {
  if (!_history) {
    _history = generateDemoHistory(8);
  }
  return _history;
}

// ============================================================================
// Dashboard Data
// ============================================================================

export interface DashboardData {
  weeklyRevenue: number;
  priorWeekRevenue: number;
  weeklyCoverage: number;
  priorWeekCoverage: number;
  avgCheck: number;
  priorAvgCheck: number;
  laborCostPercent: number;
  priorLaborCostPercent: number;
  revPerLaborHour: number;
  priorRevPerLaborHour: number;
  dailyBreakdown: Array<{
    day: string;
    date: string;
    lunch: number;
    dinner: number;
    total: number;
  }>;
}

export function getDashboardData(): DashboardData {
  const today = todayISO();
  const monday = getMondayOfWeek(today);
  const engine = new ForecastEngine(DEMO_RESTAURANT, DEMO_CONFIG.forecast);
  const laborEngine = new LaborEngine(DEMO_RESTAURANT, DEMO_CONFIG.labor);
  const history = getHistory();

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dailyBreakdown: DashboardData['dailyBreakdown'] = [];
  let weeklyRevenue = 0;
  let weeklyCoverage = 0;
  let totalLaborCost = 0;
  let totalLaborHours = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i);
    const forecast = engine.generateDailyForecast(date, history);
    const labor = laborEngine.generateDailyLaborPlan(forecast);

    const lunch = forecast.mealPeriods
      .filter(mp => mp.mealPeriod === 'lunch' || mp.mealPeriod === 'brunch')
      .reduce((s, mp) => s + mp.totalProjectedSales, 0);
    const dinner = forecast.mealPeriods
      .filter(mp => mp.mealPeriod === 'dinner')
      .reduce((s, mp) => s + mp.totalProjectedSales, 0);

    dailyBreakdown.push({
      day: dayNames[i],
      date: new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      lunch: Math.round(lunch),
      dinner: Math.round(dinner),
      total: Math.round(forecast.totalDaySales),
    });

    weeklyRevenue += forecast.totalDaySales;
    weeklyCoverage += forecast.totalDayCovers;
    totalLaborCost += labor.totalDayLaborCost;
    totalLaborHours += labor.totalDayLaborHours;
  }

  const avgCheck = weeklyCoverage > 0 ? weeklyRevenue / weeklyCoverage : 0;
  const laborCostPercent = weeklyRevenue > 0 ? totalLaborCost / weeklyRevenue : 0;
  const revPerLaborHour = totalLaborHours > 0 ? weeklyRevenue / totalLaborHours : 0;

  // Generate "prior week" with slight offset for comparison
  const priorFactor = 0.94;
  return {
    weeklyRevenue: Math.round(weeklyRevenue),
    priorWeekRevenue: Math.round(weeklyRevenue * priorFactor),
    weeklyCoverage,
    priorWeekCoverage: Math.round(weeklyCoverage * 0.97),
    avgCheck: Math.round(avgCheck * 100) / 100,
    priorAvgCheck: Math.round(avgCheck * 1.02 * 100) / 100,
    laborCostPercent: Math.round(laborCostPercent * 1000) / 1000,
    priorLaborCostPercent: Math.round(laborCostPercent * 0.98 * 1000) / 1000,
    revPerLaborHour: Math.round(revPerLaborHour * 100) / 100,
    priorRevPerLaborHour: Math.round(revPerLaborHour * 0.93 * 100) / 100,
    dailyBreakdown,
  };
}

// ============================================================================
// Forecast Data
// ============================================================================

export interface ForecastPageData {
  weekStartDate: string;
  weekEndDate: string;
  weeklyForecast: WeeklyForecast;
  confidence: number;
}

export function getForecastData(weekStart?: string): ForecastPageData {
  const start = weekStart ?? getMondayOfWeek(todayISO());
  const engine = new ForecastEngine(DEMO_RESTAURANT, DEMO_CONFIG.forecast);
  const history = getHistory();
  const weekly = engine.generateWeeklyForecast(start, history);

  // Average confidence across all meal periods
  const allConfidences = weekly.days.flatMap(d => d.mealPeriods.map(mp => mp.confidenceScore));
  const confidence = allConfidences.length > 0
    ? allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length
    : 0;

  return {
    weekStartDate: start,
    weekEndDate: addDays(start, 6),
    weeklyForecast: weekly,
    confidence: Math.round(confidence * 100),
  };
}

// ============================================================================
// Labor Data
// ============================================================================

export interface LaborPageData {
  date: string;
  forecast: DailyForecast;
  laborPlan: DailyLaborPlan;
  hourlyStaffing: Array<{
    time: string;
    foh: number;
    boh: number;
  }>;
  staffingActions: Array<{
    time: string;
    action: 'Add' | 'Reduce';
    role: string;
    count: number;
    reason: string;
  }>;
}

export function getLaborData(date?: string): LaborPageData {
  const targetDate = date ?? todayISO();
  const forecast = getDemoForecast(targetDate);
  const laborPlan = getDemoLaborPlan(targetDate);

  // Build hourly staffing from intervals
  const hourMap = new Map<string, { foh: number; boh: number }>();
  for (const mp of laborPlan.mealPeriods) {
    for (const iv of mp.intervals) {
      const hour = iv.intervalStart.slice(0, 2);
      const label = formatHour(parseInt(hour, 10));
      const existing = hourMap.get(label) ?? { foh: 0, boh: 0 };
      existing.foh = Math.max(existing.foh, iv.totalFOHHeads);
      existing.boh = Math.max(existing.boh, iv.totalBOHHeads);
      hourMap.set(label, existing);
    }
  }

  const hourlyStaffing = [...hourMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, counts]) => ({ time, ...counts }));

  // Derive staffing actions from staggered starts
  const staffingActions: LaborPageData['staffingActions'] = [];
  for (const mp of laborPlan.mealPeriods) {
    for (const ss of mp.staggeredStarts) {
      staffingActions.push({
        time: formatTime12(ss.startTime),
        action: 'Add',
        role: formatRole(ss.role),
        count: ss.headcount,
        reason: ss.reason,
      });
    }
  }

  return { date: targetDate, forecast, laborPlan, hourlyStaffing, staffingActions };
}

// ============================================================================
// Schedule Data
// ============================================================================

export interface SchedulePageData {
  weekStart: string;
  schedule: WeeklySchedule;
}

export function getScheduleData(weekStart?: string): SchedulePageData {
  const start = weekStart ?? getMondayOfWeek(todayISO());
  const schedule = getDemoWeeklySchedule(start);
  return { weekStart: start, schedule };
}

// ============================================================================
// Pace Data
// ============================================================================

export interface PacePageData {
  snapshot: PaceSnapshot;
  forecast: MealPeriodForecast;
  simulatedActualSales: number;
  simulatedActualCovers: number;
}

export function getPaceData(mealPeriod?: string, currentTime?: string): PacePageData {
  const today = todayISO();
  const forecast = getDemoForecast(today);

  // Pick the current or most relevant meal period
  const targetMP = mealPeriod ?? 'dinner';
  const mpForecast = forecast.mealPeriods.find(mp => mp.mealPeriod === targetMP)
    ?? forecast.mealPeriods[forecast.mealPeriods.length - 1];

  if (!mpForecast) {
    // Fallback empty snapshot
    const monitor = new PaceMonitor(DEMO_CONFIG.paceMonitor);
    return {
      snapshot: monitor.calculatePace(
        { mealPeriod: 'dinner', date: today, dayOfWeek: 'monday', totalProjectedSales: 0, totalProjectedCovers: 0, avgProjectedCheck: 0, intervals: [], confidenceScore: 0, factorsApplied: [] },
        0, 0
      ),
      forecast: { mealPeriod: 'dinner', date: today, dayOfWeek: 'monday', totalProjectedSales: 0, totalProjectedCovers: 0, avgProjectedCheck: 0, intervals: [], confidenceScore: 0, factorsApplied: [] },
      simulatedActualSales: 0,
      simulatedActualCovers: 0,
    };
  }

  // Simulate being ~65% through service at 108% pace
  const paceMultiplier = 1.08;
  const progressPct = 0.65;
  const simulatedActualSales = Math.round(mpForecast.totalProjectedSales * progressPct * paceMultiplier);
  const simulatedActualCovers = Math.round(mpForecast.totalProjectedCovers * progressPct * paceMultiplier);

  // Calculate the simulated current time based on intervals
  let simTime = currentTime;
  if (!simTime && mpForecast.intervals.length > 0) {
    const idx = Math.floor(mpForecast.intervals.length * progressPct);
    simTime = mpForecast.intervals[Math.min(idx, mpForecast.intervals.length - 1)].intervalStart;
  }

  const monitor = new PaceMonitor(DEMO_CONFIG.paceMonitor);
  const snapshot = monitor.calculatePace(mpForecast, simulatedActualSales, simulatedActualCovers, simTime);

  return { snapshot, forecast: mpForecast, simulatedActualSales, simulatedActualCovers };
}

// ============================================================================
// Revenue Data
// ============================================================================

export interface RevenueByMealPeriod {
  day: string;
  date: string;
  lunch: number;
  dinner: number;
  total: number;
}

export interface MenuMixCategory {
  category: string;
  amount: number;
  pct: number;
}

export interface RevenueDayComparison {
  day: string;
  date: string;
  current: number;
  priorWeek: number;
  delta: number;
}

export interface RevenuePageData {
  weeklyRevenue: number;
  avgDaily: number;
  peakDay: { day: string; revenue: number };
  weakestDay: { day: string; revenue: number };
  revenuePerSeat: number;
  seats: number;
  mealPeriodBreakdown: RevenueByMealPeriod[];
  menuMix: MenuMixCategory[];
  dayComparisons: RevenueDayComparison[];
}

export function getRevenueData(): RevenuePageData {
  const today = todayISO();
  const monday = getMondayOfWeek(today);
  const engine = new ForecastEngine(DEMO_RESTAURANT, DEMO_CONFIG.forecast);
  const history = getHistory();

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const mealPeriodBreakdown: RevenueByMealPeriod[] = [];
  let weeklyRevenue = 0;
  let peakDay = { day: '', revenue: 0 };
  let weakestDay = { day: '', revenue: Infinity };

  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i);
    const forecast = engine.generateDailyForecast(date, history);

    const lunch = forecast.mealPeriods
      .filter(mp => mp.mealPeriod === 'lunch' || mp.mealPeriod === 'brunch')
      .reduce((s, mp) => s + mp.totalProjectedSales, 0);
    const dinner = forecast.mealPeriods
      .filter(mp => mp.mealPeriod === 'dinner')
      .reduce((s, mp) => s + mp.totalProjectedSales, 0);
    const total = Math.round(forecast.totalDaySales);

    const dateLabel = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'UTC',
    });

    mealPeriodBreakdown.push({
      day: dayNames[i],
      date: dateLabel,
      lunch: Math.round(lunch),
      dinner: Math.round(dinner),
      total,
    });

    weeklyRevenue += forecast.totalDaySales;
    if (total > peakDay.revenue) peakDay = { day: dayNames[i], revenue: total };
    if (total < weakestDay.revenue) weakestDay = { day: dayNames[i], revenue: total };
  }

  weeklyRevenue = Math.round(weeklyRevenue);
  const avgDaily = Math.round(weeklyRevenue / 7);
  const seats = DEMO_RESTAURANT.seats;
  const revenuePerSeat = Math.round((weeklyRevenue / 7 / seats) * 100) / 100;

  // Menu mix breakdown (estimated ratios for casual dining)
  const mixRatios = [
    { category: 'Entrees', ratio: 0.42 },
    { category: 'Appetizers', ratio: 0.15 },
    { category: 'Beverages', ratio: 0.14 },
    { category: 'Alcohol', ratio: 0.17 },
    { category: 'Desserts', ratio: 0.08 },
    { category: 'Other', ratio: 0.04 },
  ];
  const menuMix: MenuMixCategory[] = mixRatios.map(m => ({
    category: m.category,
    amount: Math.round(weeklyRevenue * m.ratio),
    pct: m.ratio,
  }));

  // Day-over-day comparison (prior week simulated at ~94% factor with per-day variance)
  const priorVariance = [0.92, 0.95, 0.93, 0.96, 0.91, 0.98, 0.94];
  const dayComparisons: RevenueDayComparison[] = mealPeriodBreakdown.map((d, i) => {
    const prior = Math.round(d.total * priorVariance[i]);
    const delta = prior > 0 ? ((d.total - prior) / prior) * 100 : 0;
    return { day: d.day, date: d.date, current: d.total, priorWeek: prior, delta };
  });

  return {
    weeklyRevenue,
    avgDaily,
    peakDay,
    weakestDay,
    revenuePerSeat,
    seats,
    mealPeriodBreakdown,
    menuMix,
    dayComparisons,
  };
}

// ============================================================================
// Insights Data
// ============================================================================

export interface Insight {
  id: number;
  category: 'revenue' | 'labor' | 'forecast' | 'operations';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ForecastVsActual {
  day: string;
  forecast: number;
  actual: number;
  variance: number;
}

export interface WeekTrend {
  label: string;
  revenue: number;
}

export interface InsightsPageData {
  forecastAccuracy: number;
  laborEfficiency: number;
  coversPerLaborHour: number;
  avgCheckTrend: number;
  insights: Insight[];
  forecastVsActual: ForecastVsActual[];
  weekTrends: WeekTrend[];
}

export function getInsightsData(): InsightsPageData {
  const today = todayISO();
  const monday = getMondayOfWeek(today);
  const engine = new ForecastEngine(DEMO_RESTAURANT, DEMO_CONFIG.forecast);
  const laborEngine = new LaborEngine(DEMO_RESTAURANT, DEMO_CONFIG.labor);
  const history = getHistory();

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  let totalRevenue = 0;
  let totalCovers = 0;
  let totalLaborHours = 0;
  let totalLaborCost = 0;

  const dailyData: Array<{
    day: string; revenue: number; covers: number; lunch: number;
    dinner: number; laborHours: number; laborCost: number;
  }> = [];

  for (let i = 0; i < 7; i++) {
    const date = addDays(monday, i);
    const forecast = engine.generateDailyForecast(date, history);
    const labor = laborEngine.generateDailyLaborPlan(forecast);

    const lunch = forecast.mealPeriods
      .filter(mp => mp.mealPeriod === 'lunch' || mp.mealPeriod === 'brunch')
      .reduce((s, mp) => s + mp.totalProjectedSales, 0);
    const dinner = forecast.mealPeriods
      .filter(mp => mp.mealPeriod === 'dinner')
      .reduce((s, mp) => s + mp.totalProjectedSales, 0);

    dailyData.push({
      day: dayNames[i],
      revenue: forecast.totalDaySales,
      covers: forecast.totalDayCovers,
      lunch,
      dinner,
      laborHours: labor.totalDayLaborHours,
      laborCost: labor.totalDayLaborCost,
    });

    totalRevenue += forecast.totalDaySales;
    totalCovers += forecast.totalDayCovers;
    totalLaborHours += labor.totalDayLaborHours;
    totalLaborCost += labor.totalDayLaborCost;
  }

  // KPIs
  const forecastAccuracy = 0.87; // Simulated trailing 8-week accuracy
  const laborEfficiency = totalRevenue > 0 ? totalLaborCost / totalRevenue : 0;
  const coversPerLaborHour = totalLaborHours > 0 ? totalCovers / totalLaborHours : 0;
  const avgCheck = totalCovers > 0 ? totalRevenue / totalCovers : 0;
  const priorAvgCheck = avgCheck * 0.97;
  const avgCheckTrend = priorAvgCheck > 0
    ? ((avgCheck - priorAvgCheck) / priorAvgCheck) * 100
    : 0;

  // Generate smart insights
  const weekendDinner = dailyData
    .filter(d => d.day === 'Sat' || d.day === 'Sun')
    .reduce((s, d) => s + d.dinner, 0) / 2;
  const weekdayDinner = dailyData
    .filter(d => d.day !== 'Sat' && d.day !== 'Sun')
    .reduce((s, d) => s + d.dinner, 0) / 5;
  const weekendDinnerPct = weekdayDinner > 0
    ? ((weekendDinner - weekdayDinner) / weekdayDinner) * 100
    : 0;

  const highestLaborDay = dailyData.reduce((prev, cur) =>
    (cur.laborCost / cur.revenue) > (prev.laborCost / prev.revenue) ? cur : prev
  );
  const highestLaborPct = highestLaborDay.revenue > 0
    ? highestLaborDay.laborCost / highestLaborDay.revenue
    : 0;

  const lunchCPLH = dailyData.map(d => {
    const lunchHours = d.laborHours * 0.4; // Estimated lunch portion
    return lunchHours > 0 ? (d.covers * 0.45) / lunchHours : 0;
  });
  const dinnerCPLH = dailyData.map(d => {
    const dinnerHours = d.laborHours * 0.6;
    return dinnerHours > 0 ? (d.covers * 0.55) / dinnerHours : 0;
  });
  const avgLunchCPLH = lunchCPLH.reduce((a, b) => a + b, 0) / lunchCPLH.length;
  const avgDinnerCPLH = dinnerCPLH.reduce((a, b) => a + b, 0) / dinnerCPLH.length;

  // Confidence per day (simulated)
  const confidences = [0.89, 0.91, 0.88, 0.85, 0.82, 0.79, 0.84];
  const lowestConfIdx = confidences.indexOf(Math.min(...confidences));

  const peakDay = dailyData.reduce((prev, cur) => cur.revenue > prev.revenue ? cur : prev);
  const weakestDay = dailyData.reduce((prev, cur) => cur.revenue < prev.revenue ? cur : prev);

  const insights: Insight[] = [
    {
      id: 1,
      category: 'revenue',
      title: 'Weekend dinner outperforms weekday',
      description: `Weekend dinner revenue is ${weekendDinnerPct.toFixed(0)}% higher than weekday dinner average. Consider premium weekend menu pricing.`,
      impact: 'positive',
    },
    {
      id: 2,
      category: 'labor',
      title: `High labor cost on ${highestLaborDay.day}`,
      description: `Labor cost is ${(highestLaborPct * 100).toFixed(1)}% of revenue on ${highestLaborDay.day} \u2014 above the 28% target. Consider reducing 1 server.`,
      impact: 'negative',
    },
    {
      id: 3,
      category: 'forecast',
      title: `Low confidence on ${dayNames[lowestConfIdx]}`,
      description: `Forecast confidence is lowest on ${dayNames[lowestConfIdx]} at ${(confidences[lowestConfIdx] * 100).toFixed(0)}%. More historical data or event tagging would improve accuracy.`,
      impact: 'neutral',
    },
    {
      id: 4,
      category: 'operations',
      title: 'Lunch labor efficiency leads dinner',
      description: `Lunch averages ${avgLunchCPLH.toFixed(1)} covers/labor-hour vs dinner at ${avgDinnerCPLH.toFixed(1)}. Dinner staffing can be optimized.`,
      impact: 'neutral',
    },
    {
      id: 5,
      category: 'revenue',
      title: `${peakDay.day} is your strongest day`,
      description: `${peakDay.day} generates $${Math.round(peakDay.revenue).toLocaleString()} \u2014 ${((peakDay.revenue / weakestDay.revenue - 1) * 100).toFixed(0)}% more than ${weakestDay.day}. Maximize staffing and prep for ${peakDay.day}.`,
      impact: 'positive',
    },
    {
      id: 6,
      category: 'revenue',
      title: 'Average check trending up',
      description: `Average check is up ${avgCheckTrend.toFixed(1)}% vs prior week. Menu engineering or upsell training is paying off.`,
      impact: 'positive',
    },
  ];

  // Forecast vs Actual (simulated with slight variance)
  const actualVariance = [1.02, 0.97, 1.05, 0.99, 1.01, 0.96, 1.03];
  const forecastVsActual: ForecastVsActual[] = dailyData.map((d, i) => {
    const actual = Math.round(d.revenue * actualVariance[i]);
    const variance = d.revenue > 0 ? ((actual - d.revenue) / d.revenue) * 100 : 0;
    return { day: d.day, forecast: Math.round(d.revenue), actual, variance };
  });

  // Week-over-week trend (simulated 4 weeks)
  const weekTrends: WeekTrend[] = [
    { label: '3 Weeks Ago', revenue: Math.round(totalRevenue * 0.91) },
    { label: '2 Weeks Ago', revenue: Math.round(totalRevenue * 0.94) },
    { label: 'Last Week', revenue: Math.round(totalRevenue * 0.97) },
    { label: 'This Week', revenue: Math.round(totalRevenue) },
  ];

  return {
    forecastAccuracy,
    laborEfficiency,
    coversPerLaborHour: Math.round(coversPerLaborHour * 10) / 10,
    avgCheckTrend: Math.round(avgCheckTrend * 10) / 10,
    insights,
    forecastVsActual,
    weekTrends,
  };
}

// ============================================================================
// Formatting helpers
// ============================================================================

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatRole(role: string): string {
  return role.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}
