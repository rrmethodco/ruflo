/**
 * USALI 12th Edition — Key Performance Indicators
 *
 * Standard hospitality KPIs with formulas referencing
 * statistical accounts and revenue line items.
 */

import type { USALIStatistic, StatisticCategory } from '../types/usali.js';

// ─── Occupancy KPIs ──────────────────────────────────────────────────────────

export const OCCUPANCY_PERCENTAGE: USALIStatistic = {
  id: 'kpi-occupancy',
  name: 'Occupancy Percentage',
  abbreviation: 'OCC%',
  formula: 'stat-occupied-rooms / stat-available-rooms * 100',
  unit: 'percentage',
  description: 'Percentage of available rooms that were occupied during the period.',
  category: 'occupancy',
};

// ─── Rate KPIs ───────────────────────────────────────────────────────────────

export const AVERAGE_DAILY_RATE: USALIStatistic = {
  id: 'kpi-adr',
  name: 'Average Daily Rate',
  abbreviation: 'ADR',
  formula: 'rooms-total-revenue / stat-rooms-sold',
  unit: 'currency',
  description: 'Average revenue earned per room sold. Excludes complimentary rooms.',
  category: 'rate',
};

// ─── Revenue KPIs ────────────────────────────────────────────────────────────

export const REVPAR: USALIStatistic = {
  id: 'kpi-revpar',
  name: 'Revenue Per Available Room',
  abbreviation: 'RevPAR',
  formula: 'rooms-total-revenue / stat-available-rooms',
  unit: 'currency',
  description: 'Room revenue per available room. RevPAR = ADR x Occupancy%.',
  category: 'revenue',
};

export const TREVPAR: USALIStatistic = {
  id: 'kpi-trevpar',
  name: 'Total Revenue Per Available Room',
  abbreviation: 'TRevPAR',
  formula: 'total-hotel-revenue / stat-available-rooms',
  unit: 'currency',
  description: 'Total hotel revenue (all departments) per available room.',
  category: 'revenue',
};

export const REVPAG: USALIStatistic = {
  id: 'kpi-revpag',
  name: 'Revenue Per Available Guest',
  abbreviation: 'RevPAG',
  formula: 'total-hotel-revenue / stat-total-guests',
  unit: 'currency',
  description: 'Total hotel revenue per guest.',
  category: 'revenue',
};

export const FB_REVPOR: USALIStatistic = {
  id: 'kpi-fb-revpor',
  name: 'F&B Revenue Per Occupied Room',
  abbreviation: 'F&B RevPOR',
  formula: 'fb-total-revenue / stat-occupied-rooms',
  unit: 'currency',
  description: 'Food & Beverage revenue generated per occupied room.',
  category: 'revenue',
};

// ─── Profitability KPIs ──────────────────────────────────────────────────────

export const GOPPAR: USALIStatistic = {
  id: 'kpi-goppar',
  name: 'Gross Operating Profit Per Available Room',
  abbreviation: 'GOPPAR',
  formula: 'gop / stat-available-rooms',
  unit: 'currency',
  description: 'Gross Operating Profit divided by available rooms. Key profitability metric.',
  category: 'profitability',
};

export const GOP_MARGIN: USALIStatistic = {
  id: 'kpi-gop-margin',
  name: 'GOP Margin',
  abbreviation: 'GOP%',
  formula: 'gop / total-hotel-revenue * 100',
  unit: 'percentage',
  description: 'Gross Operating Profit as a percentage of total revenue.',
  category: 'profitability',
};

export const EBITDA_MARGIN: USALIStatistic = {
  id: 'kpi-ebitda-margin',
  name: 'EBITDA Margin',
  abbreviation: 'EBITDA%',
  formula: 'ebitda / total-hotel-revenue * 100',
  unit: 'percentage',
  description: 'EBITDA as a percentage of total revenue.',
  category: 'profitability',
};

export const NOI_MARGIN: USALIStatistic = {
  id: 'kpi-noi-margin',
  name: 'NOI Margin',
  abbreviation: 'NOI%',
  formula: 'noi / total-hotel-revenue * 100',
  unit: 'percentage',
  description: 'Net Operating Income as a percentage of total revenue.',
  category: 'profitability',
};

export const NOPPAR: USALIStatistic = {
  id: 'kpi-noppar',
  name: 'Net Operating Profit Per Available Room',
  abbreviation: 'NOPPAR',
  formula: 'noi / stat-available-rooms',
  unit: 'currency',
  description: 'Net Operating Income per available room.',
  category: 'profitability',
};

// ─── Cost KPIs ───────────────────────────────────────────────────────────────

export const CPOR: USALIStatistic = {
  id: 'kpi-cpor',
  name: 'Cost Per Occupied Room',
  abbreviation: 'CPOR',
  formula: 'rooms-total-expense / stat-occupied-rooms',
  unit: 'currency',
  description: 'Total rooms department expense per occupied room.',
  category: 'cost',
};

export const TOTAL_CPOR: USALIStatistic = {
  id: 'kpi-total-cpor',
  name: 'Total Cost Per Occupied Room',
  abbreviation: 'Total CPOR',
  formula: '(total-dept-expense + total-undistributed) / stat-occupied-rooms',
  unit: 'currency',
  description: 'All operating costs (departmental + undistributed) per occupied room.',
  category: 'cost',
};

export const FOOD_COST_PCT: USALIStatistic = {
  id: 'kpi-food-cost',
  name: 'Food Cost Percentage',
  abbreviation: 'Food%',
  formula: 'cos-food / total-food-revenue * 100',
  unit: 'percentage',
  description: 'Cost of food as a percentage of food revenue.',
  category: 'cost',
};

export const BEVERAGE_COST_PCT: USALIStatistic = {
  id: 'kpi-bev-cost',
  name: 'Beverage Cost Percentage',
  abbreviation: 'Bev%',
  formula: 'cos-beverage / total-bev-revenue * 100',
  unit: 'percentage',
  description: 'Cost of beverage as a percentage of beverage revenue.',
  category: 'cost',
};

// ─── Labor KPIs ──────────────────────────────────────────────────────────────

export const LABOR_COST_PCT: USALIStatistic = {
  id: 'kpi-labor-pct',
  name: 'Total Labor Cost Percentage',
  abbreviation: 'Labor%',
  formula: 'total-labor-all-depts / total-hotel-revenue * 100',
  unit: 'percentage',
  description: 'Total labor cost (all departments) as percentage of total revenue.',
  category: 'labor',
};

export const LABOR_CPOR: USALIStatistic = {
  id: 'kpi-labor-cpor',
  name: 'Labor Cost Per Occupied Room',
  abbreviation: 'Labor CPOR',
  formula: 'total-labor-all-depts / stat-occupied-rooms',
  unit: 'currency',
  description: 'Total labor cost per occupied room.',
  category: 'labor',
};

export const REVENUE_PER_FTE: USALIStatistic = {
  id: 'kpi-rev-per-fte',
  name: 'Revenue Per FTE',
  abbreviation: 'Rev/FTE',
  formula: 'total-hotel-revenue / stat-fte',
  unit: 'currency',
  description: 'Total revenue generated per full-time equivalent employee.',
  category: 'labor',
};

// ─── All KPIs ────────────────────────────────────────────────────────────────

export const ALL_KPIS: USALIStatistic[] = [
  // Occupancy
  OCCUPANCY_PERCENTAGE,
  // Rate
  AVERAGE_DAILY_RATE,
  // Revenue
  REVPAR,
  TREVPAR,
  REVPAG,
  FB_REVPOR,
  // Profitability
  GOPPAR,
  GOP_MARGIN,
  EBITDA_MARGIN,
  NOI_MARGIN,
  NOPPAR,
  // Cost
  CPOR,
  TOTAL_CPOR,
  FOOD_COST_PCT,
  BEVERAGE_COST_PCT,
  // Labor
  LABOR_COST_PCT,
  LABOR_CPOR,
  REVENUE_PER_FTE,
];

/** Get KPIs by category */
export function getKPIsByCategory(category: StatisticCategory): USALIStatistic[] {
  return ALL_KPIS.filter(k => k.category === category);
}

/** Get a specific KPI by ID */
export function getKPI(id: string): USALIStatistic | undefined {
  return ALL_KPIS.find(k => k.id === id);
}

/**
 * Calculate a KPI value from provided data points.
 * Returns null if required data is missing.
 */
export function calculateKPI(
  kpi: USALIStatistic,
  data: Record<string, number>
): number | null {
  // Parse formula: "numerator / denominator" or "numerator / denominator * 100"
  const parts = kpi.formula.split('/').map(s => s.trim());
  if (parts.length !== 2) return null;

  const numeratorKey = parts[0];
  const denominatorParts = parts[1].split('*').map(s => s.trim());
  const denominatorKey = denominatorParts[0];
  const multiplier = denominatorParts.length > 1 ? parseFloat(denominatorParts[1]) : 1;

  // Handle compound numerator: (a + b)
  let numerator: number;
  if (numeratorKey.startsWith('(') && numeratorKey.endsWith(')')) {
    const inner = numeratorKey.slice(1, -1);
    const addends = inner.split('+').map(s => s.trim());
    numerator = addends.reduce((sum, key) => {
      const val = data[key];
      return val !== undefined ? sum + val : NaN;
    }, 0);
  } else {
    const val = data[numeratorKey];
    if (val === undefined) return null;
    numerator = val;
  }

  const denominator = data[denominatorKey];
  if (denominator === undefined || denominator === 0 || isNaN(numerator)) return null;

  return (numerator / denominator) * multiplier;
}
