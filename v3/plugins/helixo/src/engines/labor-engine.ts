/**
 * Helixo Labor Engine
 *
 * Constraint-based labor optimization that converts revenue forecasts into
 * optimal staffing plans per 15-minute interval. Enforces minimum staffing,
 * labor cost targets, and productivity ratios per role.
 */

import {
  type DailyForecast,
  type DailyLaborPlan,
  type IntervalLaborRequirement,
  type LaborConfig,
  type Logger,
  type MealPeriod,
  type MealPeriodForecast,
  type MealPeriodLaborPlan,
  type RestaurantProfile,
  type RoleProductivity,
  type StaffDepartment,
  type StaffRole,
  type StaggeredStart,
  DEFAULT_LABOR_CONFIG,
  DEFAULT_ROLE_PRODUCTIVITY,
  ROLE_DEPARTMENTS,
} from '../types.js';

// ============================================================================
// Helpers
// ============================================================================

function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const FOH_ROLES: StaffRole[] = ['server', 'bartender', 'host', 'busser', 'runner', 'barback', 'sommelier', 'barista'];
const BOH_ROLES: StaffRole[] = ['line_cook', 'prep_cook', 'sous_chef', 'exec_chef', 'dishwasher', 'expo'];

// ============================================================================
// Labor Engine
// ============================================================================

export class LaborEngine {
  private readonly config: LaborConfig;
  private readonly restaurant: RestaurantProfile;
  private readonly logger: Logger;
  private readonly productivity: Record<StaffRole, RoleProductivity>;

  constructor(restaurant: RestaurantProfile, config?: Partial<LaborConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_LABOR_CONFIG, ...config };
    this.restaurant = restaurant;
    this.logger = logger ?? { debug() {}, info() {}, warn() {}, error() {} };
    this.productivity = { ...DEFAULT_ROLE_PRODUCTIVITY, ...this.config.roleProductivity } as Record<StaffRole, RoleProductivity>;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  generateDailyLaborPlan(forecast: DailyForecast): DailyLaborPlan {
    const mealPeriods = forecast.mealPeriods.map(mp => this.planMealPeriod(mp));

    const totalDayLaborHours = mealPeriods.reduce((s, p) => s + p.totalLaborHours, 0);
    const totalDayLaborCost = mealPeriods.reduce((s, p) => s + p.totalLaborCost, 0);

    // Add prep and sidework allocations
    const bohHours = mealPeriods.reduce((s, p) =>
      s + p.intervals.reduce((si, iv) => si + iv.totalBOHHeads * 0.25, 0), 0);
    const fohHours = mealPeriods.reduce((s, p) =>
      s + p.intervals.reduce((si, iv) => si + iv.totalFOHHeads * 0.25, 0), 0);

    const prepHours = bohHours * this.config.prepTimeAllocation;
    const sideWorkHours = fohHours * this.config.sideWorkAllocation;
    const breakHours = this.estimateBreakHours(totalDayLaborHours);

    const dayLaborCostPercent = forecast.totalDaySales > 0
      ? (totalDayLaborCost / forecast.totalDaySales)
      : 0;

    this.logger.info('Daily labor plan generated', {
      date: forecast.date,
      totalDayLaborHours,
      totalDayLaborCost,
      dayLaborCostPercent: `${(dayLaborCostPercent * 100).toFixed(1)}%`,
    });

    return {
      date: forecast.date,
      mealPeriods,
      totalDayLaborHours: totalDayLaborHours + prepHours + sideWorkHours + breakHours,
      totalDayLaborCost,
      dayLaborCostPercent,
      prepHours,
      sideWorkHours,
      breakHours,
    };
  }

  // --------------------------------------------------------------------------
  // Meal Period Labor Planning
  // --------------------------------------------------------------------------

  private planMealPeriod(forecast: MealPeriodForecast): MealPeriodLaborPlan {
    const intervals = forecast.intervals.map(iv => this.planInterval(
      iv.intervalStart,
      iv.intervalEnd,
      iv.projectedSales,
      iv.projectedCovers,
      forecast.mealPeriod,
    ));

    // Apply ramp-up / ramp-down smoothing
    this.applyRampSmoothing(intervals);

    const totalLaborHours = intervals.reduce((s, iv) => s + iv.totalLaborHours, 0);
    const totalLaborCost = intervals.reduce((s, iv) => s + iv.projectedLaborCost, 0);
    const totalSales = intervals.reduce((s, iv) => s + iv.projectedSales, 0);

    // Calculate peak staffing per role
    const staffingPeakByRole: Record<string, number> = {};
    for (const iv of intervals) {
      for (const [role, count] of Object.entries(iv.staffingByRole)) {
        staffingPeakByRole[role] = Math.max(staffingPeakByRole[role] ?? 0, count);
      }
    }

    // Generate staggered starts
    const staggeredStarts = this.generateStaggeredStarts(intervals, forecast.mealPeriod);

    return {
      mealPeriod: forecast.mealPeriod,
      date: forecast.date,
      intervals,
      totalLaborHours,
      totalLaborCost,
      laborCostPercent: totalSales > 0 ? totalLaborCost / totalSales : 0,
      avgCoversPerLaborHour: totalLaborHours > 0
        ? intervals.reduce((s, iv) => s + iv.projectedCovers, 0) / totalLaborHours
        : 0,
      avgRevenuePerLaborHour: totalLaborHours > 0 ? totalSales / totalLaborHours : 0,
      staffingPeakByRole: staffingPeakByRole as Record<StaffRole, number>,
      staggeredStarts,
    };
  }

  // --------------------------------------------------------------------------
  // Interval Staffing Calculation
  // --------------------------------------------------------------------------

  private planInterval(
    intervalStart: string,
    intervalEnd: string,
    projectedSales: number,
    projectedCovers: number,
    mealPeriod: MealPeriod,
  ): IntervalLaborRequirement {
    const staffingByRole: Partial<Record<StaffRole, number>> = {};
    let totalFOHHeads = 0;
    let totalBOHHeads = 0;
    let totalLaborCost = 0;

    // FOH staffing based on covers
    for (const role of FOH_ROLES) {
      const prod = this.productivity[role];
      const minStaff = this.getMinimumStaffing(role, mealPeriod);

      let needed = 0;
      if (prod.coversPerHour > 0 && projectedCovers > 0) {
        // Covers this interval need per-hour capacity * interval fraction (15 min = 0.25 hr)
        needed = Math.ceil(projectedCovers / (prod.coversPerHour * 0.25));
      }
      needed = Math.max(needed, minStaff);

      if (needed > 0 || minStaff > 0) {
        staffingByRole[role] = needed;
        totalFOHHeads += needed;
      }
    }

    // BOH staffing based on covers
    for (const role of BOH_ROLES) {
      const prod = this.productivity[role];
      const minStaff = this.getMinimumStaffing(role, mealPeriod);

      let needed = 0;
      if (prod.coversPerHour > 0 && projectedCovers > 0) {
        needed = Math.ceil(projectedCovers / (prod.coversPerHour * 0.25));
      }
      needed = Math.max(needed, minStaff);

      if (needed > 0 || minStaff > 0) {
        staffingByRole[role] = needed;
        totalBOHHeads += needed;
      }
    }

    // Enforce department minimums
    const minFOH = this.config.minimumStaffing.byDepartment.foh;
    const minBOH = this.config.minimumStaffing.byDepartment.boh;
    if (totalFOHHeads < minFOH) {
      staffingByRole.server = (staffingByRole.server ?? 0) + (minFOH - totalFOHHeads);
      totalFOHHeads = minFOH;
    }
    if (totalBOHHeads < minBOH) {
      staffingByRole.line_cook = (staffingByRole.line_cook ?? 0) + (minBOH - totalBOHHeads);
      totalBOHHeads = minBOH;
    }

    // Manager always scheduled
    const minMgmt = this.config.minimumStaffing.byDepartment.management;
    staffingByRole.manager = Math.max(staffingByRole.manager ?? 0, minMgmt);

    // Labor cost estimation (15-min interval = 0.25 hours)
    const totalHeads = totalFOHHeads + totalBOHHeads + (staffingByRole.manager ?? 0);
    const avgHourlyRate = this.estimateBlendedRate(staffingByRole as Record<StaffRole, number>);
    totalLaborCost = totalHeads * avgHourlyRate * 0.25;
    const totalLaborHours = totalHeads * 0.25;

    return {
      intervalStart,
      intervalEnd,
      projectedSales,
      projectedCovers,
      staffingByRole: staffingByRole as Record<StaffRole, number>,
      totalFOHHeads,
      totalBOHHeads,
      totalLaborHours,
      projectedLaborCost: Math.round(totalLaborCost * 100) / 100,
      laborCostPercent: projectedSales > 0 ? totalLaborCost / projectedSales : 0,
      coversPerLaborHour: totalLaborHours > 0 ? projectedCovers / totalLaborHours : 0,
      revenuePerLaborHour: totalLaborHours > 0 ? projectedSales / totalLaborHours : 0,
    };
  }

  // --------------------------------------------------------------------------
  // Ramp-Up / Ramp-Down Smoothing
  // --------------------------------------------------------------------------

  private applyRampSmoothing(intervals: IntervalLaborRequirement[]): void {
    if (intervals.length < 3) return;

    const rampUp = this.config.rampUpIntervals;
    const rampDown = this.config.rampDownIntervals;

    // Find peak interval index
    let peakIdx = 0;
    let peakHeads = 0;
    for (let i = 0; i < intervals.length; i++) {
      const heads = intervals[i].totalFOHHeads + intervals[i].totalBOHHeads;
      if (heads > peakHeads) {
        peakHeads = heads;
        peakIdx = i;
      }
    }

    // Ramp up: ensure staff aren't zero then suddenly peak
    for (let i = Math.max(0, peakIdx - rampUp); i < peakIdx; i++) {
      const next = intervals[i + 1];
      for (const role of Object.keys(next.staffingByRole) as StaffRole[]) {
        const nextCount = next.staffingByRole[role] ?? 0;
        const currCount = intervals[i].staffingByRole[role] ?? 0;
        if (nextCount > currCount + 1) {
          intervals[i].staffingByRole[role] = Math.max(currCount, Math.ceil(nextCount * 0.6));
        }
      }
      this.recalculateIntervalTotals(intervals[i]);
    }

    // Ramp down: don't cut all at once
    for (let i = peakIdx + 1; i < Math.min(intervals.length, peakIdx + rampDown + 1); i++) {
      const prev = intervals[i - 1];
      for (const role of Object.keys(prev.staffingByRole) as StaffRole[]) {
        const prevCount = prev.staffingByRole[role] ?? 0;
        const currCount = intervals[i].staffingByRole[role] ?? 0;
        if (prevCount > currCount + 1) {
          intervals[i].staffingByRole[role] = Math.max(currCount, Math.ceil(prevCount * 0.5));
        }
      }
      this.recalculateIntervalTotals(intervals[i]);
    }
  }

  private recalculateIntervalTotals(iv: IntervalLaborRequirement): void {
    let foh = 0;
    let boh = 0;
    for (const [role, count] of Object.entries(iv.staffingByRole)) {
      const dept = ROLE_DEPARTMENTS[role as StaffRole];
      if (dept === 'foh') foh += count;
      else if (dept === 'boh') boh += count;
    }
    iv.totalFOHHeads = foh;
    iv.totalBOHHeads = boh;
    const total = foh + boh + (iv.staffingByRole.manager ?? 0);
    iv.totalLaborHours = total * 0.25;
    const rate = this.estimateBlendedRate(iv.staffingByRole);
    iv.projectedLaborCost = Math.round(total * rate * 0.25 * 100) / 100;
    iv.laborCostPercent = iv.projectedSales > 0 ? iv.projectedLaborCost / iv.projectedSales : 0;
    iv.coversPerLaborHour = iv.totalLaborHours > 0 ? iv.projectedCovers / iv.totalLaborHours : 0;
    iv.revenuePerLaborHour = iv.totalLaborHours > 0 ? iv.projectedSales / iv.totalLaborHours : 0;
  }

  // --------------------------------------------------------------------------
  // Staggered Starts
  // --------------------------------------------------------------------------

  private generateStaggeredStarts(
    intervals: IntervalLaborRequirement[],
    mealPeriod: MealPeriod,
  ): StaggeredStart[] {
    const starts: StaggeredStart[] = [];
    if (intervals.length === 0) return starts;

    // Detect staffing level changes across intervals
    const roleChanges = new Map<StaffRole, { time: string; count: number; prevCount: number }[]>();

    for (let i = 1; i < intervals.length; i++) {
      for (const role of Object.keys(intervals[i].staffingByRole) as StaffRole[]) {
        const curr = intervals[i].staffingByRole[role] ?? 0;
        const prev = intervals[i - 1].staffingByRole[role] ?? 0;
        if (curr > prev) {
          if (!roleChanges.has(role)) roleChanges.set(role, []);
          roleChanges.get(role)!.push({
            time: intervals[i].intervalStart,
            count: curr,
            prevCount: prev,
          });
        }
      }
    }

    for (const [role, changes] of roleChanges) {
      for (const change of changes) {
        const added = change.count - change.prevCount;
        starts.push({
          role,
          startTime: change.time,
          endTime: intervals[intervals.length - 1].intervalEnd,
          headcount: added,
          reason: `Add ${added} ${role}(s) for ${mealPeriod} volume ramp`,
        });
      }
    }

    return starts;
  }

  // --------------------------------------------------------------------------
  // Cost & Staffing Helpers
  // --------------------------------------------------------------------------

  private getMinimumStaffing(role: StaffRole, mealPeriod: MealPeriod): number {
    return this.config.minimumStaffing.byRole?.[role]?.[mealPeriod] ?? 0;
  }

  private estimateBlendedRate(staffing: Record<StaffRole, number>): number {
    // Blended hourly rate based on typical restaurant pay rates
    const rates: Partial<Record<StaffRole, number>> = {
      server: 5.50, bartender: 7.25, host: 14.00, busser: 12.00,
      runner: 13.00, barback: 13.00, sommelier: 18.00, barista: 14.00,
      line_cook: 17.00, prep_cook: 15.00, sous_chef: 22.00,
      exec_chef: 30.00, dishwasher: 14.00, expo: 15.00, manager: 25.00,
    };

    let totalCost = 0;
    let totalHeads = 0;
    for (const [role, count] of Object.entries(staffing)) {
      const rate = rates[role as StaffRole] ?? 15.00;
      totalCost += rate * count;
      totalHeads += count;
    }
    return totalHeads > 0 ? totalCost / totalHeads : 15.00;
  }

  private estimateBreakHours(totalLaborHours: number): number {
    const threshold = this.config.targets.breakThresholdHours;
    const breakMins = this.config.targets.breakRequirementMinutes;
    // Rough estimate: every 'threshold' hours of labor generates 1 break
    const breakCount = Math.floor(totalLaborHours / threshold);
    return (breakCount * breakMins) / 60;
  }
}
