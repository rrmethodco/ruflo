import { describe, it, expect, vi } from 'vitest';
import { HelixoPlugin } from '../src/index';
import type { HelixoConfig, RestaurantProfile, ToastConfig, ResyConfig } from '../src/types';
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
  name: 'Plugin Test Bistro',
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

const BASE_CONFIG: HelixoConfig = {
  restaurant: RESTAURANT,
  forecast: DEFAULT_FORECAST_CONFIG,
  labor: DEFAULT_LABOR_CONFIG,
  scheduling: DEFAULT_SCHEDULING_CONFIG,
  paceMonitor: DEFAULT_PACE_MONITOR_CONFIG,
};

const TOAST_CONFIG: ToastConfig = {
  apiBaseUrl: 'https://toast.example.com',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  restaurantGuid: 'guid-123',
  pollIntervalMs: 60_000,
};

const RESY_CONFIG: ResyConfig = {
  apiKey: 'resy-key',
  apiSecret: 'resy-secret',
  venueId: 'venue-42',
  apiBaseUrl: 'https://api.resy.com',
  pollIntervalMs: 60_000,
};

// ============================================================================
// Tests
// ============================================================================

describe('HelixoPlugin', () => {
  describe('constructor', () => {
    it('initializes all 4 engines', () => {
      const plugin = new HelixoPlugin(BASE_CONFIG);

      expect(plugin.forecast).toBeDefined();
      expect(plugin.labor).toBeDefined();
      expect(plugin.scheduler).toBeDefined();
      expect(plugin.paceMonitor).toBeDefined();
    });

    it('skips Toast adapter when config not provided', () => {
      const plugin = new HelixoPlugin(BASE_CONFIG);
      expect(plugin.toast).toBeUndefined();
    });

    it('skips RESY adapter when config not provided', () => {
      const plugin = new HelixoPlugin(BASE_CONFIG);
      expect(plugin.resy).toBeUndefined();
    });

    it('initializes Toast adapter when config provided', () => {
      const config: HelixoConfig = { ...BASE_CONFIG, toast: TOAST_CONFIG };
      const plugin = new HelixoPlugin(config);
      expect(plugin.toast).toBeDefined();
    });

    it('initializes RESY adapter when config provided', () => {
      const config: HelixoConfig = { ...BASE_CONFIG, resy: RESY_CONFIG };
      const plugin = new HelixoPlugin(config);
      expect(plugin.resy).toBeDefined();
    });

    it('initializes both adapters when both configs provided', () => {
      const config: HelixoConfig = { ...BASE_CONFIG, toast: TOAST_CONFIG, resy: RESY_CONFIG };
      const plugin = new HelixoPlugin(config);
      expect(plugin.toast).toBeDefined();
      expect(plugin.resy).toBeDefined();
    });

    it('calls logger on initialization', () => {
      const logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const plugin = new HelixoPlugin(BASE_CONFIG, logger);

      expect(logger.info).toHaveBeenCalledWith('Helixo plugin initialized', expect.objectContaining({
        restaurant: 'Plugin Test Bistro',
        type: 'casual_dining',
        seats: 60,
        toastEnabled: false,
        resyEnabled: false,
      }));
    });
  });

  describe('getTools', () => {
    it('returns 8 MCP tools', () => {
      const plugin = new HelixoPlugin(BASE_CONFIG);
      const tools = plugin.getTools();

      expect(tools).toHaveLength(8);
      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.handler).toBeDefined();
        expect(tool.category).toBe('helixo');
      }
    });
  });

  describe('plugin metadata', () => {
    it('name is correct', () => {
      const plugin = new HelixoPlugin(BASE_CONFIG);
      expect(plugin.name).toBe('@claude-flow/plugin-helixo');
    });

    it('version is correct', () => {
      const plugin = new HelixoPlugin(BASE_CONFIG);
      expect(plugin.version).toBe('3.5.0-alpha.1');
    });

    it('description is set', () => {
      const plugin = new HelixoPlugin(BASE_CONFIG);
      expect(plugin.description).toBe('Restaurant revenue forecasting & labor optimization');
    });
  });
});
