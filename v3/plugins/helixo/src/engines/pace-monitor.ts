/**
 * Helixo Pace Monitor
 *
 * Real-time service pace tracking that compares actual sales/covers
 * against the forecast and generates staffing adjustment recommendations.
 */

import {
  type IntervalForecast,
  type IntervalPaceDetail,
  type Logger,
  type MealPeriod,
  type MealPeriodForecast,
  type PaceMonitorConfig,
  type PaceRecommendation,
  type PaceSnapshot,
  type PaceStatus,
  type StaffRole,
  DEFAULT_PACE_MONITOR_CONFIG,
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

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ============================================================================
// Pace Monitor
// ============================================================================

export class PaceMonitor {
  private readonly config: PaceMonitorConfig;
  private readonly logger: Logger;

  constructor(config?: Partial<PaceMonitorConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_PACE_MONITOR_CONFIG, ...config };
    this.logger = logger ?? { debug() {}, info() {}, warn() {}, error() {} };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  calculatePace(
    forecast: MealPeriodForecast,
    actualSales: number,
    actualCovers: number,
    currentTime?: string,
  ): PaceSnapshot {
    const now = currentTime ?? nowHHMM();
    const nowMin = timeToMinutes(now);

    const intervals = forecast.intervals;
    if (intervals.length === 0) {
      return this.emptySnapshot(forecast.mealPeriod, now, forecast.totalProjectedSales);
    }

    const firstStart = timeToMinutes(intervals[0].intervalStart);
    const lastEnd = timeToMinutes(intervals[intervals.length - 1].intervalEnd);

    // Classify intervals
    const intervalDetails: IntervalPaceDetail[] = [];
    let elapsedIntervals = 0;
    let currentInterval = intervals[0].intervalStart;
    let forecastedSalesSoFar = 0;

    for (const iv of intervals) {
      const ivStart = timeToMinutes(iv.intervalStart);
      const ivEnd = timeToMinutes(iv.intervalEnd);
      let status: 'completed' | 'current' | 'upcoming';

      if (nowMin >= ivEnd) {
        status = 'completed';
        elapsedIntervals++;
        forecastedSalesSoFar += iv.projectedSales;
      } else if (nowMin >= ivStart) {
        status = 'current';
        currentInterval = iv.intervalStart;
        // Partial interval: proportionally count forecasted sales
        const fraction = (nowMin - ivStart) / (ivEnd - ivStart);
        forecastedSalesSoFar += iv.projectedSales * fraction;
      } else {
        status = 'upcoming';
      }

      intervalDetails.push({
        intervalStart: iv.intervalStart,
        intervalEnd: iv.intervalEnd,
        forecastedSales: iv.projectedSales,
        actualSales: status === 'completed' || status === 'current' ? 0 : 0, // filled by caller granularly
        forecastedCovers: iv.projectedCovers,
        actualCovers: 0,
        variance: 0,
        variancePercent: 0,
        status,
      });
    }

    const remainingIntervals = intervals.length - elapsedIntervals;
    const totalForecast = forecast.totalProjectedSales;

    // Extrapolate pace
    let projectedSalesAtPace: number;
    if (forecastedSalesSoFar > 0 && elapsedIntervals > 0) {
      const paceRatio = actualSales / forecastedSalesSoFar;
      projectedSalesAtPace = totalForecast * paceRatio;
    } else {
      projectedSalesAtPace = totalForecast;
    }

    const pacePercent = totalForecast > 0 ? projectedSalesAtPace / totalForecast : 1.0;
    const paceStatus = this.determinePaceStatus(pacePercent);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      paceStatus,
      pacePercent,
      actualSales,
      totalForecast,
      remainingIntervals,
    );

    const projectedCoversAtPace = forecast.totalProjectedCovers > 0
      ? Math.round(forecast.totalProjectedCovers * pacePercent)
      : 0;

    this.logger.info('Pace calculated', {
      mealPeriod: forecast.mealPeriod,
      pacePercent: `${(pacePercent * 100).toFixed(1)}%`,
      paceStatus,
      recommendations: recommendations.length,
    });

    return {
      timestamp: new Date().toISOString(),
      mealPeriod: forecast.mealPeriod,
      currentInterval,
      elapsedIntervals,
      remainingIntervals,
      actualSalesSoFar: actualSales,
      projectedSalesAtPace: Math.round(projectedSalesAtPace * 100) / 100,
      originalForecast: totalForecast,
      pacePercent: Math.round(pacePercent * 1000) / 1000,
      actualCoversSoFar: actualCovers,
      projectedCoversAtPace,
      paceStatus,
      intervalDetails,
      recommendations,
    };
  }

  // --------------------------------------------------------------------------
  // Pace Status
  // --------------------------------------------------------------------------

  private determinePaceStatus(pacePercent: number): PaceStatus {
    if (pacePercent >= this.config.criticalAheadThreshold) return 'critical_ahead';
    if (pacePercent >= this.config.aheadThreshold) return 'ahead';
    if (pacePercent <= this.config.criticalBehindThreshold) return 'critical_behind';
    if (pacePercent <= this.config.behindThreshold) return 'behind';
    return 'on_pace';
  }

  // --------------------------------------------------------------------------
  // Recommendations
  // --------------------------------------------------------------------------

  private generateRecommendations(
    status: PaceStatus,
    pacePercent: number,
    actualSales: number,
    forecastedTotal: number,
    remainingIntervals: number,
  ): PaceRecommendation[] {
    const recs: PaceRecommendation[] = [];

    if (status === 'on_pace') {
      recs.push({
        type: 'hold_steady',
        urgency: 'informational',
        description: 'Sales on pace with forecast',
        reasoning: `Current pace at ${(pacePercent * 100).toFixed(1)}% of forecast — no action needed`,
      });
      return recs;
    }

    if (status === 'critical_behind' && this.config.autoRecommendCuts) {
      recs.push({
        type: 'cut_staff',
        urgency: 'immediate',
        role: 'server',
        headcountChange: -1,
        estimatedSavings: this.estimateLaborSavings(1, remainingIntervals),
        description: 'Cut 1 server — sales significantly behind forecast',
        reasoning: `At ${(pacePercent * 100).toFixed(1)}% of forecast. Reducing FOH to control labor cost.`,
      });
      recs.push({
        type: 'alert_manager',
        urgency: 'immediate',
        description: 'Alert manager: sales critically behind forecast',
        reasoning: `Projected to miss forecast by $${Math.round(forecastedTotal * (1 - pacePercent))}`,
      });
    } else if (status === 'behind' && this.config.autoRecommendCuts) {
      recs.push({
        type: 'cut_staff',
        urgency: 'within_30min',
        role: 'busser',
        headcountChange: -1,
        estimatedSavings: this.estimateLaborSavings(1, remainingIntervals),
        description: 'Consider cutting 1 busser',
        reasoning: `Pace at ${(pacePercent * 100).toFixed(1)}% — minor labor adjustment to protect margins`,
      });
    }

    if (status === 'critical_ahead' && this.config.autoRecommendCalls) {
      recs.push({
        type: 'call_staff',
        urgency: 'immediate',
        role: 'server',
        headcountChange: 1,
        description: 'Call in 1 additional server — volume exceeding forecast',
        reasoning: `At ${(pacePercent * 100).toFixed(1)}% of forecast. Service quality at risk without additional staff.`,
      });
      recs.push({
        type: 'call_staff',
        urgency: 'within_15min',
        role: 'runner',
        headcountChange: 1,
        description: 'Call in 1 runner to support higher volume',
        reasoning: 'Additional support needed for kitchen-to-table throughput',
      });
    } else if (status === 'ahead' && this.config.autoRecommendCalls) {
      recs.push({
        type: 'extend_shift',
        urgency: 'within_30min',
        role: 'server',
        description: 'Consider extending current server shifts',
        reasoning: `Pace at ${(pacePercent * 100).toFixed(1)}% — may need coverage longer than planned`,
      });
    }

    return recs;
  }

  private estimateLaborSavings(headcountReduction: number, remainingIntervals: number): number {
    const avgHourlyRate = 14; // blended tipped rate
    const hoursRemaining = (remainingIntervals * 15) / 60;
    return headcountReduction * avgHourlyRate * hoursRemaining;
  }

  // --------------------------------------------------------------------------
  // Empty State
  // --------------------------------------------------------------------------

  private emptySnapshot(mealPeriod: MealPeriod, currentTime: string, forecast: number): PaceSnapshot {
    return {
      timestamp: new Date().toISOString(),
      mealPeriod,
      currentInterval: currentTime,
      elapsedIntervals: 0,
      remainingIntervals: 0,
      actualSalesSoFar: 0,
      projectedSalesAtPace: forecast,
      originalForecast: forecast,
      pacePercent: 1.0,
      actualCoversSoFar: 0,
      projectedCoversAtPace: 0,
      paceStatus: 'on_pace',
      intervalDetails: [],
      recommendations: [],
    };
  }
}
