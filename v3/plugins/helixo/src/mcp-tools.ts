/**
 * Helixo MCP Tools
 *
 * Exposes Helixo engines as MCP tools for agent consumption.
 * 8 tools covering forecast, labor, scheduling, and pace monitoring.
 */

import {
  type HelixoConfig,
  type MCPTool,
  type MCPToolResult,
  type ToolContext,
  ForecastRequestSchema,
  LaborPlanRequestSchema,
  PaceUpdateSchema,
  ScheduleRequestSchema,
} from './types.js';
import { ForecastEngine } from './engines/forecast-engine.js';
import { LaborEngine } from './engines/labor-engine.js';
import { SchedulerEngine } from './engines/scheduler-engine.js';
import { PaceMonitor } from './engines/pace-monitor.js';

// ============================================================================
// Tool Definitions
// ============================================================================

export function createHelixoTools(config: HelixoConfig): MCPTool[] {
  return [
    createForecastDailyTool(config),
    createForecastWeeklyTool(config),
    createLaborPlanTool(config),
    createScheduleTool(config),
    createPaceSnapshotTool(config),
    createPaceRecommendationsTool(config),
    createForecastComparisonTool(config),
    createLaborCostAnalysisTool(config),
  ];
}

// --------------------------------------------------------------------------
// Forecast Tools
// --------------------------------------------------------------------------

function createForecastDailyTool(config: HelixoConfig): MCPTool {
  const engine = new ForecastEngine(config.restaurant, config.forecast);

  return {
    name: 'helixo_forecast_daily',
    description: 'Generate a daily revenue forecast with 15-minute interval granularity. Uses multi-variable regression combining historical trends, day-of-week patterns, weather, reservations, and momentum.',
    category: 'helixo',
    version: '3.5.0',
    tags: ['forecast', 'revenue', 'restaurant'],
    cacheable: true,
    cacheTTL: 300_000,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date (YYYY-MM-DD)' },
        history: { type: 'array', description: 'Historical sales records' },
        weather: { type: 'object', description: 'Weather condition (optional)' },
        holidays: { type: 'array', description: 'Holiday dates (optional)' },
      },
      required: ['date', 'history'],
    },
    handler: async (input: Record<string, unknown>, ctx?: ToolContext): Promise<MCPToolResult> => {
      const start = Date.now();
      try {
        const holidays = input.holidays ? new Set(input.holidays as string[]) : undefined;
        const forecast = engine.generateDailyForecast(
          input.date as string,
          input.history as never[],
          input.weather as never,
          undefined,
          holidays,
        );
        return {
          success: true,
          data: forecast,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        return { success: false, error: String(err), metadata: { durationMs: Date.now() - start } };
      }
    },
  };
}

function createForecastWeeklyTool(config: HelixoConfig): MCPTool {
  const engine = new ForecastEngine(config.restaurant, config.forecast);

  return {
    name: 'helixo_forecast_weekly',
    description: 'Generate a full 7-day revenue forecast with comp percentages to last week and last year.',
    category: 'helixo',
    version: '3.5.0',
    tags: ['forecast', 'revenue', 'weekly'],
    cacheable: true,
    cacheTTL: 600_000,
    inputSchema: {
      type: 'object',
      properties: {
        weekStartDate: { type: 'string', description: 'Monday of the target week (YYYY-MM-DD)' },
        history: { type: 'array', description: 'Historical sales records' },
      },
      required: ['weekStartDate', 'history'],
    },
    handler: async (input: Record<string, unknown>): Promise<MCPToolResult> => {
      const start = Date.now();
      try {
        const forecast = engine.generateWeeklyForecast(
          input.weekStartDate as string,
          input.history as never[],
        );
        return {
          success: true,
          data: forecast,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        return { success: false, error: String(err), metadata: { durationMs: Date.now() - start } };
      }
    },
  };
}

// --------------------------------------------------------------------------
// Labor Tools
// --------------------------------------------------------------------------

function createLaborPlanTool(config: HelixoConfig): MCPTool {
  const engine = new LaborEngine(config.restaurant, config.labor);

  return {
    name: 'helixo_labor_plan',
    description: 'Generate an optimized daily labor plan from a revenue forecast. Outputs staffing by role per 15-minute interval with staggered starts and labor cost projections.',
    category: 'helixo',
    version: '3.5.0',
    tags: ['labor', 'staffing', 'optimization'],
    cacheable: true,
    cacheTTL: 300_000,
    inputSchema: {
      type: 'object',
      properties: {
        forecast: { type: 'object', description: 'DailyForecast object from forecast engine' },
      },
      required: ['forecast'],
    },
    handler: async (input: Record<string, unknown>): Promise<MCPToolResult> => {
      const start = Date.now();
      try {
        const plan = engine.generateDailyLaborPlan(input.forecast as never);
        return {
          success: true,
          data: plan,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        return { success: false, error: String(err), metadata: { durationMs: Date.now() - start } };
      }
    },
  };
}

function createLaborCostAnalysisTool(config: HelixoConfig): MCPTool {
  const engine = new LaborEngine(config.restaurant, config.labor);

  return {
    name: 'helixo_labor_cost_analysis',
    description: 'Analyze labor cost vs revenue targets. Shows cost breakdown by department (FOH/BOH/Management) and identifies over/under-staffed intervals.',
    category: 'helixo',
    version: '3.5.0',
    tags: ['labor', 'cost', 'analysis'],
    cacheable: false,
    cacheTTL: 0,
    inputSchema: {
      type: 'object',
      properties: {
        forecast: { type: 'object', description: 'DailyForecast object' },
        targetLaborPercent: { type: 'number', description: 'Target labor cost as decimal (e.g., 0.28)' },
      },
      required: ['forecast'],
    },
    handler: async (input: Record<string, unknown>): Promise<MCPToolResult> => {
      const start = Date.now();
      try {
        const plan = engine.generateDailyLaborPlan(input.forecast as never);
        const target = (input.targetLaborPercent as number) ?? config.labor.targets.totalLaborPercent;
        const variance = plan.dayLaborCostPercent - target;

        return {
          success: true,
          data: {
            laborPlan: plan,
            analysis: {
              targetPercent: target,
              actualPercent: plan.dayLaborCostPercent,
              variance,
              status: Math.abs(variance) < 0.02 ? 'on_target' : variance > 0 ? 'over_budget' : 'under_budget',
              totalCost: plan.totalDayLaborCost,
              prepHours: plan.prepHours,
              sideWorkHours: plan.sideWorkHours,
              breakHours: plan.breakHours,
            },
          },
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        return { success: false, error: String(err), metadata: { durationMs: Date.now() - start } };
      }
    },
  };
}

// --------------------------------------------------------------------------
// Schedule Tools
// --------------------------------------------------------------------------

function createScheduleTool(config: HelixoConfig): MCPTool {
  const scheduler = new SchedulerEngine(config.restaurant, config.scheduling);

  return {
    name: 'helixo_schedule_generate',
    description: 'Auto-generate a weekly staff schedule from labor plans and employee availability. Handles overtime limits, minimum rest, skill matching, and coverage gap detection.',
    category: 'helixo',
    version: '3.5.0',
    tags: ['schedule', 'staffing', 'auto-scheduler'],
    cacheable: false,
    cacheTTL: 0,
    inputSchema: {
      type: 'object',
      properties: {
        weekStartDate: { type: 'string', description: 'Monday of the target week (YYYY-MM-DD)' },
        laborPlans: { type: 'array', description: 'Array of DailyLaborPlan objects (7 days)' },
        staff: { type: 'array', description: 'Array of StaffMember objects' },
      },
      required: ['weekStartDate', 'laborPlans', 'staff'],
    },
    handler: async (input: Record<string, unknown>): Promise<MCPToolResult> => {
      const start = Date.now();
      try {
        const schedule = scheduler.generateWeeklySchedule(
          input.weekStartDate as string,
          input.laborPlans as never[],
          input.staff as never[],
        );
        return {
          success: true,
          data: schedule,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        return { success: false, error: String(err), metadata: { durationMs: Date.now() - start } };
      }
    },
  };
}

// --------------------------------------------------------------------------
// Pace Tools
// --------------------------------------------------------------------------

function createPaceSnapshotTool(config: HelixoConfig): MCPTool {
  const monitor = new PaceMonitor(config.paceMonitor);

  return {
    name: 'helixo_pace_snapshot',
    description: 'Get a real-time pace snapshot comparing actual sales against forecast. Returns pace status, projected end-of-period sales, and staffing recommendations.',
    category: 'helixo',
    version: '3.5.0',
    tags: ['pace', 'real-time', 'monitoring'],
    cacheable: false,
    cacheTTL: 0,
    inputSchema: {
      type: 'object',
      properties: {
        forecast: { type: 'object', description: 'MealPeriodForecast for the current period' },
        actualSales: { type: 'number', description: 'Actual net sales so far' },
        actualCovers: { type: 'number', description: 'Actual covers so far' },
        currentTime: { type: 'string', description: 'Current time HH:mm (optional, defaults to now)' },
      },
      required: ['forecast', 'actualSales', 'actualCovers'],
    },
    handler: async (input: Record<string, unknown>): Promise<MCPToolResult> => {
      const start = Date.now();
      try {
        const snapshot = monitor.calculatePace(
          input.forecast as never,
          input.actualSales as number,
          input.actualCovers as number,
          input.currentTime as string | undefined,
        );
        return {
          success: true,
          data: snapshot,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        return { success: false, error: String(err), metadata: { durationMs: Date.now() - start } };
      }
    },
  };
}

function createPaceRecommendationsTool(config: HelixoConfig): MCPTool {
  const monitor = new PaceMonitor(config.paceMonitor);

  return {
    name: 'helixo_pace_recommendations',
    description: 'Get staffing adjustment recommendations based on current pace. Returns cut/call/extend/hold recommendations with urgency levels.',
    category: 'helixo',
    version: '3.5.0',
    tags: ['pace', 'recommendations', 'labor'],
    cacheable: false,
    cacheTTL: 0,
    inputSchema: {
      type: 'object',
      properties: {
        forecast: { type: 'object', description: 'MealPeriodForecast' },
        actualSales: { type: 'number', description: 'Actual net sales' },
        actualCovers: { type: 'number', description: 'Actual covers' },
      },
      required: ['forecast', 'actualSales', 'actualCovers'],
    },
    handler: async (input: Record<string, unknown>): Promise<MCPToolResult> => {
      const start = Date.now();
      try {
        const snapshot = monitor.calculatePace(
          input.forecast as never,
          input.actualSales as number,
          input.actualCovers as number,
        );
        return {
          success: true,
          data: {
            paceStatus: snapshot.paceStatus,
            pacePercent: snapshot.pacePercent,
            recommendations: snapshot.recommendations,
          },
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        return { success: false, error: String(err), metadata: { durationMs: Date.now() - start } };
      }
    },
  };
}

// --------------------------------------------------------------------------
// Comparison Tool
// --------------------------------------------------------------------------

function createForecastComparisonTool(config: HelixoConfig): MCPTool {
  const engine = new ForecastEngine(config.restaurant, config.forecast);

  return {
    name: 'helixo_forecast_comparison',
    description: 'Compare a forecast against historical comp periods. Shows same-week-last-year, trailing averages, and budget targets for review.',
    category: 'helixo',
    version: '3.5.0',
    tags: ['forecast', 'comparison', 'review'],
    cacheable: true,
    cacheTTL: 300_000,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Target date (YYYY-MM-DD)' },
        history: { type: 'array', description: 'Historical sales records (12+ months ideal)' },
        budgetTarget: { type: 'object', description: 'Budget target (optional)' },
      },
      required: ['date', 'history'],
    },
    handler: async (input: Record<string, unknown>): Promise<MCPToolResult> => {
      const start = Date.now();
      try {
        const forecast = engine.generateDailyForecast(
          input.date as string,
          input.history as never[],
        );

        return {
          success: true,
          data: {
            forecast,
            budgetTarget: input.budgetTarget ?? null,
          },
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        return { success: false, error: String(err), metadata: { durationMs: Date.now() - start } };
      }
    },
  };
}

export { createHelixoTools as default };
