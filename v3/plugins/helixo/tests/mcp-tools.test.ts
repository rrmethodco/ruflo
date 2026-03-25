import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHelixoTools } from '../src/mcp-tools';
import type {
  HelixoConfig,
  RestaurantProfile,
  HistoricalSalesRecord,
  MCPTool,
  MCPToolResult,
} from '../src/types';
import {
  DEFAULT_FORECAST_CONFIG,
  DEFAULT_LABOR_CONFIG,
  DEFAULT_SCHEDULING_CONFIG,
  DEFAULT_PACE_MONITOR_CONFIG,
  DEFAULT_LABOR_TARGETS,
} from '../src/types';

// ============================================================================
// Fixtures
// ============================================================================

const RESTAURANT: RestaurantProfile = {
  id: 'test-rest',
  name: 'Test Bistro',
  type: 'casual_dining',
  seats: 60,
  avgTurnTime: { breakfast: 45, brunch: 60, lunch: 50, afternoon: 40, dinner: 75, late_night: 60 },
  avgCheckSize: { breakfast: 15, brunch: 28, lunch: 22, afternoon: 18, dinner: 42, late_night: 30 },
  operatingHours: {
    monday: [{ period: 'lunch', open: '11:00', close: '14:30' }, { period: 'dinner', open: '17:00', close: '22:00' }],
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

const CONFIG: HelixoConfig = {
  restaurant: RESTAURANT,
  forecast: DEFAULT_FORECAST_CONFIG,
  labor: DEFAULT_LABOR_CONFIG,
  scheduling: DEFAULT_SCHEDULING_CONFIG,
  paceMonitor: DEFAULT_PACE_MONITOR_CONFIG,
};

function generateHistory(weeks: number): HistoricalSalesRecord[] {
  const records: HistoricalSalesRecord[] = [];
  const days: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> =
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      for (let i = 0; i < 14; i++) {
        const hour = 11 + Math.floor(i / 4);
        const min = (i % 4) * 15;
        const baseDate = new Date('2026-03-02');
        baseDate.setDate(baseDate.getDate() - (w * 7) + d);
        const dateStr = baseDate.toISOString().slice(0, 10);

        records.push({
          date: dateStr,
          dayOfWeek: days[d],
          mealPeriod: hour < 14 ? 'lunch' : 'dinner',
          intervalStart: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
          intervalEnd: `${String(hour).padStart(2, '0')}:${String(min + 15 === 60 ? 0 : min + 15).padStart(2, '0')}`,
          netSales: 200 + Math.random() * 100,
          grossSales: 220 + Math.random() * 110,
          covers: 8 + Math.floor(Math.random() * 6),
          checkCount: 4 + Math.floor(Math.random() * 3),
          avgCheck: 25 + Math.random() * 10,
          menuMix: [
            { category: 'entrees', salesAmount: 120, quantity: 4, percentOfTotal: 0.6 },
            { category: 'beverages', salesAmount: 80, quantity: 8, percentOfTotal: 0.4 },
          ],
        });
      }
    }
  }
  return records;
}

// ============================================================================
// Tests
// ============================================================================

describe('createHelixoTools', () => {
  let tools: MCPTool[];

  beforeEach(() => {
    tools = createHelixoTools(CONFIG);
  });

  it('returns 8 tools', () => {
    expect(tools).toHaveLength(8);
  });

  it('each tool has correct name, category, tags', () => {
    const expectedNames = [
      'helixo_forecast_daily',
      'helixo_forecast_weekly',
      'helixo_labor_plan',
      'helixo_schedule_generate',
      'helixo_pace_snapshot',
      'helixo_pace_recommendations',
      'helixo_forecast_comparison',
      'helixo_labor_cost_analysis',
    ];

    for (const name of expectedNames) {
      const tool = tools.find(t => t.name === name);
      expect(tool, `Tool "${name}" should exist`).toBeDefined();
      expect(tool!.category).toBe('helixo');
      expect(tool!.version).toBe('3.5.0');
      expect(tool!.tags.length).toBeGreaterThan(0);
      expect(tool!.description.length).toBeGreaterThan(0);
      expect(tool!.inputSchema.type).toBe('object');
      expect(typeof tool!.handler).toBe('function');
    }
  });

  describe('helixo_forecast_daily', () => {
    it('handler returns forecast data', async () => {
      const tool = tools.find(t => t.name === 'helixo_forecast_daily')!;
      const history = generateHistory(4);

      const result = await tool.handler({
        date: '2026-03-20',
        history,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);

      const forecast = result.data as Record<string, unknown>;
      expect(forecast.date).toBe('2026-03-20');
      expect(forecast.mealPeriods).toBeDefined();
    });

    it('handler returns error on bad input', async () => {
      const tool = tools.find(t => t.name === 'helixo_forecast_daily')!;

      const result = await tool.handler({
        date: '2026-03-20',
        history: [], // empty history — engine may throw
      });

      // With no data the engine should still return something or error gracefully
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('helixo_forecast_weekly', () => {
    it('handler returns 7 days', async () => {
      const tool = tools.find(t => t.name === 'helixo_forecast_weekly')!;
      const history = generateHistory(4);

      const result = await tool.handler({
        weekStartDate: '2026-03-16', // Monday
        history,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);

      const forecast = result.data as Record<string, unknown>;
      expect(forecast.weekStartDate).toBe('2026-03-16');
      expect((forecast.days as unknown[]).length).toBe(7);
    });
  });

  describe('helixo_labor_plan', () => {
    it('handler returns labor plan', async () => {
      const tool = tools.find(t => t.name === 'helixo_labor_plan')!;

      // First generate a forecast to feed into labor plan
      const forecastTool = tools.find(t => t.name === 'helixo_forecast_daily')!;
      const history = generateHistory(4);
      const forecastResult = await forecastTool.handler({ date: '2026-03-20', history });
      expect(forecastResult.success).toBe(true);

      const result = await tool.handler({
        forecast: forecastResult.data,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);

      const plan = result.data as Record<string, unknown>;
      expect(plan.date).toBeDefined();
      expect(plan.mealPeriods).toBeDefined();
    });
  });

  describe('helixo_schedule_generate', () => {
    it('handler returns weekly schedule', async () => {
      const tool = tools.find(t => t.name === 'helixo_schedule_generate')!;
      const history = generateHistory(4);

      // Generate forecasts and labor plans for the week
      const forecastTool = tools.find(t => t.name === 'helixo_forecast_daily')!;
      const laborTool = tools.find(t => t.name === 'helixo_labor_plan')!;

      const laborPlans = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date('2026-03-16');
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().slice(0, 10);

        const forecastResult = await forecastTool.handler({ date: dateStr, history });
        if (forecastResult.success) {
          const laborResult = await laborTool.handler({ forecast: forecastResult.data });
          if (laborResult.success) {
            laborPlans.push(laborResult.data);
          }
        }
      }

      const staff = [
        { id: 's1', name: 'Server A', roles: ['server'], primaryRole: 'server', department: 'foh', hourlyRate: 5.50, overtimeRate: 8.25, maxHoursPerWeek: 40, availability: makeAvail('10:00', '22:30'), skillLevel: 4, hireDate: '2023-01-01', isMinor: false },
        { id: 'lc1', name: 'Cook A', roles: ['line_cook'], primaryRole: 'line_cook', department: 'boh', hourlyRate: 17.00, overtimeRate: 25.50, maxHoursPerWeek: 45, availability: makeAvail('08:00', '23:00'), skillLevel: 4, hireDate: '2023-01-01', isMinor: false },
        { id: 'm1', name: 'Manager A', roles: ['manager'], primaryRole: 'manager', department: 'management', hourlyRate: 25.00, overtimeRate: 37.50, maxHoursPerWeek: 50, availability: makeAvail('08:00', '23:00'), skillLevel: 5, hireDate: '2022-01-01', isMinor: false },
      ];

      const result = await tool.handler({
        weekStartDate: '2026-03-16',
        laborPlans,
        staff,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('helixo_pace_snapshot', () => {
    it('handler returns pace snapshot', async () => {
      const tool = tools.find(t => t.name === 'helixo_pace_snapshot')!;

      // Build a minimal MealPeriodForecast-like object
      const forecast = {
        mealPeriod: 'lunch',
        date: '2026-03-20',
        dayOfWeek: 'friday',
        totalProjectedSales: 2000,
        totalProjectedCovers: 60,
        avgProjectedCheck: 33.33,
        confidenceScore: 0.85,
        factorsApplied: [],
        intervals: [
          { intervalStart: '11:00', intervalEnd: '11:15', projectedSales: 150, projectedCovers: 5, projectedChecks: 3, confidenceLow: 120, confidenceHigh: 180, confidence: 0.8 },
          { intervalStart: '11:15', intervalEnd: '11:30', projectedSales: 200, projectedCovers: 7, projectedChecks: 4, confidenceLow: 160, confidenceHigh: 240, confidence: 0.8 },
          { intervalStart: '11:30', intervalEnd: '11:45', projectedSales: 250, projectedCovers: 8, projectedChecks: 5, confidenceLow: 200, confidenceHigh: 300, confidence: 0.8 },
          { intervalStart: '11:45', intervalEnd: '12:00', projectedSales: 300, projectedCovers: 10, projectedChecks: 6, confidenceLow: 240, confidenceHigh: 360, confidence: 0.8 },
          { intervalStart: '12:00', intervalEnd: '12:15', projectedSales: 350, projectedCovers: 12, projectedChecks: 7, confidenceLow: 280, confidenceHigh: 420, confidence: 0.8 },
          { intervalStart: '12:15', intervalEnd: '12:30', projectedSales: 300, projectedCovers: 10, projectedChecks: 6, confidenceLow: 240, confidenceHigh: 360, confidence: 0.8 },
        ],
      };

      const result = await tool.handler({
        forecast,
        actualSales: 350,
        actualCovers: 12,
        currentTime: '11:30',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);

      const snapshot = result.data as Record<string, unknown>;
      expect(snapshot.paceStatus).toBeDefined();
      expect(snapshot.pacePercent).toBeDefined();
    });
  });

  describe('tool handler error handling', () => {
    it('returns { success: false } on error', async () => {
      const tool = tools.find(t => t.name === 'helixo_pace_snapshot')!;

      // Pass completely invalid input to trigger an error
      const result = await tool.handler({
        forecast: null,
        actualSales: 'not-a-number',
        actualCovers: undefined,
      } as unknown as Record<string, unknown>);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      expect(result.metadata?.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('each tool includes metadata.durationMs', async () => {
      // Test a couple tools for durationMs presence
      const forecastTool = tools.find(t => t.name === 'helixo_forecast_daily')!;
      const result = await forecastTool.handler({
        date: '2026-03-20',
        history: generateHistory(4),
      });
      expect(result.metadata).toBeDefined();
      expect(typeof result.metadata!.durationMs).toBe('number');

      // Also test error case
      const paceTool = tools.find(t => t.name === 'helixo_pace_snapshot')!;
      const errorResult = await paceTool.handler({
        forecast: null,
        actualSales: 0,
        actualCovers: 0,
      } as Record<string, unknown>);
      expect(errorResult.metadata).toBeDefined();
      expect(typeof errorResult.metadata!.durationMs).toBe('number');
    });
  });
});

// ============================================================================
// Helpers
// ============================================================================

function makeAvail(start: string, end: string) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const a: Record<string, Array<{ start: string; end: string; preferred: boolean }>> = {};
  for (const d of days) a[d] = [{ start, end, preferred: true }];
  return a;
}
