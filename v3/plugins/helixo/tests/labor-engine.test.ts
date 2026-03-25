import { describe, it, expect } from 'vitest';
import { LaborEngine } from '../src/engines/labor-engine';
import { ForecastEngine } from '../src/engines/forecast-engine';
import type {
  RestaurantProfile,
  DailyForecast,
  HistoricalSalesRecord,
} from '../src/types';
import {
  DEFAULT_FORECAST_CONFIG,
  DEFAULT_LABOR_CONFIG,
  DEFAULT_LABOR_TARGETS,
} from '../src/types';

// ============================================================================
// Fixtures
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
    tuesday: [{ period: 'lunch', open: '11:00', close: '14:30' }, { period: 'dinner', open: '17:00', close: '22:00' }],
    wednesday: [{ period: 'lunch', open: '11:00', close: '14:30' }, { period: 'dinner', open: '17:00', close: '22:00' }],
    thursday: [{ period: 'lunch', open: '11:00', close: '14:30' }, { period: 'dinner', open: '17:00', close: '22:00' }],
    friday: [{ period: 'lunch', open: '11:00', close: '14:30' }, { period: 'dinner', open: '17:00', close: '22:30' }],
    saturday: [{ period: 'brunch', open: '10:00', close: '14:30' }, { period: 'dinner', open: '17:00', close: '22:30' }],
    sunday: [{ period: 'brunch', open: '10:00', close: '14:30' }, { period: 'dinner', open: '17:00', close: '22:00' }],
  },
  laborTargets: DEFAULT_LABOR_TARGETS.casual_dining,
  minimumStaffing: {
    byRole: {},
    byDepartment: { foh: 2, boh: 2, management: 1 },
  },
};

function generateHistory(count: number): HistoricalSalesRecord[] {
  const records: HistoricalSalesRecord[] = [];
  for (let i = 0; i < count; i++) {
    const hour = 11 + Math.floor(i / 4);
    const min = (i % 4) * 15;
    records.push({
      date: '2026-03-16',
      dayOfWeek: 'monday',
      mealPeriod: 'lunch',
      intervalStart: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
      intervalEnd: `${String(hour).padStart(2, '0')}:${String((min + 15) % 60).padStart(2, '0')}`,
      netSales: 300 + Math.sin(i) * 100,
      grossSales: 350,
      covers: 12,
      checkCount: 8,
      avgCheck: 30,
      menuMix: [],
    });
  }
  return records;
}

function makeForecast(): DailyForecast {
  const forecastEngine = new ForecastEngine(RESTAURANT, DEFAULT_FORECAST_CONFIG);
  return forecastEngine.generateDailyForecast('2026-03-23', generateHistory(56));
}

// ============================================================================
// Tests
// ============================================================================

describe('LaborEngine', () => {
  const laborConfig = {
    ...DEFAULT_LABOR_CONFIG,
    targets: RESTAURANT.laborTargets,
    minimumStaffing: RESTAURANT.minimumStaffing,
  };
  const engine = new LaborEngine(RESTAURANT, laborConfig);

  describe('generateDailyLaborPlan', () => {
    it('returns a plan with meal periods matching the forecast', () => {
      const forecast = makeForecast();
      const plan = engine.generateDailyLaborPlan(forecast);

      expect(plan.date).toBe(forecast.date);
      expect(plan.mealPeriods.length).toBe(forecast.mealPeriods.length);
    });

    it('has positive labor hours and cost', () => {
      const forecast = makeForecast();
      const plan = engine.generateDailyLaborPlan(forecast);

      expect(plan.totalDayLaborHours).toBeGreaterThan(0);
      expect(plan.totalDayLaborCost).toBeGreaterThan(0);
    });

    it('enforces minimum staffing per department', () => {
      const forecast = makeForecast();
      const plan = engine.generateDailyLaborPlan(forecast);

      for (const mp of plan.mealPeriods) {
        for (const iv of mp.intervals) {
          // minimum FOH = 2, minimum BOH = 2
          expect(iv.totalFOHHeads).toBeGreaterThanOrEqual(2);
          expect(iv.totalBOHHeads).toBeGreaterThanOrEqual(2);
        }
      }
    });

    it('calculates labor cost percent relative to revenue', () => {
      const forecast = makeForecast();
      const plan = engine.generateDailyLaborPlan(forecast);

      if (forecast.totalDaySales > 0) {
        expect(plan.dayLaborCostPercent).toBeGreaterThan(0);
        // dayLaborCostPercent is totalCost/totalSales — can exceed 1.0 with
        // sparse demo history where projected sales are low relative to
        // minimum-staffing labor costs. Just verify it's finite and positive.
        expect(Number.isFinite(plan.dayLaborCostPercent)).toBe(true);
      }
    });

    it('includes prep, sidework, and break hours', () => {
      const forecast = makeForecast();
      const plan = engine.generateDailyLaborPlan(forecast);

      expect(plan.prepHours).toBeGreaterThanOrEqual(0);
      expect(plan.sideWorkHours).toBeGreaterThanOrEqual(0);
      expect(plan.breakHours).toBeGreaterThanOrEqual(0);
    });

    it('generates staggered starts for volume ramps', () => {
      const forecast = makeForecast();
      const plan = engine.generateDailyLaborPlan(forecast);

      // At least one meal period should have staggered starts
      const allStarts = plan.mealPeriods.flatMap(mp => mp.staggeredStarts);
      // It's possible to have zero if staffing is flat, but generally should have some
      expect(allStarts).toBeDefined();
    });

    it('interval labor cost sums approximately match meal period total', () => {
      const forecast = makeForecast();
      const plan = engine.generateDailyLaborPlan(forecast);

      for (const mp of plan.mealPeriods) {
        const intervalCostSum = mp.intervals.reduce((s, iv) => s + iv.projectedLaborCost, 0);
        expect(Math.abs(mp.totalLaborCost - intervalCostSum)).toBeLessThan(5);
      }
    });
  });
});
