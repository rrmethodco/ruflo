/**
 * Helixo Scheduler Engine
 *
 * Constraint-satisfaction auto-scheduler that assigns staff to shifts
 * based on labor plans, availability, skill levels, and scheduling rules.
 * Produces weekly schedules with coverage analysis and overtime alerts.
 */

import {
  type CoverageGap,
  type DailyLaborPlan,
  type DailySchedule,
  type EmployeeWeekSummary,
  type Logger,
  type MealPeriodLaborPlan,
  type OvertimeAlert,
  type RestaurantProfile,
  type ScheduleConstraint,
  type ScheduleConstraintResult,
  type SchedulingConfig,
  type Shift,
  type StaffMember,
  type StaffRole,
  type WeeklySchedule,
  DEFAULT_SCHEDULING_CONFIG,
  ROLE_DEPARTMENTS,
} from '../types.js';

import { addDays, dateToDayOfWeek, generateId, minutesToTime, timeToMinutes } from '../utils.js';

function dateToDayKey(date: string): string {
  return dateToDayOfWeek(date);
}

// ============================================================================
// Scheduler Engine
// ============================================================================

export class SchedulerEngine {
  private readonly config: SchedulingConfig;
  private readonly restaurant: RestaurantProfile;
  private readonly logger: Logger;

  constructor(restaurant: RestaurantProfile, config?: Partial<SchedulingConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_SCHEDULING_CONFIG, ...config };
    this.restaurant = restaurant;
    this.logger = logger ?? { debug() {}, info() {}, warn() {}, error() {} };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  generateWeeklySchedule(
    weekStartDate: string,
    laborPlans: DailyLaborPlan[],
    staff: StaffMember[],
  ): WeeklySchedule {
    const weekTracker = new Map<string, number>(); // employeeId -> hours this week
    for (const s of staff) weekTracker.set(s.id, 0);

    const lastShiftEnd = new Map<string, { date: string; endMinutes: number }>();
    const consecutiveDays = new Map<string, number>();
    for (const s of staff) consecutiveDays.set(s.id, 0);

    const days: DailySchedule[] = [];

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const date = addDays(weekStartDate, dayIdx);
      const laborPlan = laborPlans.find(p => p.date === date);

      if (!laborPlan) {
        days.push(this.emptyDaySchedule(date));
        // Reset consecutive days for everyone
        for (const s of staff) consecutiveDays.set(s.id, 0);
        continue;
      }

      const daily = this.scheduleDailyShifts(
        date,
        laborPlan,
        staff,
        weekTracker,
        lastShiftEnd,
        consecutiveDays,
      );
      days.push(daily);
    }

    // Build employee week summaries
    const employeeSummaries = this.buildEmployeeSummaries(days, staff);
    const overtimeAlerts = this.detectOvertimeAlerts(employeeSummaries);

    const totalWeeklyHours = days.reduce((s, d) => s + d.totalScheduledHours, 0);
    const totalWeeklyCost = days.reduce((s, d) => s + d.totalScheduledCost, 0);
    const weeklyBudget = laborPlans.reduce((s, p) => s + p.totalDayLaborCost, 0);

    this.logger.info('Weekly schedule generated', {
      weekStartDate,
      totalWeeklyHours,
      totalWeeklyCost,
      openShifts: days.reduce((s, d) => s + d.openShifts.length, 0),
    });

    return {
      weekStartDate,
      weekEndDate: addDays(weekStartDate, 6),
      days,
      totalWeeklyHours,
      totalWeeklyCost,
      employeeSummaries,
      overtimeAlerts,
      laborBudgetVariance: weeklyBudget > 0 ? (totalWeeklyCost - weeklyBudget) / weeklyBudget : 0,
    };
  }

  // --------------------------------------------------------------------------
  // Daily Scheduling
  // --------------------------------------------------------------------------

  private scheduleDailyShifts(
    date: string,
    laborPlan: DailyLaborPlan,
    staff: StaffMember[],
    weekTracker: Map<string, number>,
    lastShiftEnd: Map<string, { date: string; endMinutes: number }>,
    consecutiveDays: Map<string, number>,
  ): DailySchedule {
    const shifts: Shift[] = [];
    const dayKey = dateToDayKey(date);
    const constraintResults: ScheduleConstraintResult[] = [];

    // Collect all role requirements across meal periods
    const roleNeeds = this.aggregateRoleNeeds(laborPlan);

    // Sort roles by difficulty to fill (fewer qualified staff = harder)
    const sortedRoles = [...roleNeeds.entries()].sort(
      (a, b) => this.countQualifiedStaff(a[0], staff) - this.countQualifiedStaff(b[0], staff),
    );

    // Assign staff to each role need
    const assignedToday = new Set<string>();

    for (const [role, { startTime, endTime, headcount }] of sortedRoles) {
      for (let h = 0; h < headcount; h++) {
        const candidate = this.findBestCandidate(
          role,
          date,
          dayKey,
          startTime,
          endTime,
          staff,
          weekTracker,
          lastShiftEnd,
          consecutiveDays,
          assignedToday,
          constraintResults,
        );

        if (candidate) {
          const shift = this.createShift(candidate, role, date, startTime, endTime);
          shifts.push(shift);
          assignedToday.add(candidate.id);

          const prev = weekTracker.get(candidate.id) ?? 0;
          weekTracker.set(candidate.id, prev + shift.totalHours);
          lastShiftEnd.set(candidate.id, { date, endMinutes: timeToMinutes(endTime) });
          consecutiveDays.set(candidate.id, (consecutiveDays.get(candidate.id) ?? 0) + 1);
        } else {
          // Create open shift
          shifts.push(this.createOpenShift(role, date, startTime, endTime));
        }
      }
    }

    // Reset consecutive days for unscheduled staff
    for (const s of staff) {
      if (!assignedToday.has(s.id)) {
        consecutiveDays.set(s.id, 0);
      }
    }

    const openShifts = shifts.filter(s => s.isOpen);
    const coverageGaps = this.detectCoverageGaps(date, laborPlan, shifts);
    const totalScheduledHours = shifts.filter(s => !s.isOpen).reduce((sum, s) => sum + s.totalHours, 0);
    const totalScheduledCost = shifts.filter(s => !s.isOpen).reduce((sum, s) => sum + s.estimatedCost, 0);
    const forecastedSales = laborPlan.mealPeriods.reduce((s, mp) =>
      s + mp.intervals.reduce((si, iv) => si + iv.projectedSales, 0), 0);

    return {
      date,
      shifts,
      totalScheduledHours,
      totalScheduledCost,
      laborCostPercent: forecastedSales > 0 ? totalScheduledCost / forecastedSales : 0,
      openShifts,
      coverageGaps,
      constraints: constraintResults,
    };
  }

  // --------------------------------------------------------------------------
  // Role Need Aggregation
  // --------------------------------------------------------------------------

  private aggregateRoleNeeds(
    laborPlan: DailyLaborPlan,
  ): Map<StaffRole, { startTime: string; endTime: string; headcount: number }> {
    const needs = new Map<StaffRole, { startTime: string; endTime: string; headcount: number }>();

    for (const mp of laborPlan.mealPeriods) {
      for (const [role, peakCount] of Object.entries(mp.staffingPeakByRole)) {
        const existing = needs.get(role as StaffRole);
        const mpStart = mp.intervals[0]?.intervalStart ?? '00:00';
        const mpEnd = mp.intervals[mp.intervals.length - 1]?.intervalEnd ?? '23:59';

        if (!existing) {
          needs.set(role as StaffRole, { startTime: mpStart, endTime: mpEnd, headcount: peakCount });
        } else {
          // Extend window and take max headcount
          if (timeToMinutes(mpStart) < timeToMinutes(existing.startTime)) {
            existing.startTime = mpStart;
          }
          if (timeToMinutes(mpEnd) > timeToMinutes(existing.endTime)) {
            existing.endTime = mpEnd;
          }
          existing.headcount = Math.max(existing.headcount, peakCount);
        }
      }
    }

    return needs;
  }

  // --------------------------------------------------------------------------
  // Candidate Selection
  // --------------------------------------------------------------------------

  private findBestCandidate(
    role: StaffRole,
    date: string,
    dayKey: string,
    startTime: string,
    endTime: string,
    staff: StaffMember[],
    weekTracker: Map<string, number>,
    lastShiftEnd: Map<string, { date: string; endMinutes: number }>,
    consecutiveDays: Map<string, number>,
    assignedToday: Set<string>,
    constraintResults: ScheduleConstraintResult[],
  ): StaffMember | null {
    const candidates = staff
      .filter(s => !assignedToday.has(s.id))
      .filter(s => s.roles.includes(role))
      .filter(s => this.isAvailable(s, dayKey, startTime, endTime))
      .filter(s => {
        const hoursThisWeek = weekTracker.get(s.id) ?? 0;
        const shiftHours = this.calculateShiftHours(startTime, endTime);
        return hoursThisWeek + shiftHours <= s.maxHoursPerWeek;
      })
      .filter(s => this.checkMinRest(s.id, date, startTime, lastShiftEnd))
      .filter(s => (consecutiveDays.get(s.id) ?? 0) < this.config.maxConsecutiveDays)
      .filter(s => {
        if (!s.isMinor) return true;
        // Minors can't work past 10 PM or before 7 AM
        const endMin = timeToMinutes(endTime);
        const startMin = timeToMinutes(startTime);
        return startMin >= 7 * 60 && endMin <= 22 * 60;
      });

    if (candidates.length === 0) return null;

    // Score candidates
    const scored = candidates.map(c => ({
      candidate: c,
      score: this.scoreCandidate(c, role, dayKey, startTime, weekTracker),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].candidate;
  }

  private scoreCandidate(
    candidate: StaffMember,
    role: StaffRole,
    dayKey: string,
    startTime: string,
    weekTracker: Map<string, number>,
  ): number {
    let score = 0;

    // Primary role match bonus
    if (candidate.primaryRole === role) score += 50;

    // Skill level bonus
    score += candidate.skillLevel * 10;

    // Seniority (days since hire)
    const daysSinceHire = Math.floor(
      (Date.now() - new Date(candidate.hireDate).getTime()) / 86_400_000,
    );
    score += Math.min(daysSinceHire / 365, 5) * this.config.seniorityWeight * 20;

    // Preference bonus
    const avail = candidate.availability[dayKey] ?? [];
    const preferred = avail.some(
      w => w.preferred && timeToMinutes(w.start) <= timeToMinutes(startTime),
    );
    if (preferred) score += this.config.preferenceWeight * 30;

    // Hours balancing (prefer employees with fewer hours)
    if (this.config.balanceHoursAcrossStaff) {
      const hoursUsed = weekTracker.get(candidate.id) ?? 0;
      score -= hoursUsed * 2; // penalize higher hours
    }

    return score;
  }

  // --------------------------------------------------------------------------
  // Constraint Checks
  // --------------------------------------------------------------------------

  private isAvailable(
    staff: StaffMember,
    dayKey: string,
    startTime: string,
    endTime: string,
  ): boolean {
    const windows = staff.availability[dayKey] ?? [];
    if (windows.length === 0) return false;

    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);

    return windows.some(w =>
      timeToMinutes(w.start) <= startMin && timeToMinutes(w.end) >= endMin,
    );
  }

  private checkMinRest(
    employeeId: string,
    date: string,
    startTime: string,
    lastShiftEnd: Map<string, { date: string; endMinutes: number }>,
  ): boolean {
    const last = lastShiftEnd.get(employeeId);
    if (!last) return true;

    const lastDate = new Date(last.date + 'T00:00:00Z');
    const thisDate = new Date(date + 'T00:00:00Z');
    const daysDiff = (thisDate.getTime() - lastDate.getTime()) / 86_400_000;

    if (daysDiff > 1) return true;
    if (daysDiff === 1) {
      const restHours = (24 * 60 - last.endMinutes + timeToMinutes(startTime)) / 60;
      return restHours >= this.config.minRestBetweenShifts;
    }
    return false; // same day - already assigned
  }

  private calculateShiftHours(startTime: string, endTime: string): number {
    const diff = (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60;
    return diff > 0 ? diff : diff + 24;
  }

  // --------------------------------------------------------------------------
  // Shift Creation
  // --------------------------------------------------------------------------

  private createShift(
    employee: StaffMember,
    role: StaffRole,
    date: string,
    startTime: string,
    endTime: string,
  ): Shift {
    const totalHours = this.calculateShiftHours(startTime, endTime);
    const clampedHours = Math.min(
      Math.max(totalHours, this.config.shiftMinHours),
      this.config.shiftMaxHours,
    );

    // Adjust end time if clamped
    const actualEnd = clampedHours !== totalHours
      ? minutesToTime(timeToMinutes(startTime) + clampedHours * 60)
      : endTime;

    const otThreshold = 40; // weekly OT threshold
    const weeklyHoursBefore = 0; // tracked externally
    const regularHours = clampedHours;
    const overtimeHours = 0; // calculated at weekly level

    // Break calculation
    let breakStart: string | undefined;
    let breakEnd: string | undefined;
    if (clampedHours >= 6) {
      const breakMid = timeToMinutes(startTime) + Math.floor(clampedHours * 60 * 0.5);
      breakStart = minutesToTime(breakMid);
      breakEnd = minutesToTime(breakMid + 30);
    }

    return {
      id: generateId('shift'),
      employeeId: employee.id,
      employeeName: employee.name,
      role,
      date,
      startTime,
      endTime: actualEnd,
      breakStart,
      breakEnd,
      totalHours: clampedHours,
      regularHours,
      overtimeHours,
      estimatedCost: clampedHours * employee.hourlyRate,
      isOpen: false,
    };
  }

  private createOpenShift(
    role: StaffRole,
    date: string,
    startTime: string,
    endTime: string,
  ): Shift {
    return {
      id: generateId('shift'),
      employeeId: '',
      employeeName: '',
      role,
      date,
      startTime,
      endTime,
      totalHours: this.calculateShiftHours(startTime, endTime),
      regularHours: 0,
      overtimeHours: 0,
      estimatedCost: 0,
      isOpen: true,
      notes: `Open ${role} shift — needs coverage`,
    };
  }

  // --------------------------------------------------------------------------
  // Analysis
  // --------------------------------------------------------------------------

  private detectCoverageGaps(
    date: string,
    laborPlan: DailyLaborPlan,
    shifts: Shift[],
  ): CoverageGap[] {
    const gaps: CoverageGap[] = [];

    for (const mp of laborPlan.mealPeriods) {
      for (const iv of mp.intervals) {
        for (const [role, needed] of Object.entries(iv.staffingByRole)) {
          if (needed === 0) continue;
          const scheduled = shifts.filter(
            s => !s.isOpen && s.role === role &&
              timeToMinutes(s.startTime) <= timeToMinutes(iv.intervalStart) &&
              timeToMinutes(s.endTime) >= timeToMinutes(iv.intervalEnd),
          ).length;

          if (scheduled < needed) {
            gaps.push({
              date,
              intervalStart: iv.intervalStart,
              intervalEnd: iv.intervalEnd,
              role: role as StaffRole,
              neededCount: needed,
              scheduledCount: scheduled,
              deficit: needed - scheduled,
              severity: needed - scheduled >= 2 ? 'critical' : needed - scheduled === 1 ? 'warning' : 'info',
            });
          }
        }
      }
    }

    return gaps;
  }

  private buildEmployeeSummaries(days: DailySchedule[], staff: StaffMember[]): EmployeeWeekSummary[] {
    const summaries: EmployeeWeekSummary[] = [];

    for (const employee of staff) {
      const empShifts = days.flatMap(d => d.shifts.filter(s => s.employeeId === employee.id));
      if (empShifts.length === 0) continue;

      const totalHours = empShifts.reduce((s, sh) => s + sh.totalHours, 0);
      const otThreshold = employee.maxHoursPerWeek < 40 ? employee.maxHoursPerWeek : 40;
      const regularHours = Math.min(totalHours, otThreshold);
      const overtimeHours = Math.max(0, totalHours - otThreshold);
      const totalCost = regularHours * employee.hourlyRate + overtimeHours * employee.overtimeRate;

      summaries.push({
        employeeId: employee.id,
        employeeName: employee.name,
        totalHours,
        regularHours,
        overtimeHours,
        shiftsScheduled: empShifts.length,
        totalCost,
        hoursVsMax: totalHours / employee.maxHoursPerWeek,
      });
    }

    return summaries;
  }

  private detectOvertimeAlerts(summaries: EmployeeWeekSummary[]): OvertimeAlert[] {
    return summaries
      .filter(s => s.overtimeHours > 0)
      .map(s => ({
        employeeId: s.employeeId,
        employeeName: s.employeeName,
        projectedHours: s.totalHours,
        threshold: 40,
        overtimeHours: s.overtimeHours,
        additionalCost: s.overtimeHours * (s.totalCost / s.totalHours) * 0.5,
      }));
  }

  private countQualifiedStaff(role: StaffRole, staff: StaffMember[]): number {
    return staff.filter(s => s.roles.includes(role)).length;
  }

  private emptyDaySchedule(date: string): DailySchedule {
    return {
      date,
      shifts: [],
      totalScheduledHours: 0,
      totalScheduledCost: 0,
      laborCostPercent: 0,
      openShifts: [],
      coverageGaps: [],
      constraints: [],
    };
  }
}
