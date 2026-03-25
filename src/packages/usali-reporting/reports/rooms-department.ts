/**
 * USALI 12th Edition — Rooms Department Schedule
 *
 * Detailed revenue, labor, and expense breakdown for the Rooms department.
 * Filtered to ROOMS department dimension.
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
  line('rev-transient', '  Transient Room Revenue', 'account', {
    type: 'gl_accounts', accounts: ['4000'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-group', '  Group Room Revenue', 'account', {
    type: 'gl_accounts', accounts: ['4010'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-contract', '  Contract Room Revenue', 'account', {
    type: 'gl_accounts', accounts: ['4020'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-other', '  Other Room Revenue', 'account', {
    type: 'gl_accounts', accounts: ['4030'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-noshow', '  No-Show Revenue', 'account', {
    type: 'gl_accounts', accounts: ['4040'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-cancel', '  Cancellation Revenue', 'account', {
    type: 'gl_accounts', accounts: ['4050'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-svccharge', '  Service Charges', 'account', {
    type: 'gl_accounts', accounts: ['4060'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-allowances', '  Less: Allowances', 'account', {
    type: 'gl_accounts', accounts: ['4090'], departments: dept,
  }, { indent: 1 }),
  line('total-revenue', 'TOTAL ROOMS REVENUE', 'total', {
    type: 'sum', lineIds: ['rev-transient', 'rev-group', 'rev-contract', 'rev-other', 'rev-noshow', 'rev-cancel', 'rev-svccharge', 'rev-allowances'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  // ── LABOR COSTS ──────────────────────────────────────────────────────

  line('header-labor', 'LABOR COSTS', 'header', { type: 'none' }, { bold: true }),
  line('labor-salaries-mgmt', '  Salaries - Management', 'account', {
    type: 'gl_accounts', accounts: ['6000'], departments: dept,
  }, { indent: 1 }),
  line('labor-salaries-staff', '  Wages - Staff', 'account', {
    type: 'gl_accounts', accounts: ['6010'], departments: dept,
  }, { indent: 1 }),
  line('labor-overtime', '  Overtime', 'account', {
    type: 'gl_accounts', accounts: ['6020'], departments: dept,
  }, { indent: 1 }),
  line('labor-vacation', '  Vacation & Holiday Pay', 'account', {
    type: 'gl_accounts', accounts: ['6030'], departments: dept,
  }, { indent: 1 }),
  line('labor-bonuses', '  Bonuses & Incentives', 'account', {
    type: 'gl_accounts', accounts: ['6050'], departments: dept,
  }, { indent: 1 }),
  line('labor-svccharge-dist', '  Service Charge Distribution', 'account', {
    type: 'gl_accounts', accounts: ['6060'], departments: dept,
  }, { indent: 1 }),
  line('labor-contract', '  Contract Labor', 'account', {
    type: 'gl_accounts', accounts: ['6070'], departments: dept,
  }, { indent: 1 }),
  line('total-salaries', '  Total Salaries & Wages', 'subtotal', {
    type: 'sum', lineIds: ['labor-salaries-mgmt', 'labor-salaries-staff', 'labor-overtime', 'labor-vacation', 'labor-bonuses', 'labor-svccharge-dist', 'labor-contract'],
  }, { indent: 1, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  // Benefits
  line('labor-payrolltax', '  Payroll Taxes', 'account', {
    type: 'gl_accounts', accounts: ['6100'], departments: dept,
  }, { indent: 1 }),
  line('labor-health', '  Employee Health Insurance', 'account', {
    type: 'gl_accounts', accounts: ['6110'], departments: dept,
  }, { indent: 1 }),
  line('labor-workcomp', '  Workers Compensation', 'account', {
    type: 'gl_accounts', accounts: ['6120'], departments: dept,
  }, { indent: 1 }),
  line('labor-retirement', '  Retirement/401k', 'account', {
    type: 'gl_accounts', accounts: ['6130'], departments: dept,
  }, { indent: 1 }),
  line('labor-meals', '  Employee Meals', 'account', {
    type: 'gl_accounts', accounts: ['6140'], departments: dept,
  }, { indent: 1 }),
  line('labor-training', '  Employee Training', 'account', {
    type: 'gl_accounts', accounts: ['6150'], departments: dept,
  }, { indent: 1 }),
  line('labor-other', '  Other Benefits', 'account', {
    type: 'gl_accounts', accounts: ['6170'], departments: dept,
  }, { indent: 1 }),
  line('total-benefits', '  Total Benefits', 'subtotal', {
    type: 'sum', lineIds: ['labor-payrolltax', 'labor-health', 'labor-workcomp', 'labor-retirement', 'labor-meals', 'labor-training', 'labor-other'],
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
  line('exp-guest-supplies', '  Guest Supplies', 'account', {
    type: 'gl_accounts', accounts: ['7000'], departments: dept,
  }, { indent: 1 }),
  line('exp-cleaning', '  Cleaning Supplies', 'account', {
    type: 'gl_accounts', accounts: ['7010'], departments: dept,
  }, { indent: 1 }),
  line('exp-laundry', '  Laundry & Linen', 'account', {
    type: 'gl_accounts', accounts: ['7020'], departments: dept,
  }, { indent: 1 }),
  line('exp-uniforms', '  Uniforms', 'account', {
    type: 'gl_accounts', accounts: ['7030'], departments: dept,
  }, { indent: 1 }),
  line('exp-commissions', '  Commissions', 'account', {
    type: 'gl_accounts', accounts: ['7040'], departments: dept,
  }, { indent: 1 }),
  line('exp-reservations', '  Reservation Costs', 'account', {
    type: 'gl_accounts', accounts: ['7050'], departments: dept,
  }, { indent: 1 }),
  line('exp-ta-commissions', '  Travel Agent Commissions', 'account', {
    type: 'gl_accounts', accounts: ['7060'], departments: dept,
  }, { indent: 1 }),
  line('exp-ota-commissions', '  OTA Commissions', 'account', {
    type: 'gl_accounts', accounts: ['7070'], departments: dept,
  }, { indent: 1 }),
  line('exp-cc-commissions', '  Credit Card Commissions', 'account', {
    type: 'gl_accounts', accounts: ['7080'], departments: dept,
  }, { indent: 1 }),
  line('exp-complimentary', '  Complimentary Services', 'account', {
    type: 'gl_accounts', accounts: ['7090'], departments: dept,
  }, { indent: 1 }),
  line('exp-operating-supplies', '  Operating Supplies', 'account', {
    type: 'gl_accounts', accounts: ['7110'], departments: dept,
  }, { indent: 1 }),
  line('exp-telecom', '  Telecommunications', 'account', {
    type: 'gl_accounts', accounts: ['7140'], departments: dept,
  }, { indent: 1 }),
  line('exp-transportation', '  Transportation', 'account', {
    type: 'gl_accounts', accounts: ['7150'], departments: dept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: ['exp-guest-supplies', 'exp-cleaning', 'exp-laundry', 'exp-uniforms', 'exp-commissions', 'exp-reservations', 'exp-ta-commissions', 'exp-ota-commissions', 'exp-cc-commissions', 'exp-complimentary', 'exp-operating-supplies', 'exp-telecom', 'exp-transportation'],
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
