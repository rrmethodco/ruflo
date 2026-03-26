import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabase } from '$lib/server/supabase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function gradeFromScore(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 60) return 'D';
  return 'F';
}

function accuracyScore(mape: number): number {
  if (mape < 0.05) return 100;
  if (mape < 0.10) return 85;
  if (mape < 0.15) return 70;
  if (mape < 0.20) return 55;
  return 40;
}

function consistencyScore(errors: number[]): number {
  if (errors.length < 2) return 50;
  const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
  const variance = errors.reduce((s, e) => s + (e - mean) ** 2, 0) / errors.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev < 0.05) return 100;
  if (stdDev < 0.10) return 85;
  if (stdDev < 0.15) return 70;
  if (stdDev < 0.20) return 55;
  return 40;
}

function biasScore(meanBias: number): number {
  const absBias = Math.abs(meanBias);
  if (absBias < 0.02) return 100;
  if (absBias < 0.05) return 80;
  if (absBias < 0.10) return 60;
  return 40;
}

function improvementScore(recentMape: number | null, priorMape: number | null): number {
  if (recentMape === null || priorMape === null) return 70;
  if (priorMape === 0) return 70;
  const change = (recentMape - priorMape) / priorMape;
  if (change < -0.20) return 100;
  if (change < -0.10) return 90;
  if (change < 0) return 80;
  if (change < 0.10) return 65;
  return 45;
}

function coverageScore(forecastDays: number, actualDays: number): number {
  if (actualDays === 0) return 50;
  const ratio = forecastDays / actualDays;
  return Math.min(100, Math.round(ratio * 100));
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export const GET: RequestHandler = async ({ url }) => {
  const sb = getSupabase();
  const locationId = url.searchParams.get('locationId');
  const weeksBack = Number(url.searchParams.get('weeksBack') || '4');

  if (!locationId) {
    return json({ error: 'locationId required' }, { status: 400 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  // Wide range for trailing 2-week avg and SDLY lookups
  const wideCutoff = new Date();
  wideCutoff.setDate(wideCutoff.getDate() - 400); // ~13 months for SDLY
  const wideCutoffStr = wideCutoff.toISOString().split('T')[0];

  // Fetch all data in parallel
  const [
    { data: accuracyRows },
    { data: forecastRows },
    { data: actualRows },
    { data: budgetRows },
    { data: wideActualRows },
  ] = await Promise.all([
    sb.from('forecast_accuracy')
      .select('*')
      .eq('location_id', locationId)
      .gte('business_date', cutoffStr)
      .lte('business_date', todayStr)
      .order('business_date', { ascending: true }),
    sb.from('daily_forecasts')
      .select('business_date, manager_revenue, manager_covers, ai_suggested_revenue, ai_confidence, forecast_weights, override_tags, is_override, accepted_at')
      .eq('location_id', locationId)
      .gte('business_date', cutoffStr)
      .lte('business_date', todayStr)
      .not('manager_revenue', 'is', null),
    sb.from('daily_actuals')
      .select('business_date, revenue, covers, prior_year_revenue')
      .eq('location_id', locationId)
      .gte('business_date', cutoffStr)
      .lte('business_date', todayStr)
      .gt('revenue', 0),
    sb.from('daily_budget')
      .select('business_date, budget_revenue')
      .eq('location_id', locationId)
      .gte('business_date', cutoffStr)
      .lte('business_date', todayStr),
    // Wide range actuals for trailing 2W avg and SDLY lookups
    sb.from('daily_actuals')
      .select('business_date, revenue')
      .eq('location_id', locationId)
      .gte('business_date', wideCutoffStr)
      .lte('business_date', todayStr)
      .gt('revenue', 0),
  ]);

  const forecasts = forecastRows || [];
  const actuals = actualRows || [];
  const budgets = budgetRows || [];
  const accuracy = accuracyRows || [];

  // Build lookup maps
  const forecastMap = new Map(forecasts.map(f => [f.business_date, f]));
  const actualMap = new Map(actuals.map(a => [a.business_date, a]));
  const budgetMap = new Map(budgets.map(b => [b.business_date, b]));

  // ---------------------------------------------------------------------------
  // Daily Comparison
  // ---------------------------------------------------------------------------
  const dailyComparison: any[] = [];
  const allDates = new Set([
    ...forecasts.map(f => f.business_date),
    ...actuals.map(a => a.business_date),
  ]);
  const sortedDates = [...allDates].sort();

  // Build actuals lookup using WIDE range data for trailing avg + SDLY lookups
  const wideActuals = wideActualRows || [];
  const actualsLookup = new Map(wideActuals.map((a: any) => [a.business_date, a.revenue || 0]));

  // P1 starts 12/29/2025 — for same period last year, offset by 364 days (52 weeks)
  const P1_START = new Date('2025-12-29T12:00:00');
  const PY_OFFSET_DAYS = 364; // same DOW position, 52 weeks back

  for (const date of sortedDates) {
    const fc = forecastMap.get(date);
    const act = actualMap.get(date);
    const bud = budgetMap.get(date);
    const forecastRev = fc?.manager_revenue ?? null;
    const actualRev = act?.revenue ?? null;
    const budgetRev = bud?.budget_revenue ?? null;
    const d = new Date(date + 'T12:00:00');
    const dow = DAY_NAMES[d.getDay()];
    const dowNum = d.getDay();

    let error: number | null = null;
    let errorPct: number | null = null;
    if (forecastRev != null && actualRev != null && forecastRev > 0) {
      error = actualRev - forecastRev;
      errorPct = error / forecastRev;
    }

    // Trailing 2-week same-DOW average
    let trailing2wAvg: number | null = null;
    const sameDowRevs: number[] = [];
    for (let wk = 1; wk <= 2; wk++) {
      const priorDate = new Date(d);
      priorDate.setDate(priorDate.getDate() - wk * 7);
      const priorStr = priorDate.toISOString().split('T')[0];
      const rev = actualsLookup.get(priorStr);
      if (rev && rev > 0) sameDowRevs.push(rev);
    }
    if (sameDowRevs.length > 0) {
      trailing2wAvg = Math.round(sameDowRevs.reduce((a, b) => a + b, 0) / sameDowRevs.length);
    }

    // Same period last year (364 days back = same DOW position)
    const pyDate = new Date(d);
    pyDate.setDate(pyDate.getDate() - PY_OFFSET_DAYS);
    const pyStr = pyDate.toISOString().split('T')[0];
    const pyRevenue = actualsLookup.get(pyStr) || (act?.prior_year_revenue ?? null);

    dailyComparison.push({
      date,
      dayOfWeek: dow,
      forecast: forecastRev,
      actual: actualRev,
      budget: budgetRev,
      trailing2wAvg,
      samePeriodPY: pyRevenue ? Math.round(pyRevenue) : null,
      error: error != null ? Math.round(error) : null,
      errorPct: errorPct != null ? Math.round(errorPct * 10000) / 10000 : null,
      confidence: fc?.ai_confidence ?? null,
    });
  }

  // ---------------------------------------------------------------------------
  // Core Metrics
  // ---------------------------------------------------------------------------
  const pairedDays = dailyComparison.filter(d => d.forecast != null && d.actual != null && d.forecast > 0);
  const errorPcts = pairedDays.map(d => d.errorPct as number);
  const absErrorPcts = errorPcts.map(Math.abs);

  const mape = absErrorPcts.length > 0
    ? absErrorPcts.reduce((a, b) => a + b, 0) / absErrorPcts.length
    : 0;

  const meanBias = errorPcts.length > 0
    ? errorPcts.reduce((a, b) => a + b, 0) / errorPcts.length
    : 0;

  // R-squared
  let r2 = 0;
  if (pairedDays.length > 1) {
    const actVals = pairedDays.map(d => d.actual as number);
    const fcVals = pairedDays.map(d => d.forecast as number);
    const meanAct = actVals.reduce((a, b) => a + b, 0) / actVals.length;
    const ssRes = actVals.reduce((s, a, i) => s + (a - fcVals[i]) ** 2, 0);
    const ssTot = actVals.reduce((s, a) => s + (a - meanAct) ** 2, 0);
    r2 = ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 1000) / 1000 : 0;
  }

  // Threshold counts
  const within5 = absErrorPcts.filter(e => e <= 0.05).length;
  const within10 = absErrorPcts.filter(e => e <= 0.10).length;
  const within15 = absErrorPcts.filter(e => e <= 0.15).length;

  // ---------------------------------------------------------------------------
  // DOW Analysis
  // ---------------------------------------------------------------------------
  const dowGroups: Record<string, { forecasts: number[]; actuals: number[]; errors: number[] }> = {};
  for (const day of pairedDays) {
    const dow = day.dayOfWeek;
    if (!dowGroups[dow]) dowGroups[dow] = { forecasts: [], actuals: [], errors: [] };
    dowGroups[dow].forecasts.push(day.forecast);
    dowGroups[dow].actuals.push(day.actual);
    dowGroups[dow].errors.push(day.errorPct);
  }

  const dowAnalysis = DAY_NAMES.map(dow => {
    const group = dowGroups[dow];
    if (!group || group.errors.length === 0) {
      return { dow, avgForecast: 0, avgActual: 0, mape: 0, bias: 0, count: 0, grade: '-' };
    }
    const avgFc = Math.round(group.forecasts.reduce((a, b) => a + b, 0) / group.forecasts.length);
    const avgAct = Math.round(group.actuals.reduce((a, b) => a + b, 0) / group.actuals.length);
    const dowMape = group.errors.map(Math.abs).reduce((a, b) => a + b, 0) / group.errors.length;
    const dowBias = group.errors.reduce((a, b) => a + b, 0) / group.errors.length;
    const dowScore = accuracyScore(dowMape);
    return {
      dow,
      avgForecast: avgFc,
      avgActual: avgAct,
      mape: Math.round(dowMape * 10000) / 10000,
      bias: Math.round(dowBias * 10000) / 10000,
      count: group.errors.length,
      grade: gradeFromScore(dowScore),
    };
  });

  // ---------------------------------------------------------------------------
  // Weekly Trend (group by ISO week)
  // ---------------------------------------------------------------------------
  const weekBuckets: Record<string, number[]> = {};
  for (const day of pairedDays) {
    const d = new Date(day.date + 'T12:00:00');
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const label = weekStart.toISOString().split('T')[0];
    if (!weekBuckets[label]) weekBuckets[label] = [];
    weekBuckets[label].push(Math.abs(day.errorPct));
  }

  const weeklyTrend = Object.entries(weekBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, errors]) => {
      const wMape = errors.reduce((a, b) => a + b, 0) / errors.length;
      return {
        week,
        mape: Math.round(wMape * 10000) / 10000,
        score: accuracyScore(wMape),
      };
    });

  // ---------------------------------------------------------------------------
  // Tag Impact
  // ---------------------------------------------------------------------------
  const tagImpact: any[] = [];
  const tagStats: Record<string, { count: number; errors: number[]; revImpacts: number[] }> = {};
  for (const fc of forecasts) {
    const tags = fc.override_tags as string[] | null;
    if (!tags || tags.length === 0) continue;
    const act = actualMap.get(fc.business_date);
    if (!act) continue;
    for (const tag of tags) {
      if (!tagStats[tag]) tagStats[tag] = { count: 0, errors: [], revImpacts: [] };
      tagStats[tag].count++;
      if (fc.manager_revenue > 0) {
        const errPct = (act.revenue - fc.manager_revenue) / fc.manager_revenue;
        tagStats[tag].errors.push(errPct);
        tagStats[tag].revImpacts.push(errPct);
      }
    }
  }
  for (const [tag, stats] of Object.entries(tagStats)) {
    const avgImpact = stats.revImpacts.length > 0
      ? stats.revImpacts.reduce((a, b) => a + b, 0) / stats.revImpacts.length
      : 0;
    const tagAccuracy = stats.errors.length > 0
      ? 1 - stats.errors.map(Math.abs).reduce((a, b) => a + b, 0) / stats.errors.length
      : 0;
    tagImpact.push({
      tag,
      occurrences: stats.count,
      avgRevImpact: Math.round(avgImpact * 10000) / 10000,
      forecastAccuracy: Math.round(tagAccuracy * 100) / 100,
    });
  }

  // ---------------------------------------------------------------------------
  // Weight History (from forecast_accuracy table)
  // ---------------------------------------------------------------------------
  const weightHistory = accuracy
    .filter(r => r.weights_used)
    .slice(-14)
    .map(r => ({
      date: r.business_date,
      trailing: r.weights_used?.trailing ?? null,
      pyGrowth: r.weights_used?.pyGrowth ?? null,
      momentum: r.weights_used?.momentum ?? null,
      budget: r.weights_used?.budget ?? null,
    }));

  // ---------------------------------------------------------------------------
  // Self-Grading
  // ---------------------------------------------------------------------------
  const accScore = accuracyScore(mape);
  const consScore = consistencyScore(errorPcts);
  const biasCtrl = biasScore(meanBias);

  // Improvement: compare last half vs first half
  const halfIdx = Math.floor(pairedDays.length / 2);
  const firstHalf = pairedDays.slice(0, halfIdx);
  const secondHalf = pairedDays.slice(halfIdx);
  const firstMape = firstHalf.length > 0
    ? firstHalf.map(d => Math.abs(d.errorPct)).reduce((a: number, b: number) => a + b, 0) / firstHalf.length
    : null;
  const secondMape = secondHalf.length > 0
    ? secondHalf.map(d => Math.abs(d.errorPct)).reduce((a: number, b: number) => a + b, 0) / secondHalf.length
    : null;
  const impScore = improvementScore(secondMape, firstMape);

  const forecastDayCount = forecasts.length;
  const actualDayCount = actuals.length;
  const covScore = coverageScore(forecastDayCount, actualDayCount);

  const overallScore = Math.round(
    accScore * 0.30 + consScore * 0.20 + biasCtrl * 0.20 + impScore * 0.15 + covScore * 0.15,
  );

  // Previous score (use first half as proxy for "previous period")
  const prevAccScore = firstMape !== null ? accuracyScore(firstMape) : 70;
  const previousScore = Math.round(prevAccScore * 0.30 + 70 * 0.70);

  const trend = overallScore > previousScore ? 'improving' : overallScore < previousScore ? 'declining' : 'stable';

  // ---------------------------------------------------------------------------
  // Recommendations
  // ---------------------------------------------------------------------------
  const recommendations: string[] = [];

  // Worst DOW
  const activeDow = dowAnalysis.filter(d => d.count > 0);
  if (activeDow.length > 0) {
    const worst = activeDow.reduce((a, b) => a.mape > b.mape ? a : b);
    if (worst.mape > 0.10) {
      const dir = worst.bias > 0 ? 'under' : 'over';
      recommendations.push(
        `${worst.dow} forecasts are consistently ${Math.round(worst.mape * 100)}% off  - model tends to ${dir}-forecast. Auto-adjusting weights.`,
      );
    }
    const best = activeDow.reduce((a, b) => a.mape < b.mape ? a : b);
    if (best.mape < 0.08 && best.count >= 2) {
      recommendations.push(
        `${best.dow} accuracy is strong at ${Math.round((1 - best.mape) * 100)}% - patterns are well-captured.`,
      );
    }
  }

  if (trend === 'improving') {
    recommendations.push('Model accuracy is trending upward as adaptive weights learn from recent data.');
  } else if (trend === 'declining') {
    recommendations.push('Model accuracy has declined recently - review whether business patterns have shifted.');
  }

  if (tagImpact.length > 0) {
    const highImpact = tagImpact.filter(t => Math.abs(t.avgRevImpact) > 0.15);
    for (const t of highImpact.slice(0, 2)) {
      const dir = t.avgRevImpact > 0 ? 'positive' : 'negative';
      recommendations.push(
        `Events tagged "${t.tag}" have a ${Math.round(Math.abs(t.avgRevImpact) * 100)}% ${dir} revenue impact - factor into forecasts.`,
      );
    }
  }

  const missingDays = actualDayCount - forecastDayCount;
  if (missingDays > 2) {
    recommendations.push(
      `Missing forecasts for ${missingDays} days with actuals - ensure forecasts are accepted by Wednesday each week.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('Forecast model is performing well across all dimensions. Continue monitoring.');
  }

  // ---------------------------------------------------------------------------
  // Response
  // ---------------------------------------------------------------------------
  return json({
    overallScore,
    mape: Math.round(mape * 10000) / 10000,
    bias: Math.round(meanBias * 10000) / 10000,
    r2,
    totalForecasts: pairedDays.length,
    withinThreshold: { '5pct': within5, '10pct': within10, '15pct': within15 },
    dailyComparison,
    dowAnalysis,
    weeklyTrend,
    tagImpact,
    weightHistory,
    recommendations,
    selfGrading: {
      score: overallScore,
      grade: gradeFromScore(overallScore),
      breakdown: {
        accuracy: accScore,
        consistency: consScore,
        biasControl: biasCtrl,
        improvement: impScore,
        coverage: covScore,
      },
      previousScore,
      trend,
    },
  });
};
