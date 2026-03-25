/**
 * Helixo - Restaurant Revenue Forecasting & Labor Optimization Plugin
 *
 * @module @claude-flow/plugin-helixo
 * @version 3.5.0-alpha.1
 *
 * Four engines:
 * 1. ForecastEngine  — Multi-variable regression revenue forecasting
 * 2. LaborEngine     — Constraint-based labor optimization
 * 3. SchedulerEngine — Auto-scheduling with shift generation
 * 4. PaceMonitor     — Real-time service pace tracking
 *
 * Two integrations:
 * - ToastAdapter — Toast POS sales/labor data
 * - ResyAdapter  — RESY reservation pacing
 *
 * 8 MCP tools for agent consumption.
 */

import type { HelixoConfig, Logger, MCPTool } from './types.js';
import { ForecastEngine } from './engines/forecast-engine.js';
import { LaborEngine } from './engines/labor-engine.js';
import { SchedulerEngine } from './engines/scheduler-engine.js';
import { PaceMonitor } from './engines/pace-monitor.js';
import { ToastAdapter } from './integrations/toast-adapter.js';
import { ResyAdapter } from './integrations/resy-adapter.js';
import { createHelixoTools } from './mcp-tools.js';

// ============================================================================
// Plugin Class
// ============================================================================

export class HelixoPlugin {
  readonly name = '@claude-flow/plugin-helixo';
  readonly version = '3.5.0-alpha.1';
  readonly description = 'Restaurant revenue forecasting & labor optimization';

  private readonly config: HelixoConfig;
  private readonly logger: Logger;

  readonly forecast: ForecastEngine;
  readonly labor: LaborEngine;
  readonly scheduler: SchedulerEngine;
  readonly paceMonitor: PaceMonitor;
  readonly toast?: ToastAdapter;
  readonly resy?: ResyAdapter;

  constructor(config: HelixoConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger ?? { debug() {}, info() {}, warn() {}, error() {} };

    this.forecast = new ForecastEngine(config.restaurant, config.forecast, this.logger);
    this.labor = new LaborEngine(config.restaurant, config.labor, this.logger);
    this.scheduler = new SchedulerEngine(config.restaurant, config.scheduling, this.logger);
    this.paceMonitor = new PaceMonitor(config.paceMonitor, this.logger);

    if (config.toast) {
      this.toast = new ToastAdapter(config.toast, this.logger);
    }
    if (config.resy) {
      this.resy = new ResyAdapter(config.resy, this.logger);
    }

    this.logger.info('Helixo plugin initialized', {
      restaurant: config.restaurant.name,
      type: config.restaurant.type,
      seats: config.restaurant.seats,
      toastEnabled: !!config.toast,
      resyEnabled: !!config.resy,
    });
  }

  getTools(): MCPTool[] {
    return createHelixoTools(this.config);
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export { ForecastEngine } from './engines/forecast-engine.js';
export { LaborEngine } from './engines/labor-engine.js';
export { SchedulerEngine } from './engines/scheduler-engine.js';
export { PaceMonitor } from './engines/pace-monitor.js';
export { ToastAdapter } from './integrations/toast-adapter.js';
export { ResyAdapter } from './integrations/resy-adapter.js';
export { createHelixoTools } from './mcp-tools.js';

// Re-export all types
export * from './types.js';
