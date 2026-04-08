import { describe, it, expect } from 'vitest';
import { PaceMonitor } from '../src/engines/pace-monitor';
import type { MealPeriodForecast, IntervalForecast } from '../src/types';
import { DEFAULT_PACE_MONITOR_CONFIG } from '../src/types';

// ============================================================================
// Fixtures
// ============================================================================

function makeIntervals(count: number, salesPerInterval: number): IntervalForecast[] {
  const intervals: IntervalForecast[] = [];
  for (let i = 0; i < count; i++) {
    const startHour = 17 + Math.floor((i * 15) / 60);
    const startMin = (i * 15) % 60;
    const endMin = startMin + 15;
    const endHour = endMin >= 60 ? startHour + 1 : startHour;

    intervals.push({
      intervalStart: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
      intervalEnd: `${String(endHour).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`,
      projectedSales: salesPerInterval,
      projectedCovers: Math.round(salesPerInterval / 40),
      projectedChecks: Math.round(salesPerInterval / 40),
      confidenceLow: salesPerInterval * 0.8,
      confidenceHigh: salesPerInterval * 1.2,
      confidence: 0.85,
    });
  }
  return intervals;
}

function makeForecast(overrides: Partial<MealPeriodForecast> = {}): MealPeriodForecast {
  const intervals = makeIntervals(20, 500); // 20 intervals x $500 = $10,000 total
  return {
    mealPeriod: 'dinner',
    date: '2026-03-25',
    dayOfWeek: 'wednesday',
    totalProjectedSales: intervals.reduce((s, iv) => s + iv.projectedSales, 0),
    totalProjectedCovers: intervals.reduce((s, iv) => s + iv.projectedCovers, 0),
    avgProjectedCheck: 40,
    intervals,
    confidenceScore: 0.85,
    factorsApplied: [],
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('PaceMonitor', () => {
  const monitor = new PaceMonitor(DEFAULT_PACE_MONITOR_CONFIG);

  describe('calculatePace', () => {
    it('returns on_pace when actual matches forecast', () => {
      const forecast = makeForecast();
      // Simulate 10 completed intervals, exactly on pace
      const expectedSalesSoFar = forecast.intervals.slice(0, 10).reduce((s, iv) => s + iv.projectedSales, 0);
      const expectedCoversSoFar = forecast.intervals.slice(0, 10).reduce((s, iv) => s + iv.projectedCovers, 0);

      const snapshot = monitor.calculatePace(
        forecast,
        expectedSalesSoFar,
        expectedCoversSoFar,
        forecast.intervals[10].intervalStart, // current = interval 11
      );

      expect(snapshot.paceStatus).toBe('on_pace');
      expect(snapshot.elapsedIntervals).toBe(10);
      expect(snapshot.remainingIntervals).toBe(10);
    });

    it('returns ahead when actual exceeds forecast', () => {
      const forecast = makeForecast();
      const expectedSalesSoFar = forecast.intervals.slice(0, 10).reduce((s, iv) => s + iv.projectedSales, 0);

      const snapshot = monitor.calculatePace(
        forecast,
        expectedSalesSoFar * 1.15, // 15% ahead
        80,
        forecast.intervals[10].intervalStart,
      );

      expect(snapshot.paceStatus).toBe('ahead');
      expect(snapshot.projectedSalesAtPace).toBeGreaterThan(forecast.totalProjectedSales);
    });

    it('returns behind when actual is below forecast', () => {
      const forecast = makeForecast();
      const expectedSalesSoFar = forecast.intervals.slice(0, 10).reduce((s, iv) => s + iv.projectedSales, 0);

      const snapshot = monitor.calculatePace(
        forecast,
        expectedSalesSoFar * 0.80, // 20% behind
        50,
        forecast.intervals[10].intervalStart,
      );

      expect(snapshot.paceStatus).toBe('behind');
      expect(snapshot.projectedSalesAtPace).toBeLessThan(forecast.totalProjectedSales);
    });

    it('returns critical_behind for severe shortfall', () => {
      const forecast = makeForecast();
      const expectedSalesSoFar = forecast.intervals.slice(0, 10).reduce((s, iv) => s + iv.projectedSales, 0);

      const snapshot = monitor.calculatePace(
        forecast,
        expectedSalesSoFar * 0.60, // 40% behind
        30,
        forecast.intervals[10].intervalStart,
      );

      expect(snapshot.paceStatus).toBe('critical_behind');
    });

    it('returns critical_ahead for significant surplus', () => {
      const forecast = makeForecast();
      const expectedSalesSoFar = forecast.intervals.slice(0, 10).reduce((s, iv) => s + iv.projectedSales, 0);

      const snapshot = monitor.calculatePace(
        forecast,
        expectedSalesSoFar * 1.35, // 35% ahead
        100,
        forecast.intervals[10].intervalStart,
      );

      expect(snapshot.paceStatus).toBe('critical_ahead');
    });

    it('generates recommendations for behind pace', () => {
      const forecast = makeForecast();
      const expectedSalesSoFar = forecast.intervals.slice(0, 10).reduce((s, iv) => s + iv.projectedSales, 0);

      const snapshot = monitor.calculatePace(
        forecast,
        expectedSalesSoFar * 0.70, // significantly behind
        40,
        forecast.intervals[10].intervalStart,
      );

      expect(snapshot.recommendations.length).toBeGreaterThan(0);
      const hasStaffAction = snapshot.recommendations.some(r =>
        r.type === 'cut_staff' || r.type === 'alert_manager'
      );
      expect(hasStaffAction).toBe(true);
    });

    it('generates recommendations for ahead pace', () => {
      const forecast = makeForecast();
      const expectedSalesSoFar = forecast.intervals.slice(0, 10).reduce((s, iv) => s + iv.projectedSales, 0);

      const snapshot = monitor.calculatePace(
        forecast,
        expectedSalesSoFar * 1.30, // well ahead
        95,
        forecast.intervals[10].intervalStart,
      );

      expect(snapshot.recommendations.length).toBeGreaterThan(0);
      const hasCallOrExtend = snapshot.recommendations.some(r =>
        r.type === 'call_staff' || r.type === 'extend_shift'
      );
      expect(hasCallOrExtend).toBe(true);
    });

    it('handles empty intervals gracefully', () => {
      const emptyForecast = makeForecast({ intervals: [], totalProjectedSales: 0, totalProjectedCovers: 0 });
      const snapshot = monitor.calculatePace(emptyForecast, 0, 0, '19:00');

      expect(snapshot.paceStatus).toBe('on_pace');
      expect(snapshot.intervalDetails.length).toBe(0);
    });

    it('classifies intervals as completed, current, and upcoming', () => {
      const forecast = makeForecast();
      const snapshot = monitor.calculatePace(
        forecast,
        3000,
        30,
        forecast.intervals[10].intervalStart,
      );

      const completed = snapshot.intervalDetails.filter(d => d.status === 'completed');
      const current = snapshot.intervalDetails.filter(d => d.status === 'current');
      const upcoming = snapshot.intervalDetails.filter(d => d.status === 'upcoming');

      expect(completed.length).toBe(10);
      expect(current.length).toBe(1);
      expect(upcoming.length).toBe(9);
    });

    it('provides hold_steady recommendation when on pace', () => {
      const forecast = makeForecast();
      const expectedSalesSoFar = forecast.intervals.slice(0, 10).reduce((s, iv) => s + iv.projectedSales, 0);

      const snapshot = monitor.calculatePace(
        forecast,
        expectedSalesSoFar,
        60,
        forecast.intervals[10].intervalStart,
      );

      const holdSteady = snapshot.recommendations.find(r => r.type === 'hold_steady');
      expect(holdSteady).toBeDefined();
    });
  });
});
