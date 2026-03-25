/**
 * Helixo Demo Data
 *
 * Generates realistic demo data for "The Modern Table", a 120-seat casual dining
 * restaurant. Provides historical sales, staff roster, and helper functions
 * so the web UI works immediately without real POS/reservation integrations.
 */

import type {
  RestaurantProfile,
  HistoricalSalesRecord,
  StaffMember,
  HelixoConfig,
  DayOfWeek,
  MealPeriod,
  MenuMixEntry,
  DailyForecast,
  DailyLaborPlan,
  WeeklySchedule,
  ServiceWindow,
  WeeklyAvailability,
} from '../../src/types';

import {
  DEFAULT_FORECAST_CONFIG,
  DEFAULT_LABOR_CONFIG,
  DEFAULT_SCHEDULING_CONFIG,
  DEFAULT_PACE_MONITOR_CONFIG,
  DEFAULT_LABOR_TARGETS,
} from '../../src/types';

import { ForecastEngine } from '../../src/engines/forecast-engine';
import { LaborEngine } from '../../src/engines/labor-engine';
import { SchedulerEngine } from '../../src/engines/scheduler-engine';

// ============================================================================
// Constants
// ============================================================================

const DAYS: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

const WEEKDAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKENDS: DayOfWeek[] = ['saturday', 'sunday'];

const MENU_CATEGORIES = ['appetizers', 'entrees', 'desserts', 'beverages', 'alcohol'] as const;

/** Revenue distribution by menu category for a casual dining concept */
const MENU_MIX_RATIOS: Record<MealPeriod, Record<string, number>> = {
  lunch:     { appetizers: 0.10, entrees: 0.45, desserts: 0.05, beverages: 0.15, alcohol: 0.25 },
  dinner:    { appetizers: 0.14, entrees: 0.40, desserts: 0.08, beverages: 0.10, alcohol: 0.28 },
  brunch:    { appetizers: 0.08, entrees: 0.42, desserts: 0.10, beverages: 0.18, alcohol: 0.22 },
  breakfast: { appetizers: 0.05, entrees: 0.50, desserts: 0.10, beverages: 0.30, alcohol: 0.05 },
  afternoon: { appetizers: 0.20, entrees: 0.15, desserts: 0.15, beverages: 0.25, alcohol: 0.25 },
  late_night:{ appetizers: 0.20, entrees: 0.25, desserts: 0.05, beverages: 0.10, alcohol: 0.40 },
};

// ============================================================================
// Restaurant Profile
// ============================================================================

const weekdayHours: ServiceWindow[] = [
  { period: 'lunch', open: '11:00', close: '14:30' },
  { period: 'dinner', open: '17:00', close: '22:00' },
];

const weekendHours: ServiceWindow[] = [
  { period: 'brunch', open: '10:00', close: '14:30' },
  { period: 'dinner', open: '17:00', close: '22:30' },
];

const operatingHours: Record<DayOfWeek, ServiceWindow[]> = {
  monday: weekdayHours,
  tuesday: weekdayHours,
  wednesday: weekdayHours,
  thursday: weekdayHours,
  friday: [...weekdayHours.slice(0, 1), { period: 'dinner', open: '17:00', close: '22:30' }],
  saturday: weekendHours,
  sunday: weekendHours,
};

export const DEMO_RESTAURANT: RestaurantProfile = {
  id: 'demo-modern-table',
  name: 'The Modern Table',
  type: 'casual_dining',
  seats: 120,
  avgTurnTime: {
    breakfast: 45, brunch: 60, lunch: 50,
    afternoon: 40, dinner: 75, late_night: 60,
  },
  avgCheckSize: {
    breakfast: 18, brunch: 32, lunch: 26,
    afternoon: 20, dinner: 48, late_night: 35,
  },
  operatingHours,
  laborTargets: DEFAULT_LABOR_TARGETS.casual_dining,
  minimumStaffing: {
    byRole: {
      server:    { breakfast: 1, brunch: 2, lunch: 2, afternoon: 1, dinner: 3, late_night: 1 },
      bartender: { breakfast: 0, brunch: 1, lunch: 1, afternoon: 1, dinner: 2, late_night: 1 },
      host:      { breakfast: 0, brunch: 1, lunch: 1, afternoon: 0, dinner: 1, late_night: 0 },
      line_cook: { breakfast: 1, brunch: 2, lunch: 2, afternoon: 1, dinner: 2, late_night: 1 },
    },
    byDepartment: { foh: 3, boh: 3, management: 1 },
  },
};

// ============================================================================
// Staff Roster (25 members)
// ============================================================================

function avail(days: DayOfWeek[], start: string, end: string, preferred = true): WeeklyAvailability {
  const a: WeeklyAvailability = {};
  for (const d of days) {
    a[d] = [{ start, end, preferred }];
  }
  return a;
}

export const DEMO_STAFF: StaffMember[] = [
  // Servers (7)
  { id: 's1', name: 'Maria Santos', roles: ['server'], primaryRole: 'server', department: 'foh', hourlyRate: 5.50, overtimeRate: 8.25, maxHoursPerWeek: 38, availability: avail(['monday','tuesday','wednesday','thursday','friday'], '10:00', '22:30'), skillLevel: 5, hireDate: '2023-03-15', isMinor: false, certifications: ['alcohol_service', 'food_safety'] },
  { id: 's2', name: 'Jake Turner', roles: ['server', 'runner'], primaryRole: 'server', department: 'foh', hourlyRate: 5.50, overtimeRate: 8.25, maxHoursPerWeek: 35, availability: avail(['tuesday','wednesday','thursday','friday','saturday'], '10:00', '22:30'), skillLevel: 4, hireDate: '2023-09-01', isMinor: false, certifications: ['alcohol_service'] },
  { id: 's3', name: 'Priya Patel', roles: ['server'], primaryRole: 'server', department: 'foh', hourlyRate: 5.50, overtimeRate: 8.25, maxHoursPerWeek: 40, availability: avail(['monday','wednesday','thursday','friday','saturday','sunday'], '10:00', '22:30'), skillLevel: 5, hireDate: '2022-11-10', isMinor: false, certifications: ['alcohol_service', 'food_safety'] },
  { id: 's4', name: 'Tyler Reed', roles: ['server', 'bartender'], primaryRole: 'server', department: 'foh', hourlyRate: 5.50, overtimeRate: 8.25, maxHoursPerWeek: 36, availability: avail(['monday','tuesday','friday','saturday','sunday'], '10:00', '22:30'), skillLevel: 4, hireDate: '2024-01-20', isMinor: false, certifications: ['alcohol_service'] },
  { id: 's5', name: 'Aisha Johnson', roles: ['server'], primaryRole: 'server', department: 'foh', hourlyRate: 5.50, overtimeRate: 8.25, maxHoursPerWeek: 32, availability: avail(['wednesday','thursday','friday','saturday'], '16:00', '22:30'), skillLevel: 3, hireDate: '2024-06-15', isMinor: false },
  { id: 's6', name: 'Carlos Mendez', roles: ['server', 'host'], primaryRole: 'server', department: 'foh', hourlyRate: 5.50, overtimeRate: 8.25, maxHoursPerWeek: 38, availability: avail(['monday','tuesday','wednesday','saturday','sunday'], '10:00', '22:30'), skillLevel: 4, hireDate: '2023-07-01', isMinor: false, certifications: ['alcohol_service'] },
  { id: 's7', name: 'Emma Chen', roles: ['server'], primaryRole: 'server', department: 'foh', hourlyRate: 5.50, overtimeRate: 8.25, maxHoursPerWeek: 25, availability: avail(['thursday','friday','saturday','sunday'], '16:00', '22:30'), skillLevel: 3, hireDate: '2025-01-10', isMinor: false },
  // Bartenders (3)
  { id: 'b1', name: 'Marcus Williams', roles: ['bartender'], primaryRole: 'bartender', department: 'foh', hourlyRate: 7.25, overtimeRate: 10.88, maxHoursPerWeek: 40, availability: avail(['monday','tuesday','wednesday','thursday','friday'], '10:00', '22:30'), skillLevel: 5, hireDate: '2022-06-01', isMinor: false, certifications: ['alcohol_service'] },
  { id: 'b2', name: 'Sophie Martin', roles: ['bartender', 'server'], primaryRole: 'bartender', department: 'foh', hourlyRate: 7.25, overtimeRate: 10.88, maxHoursPerWeek: 38, availability: avail(['wednesday','thursday','friday','saturday','sunday'], '10:00', '22:30'), skillLevel: 4, hireDate: '2023-04-15', isMinor: false, certifications: ['alcohol_service'] },
  { id: 'b3', name: 'Dan Kowalski', roles: ['bartender', 'barback'], primaryRole: 'bartender', department: 'foh', hourlyRate: 7.25, overtimeRate: 10.88, maxHoursPerWeek: 35, availability: avail(['tuesday','thursday','friday','saturday','sunday'], '16:00', '22:30'), skillLevel: 3, hireDate: '2024-08-01', isMinor: false, certifications: ['alcohol_service'] },
  // Hosts (2)
  { id: 'h1', name: 'Olivia Park', roles: ['host'], primaryRole: 'host', department: 'foh', hourlyRate: 14.00, overtimeRate: 21.00, maxHoursPerWeek: 35, availability: avail(['monday','tuesday','wednesday','thursday','friday'], '10:00', '22:30'), skillLevel: 4, hireDate: '2024-02-01', isMinor: false },
  { id: 'h2', name: 'Noah Jackson', roles: ['host', 'busser'], primaryRole: 'host', department: 'foh', hourlyRate: 14.00, overtimeRate: 21.00, maxHoursPerWeek: 30, availability: avail(['thursday','friday','saturday','sunday'], '10:00', '22:30'), skillLevel: 3, hireDate: '2024-10-15', isMinor: false },
  // Bussers (2)
  { id: 'bu1', name: 'Leo Ramirez', roles: ['busser', 'runner'], primaryRole: 'busser', department: 'foh', hourlyRate: 12.00, overtimeRate: 18.00, maxHoursPerWeek: 36, availability: avail(['monday','tuesday','wednesday','friday','saturday'], '10:00', '22:30'), skillLevel: 4, hireDate: '2023-11-01', isMinor: false },
  { id: 'bu2', name: 'Zara Ali', roles: ['busser'], primaryRole: 'busser', department: 'foh', hourlyRate: 12.00, overtimeRate: 18.00, maxHoursPerWeek: 30, availability: avail(['wednesday','thursday','friday','saturday','sunday'], '16:00', '22:30'), skillLevel: 3, hireDate: '2024-05-20', isMinor: false },
  // Line Cooks (4)
  { id: 'lc1', name: 'David Kim', roles: ['line_cook'], primaryRole: 'line_cook', department: 'boh', hourlyRate: 18.00, overtimeRate: 27.00, maxHoursPerWeek: 45, availability: avail(['monday','tuesday','wednesday','thursday','friday'], '08:00', '23:00'), skillLevel: 5, hireDate: '2022-09-01', isMinor: false, certifications: ['food_safety'] },
  { id: 'lc2', name: 'Rachel Green', roles: ['line_cook'], primaryRole: 'line_cook', department: 'boh', hourlyRate: 17.00, overtimeRate: 25.50, maxHoursPerWeek: 42, availability: avail(['tuesday','wednesday','thursday','friday','saturday'], '08:00', '23:00'), skillLevel: 4, hireDate: '2023-02-15', isMinor: false, certifications: ['food_safety'] },
  { id: 'lc3', name: 'Andre Brown', roles: ['line_cook', 'prep_cook'], primaryRole: 'line_cook', department: 'boh', hourlyRate: 16.50, overtimeRate: 24.75, maxHoursPerWeek: 40, availability: avail(['monday','wednesday','friday','saturday','sunday'], '08:00', '23:00'), skillLevel: 4, hireDate: '2023-08-01', isMinor: false, certifications: ['food_safety'] },
  { id: 'lc4', name: 'Mei Lin', roles: ['line_cook'], primaryRole: 'line_cook', department: 'boh', hourlyRate: 16.00, overtimeRate: 24.00, maxHoursPerWeek: 38, availability: avail(['monday','tuesday','thursday','saturday','sunday'], '08:00', '23:00'), skillLevel: 3, hireDate: '2024-04-10', isMinor: false },
  // Prep Cooks (2)
  { id: 'pc1', name: 'Sam Rivera', roles: ['prep_cook'], primaryRole: 'prep_cook', department: 'boh', hourlyRate: 15.00, overtimeRate: 22.50, maxHoursPerWeek: 40, availability: avail(['monday','tuesday','wednesday','thursday','friday'], '07:00', '16:00'), skillLevel: 4, hireDate: '2023-05-01', isMinor: false, certifications: ['food_safety'] },
  { id: 'pc2', name: 'Tony Nguyen', roles: ['prep_cook', 'dishwasher'], primaryRole: 'prep_cook', department: 'boh', hourlyRate: 15.00, overtimeRate: 22.50, maxHoursPerWeek: 38, availability: avail(['monday','wednesday','thursday','friday','saturday'], '07:00', '16:00'), skillLevel: 3, hireDate: '2024-01-08', isMinor: false },
  // Sous Chef (1)
  { id: 'sc1', name: 'Chef Jordan Blake', roles: ['sous_chef', 'line_cook', 'expo'], primaryRole: 'sous_chef', department: 'boh', hourlyRate: 23.00, overtimeRate: 34.50, maxHoursPerWeek: 48, availability: avail(['monday','tuesday','wednesday','thursday','friday','saturday'], '08:00', '23:00'), skillLevel: 5, hireDate: '2022-03-01', isMinor: false, certifications: ['food_safety'] },
  // Dishwashers (2)
  { id: 'dw1', name: 'Luis Ortega', roles: ['dishwasher'], primaryRole: 'dishwasher', department: 'boh', hourlyRate: 14.00, overtimeRate: 21.00, maxHoursPerWeek: 40, availability: avail(['monday','tuesday','wednesday','thursday','friday'], '10:00', '23:00'), skillLevel: 3, hireDate: '2024-03-01', isMinor: false },
  { id: 'dw2', name: 'Grace Okafor', roles: ['dishwasher', 'busser'], primaryRole: 'dishwasher', department: 'boh', hourlyRate: 14.00, overtimeRate: 21.00, maxHoursPerWeek: 35, availability: avail(['wednesday','thursday','friday','saturday','sunday'], '10:00', '23:00'), skillLevel: 3, hireDate: '2024-07-15', isMinor: false },
  // Manager (1)
  { id: 'm1', name: 'Alex Whitfield', roles: ['manager'], primaryRole: 'manager', department: 'management', hourlyRate: 26.00, overtimeRate: 39.00, maxHoursPerWeek: 50, availability: avail(DAYS, '08:00', '23:00'), skillLevel: 5, hireDate: '2021-08-01', isMinor: false, certifications: ['alcohol_service', 'food_safety'] },
];

// ============================================================================
// Demo Config
// ============================================================================

export const DEMO_CONFIG: HelixoConfig = {
  restaurant: DEMO_RESTAURANT,
  forecast: DEFAULT_FORECAST_CONFIG,
  labor: {
    ...DEFAULT_LABOR_CONFIG,
    targets: DEMO_RESTAURANT.laborTargets,
    minimumStaffing: DEMO_RESTAURANT.minimumStaffing,
  },
  scheduling: DEFAULT_SCHEDULING_CONFIG,
  paceMonitor: DEFAULT_PACE_MONITOR_CONFIG,
};

// ============================================================================
// Historical Data Generator
// ============================================================================

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function gaussianVariance(rand: () => number, mean: number, pct: number): number {
  // Box-Muller for natural-feeling variance
  const u1 = rand();
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
  return mean * (1 + z * pct);
}

/** Bell-curve weight peaking at `peakMinute` within the service window */
function bellWeight(minute: number, peakMinute: number, spread: number): number {
  const x = (minute - peakMinute) / spread;
  return Math.exp(-0.5 * x * x);
}

function buildMenuMix(totalSales: number, period: MealPeriod): MenuMixEntry[] {
  const ratios = MENU_MIX_RATIOS[period];
  return MENU_CATEGORIES.map(cat => {
    const amt = totalSales * ratios[cat];
    return {
      category: cat,
      salesAmount: Math.round(amt * 100) / 100,
      quantity: Math.round(amt / (cat === 'entrees' ? 22 : cat === 'alcohol' ? 12 : 8)),
      percentOfTotal: ratios[cat],
    };
  });
}

/** Revenue targets by day type and meal period */
const REVENUE_TARGETS: Record<'weekday' | 'weekend', Record<MealPeriod, [number, number]>> = {
  weekday: {
    breakfast: [0, 0], brunch: [0, 0], lunch: [3000, 5000],
    afternoon: [0, 0], dinner: [8000, 12000], late_night: [0, 0],
  },
  weekend: {
    breakfast: [0, 0], brunch: [5000, 8000], lunch: [0, 0],
    afternoon: [0, 0], dinner: [14000, 18000], late_night: [0, 0],
  },
};

/** Peak times in minutes-from-midnight for the bell curve center */
const PEAK_MINUTES: Record<MealPeriod, number> = {
  breakfast: 8 * 60 + 30,
  brunch: 11 * 60 + 30,
  lunch: 12 * 60 + 30,
  afternoon: 15 * 60,
  dinner: 19 * 60,
  late_night: 22 * 60 + 30,
};

function dateToDayOfWeek(date: string): DayOfWeek {
  const d = new Date(date + 'T12:00:00Z');
  const js = d.getUTCDay();
  return DAYS[(js + 6) % 7];
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function getWindowsForDay(dow: DayOfWeek): ServiceWindow[] {
  return DEMO_RESTAURANT.operatingHours[dow];
}

export function generateDemoHistory(weeks: number): HistoricalSalesRecord[] {
  const records: HistoricalSalesRecord[] = [];
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setUTCDate(startDate.getUTCDate() - weeks * 7);
  const rand = seededRandom(42);

  for (let dayOffset = 0; dayOffset < weeks * 7; dayOffset++) {
    const dateObj = new Date(startDate);
    dateObj.setUTCDate(dateObj.getUTCDate() + dayOffset);
    const dateStr = dateObj.toISOString().slice(0, 10);
    const dow = dateToDayOfWeek(dateStr);
    const isWeekend = WEEKENDS.includes(dow);
    const dayType = isWeekend ? 'weekend' : 'weekday';
    const windows = getWindowsForDay(dow);

    for (const window of windows) {
      const mp = window.period;
      const [lo, hi] = REVENUE_TARGETS[dayType][mp];
      if (lo === 0 && hi === 0) continue;

      const baseSales = gaussianVariance(rand, (lo + hi) / 2, 0.15);
      const totalSales = Math.max(lo * 0.6, baseSales);
      const avgCheck = DEMO_RESTAURANT.avgCheckSize[mp];
      const totalCovers = Math.round(totalSales / avgCheck);

      // Distribute across 15-minute intervals using bell curve
      const openMin = timeToMin(window.open);
      const closeMin = timeToMin(window.close);
      const peakMin = PEAK_MINUTES[mp];
      const spread = (closeMin - openMin) * 0.3;

      // Calculate weights for all intervals
      const intervalCount = Math.ceil((closeMin - openMin) / 15);
      const weights: number[] = [];
      for (let i = 0; i < intervalCount; i++) {
        const mid = openMin + i * 15 + 7.5;
        weights.push(bellWeight(mid, peakMin, spread));
      }
      const weightSum = weights.reduce((a, b) => a + b, 0);

      for (let i = 0; i < intervalCount; i++) {
        const iStart = openMin + i * 15;
        const iEnd = Math.min(iStart + 15, closeMin);
        const share = weights[i] / weightSum;
        const intervalSales = totalSales * share;
        const intervalCovers = Math.max(1, Math.round(totalCovers * share));

        // Add micro-variance per interval
        const jitteredSales = Math.max(0, intervalSales * (0.85 + rand() * 0.30));
        const netSales = Math.round(jitteredSales * 100) / 100;
        const grossSales = Math.round(netSales * 1.08 * 100) / 100;

        records.push({
          date: dateStr,
          dayOfWeek: dow,
          mealPeriod: mp,
          intervalStart: minToTime(iStart),
          intervalEnd: minToTime(iEnd),
          netSales,
          grossSales,
          covers: intervalCovers,
          checkCount: intervalCovers,
          avgCheck: intervalCovers > 0 ? Math.round((netSales / intervalCovers) * 100) / 100 : 0,
          menuMix: buildMenuMix(netSales, mp),
        });
      }
    }
  }
  return records;
}

// ============================================================================
// Helper Functions for Demo UI
// ============================================================================

let cachedHistory: HistoricalSalesRecord[] | null = null;

function getHistory(): HistoricalSalesRecord[] {
  if (!cachedHistory) {
    cachedHistory = generateDemoHistory(8);
  }
  return cachedHistory;
}

export function getDemoForecast(date: string): DailyForecast {
  const engine = new ForecastEngine(DEMO_RESTAURANT, DEMO_CONFIG.forecast);
  return engine.generateDailyForecast(date, getHistory());
}

export function getDemoLaborPlan(date: string): DailyLaborPlan {
  const forecast = getDemoForecast(date);
  const engine = new LaborEngine(DEMO_RESTAURANT, DEMO_CONFIG.labor);
  return engine.generateDailyLaborPlan(forecast);
}

export function getDemoWeeklySchedule(weekStart: string): WeeklySchedule {
  const laborPlans: DailyLaborPlan[] = [];
  for (let i = 0; i < 7; i++) {
    laborPlans.push(getDemoLaborPlan(addDays(weekStart, i)));
  }
  const engine = new SchedulerEngine(DEMO_RESTAURANT, DEMO_CONFIG.scheduling);
  return engine.generateWeeklySchedule(weekStart, laborPlans, DEMO_STAFF);
}

// ============================================================================
// Time helpers (local to this module)
// ============================================================================

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
