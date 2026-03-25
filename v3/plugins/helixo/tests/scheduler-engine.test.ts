import { describe, it, expect } from 'vitest';
import { SchedulerEngine } from '../src/engines/scheduler-engine';
import { ForecastEngine } from '../src/engines/forecast-engine';
import { LaborEngine } from '../src/engines/labor-engine';
import type {
  RestaurantProfile,
  StaffMember,
  DailyLaborPlan,
  WeeklyAvailability,
  DayOfWeek,
} from '../src/types';
import {
  DEFAULT_FORECAST_CONFIG,
  DEFAULT_LABOR_CONFIG,
  DEFAULT_SCHEDULING_CONFIG,
  DEFAULT_LABOR_TARGETS,
} from '../src/types';

// ============================================================================
// Fixtures
// ============================================================================

const RESTAURANT: RestaurantProfile = {
  id: 'test',
  name: 'Test',
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

function allDaysAvail(start: string, end: string): WeeklyAvailability {
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const a: WeeklyAvailability = {};
  for (const d of days) {
    a[d] = [{ start, end, preferred: true }];
  }
  return a;
}

const STAFF: StaffMember[] = [
  { id: 's1', name: 'Server A', roles: ['server'], primaryRole: 'server', department: 'foh', hourlyRate: 5.50, overtimeRate: 8.25, maxHoursPerWeek: 40, availability: allDaysAvail('10:00', '22:30'), skillLevel: 4, hireDate: '2023-01-01', isMinor: false },
  { id: 's2', name: 'Server B', roles: ['server'], primaryRole: 'server', department: 'foh', hourlyRate: 5.50, overtimeRate: 8.25, maxHoursPerWeek: 40, availability: allDaysAvail('10:00', '22:30'), skillLevel: 3, hireDate: '2024-01-01', isMinor: false },
  { id: 'b1', name: 'Bartender A', roles: ['bartender'], primaryRole: 'bartender', department: 'foh', hourlyRate: 7.25, overtimeRate: 10.88, maxHoursPerWeek: 40, availability: allDaysAvail('10:00', '22:30'), skillLevel: 4, hireDate: '2023-06-01', isMinor: false },
  { id: 'h1', name: 'Host A', roles: ['host', 'busser'], primaryRole: 'host', department: 'foh', hourlyRate: 14.00, overtimeRate: 21.00, maxHoursPerWeek: 35, availability: allDaysAvail('10:00', '22:30'), skillLevel: 3, hireDate: '2024-03-01', isMinor: false },
  { id: 'lc1', name: 'Cook A', roles: ['line_cook'], primaryRole: 'line_cook', department: 'boh', hourlyRate: 17.00, overtimeRate: 25.50, maxHoursPerWeek: 45, availability: allDaysAvail('08:00', '23:00'), skillLevel: 4, hireDate: '2023-01-01', isMinor: false },
  { id: 'lc2', name: 'Cook B', roles: ['line_cook', 'prep_cook'], primaryRole: 'line_cook', department: 'boh', hourlyRate: 16.00, overtimeRate: 24.00, maxHoursPerWeek: 40, availability: allDaysAvail('08:00', '23:00'), skillLevel: 3, hireDate: '2024-01-01', isMinor: false },
  { id: 'dw1', name: 'Dishwasher A', roles: ['dishwasher'], primaryRole: 'dishwasher', department: 'boh', hourlyRate: 14.00, overtimeRate: 21.00, maxHoursPerWeek: 40, availability: allDaysAvail('10:00', '23:00'), skillLevel: 3, hireDate: '2024-06-01', isMinor: false },
  { id: 'm1', name: 'Manager A', roles: ['manager'], primaryRole: 'manager', department: 'management', hourlyRate: 25.00, overtimeRate: 37.50, maxHoursPerWeek: 50, availability: allDaysAvail('08:00', '23:00'), skillLevel: 5, hireDate: '2022-01-01', isMinor: false },
];

function generateWeekLaborPlans(weekStart: string): DailyLaborPlan[] {
  const forecastEngine = new ForecastEngine(RESTAURANT, DEFAULT_FORECAST_CONFIG);
  const laborEngine = new LaborEngine(RESTAURANT, {
    ...DEFAULT_LABOR_CONFIG,
    targets: RESTAURANT.laborTargets,
    minimumStaffing: RESTAURANT.minimumStaffing,
  });

  const history: any[] = [];
  // Generate minimal history for forecast
  for (let w = 0; w < 4; w++) {
    for (let i = 0; i < 14; i++) {
      const hour = 11 + Math.floor(i / 4);
      const min = (i % 4) * 15;
      history.push({
        date: `2026-02-${String(10 + w * 7).padStart(2, '0')}`,
        dayOfWeek: 'monday',
        mealPeriod: 'lunch',
        intervalStart: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
        intervalEnd: `${String(hour).padStart(2, '0')}:${String((min + 15) % 60).padStart(2, '0')}`,
        netSales: 300,
        grossSales: 324,
        covers: 12,
        checkCount: 8,
        avgCheck: 25,
        menuMix: [],
      });
    }
  }

  const plans: DailyLaborPlan[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + i);
    const date = d.toISOString().slice(0, 10);
    const forecast = forecastEngine.generateDailyForecast(date, history);
    plans.push(laborEngine.generateDailyLaborPlan(forecast));
  }

  return plans;
}

// ============================================================================
// Tests
// ============================================================================

describe('SchedulerEngine', () => {
  const engine = new SchedulerEngine(RESTAURANT, DEFAULT_SCHEDULING_CONFIG);

  describe('generateWeeklySchedule', () => {
    it('returns 7 days of schedules', () => {
      const plans = generateWeekLaborPlans('2026-03-23');
      const schedule = engine.generateWeeklySchedule('2026-03-23', plans, STAFF);

      expect(schedule.days.length).toBe(7);
      expect(schedule.weekStartDate).toBe('2026-03-23');
      expect(schedule.weekEndDate).toBe('2026-03-29');
    });

    it('assigns shifts to available staff', () => {
      const plans = generateWeekLaborPlans('2026-03-23');
      const schedule = engine.generateWeeklySchedule('2026-03-23', plans, STAFF);

      const assignedShifts = schedule.days.flatMap(d => d.shifts.filter(s => !s.isOpen));
      expect(assignedShifts.length).toBeGreaterThan(0);

      // Every assigned shift should reference a valid employee
      for (const shift of assignedShifts) {
        expect(shift.employeeId).toBeTruthy();
        expect(shift.employeeName).toBeTruthy();
        expect(shift.totalHours).toBeGreaterThan(0);
      }
    });

    it('respects maximum weekly hours', () => {
      const plans = generateWeekLaborPlans('2026-03-23');
      const schedule = engine.generateWeeklySchedule('2026-03-23', plans, STAFF);

      for (const summary of schedule.employeeSummaries) {
        const staffMember = STAFF.find(s => s.id === summary.employeeId);
        if (staffMember) {
          expect(summary.totalHours).toBeLessThanOrEqual(staffMember.maxHoursPerWeek + 0.01);
        }
      }
    });

    it('detects overtime alerts correctly', () => {
      const plans = generateWeekLaborPlans('2026-03-23');
      const schedule = engine.generateWeeklySchedule('2026-03-23', plans, STAFF);

      for (const alert of schedule.overtimeAlerts) {
        expect(alert.overtimeHours).toBeGreaterThan(0);
        expect(alert.projectedHours).toBeGreaterThan(alert.threshold);
      }
    });

    it('creates open shifts when staff is insufficient', () => {
      // Use only 2 staff members — should create many open shifts
      const plans = generateWeekLaborPlans('2026-03-23');
      const schedule = engine.generateWeeklySchedule('2026-03-23', plans, STAFF.slice(0, 2));

      const openShiftCount = schedule.days.reduce((s, d) => s + d.openShifts.length, 0);
      expect(openShiftCount).toBeGreaterThan(0);
    });

    it('calculates weekly cost from assigned shifts', () => {
      const plans = generateWeekLaborPlans('2026-03-23');
      const schedule = engine.generateWeeklySchedule('2026-03-23', plans, STAFF);

      const sumDailyCost = schedule.days.reduce((s, d) => s + d.totalScheduledCost, 0);
      expect(Math.abs(schedule.totalWeeklyCost - sumDailyCost)).toBeLessThan(1);
    });
  });
});
