/**
 * Helixo Forecast Engine
 *
 * Multi-variable regression revenue forecasting with 15-minute interval
 * granularity. Combines historical averages, day-of-week patterns,
 * seasonality, weather, reservations, and trend momentum.
 */

import {
  type DailyForecast,
  type ForecastConfig,
  type ForecastFactor,
  type ForecastModelWeights,
  type HistoricalSalesRecord,
  type IntervalForecast,
  type Logger,
  type MealPeriodForecast,
  type RestaurantProfile,
  type ServiceWindow,
  type WeatherCondition,
  type WeeklyForecast,
  DEFAULT_FORECAST_CONFIG,
  type DayOfWeek,
  type MealPeriod,
  type ResyReservationData,
} from '../types.js';

import {
  addDays,
  dateToDayOfWeek,
  mean,
  minutesToTime,
  removeOutliers,
  stddev,
  timeToMinutes,
  weightedMean,
} from '../utils.js';

// ============================================================================
// Forecast Engine
// ============================================================================

export class ForecastEngine {
  private readonly config: ForecastConfig;
  private readonly restaurant: RestaurantProfile;
  private readonly logger: Logger;

  constructor(restaurant: RestaurantProfile, config?: Partial<ForecastConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_FORECAST_CONFIG, ...config };
    this.restaurant = restaurant;
    this.logger = logger ?? { debug() {}, info() {}, warn() {}, error() {} };
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  generateDailyForecast(
    date: string,
    history: HistoricalSalesRecord[],
    weather?: WeatherCondition,
    reservations?: ResyReservationData,
    holidays?: Set<string>,
    events?: Map<string, string>,
  ): DailyForecast {
    const dow = dateToDayOfWeek(date);
    const windows = this.restaurant.operatingHours[dow] ?? [];
    const isHoliday = holidays?.has(date) ?? false;
    const isEvent = events?.has(date) ?? false;

    const mealPeriods: MealPeriodForecast[] = windows.map(w =>
      this.forecastMealPeriod(date, dow, w, history, weather, reservations, isHoliday, isEvent),
    );

    const totalDaySales = mealPeriods.reduce((s, mp) => s + mp.totalProjectedSales, 0);
    const totalDayCovers = mealPeriods.reduce((s, mp) => s + mp.totalProjectedCovers, 0);

    this.logger.info('Daily forecast generated', { date, totalDaySales, totalDayCovers });

    return {
      date,
      dayOfWeek: dow,
      mealPeriods,
      totalDaySales,
      totalDayCovers,
      weatherForecast: weather,
      isHoliday,
      isEvent,
      eventDetails: events?.get(date),
    };
  }

  generateWeeklyForecast(
    weekStartDate: string,
    history: HistoricalSalesRecord[],
    weatherByDate?: Map<string, WeatherCondition>,
    reservationsByDate?: Map<string, ResyReservationData>,
    holidays?: Set<string>,
    events?: Map<string, string>,
  ): WeeklyForecast {
    const days: DailyForecast[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStartDate, i);
      days.push(
        this.generateDailyForecast(
          date,
          history,
          weatherByDate?.get(date),
          reservationsByDate?.get(date),
          holidays,
          events,
        ),
      );
    }

    const totalWeekSales = days.reduce((s, d) => s + d.totalDaySales, 0);
    const totalWeekCovers = days.reduce((s, d) => s + d.totalDayCovers, 0);

    // Compare to trailing same-DOW averages for comp calculation
    const lastWeekSales = this.getLastWeekSales(weekStartDate, history);
    const lastYearSales = this.getLastYearSales(weekStartDate, history);

    return {
      weekStartDate,
      weekEndDate: addDays(weekStartDate, 6),
      days,
      totalWeekSales,
      totalWeekCovers,
      compToLastWeek: lastWeekSales > 0 ? ((totalWeekSales - lastWeekSales) / lastWeekSales) * 100 : 0,
      compToLastYear: lastYearSales > 0 ? ((totalWeekSales - lastYearSales) / lastYearSales) * 100 : 0,
    };
  }

  // --------------------------------------------------------------------------
  // Meal Period Forecasting
  // --------------------------------------------------------------------------

  private forecastMealPeriod(
    date: string,
    dow: DayOfWeek,
    window: ServiceWindow,
    history: HistoricalSalesRecord[],
    weather?: WeatherCondition,
    reservations?: ResyReservationData,
    isHoliday = false,
    isEvent = false,
  ): MealPeriodForecast {
    const mp = window.period;
    const relevantHistory = this.filterHistory(history, dow, mp);

    // Generate intervals
    const openMin = timeToMinutes(window.open);
    const closeMin = timeToMinutes(window.close);
    const step = this.config.intervalMinutes;

    const factors: ForecastFactor[] = [];
    const baseSales = this.calculateBaselineSales(relevantHistory, factors);
    const baseCovers = this.calculateBaselineCovers(relevantHistory);

    // Apply factor adjustments
    const adjustedSales = this.applyFactors(baseSales, factors, weather, reservations, isHoliday, isEvent);

    // Distribute across intervals using historical distribution curve
    const intervals = this.distributeAcrossIntervals(
      adjustedSales,
      baseCovers * (adjustedSales / Math.max(baseSales, 1)),
      openMin,
      closeMin,
      step,
      relevantHistory,
    );

    const totalProjectedSales = intervals.reduce((s, iv) => s + iv.projectedSales, 0);
    const totalProjectedCovers = intervals.reduce((s, iv) => s + iv.projectedCovers, 0);
    const avgProjectedCheck = totalProjectedCovers > 0 ? totalProjectedSales / totalProjectedCovers : 0;
    const confidenceScore = this.calculateConfidence(relevantHistory.length);

    return {
      mealPeriod: mp,
      date,
      dayOfWeek: dow,
      totalProjectedSales,
      totalProjectedCovers,
      avgProjectedCheck,
      intervals,
      confidenceScore,
      factorsApplied: factors,
    };
  }

  // --------------------------------------------------------------------------
  // Baseline Calculation (Historical Average + Trend)
  // --------------------------------------------------------------------------

  private calculateBaselineSales(records: HistoricalSalesRecord[], factors: ForecastFactor[]): number {
    if (records.length === 0) return 0;

    const salesValues = records.map(r => r.netSales);
    const cleaned = removeOutliers(salesValues, this.config.outlierStdDevThreshold);
    if (cleaned.length === 0) return 0;

    // Recency-weighted average: more recent weeks get higher weight
    const weights = cleaned.map((_, i) => 1 + i * 0.15); // increasing weight for more recent
    const baseAvg = weightedMean(cleaned, weights);

    factors.push({
      name: 'Historical Average',
      type: 'multiplier',
      value: 1.0,
      source: 'historical_trend',
      confidence: this.calculateConfidence(cleaned.length),
      description: `Weighted average of ${cleaned.length} comparable periods`,
    });

    // Week-over-week trend (momentum)
    if (cleaned.length >= 3) {
      const recent = mean(cleaned.slice(-2));
      const older = mean(cleaned.slice(0, -2));
      if (older > 0) {
        const momentum = recent / older;
        factors.push({
          name: 'Recent Momentum',
          type: 'multiplier',
          value: momentum,
          source: 'historical_trend',
          confidence: Math.min(0.8, cleaned.length / 10),
          description: `Last 2 periods vs earlier: ${((momentum - 1) * 100).toFixed(1)}% change`,
        });
        return baseAvg * (1 + (momentum - 1) * this.config.weights.recentMomentum);
      }
    }

    return baseAvg;
  }

  private calculateBaselineCovers(records: HistoricalSalesRecord[]): number {
    if (records.length === 0) return 0;
    const coverValues = records.map(r => r.covers);
    const cleaned = removeOutliers(coverValues, this.config.outlierStdDevThreshold);
    return mean(cleaned);
  }

  // --------------------------------------------------------------------------
  // Factor Adjustment
  // --------------------------------------------------------------------------

  private applyFactors(
    baseSales: number,
    factors: ForecastFactor[],
    weather?: WeatherCondition,
    reservations?: ResyReservationData,
    isHoliday = false,
    isEvent = false,
  ): number {
    let adjusted = baseSales;
    const w = this.config.weights;

    // Weather impact
    if (this.config.weatherEnabled && weather) {
      const weatherMult = this.weatherMultiplier(weather);
      if (weatherMult !== 1.0) {
        factors.push({
          name: 'Weather',
          type: 'multiplier',
          value: weatherMult,
          source: 'weather',
          confidence: 0.6,
          description: `${weather.description} (${weather.tempF}°F, ${weather.precipitation})`,
        });
        adjusted *= 1 + (weatherMult - 1) * w.weatherImpact;
      }
    }

    // Holiday impact
    if (isHoliday) {
      const holidayMult = this.config.holidayBoostMultiplier ?? 1.15;
      factors.push({
        name: 'Holiday',
        type: 'multiplier',
        value: holidayMult,
        source: 'holiday',
        confidence: 0.7,
        description: 'Holiday adjustment',
      });
      adjusted *= 1 + (holidayMult - 1) * w.holidayImpact;
    }

    // Event impact
    if (isEvent) {
      const eventMult = this.config.eventBoostMultiplier ?? 1.10;
      factors.push({
        name: 'Local Event',
        type: 'multiplier',
        value: eventMult,
        source: 'event',
        confidence: 0.5,
        description: 'Local event adjustment',
      });
      adjusted *= 1 + (eventMult - 1) * w.eventImpact;
    }

    // Reservation pace signal
    if (this.config.reservationPaceEnabled && reservations) {
      const resyMult = this.reservationPaceMultiplier(reservations);
      if (resyMult !== 1.0) {
        factors.push({
          name: 'Reservation Pace',
          type: 'multiplier',
          value: resyMult,
          source: 'reservation_pace',
          confidence: 0.7,
          description: `${reservations.totalReservations} reservations for ${reservations.totalCovers} covers`,
        });
        adjusted *= 1 + (resyMult - 1) * w.reservationPace;
      }
    }

    return Math.max(0, adjusted);
  }

  private weatherMultiplier(weather: WeatherCondition): number {
    let mult = 1.0;
    // Precipitation impact
    switch (weather.precipitation) {
      case 'light_rain': mult *= 0.92; break;
      case 'heavy_rain': mult *= 0.80; break;
      case 'snow': mult *= 0.70; break;
      case 'extreme': mult *= this.config.extremeWeatherMultiplier ?? 0.50; break;
    }
    // Temperature extremes
    if (weather.tempF > (this.config.highTempThresholdF ?? 95)) mult *= 0.90;
    else if (weather.tempF < (this.config.lowTempThresholdF ?? 20)) mult *= 0.85;
    return mult;
  }

  private reservationPaceMultiplier(reservations: ResyReservationData): number {
    const totalExpected = reservations.totalCovers + reservations.walkInEstimate;
    const seatCapacity = this.restaurant.seats;
    if (seatCapacity === 0) return 1.0;
    const utilizationRatio = totalExpected / seatCapacity;
    if (utilizationRatio > 1.2) return 1.15;
    if (utilizationRatio > 1.0) return 1.08;
    if (utilizationRatio < 0.5) return 0.85;
    if (utilizationRatio < 0.7) return 0.92;
    return 1.0;
  }

  // --------------------------------------------------------------------------
  // Interval Distribution
  // --------------------------------------------------------------------------

  private distributeAcrossIntervals(
    totalSales: number,
    totalCovers: number,
    openMin: number,
    closeMin: number,
    step: number,
    history: HistoricalSalesRecord[],
  ): IntervalForecast[] {
    const intervals: IntervalForecast[] = [];
    const count = Math.ceil((closeMin - openMin) / step);
    if (count <= 0) return intervals;

    // Build distribution curve from historical interval data
    const curve = this.buildDistributionCurve(openMin, closeMin, step, history);
    const curveSum = curve.reduce((a, b) => a + b, 0);

    for (let i = 0; i < count; i++) {
      const start = openMin + i * step;
      const end = Math.min(start + step, closeMin);
      const share = curveSum > 0 ? curve[i] / curveSum : 1 / count;
      const projSales = totalSales * share;
      const projCovers = Math.round(totalCovers * share);
      const projChecks = projCovers; // simplified: 1 check per cover
      const sd = this.intervalStdDev(history, minutesToTime(start));

      intervals.push({
        intervalStart: minutesToTime(start),
        intervalEnd: minutesToTime(end),
        projectedSales: Math.round(projSales * 100) / 100,
        projectedCovers: projCovers,
        projectedChecks: projChecks,
        confidenceLow: Math.round((projSales - sd * 1.28) * 100) / 100, // 10th percentile
        confidenceHigh: Math.round((projSales + sd * 1.28) * 100) / 100, // 90th percentile
        confidence: this.calculateConfidence(history.length),
      });
    }

    return intervals;
  }

  private buildDistributionCurve(
    openMin: number,
    closeMin: number,
    step: number,
    history: HistoricalSalesRecord[],
  ): number[] {
    const count = Math.ceil((closeMin - openMin) / step);
    const curve = new Array(count).fill(0);

    if (history.length === 0) {
      // Bell-curve default: peak at 60% through service
      const peak = Math.floor(count * 0.6);
      for (let i = 0; i < count; i++) {
        const dist = Math.abs(i - peak) / count;
        curve[i] = Math.exp(-dist * dist * 8);
      }
      return curve;
    }

    // Sum historical sales per interval bucket
    for (const rec of history) {
      const recStart = timeToMinutes(rec.intervalStart);
      const idx = Math.floor((recStart - openMin) / step);
      if (idx >= 0 && idx < count) {
        curve[idx] += rec.netSales;
      }
    }

    // Smooth to avoid zero-intervals if data is sparse
    if (curve.some(v => v === 0)) {
      for (let i = 0; i < count; i++) {
        if (curve[i] === 0) {
          const prev = i > 0 ? curve[i - 1] : 0;
          const next = i < count - 1 ? curve[i + 1] : 0;
          curve[i] = (prev + next) / 2 || 1;
        }
      }
    }

    return curve;
  }

  private intervalStdDev(history: HistoricalSalesRecord[], intervalStart: string): number {
    const matching = history.filter(r => r.intervalStart === intervalStart);
    return stddev(matching.map(r => r.netSales));
  }

  // --------------------------------------------------------------------------
  // Confidence Calculation
  // --------------------------------------------------------------------------

  private calculateConfidence(dataPoints: number): number {
    const min = this.config.minDataPointsForForecast;
    if (dataPoints < min) return 0.3;
    if (dataPoints >= 20) return 0.95;
    return 0.3 + 0.65 * Math.min(1, (dataPoints - min) / (20 - min));
  }

  // --------------------------------------------------------------------------
  // Comparison Helpers
  // --------------------------------------------------------------------------

  private filterHistory(
    history: HistoricalSalesRecord[],
    dow: DayOfWeek,
    mealPeriod: MealPeriod,
  ): HistoricalSalesRecord[] {
    return history.filter(r => r.dayOfWeek === dow && r.mealPeriod === mealPeriod);
  }

  private getLastWeekSales(weekStart: string, history: HistoricalSalesRecord[]): number {
    const prevWeekStart = addDays(weekStart, -7);
    const prevWeekEnd = addDays(weekStart, -1);
    return history
      .filter(r => r.date >= prevWeekStart && r.date <= prevWeekEnd)
      .reduce((s, r) => s + r.netSales, 0);
  }

  private getLastYearSales(weekStart: string, history: HistoricalSalesRecord[]): number {
    const lastYearStart = addDays(weekStart, -364);
    const lastYearEnd = addDays(weekStart, -358);
    return history
      .filter(r => r.date >= lastYearStart && r.date <= lastYearEnd)
      .reduce((s, r) => s + r.netSales, 0);
  }

  // --------------------------------------------------------------------------
  // Forecast Accuracy Tracking
  // --------------------------------------------------------------------------

  /**
   * Compare a forecast against actual results to measure accuracy.
   * Returns metrics like MAPE, WMAPE, bias, and per-interval accuracy.
   */
  calculateAccuracy(
    forecast: DailyForecast,
    actuals: HistoricalSalesRecord[],
  ): ForecastAccuracyReport {
    const forecastDate = forecast.date;
    const dateActuals = actuals.filter(r => r.date === forecastDate);

    const mpReports: MealPeriodAccuracy[] = [];

    for (const mp of forecast.mealPeriods) {
      const mpActuals = dateActuals.filter(r => r.mealPeriod === mp.mealPeriod);
      const actualTotal = mpActuals.reduce((s, r) => s + r.netSales, 0);
      const actualCovers = mpActuals.reduce((s, r) => s + r.covers, 0);
      const forecastTotal = mp.totalProjectedSales;
      const forecastCovers = mp.totalProjectedCovers;

      const salesError = forecastTotal - actualTotal;
      const salesErrorPct = actualTotal > 0 ? Math.abs(salesError) / actualTotal : 0;
      const coverError = forecastCovers - actualCovers;

      // Per-interval accuracy
      const intervalAccuracies: IntervalAccuracy[] = [];
      for (const iv of mp.intervals) {
        const matchingActual = mpActuals.find(a => a.intervalStart === iv.intervalStart);
        const actualSales = matchingActual?.netSales ?? 0;
        const error = iv.projectedSales - actualSales;
        intervalAccuracies.push({
          intervalStart: iv.intervalStart,
          intervalEnd: iv.intervalEnd,
          forecastedSales: iv.projectedSales,
          actualSales,
          error,
          absolutePercentError: actualSales > 0 ? Math.abs(error) / actualSales : 0,
          withinConfidenceBand: actualSales >= iv.confidenceLow && actualSales <= iv.confidenceHigh,
        });
      }

      const mape = intervalAccuracies.length > 0
        ? intervalAccuracies.reduce((s, ia) => s + ia.absolutePercentError, 0) / intervalAccuracies.length
        : 0;

      const withinBand = intervalAccuracies.filter(ia => ia.withinConfidenceBand).length;
      const bandAccuracy = intervalAccuracies.length > 0 ? withinBand / intervalAccuracies.length : 0;

      mpReports.push({
        mealPeriod: mp.mealPeriod,
        forecastedSales: forecastTotal,
        actualSales: actualTotal,
        salesError,
        salesErrorPercent: salesErrorPct,
        forecastedCovers: forecastCovers,
        actualCovers,
        coverError,
        mape,
        confidenceBandAccuracy: bandAccuracy,
        intervalAccuracies,
        bias: salesError > 0 ? 'over_forecast' : salesError < 0 ? 'under_forecast' : 'accurate',
      });
    }

    const totalForecast = forecast.totalDaySales;
    const totalActual = dateActuals.reduce((s, r) => s + r.netSales, 0);
    const totalError = totalForecast - totalActual;
    const wmape = totalActual > 0 ? Math.abs(totalError) / totalActual : 0;

    return {
      date: forecastDate,
      totalForecastedSales: totalForecast,
      totalActualSales: totalActual,
      totalError,
      wmape,
      overallAccuracyPercent: Math.max(0, (1 - wmape) * 100),
      mealPeriods: mpReports,
      bias: totalError > 0 ? 'over_forecast' : totalError < 0 ? 'under_forecast' : 'accurate',
    };
  }
}

// ============================================================================
// Forecast Accuracy Types
// ============================================================================

export interface ForecastAccuracyReport {
  date: string;
  totalForecastedSales: number;
  totalActualSales: number;
  totalError: number;
  wmape: number;                    // Weighted Mean Absolute Percentage Error
  overallAccuracyPercent: number;   // 0-100, higher is better
  mealPeriods: MealPeriodAccuracy[];
  bias: 'over_forecast' | 'under_forecast' | 'accurate';
}

export interface MealPeriodAccuracy {
  mealPeriod: MealPeriod;
  forecastedSales: number;
  actualSales: number;
  salesError: number;
  salesErrorPercent: number;
  forecastedCovers: number;
  actualCovers: number;
  coverError: number;
  mape: number;
  confidenceBandAccuracy: number;   // % of intervals where actual fell within confidence band
  intervalAccuracies: IntervalAccuracy[];
  bias: 'over_forecast' | 'under_forecast' | 'accurate';
}

export interface IntervalAccuracy {
  intervalStart: string;
  intervalEnd: string;
  forecastedSales: number;
  actualSales: number;
  error: number;
  absolutePercentError: number;
  withinConfidenceBand: boolean;
}
