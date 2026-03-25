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
