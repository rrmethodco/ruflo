import { describe, it, expect } from 'vitest';
import { ForecastEngine } from '../src/engines/forecast-engine';
import type {
  RestaurantProfile,
  HistoricalSalesRecord,
  WeatherCondition,
  ResyReservationData,
  DayOfWeek,
  MealPeriod,
} from '../src/types';
import { DEFAULT_FORECAST_CONFIG, DEFAULT_LABOR_TARGETS } from '../src/types';

// ============================================================================
// Test Fixtures
// ============================================================================

const RESTAURANT: RestaurantProfile = {
  id: 'test-restaurant',
  name: 'Test Restaurant',
  type: 'casual_dining',
  seats: 80,
  avgTurnTime: { breakfast: 45, brunch: 60, lunch: 50, afternoon: 40, dinner: 75, late_night: 60 },
  avgCheckSize: { breakfast: 15, brunch: 28, lunch: 22, afternoon: 18, dinner: 42, late_night: 30 },
  operatingHours: {
    monday: [
      { period: 'lunch', open: '11:00', close: '14:30' },
      { period: 'dinner', open: '17:00', close: '22:00' },
    ],
    tuesday: [
      { period: 'lunch', open: '11:00', close: '14:30' },
      { period: 'dinner', open: '17:00', close: '22:00' },
    ],
    wednesday: [
      { period: 'lunch', open: '11:00', close: '14:30' },
      { period: 'dinner', open: '17:00', close: '22:00' },
    ],
    thursday: [
      { period: 'lunch', open: '11:00', close: '14:30' },
      { period: 'dinner', open: '17:00', close: '22:00' },
    ],
    friday: [
      { period: 'lunch', open: '11:00', close: '14:30' },
      { period: 'dinner', open: '17:00', close: '22:30' },
    ],
    saturday: [
      { period: 'brunch', open: '10:00', close: '14:30' },
      { period: 'dinner', open: '17:00', close: '22:30' },
    ],
    sunday: [
      { period: 'brunch', open: '10:00', close: '14:30' },
      { period: 'dinner', open: '17:00', close: '22:00' },
    ],
  },
  laborTargets: DEFAULT_LABOR_TARGETS.casual_dining,
  minimumStaffing: {
    byRole: {},
    byDepartment: { foh: 2, boh: 2, management: 1 },
  },
};

function makeHistoryRecord(overrides: Partial<HistoricalSalesRecord> = {}): HistoricalSalesRecord {
  return {
    date: '2026-03-17',
    dayOfWeek: 'monday',
    mealPeriod: 'lunch',
    intervalStart: '12:00',
    intervalEnd: '12:15',
    netSales: 350,
    grossSales: 378,
    covers: 14,
    checkCount: 10,
    avgCheck: 35,
    menuMix: [{ category: 'entrees', salesAmount: 200, quantity: 8, percentOfTotal: 0.57 }],
    ...overrides,
  };
}

function generateHistory(weeks: number, dow: DayOfWeek, mp: MealPeriod): HistoricalSalesRecord[] {
  const records: HistoricalSalesRecord[] = [];
  for (let w = 0; w < weeks; w++) {
    for (let interval = 0; interval < 14; interval++) {
      const hour = 11 + Math.floor(interval / 4);
      const min = (interval % 4) * 15;
      const start = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      const endMin = min + 15;
      const endHour = endMin >= 60 ? hour + 1 : hour;
      const end = `${String(endHour).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

      // Sales with slight week-over-week growth
      const baseSales = 250 + Math.sin(interval / 3) * 100;
      const sales = baseSales * (1 + w * 0.02);

      records.push(makeHistoryRecord({
        date: `2026-0${2 + Math.floor(w / 4)}-${String(10 + (w % 4) * 7).padStart(2, '0')}`,
        dayOfWeek: dow,
        mealPeriod: mp,
        intervalStart: start,
        intervalEnd: end,
        netSales: Math.round(sales * 100) / 100,
        covers: Math.round(sales / 25),
      }));
    }
  }
  return records;
}

// ============================================================================
// Tests
// ============================================================================

describe('ForecastEngine', () => {
  const engine = new ForecastEngine(RESTAURANT, DEFAULT_FORECAST_CONFIG);

  describe('generateDailyForecast', () => {
    it('returns a forecast with meal periods matching operating hours', () => {
      const history = generateHistory(6, 'monday', 'lunch');
      const forecast = engine.generateDailyForecast('2026-03-23', history);

      expect(forecast.date).toBe('2026-03-23');
      expect(forecast.dayOfWeek).toBe('monday');
      expect(forecast.mealPeriods.length).toBe(2); // lunch + dinner
      expect(forecast.totalDaySales).toBeGreaterThan(0);
      expect(forecast.totalDayCovers).toBeGreaterThan(0);
    });

    it('generates 15-minute intervals within each meal period', () => {
      const history = generateHistory(6, 'monday', 'lunch');
      const forecast = engine.generateDailyForecast('2026-03-23', history);
      const lunch = forecast.mealPeriods.find(mp => mp.mealPeriod === 'lunch');

      expect(lunch).toBeDefined();
      expect(lunch!.intervals.length).toBeGreaterThan(0);

      // All intervals should have positive sales (or zero if low data)
      for (const iv of lunch!.intervals) {
        expect(iv.projectedSales).toBeGreaterThanOrEqual(0);
        expect(iv.projectedCovers).toBeGreaterThanOrEqual(0);
        expect(iv.confidence).toBeGreaterThanOrEqual(0);
        expect(iv.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('sums interval sales to match meal period totals', () => {
      const history = generateHistory(6, 'monday', 'lunch');
      const forecast = engine.generateDailyForecast('2026-03-23', history);

      for (const mp of forecast.mealPeriods) {
        const intervalSum = mp.intervals.reduce((s, iv) => s + iv.projectedSales, 0);
        expect(Math.abs(mp.totalProjectedSales - intervalSum)).toBeLessThan(1);
      }
    });

    it('applies weather factor reducing sales in heavy rain', () => {
      const history = generateHistory(6, 'monday', 'lunch');
      const clearForecast = engine.generateDailyForecast('2026-03-23', history);
      const rainForecast = engine.generateDailyForecast('2026-03-23', history, {
        tempF: 55,
        precipitation: 'heavy_rain',
        description: 'Heavy rain',
      });

      // Rain should reduce forecast
      expect(rainForecast.totalDaySales).toBeLessThan(clearForecast.totalDaySales);
    });

    it('returns zero forecast with empty history', () => {
      const forecast = engine.generateDailyForecast('2026-03-23', []);
      expect(forecast.totalDaySales).toBe(0);
      expect(forecast.totalDayCovers).toBe(0);
    });

    it('marks holiday flag when holiday set provided', () => {
      const history = generateHistory(6, 'monday', 'lunch');
      const holidays = new Set(['2026-03-23']);
      const forecast = engine.generateDailyForecast('2026-03-23', history, undefined, undefined, holidays);

      expect(forecast.isHoliday).toBe(true);
      // Holiday should boost sales
      const normalForecast = engine.generateDailyForecast('2026-03-23', history);
      expect(forecast.totalDaySales).toBeGreaterThan(normalForecast.totalDaySales);
    });
  });

  describe('generateWeeklyForecast', () => {
    it('returns 7 days of forecasts', () => {
      const history = generateHistory(6, 'monday', 'lunch');
      const weekly = engine.generateWeeklyForecast('2026-03-23', history);

      expect(weekly.days.length).toBe(7);
      expect(weekly.weekStartDate).toBe('2026-03-23');
      expect(weekly.weekEndDate).toBe('2026-03-29');
      expect(weekly.totalWeekSales).toBeGreaterThanOrEqual(0);
    });

    it('weekly total equals sum of daily totals', () => {
      const history = generateHistory(6, 'monday', 'lunch');
      const weekly = engine.generateWeeklyForecast('2026-03-23', history);

      const sumDays = weekly.days.reduce((s, d) => s + d.totalDaySales, 0);
      expect(Math.abs(weekly.totalWeekSales - sumDays)).toBeLessThan(1);
    });
  });
});
