/**
 * USALI 12th Edition — Food & Beverage Department Schedule
 *
 * Detailed revenue, cost of sales, labor, and expense breakdown.
 * Shows food and beverage separately per USALI guidelines.
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

const dept = [USALIDepartment.FOOD_AND_BEVERAGE];

const LINES: ReportLineItem[] = [
  // ── FOOD REVENUE ─────────────────────────────────────────────────────

  line('header-food-rev', 'FOOD REVENUE', 'header', { type: 'none' }, { bold: true }),
  line('rev-food-restaurant', '  Restaurant', 'account', {
    type: 'gl_accounts', accounts: ['4100'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-food-banquet', '  Banquet/Catering', 'account', {
    type: 'gl_accounts', accounts: ['4110'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-food-roomservice', '  Room Service/In-Room Dining', 'account', {
    type: 'gl_accounts', accounts: ['4120'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-food-minibar', '  Mini Bar - Food', 'account', {
    type: 'gl_accounts', accounts: ['4130'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-food-other', '  Other Food Revenue', 'account', {
    type: 'gl_accounts', accounts: ['4140'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('total-food-rev', 'TOTAL FOOD REVENUE', 'subtotal', {
    type: 'sum', lineIds: ['rev-food-restaurant', 'rev-food-banquet', 'rev-food-roomservice', 'rev-food-minibar', 'rev-food-other'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  // ── BEVERAGE REVENUE ─────────────────────────────────────────────────

  line('header-bev-rev', 'BEVERAGE REVENUE', 'header', { type: 'none' }, { bold: true }),
  line('rev-bev-restaurant', '  Restaurant', 'account', {
    type: 'gl_accounts', accounts: ['4150'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-bev-banquet', '  Banquet/Catering', 'account', {
    type: 'gl_accounts', accounts: ['4160'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-bev-bar', '  Lounge/Bar', 'account', {
    type: 'gl_accounts', accounts: ['4170'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-bev-minibar', '  Mini Bar - Beverage', 'account', {
    type: 'gl_accounts', accounts: ['4180'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('total-bev-rev', 'TOTAL BEVERAGE REVENUE', 'subtotal', {
    type: 'sum', lineIds: ['rev-bev-restaurant', 'rev-bev-banquet', 'rev-bev-bar', 'rev-bev-minibar'],
  }, { bold: true, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  // Service Charges & Allowances
  line('rev-svccharge', '  Service Charges', 'account', {
    type: 'gl_accounts', accounts: ['4190'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-allowances', '  Less: Allowances', 'account', {
    type: 'gl_accounts', accounts: ['4195'], departments: dept,
  }, { indent: 1 }),
  line('total-revenue', 'TOTAL F&B REVENUE', 'total', {
    type: 'sum', lineIds: ['total-food-rev', 'total-bev-rev', 'rev-svccharge', 'rev-allowances'],
  }, { bold: true, underline: 'double' }),
  line('blank-3', '', 'blank', { type: 'none' }),

  // ── COST OF SALES ────────────────────────────────────────────────────

  line('header-cos', 'COST OF SALES', 'header', { type: 'none' }, { bold: true }),
  line('cos-food', '  Cost of Food', 'account', {
    type: 'gl_accounts', accounts: ['5100'], departments: dept,
  }, { indent: 1 }),
  line('cos-food-pct', '    Food Cost %', 'ratio', {
    type: 'ratio', numerator: 'cos-food', denominator: 'total-food-rev', format: 'percentage',
  }, { indent: 2 }),
  line('cos-beverage', '  Cost of Beverage', 'account', {
    type: 'gl_accounts', accounts: ['5150'], departments: dept,
  }, { indent: 1 }),
  line('cos-bev-pct', '    Beverage Cost %', 'ratio', {
    type: 'ratio', numerator: 'cos-beverage', denominator: 'total-bev-rev', format: 'percentage',
  }, { indent: 2 }),
  line('total-cos', 'TOTAL COST OF SALES', 'total', {
    type: 'sum', lineIds: ['cos-food', 'cos-beverage'],
  }, { bold: true, underline: 'single' }),
  line('total-cos-pct', '  Combined Cost of Sales %', 'ratio', {
    type: 'ratio', numerator: 'total-cos', denominator: 'total-revenue', format: 'percentage',
  }, { indent: 1 }),
  line('blank-4', '', 'blank', { type: 'none' }),

  line('gross-profit', 'GROSS PROFIT', 'net', {
    type: 'difference', minuend: 'total-revenue', subtrahend: 'total-cos',
  }, { bold: true, underline: 'single' }),
  line('blank-5', '', 'blank', { type: 'none' }),

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
  line('blank-6', '', 'blank', { type: 'none' }),

  // ── OTHER EXPENSES ───────────────────────────────────────────────────

  line('header-other', 'OTHER EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-china-glass', '  China, Glass & Silver', 'account', {
    type: 'gl_accounts', accounts: ['7000'], departments: dept,
  }, { indent: 1 }),
  line('exp-cleaning', '  Cleaning Supplies', 'account', {
    type: 'gl_accounts', accounts: ['7010'], departments: dept,
  }, { indent: 1 }),
  line('exp-decorations', '  Decorations & Flowers', 'account', {
    type: 'gl_accounts', accounts: ['7100'], departments: dept,
  }, { indent: 1 }),
  line('exp-laundry', '  Laundry & Linen', 'account', {
    type: 'gl_accounts', accounts: ['7020'], departments: dept,
  }, { indent: 1 }),
  line('exp-uniforms', '  Uniforms', 'account', {
    type: 'gl_accounts', accounts: ['7030'], departments: dept,
  }, { indent: 1 }),
  line('exp-operating-supplies', '  Operating Supplies', 'account', {
    type: 'gl_accounts', accounts: ['7110'], departments: dept,
  }, { indent: 1 }),
  line('exp-printing', '  Printing & Menus', 'account', {
    type: 'gl_accounts', accounts: ['7120'], departments: dept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: ['exp-china-glass', 'exp-cleaning', 'exp-decorations', 'exp-laundry', 'exp-uniforms', 'exp-operating-supplies', 'exp-printing'],
  }, { bold: true, underline: 'single' }),
  line('blank-7', '', 'blank', { type: 'none' }),

  // ── DEPARTMENT TOTALS ────────────────────────────────────────────────

  line('total-expense', 'TOTAL F&B EXPENSES', 'total', {
    type: 'sum', lineIds: ['total-cos', 'total-labor', 'total-other'],
  }, { bold: true, underline: 'single' }),
  line('dept-income', 'F&B DEPARTMENT INCOME', 'net', {
    type: 'difference', minuend: 'total-revenue', subtrahend: 'total-expense',
  }, { bold: true, underline: 'double' }),
  line('dept-margin', '  Department Margin %', 'ratio', {
    type: 'ratio', numerator: 'dept-income', denominator: 'total-revenue', format: 'percentage',
  }, { indent: 1 }),
  line('blank-8', '', 'blank', { type: 'none' }),

  // ── STATISTICS ───────────────────────────────────────────────────────

  line('header-stats', 'STATISTICS', 'header', { type: 'none' }, { bold: true }),
  line('stat-covers-restaurant', '  Restaurant Covers', 'statistic', {
    type: 'statistic', statisticId: 'stat-covers-restaurant',
  }, { indent: 1 }),
  line('stat-covers-banquet', '  Banquet Covers', 'statistic', {
    type: 'statistic', statisticId: 'stat-covers-banquet',
  }, { indent: 1 }),
  line('stat-avg-check-food', '  Avg Check - Food', 'ratio', {
    type: 'ratio', numerator: 'total-food-rev', denominator: 'stat-covers-restaurant', format: 'currency',
  }, { indent: 1 }),
  line('stat-rev-per-occupied', '  F&B Revenue per Occupied Room', 'ratio', {
    type: 'ratio', numerator: 'total-revenue', denominator: 'stat-occupied-rooms', format: 'currency',
  }, { indent: 1 }),
];

export const FOOD_BEVERAGE_DEPARTMENT: USALIReportDefinition = {
  id: 'usali-fb',
  name: 'Food & Beverage Department',
  description: 'USALI 12th Edition Food & Beverage Department Schedule — Revenue by outlet, cost of sales, labor, and operating expenses with food/beverage cost percentages.',
  usaliSection: USALISection.FOOD_AND_BEVERAGE,
  departments: dept,
  lines: LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};
