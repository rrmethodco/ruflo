/**
 * USALI 12th Edition — Rooms Department Schedule
 *
 * Detailed revenue, labor, and expense breakdown for the Rooms department.
 * Filtered to ROOMS department dimension.
 * GL account numbers mapped to actual Sage Intacct chart of accounts.
 */

import {
  USALIDepartment,
  USALISection,
  type USALIReportDefinition,
  type ReportLineItem,
} from '../types/usali.js';
import { SUMMARY_OPERATING_STATEMENT } from './summary-operating-statement.js';

function line(
  id: string,
  label: string,
  type: ReportLineItem['type'],
  source: ReportLineItem['source'],
  opts: Partial<ReportLineItem> = {}
): ReportLineItem {
  return {
    id,
    label,
    type,
    source,
    indent: opts.indent ?? 0,
    signConvention: opts.signConvention ?? 'natural',
    bold: opts.bold,
    underline: opts.underline,
  };
}

const dept = [USALIDepartment.ROOMS];

const LINES: ReportLineItem[] = [
  // ── REVENUE ──────────────────────────────────────────────────────────

  line('header-rev', 'REVENUE', 'header', { type: 'none' }, { bold: true }),
  line('rev-transient', '  Transient Revenue', 'account', {
    type: 'gl_accounts', accounts: ['4110010', '4110020', '4110030', '4110040', '4110050'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-group', '  Group Revenue', 'account', {
    type: 'gl_accounts', accounts: ['4110100', '4110110', '4110120', '4110130', '4110140', '4110150'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-contract', '  Contract Revenue', 'account', {
    type: 'gl_accounts', accounts: ['4110200', '4110210', '4110220'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-dayuse-other', '  Day Use / Other Room Charges', 'account', {
    type: 'gl_accounts', accounts: ['4110300', '4110310', '4110320', '4110330', '4110340', '4110350', '4110360', '4110370'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-package-ancillary', '  Package & Ancillary Revenue', 'account', {
    type: 'gl_accounts', accounts: ['4110380', '4110390', '4110400', '4110410', '4110420', '4110430', '4110440', '4110450'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('total-revenue', 'TOTAL ROOMS REVENUE', 'total', {
    type: 'sum', lineIds: ['rev-transient', 'rev-group', 'rev-contract', 'rev-dayuse-other', 'rev-package-ancillary'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  // ── LABOR COSTS ──────────────────────────────────────────────────────

  line('header-labor', 'LABOR COSTS', 'header', { type: 'none' }, { bold: true }),

  // Salaries & Wages
  line('labor-salaries-base', '  Salaries/Wages (Base)', 'account', {
    type: 'gl_accounts', accounts: ['6110000'], departments: dept,
  }, { indent: 1 }),
  line('labor-salaries-ot', '  Salaries/Wages (OT)', 'account', {
    type: 'gl_accounts', accounts: ['6120000'], departments: dept,
  }, { indent: 1 }),
  line('labor-contract-temp', '  Contract/Temp Labor', 'account', {
    type: 'gl_accounts', accounts: ['6130000'], departments: dept,
  }, { indent: 1 }),
  line('total-salaries', '  Total Salaries & Wages', 'subtotal', {
    type: 'sum', lineIds: ['labor-salaries-base', 'labor-salaries-ot', 'labor-contract-temp'],
  }, { indent: 1, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  // Benefits
  line('labor-payrolltax', '  Payroll Taxes', 'account', {
    type: 'gl_accounts', accounts: ['6210000', '6220000', '6230000', '6240000', '6250000'], departments: dept,
  }, { indent: 1 }),
  line('labor-insurance', '  Employee Insurance', 'account', {
    type: 'gl_accounts', accounts: ['6310000', '6320000', '6330000', '6340000', '6350000', '6360000', '6370000', '6380000'], departments: dept,
  }, { indent: 1 }),
  line('labor-benefits', '  Benefits', 'account', {
    type: 'gl_accounts', accounts: ['6410000', '6411000', '6412000', '6413000', '6414000', '6415000', '6416000', '6417000', '6418000', '6419000', '6419100', '6419200'], departments: dept,
  }, { indent: 1 }),
  line('labor-bonuses', '  Bonuses', 'account', {
    type: 'gl_accounts', accounts: ['6510000', '6520000'], departments: dept,
  }, { indent: 1 }),
  line('labor-svccharge-dist', '  Service Charge Distribution', 'account', {
    type: 'gl_accounts', accounts: ['6610000'], departments: dept,
  }, { indent: 1 }),
  line('total-benefits', '  Total Benefits', 'subtotal', {
    type: 'sum', lineIds: ['labor-payrolltax', 'labor-insurance', 'labor-benefits', 'labor-bonuses', 'labor-svccharge-dist'],
  }, { indent: 1, underline: 'single' }),

  line('total-labor', 'TOTAL LABOR COSTS', 'total', {
    type: 'sum', lineIds: ['total-salaries', 'total-benefits'],
  }, { bold: true, underline: 'single' }),
  line('labor-pct', '  Labor Cost %', 'ratio', {
    type: 'ratio', numerator: 'total-labor', denominator: 'total-revenue', format: 'percentage',
  }, { indent: 1 }),
  line('blank-3', '', 'blank', { type: 'none' }),

  // ── OTHER EXPENSES ───────────────────────────────────────────────────

  line('header-other', 'OTHER EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-guest-amenities', '  Guest Amenities', 'account', {
    type: 'gl_accounts', accounts: ['7110000', '7111000', '7112000', '7113000', '7114000'], departments: dept,
  }, { indent: 1 }),
  line('exp-commissions-fees', '  Commissions & Fees', 'account', {
    type: 'gl_accounts', accounts: ['7410000', '7411000', '7412000', '7420000', '7421000'], departments: dept,
  }, { indent: 1 }),
  line('exp-contract-services', '  Contract Services', 'account', {
    type: 'gl_accounts', accounts: ['7501060', '7510000', '7512000', '7513000', '7514000', '7515000', '7516000', '7517000', '7518000', '7519000', '7520000'], departments: dept,
  }, { indent: 1 }),
  line('exp-uniforms', '  Uniforms', 'account', {
    type: 'gl_accounts', accounts: ['7610000', '7611000', '7612000'], departments: dept,
  }, { indent: 1 }),
  line('exp-guest-room-supplies', '  Guest Room Supplies', 'account', {
    type: 'gl_accounts', accounts: ['7310000', '7311000'], departments: dept,
  }, { indent: 1 }),
  line('exp-tv-cable', '  TV/Cable', 'account', {
    type: 'gl_accounts', accounts: ['7301150'], departments: dept,
  }, { indent: 1 }),
  line('exp-equipment-rental', '  Equipment Rental', 'account', {
    type: 'gl_accounts', accounts: ['7910000'], departments: dept,
  }, { indent: 1 }),
  line('exp-licenses-permits', '  Licenses & Permits', 'account', {
    type: 'gl_accounts', accounts: ['7920000'], departments: dept,
  }, { indent: 1 }),
  line('exp-training', '  Training', 'account', {
    type: 'gl_accounts', accounts: ['7922000'], departments: dept,
  }, { indent: 1 }),
  line('exp-other-dept', '  Other Departmental', 'account', {
    type: 'gl_accounts', accounts: ['7929000'], departments: dept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: [
      'exp-guest-amenities', 'exp-commissions-fees', 'exp-contract-services',
      'exp-uniforms', 'exp-guest-room-supplies', 'exp-tv-cable',
      'exp-equipment-rental', 'exp-licenses-permits', 'exp-training', 'exp-other-dept',
    ],
  }, { bold: true, underline: 'single' }),
  line('blank-4', '', 'blank', { type: 'none' }),

  // ── DEPARTMENT TOTALS ────────────────────────────────────────────────

  line('total-expense', 'TOTAL ROOMS EXPENSES', 'total', {
    type: 'sum', lineIds: ['total-labor', 'total-other'],
  }, { bold: true, underline: 'single' }),
  line('dept-income', 'ROOMS DEPARTMENT INCOME', 'net', {
    type: 'difference', minuend: 'total-revenue', subtrahend: 'total-expense',
  }, { bold: true, underline: 'double' }),
  line('dept-margin', '  Department Margin %', 'ratio', {
    type: 'ratio', numerator: 'dept-income', denominator: 'total-revenue', format: 'percentage',
  }, { indent: 1 }),
  line('blank-5', '', 'blank', { type: 'none' }),

  // ── STATISTICS ───────────────────────────────────────────────────────

  line('header-stats', 'STATISTICS', 'header', { type: 'none' }, { bold: true }),
  line('stat-available', '  Available Rooms', 'statistic', {
    type: 'statistic', statisticId: 'stat-available-rooms',
  }, { indent: 1 }),
  line('stat-sold', '  Rooms Sold', 'statistic', {
    type: 'statistic', statisticId: 'stat-rooms-sold',
  }, { indent: 1 }),
  line('stat-occupied', '  Occupied Rooms', 'statistic', {
    type: 'statistic', statisticId: 'stat-occupied-rooms',
  }, { indent: 1 }),
  line('stat-comp', '  Complimentary Rooms', 'statistic', {
    type: 'statistic', statisticId: 'stat-comp-rooms',
  }, { indent: 1 }),
  line('stat-ooo', '  Out of Order Rooms', 'statistic', {
    type: 'statistic', statisticId: 'stat-ooo-rooms',
  }, { indent: 1 }),
  line('stat-occupancy', '  Occupancy %', 'ratio', {
    type: 'ratio', numerator: 'stat-occupied', denominator: 'stat-available', format: 'percentage',
  }, { indent: 1 }),
  line('stat-adr', '  Average Daily Rate (ADR)', 'ratio', {
    type: 'ratio', numerator: 'total-revenue', denominator: 'stat-sold', format: 'currency',
  }, { indent: 1 }),
  line('stat-revpar', '  RevPAR', 'ratio', {
    type: 'ratio', numerator: 'total-revenue', denominator: 'stat-available', format: 'currency',
  }, { indent: 1 }),
  line('stat-cpor', '  Cost Per Occupied Room (CPOR)', 'ratio', {
    type: 'ratio', numerator: 'total-expense', denominator: 'stat-occupied', format: 'currency',
  }, { indent: 1 }),
];

export const ROOMS_DEPARTMENT: USALIReportDefinition = {
  id: 'usali-rooms',
  name: 'Rooms Department',
  description: 'USALI 12th Edition Rooms Department Schedule — Detailed revenue, labor, expenses, and operating statistics for the Rooms department.',
  usaliSection: USALISection.ROOMS,
  departments: dept,
  lines: LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};
