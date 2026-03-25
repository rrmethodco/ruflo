/**
 * USALI 12th Edition — Food & Beverage Department Schedule
 *
 * Detailed revenue, cost of sales, labor, and expense breakdown.
 * Uses actual Sage Intacct GL account numbers.
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
  line('rev-food-restaurant', '  Restaurant Food', 'account', {
    type: 'gl_accounts', accounts: ['4210000', '4210010', '4210020', '4210030', '4210040'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-food-banquet', '  Banquet Food', 'account', {
    type: 'gl_accounts', accounts: ['4210100'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-food-ird', '  IRD Food', 'account', {
    type: 'gl_accounts', accounts: ['4210200'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-food-minibar', '  Minibar Food', 'account', {
    type: 'gl_accounts', accounts: ['4210260'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-food-retail', '  Retail/Takeaway Food', 'account', {
    type: 'gl_accounts', accounts: ['4210310', '4210320'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('total-food-rev', 'TOTAL FOOD REVENUE', 'subtotal', {
    type: 'sum', lineIds: ['rev-food-restaurant', 'rev-food-banquet', 'rev-food-ird', 'rev-food-minibar', 'rev-food-retail'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  // ── BEVERAGE REVENUE ─────────────────────────────────────────────────

  line('header-bev-rev', 'BEVERAGE REVENUE', 'header', { type: 'none' }, { bold: true }),
  line('rev-bev-restaurant', '  Restaurant Beverage', 'account', {
    type: 'gl_accounts', accounts: ['4210050', '4210060', '4210070', '4210080', '4210090'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-bev-banquet', '  Banquet Beverage', 'account', {
    type: 'gl_accounts', accounts: ['4210110', '4210120', '4210130', '4210140'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-bev-ird', '  IRD Beverage', 'account', {
    type: 'gl_accounts', accounts: ['4210210', '4210220', '4210230', '4210240'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-bev-minibar', '  Minibar Beverage', 'account', {
    type: 'gl_accounts', accounts: ['4210270', '4210280', '4210290', '4210300'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('total-bev-rev', 'TOTAL BEVERAGE REVENUE', 'subtotal', {
    type: 'sum', lineIds: ['rev-bev-restaurant', 'rev-bev-banquet', 'rev-bev-ird', 'rev-bev-minibar'],
  }, { bold: true, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  // ── OTHER F&B REVENUE ────────────────────────────────────────────────

  line('header-other-rev', 'OTHER F&B REVENUE', 'header', { type: 'none' }, { bold: true }),
  line('rev-other-banquet-svc', '  Banquet Service Charges', 'account', {
    type: 'gl_accounts', accounts: ['4210150'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-other-banquet-room', '  Banquet Room Rental', 'account', {
    type: 'gl_accounts', accounts: ['4210160'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-other-banquet-av', '  Banquet AV/Setup', 'account', {
    type: 'gl_accounts', accounts: ['4210170'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-other-outside-catering', '  Outside Catering', 'account', {
    type: 'gl_accounts', accounts: ['4210180'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-other-banquet-other', '  Other Banquet', 'account', {
    type: 'gl_accounts', accounts: ['4210190'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-other-ird-svc', '  IRD Service Charge', 'account', {
    type: 'gl_accounts', accounts: ['4210250'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('rev-other-corkage-misc', '  Corkage/Cover/Misc', 'account', {
    type: 'gl_accounts', accounts: ['4210330', '4210340', '4210350'], departments: dept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('total-other-rev', 'TOTAL OTHER F&B REVENUE', 'subtotal', {
    type: 'sum', lineIds: [
      'rev-other-banquet-svc', 'rev-other-banquet-room', 'rev-other-banquet-av',
      'rev-other-outside-catering', 'rev-other-banquet-other', 'rev-other-ird-svc',
      'rev-other-corkage-misc',
    ],
  }, { bold: true, underline: 'single' }),
  line('blank-3', '', 'blank', { type: 'none' }),

  // ── TOTAL F&B REVENUE ────────────────────────────────────────────────

  line('total-revenue', 'TOTAL F&B REVENUE', 'total', {
    type: 'sum', lineIds: ['total-food-rev', 'total-bev-rev', 'total-other-rev'],
  }, { bold: true, underline: 'double' }),
  line('blank-4', '', 'blank', { type: 'none' }),

  // ── COST OF SALES ────────────────────────────────────────────────────

  line('header-cos', 'COST OF SALES', 'header', { type: 'none' }, { bold: true }),
  line('cos-food', '  Cost of Food', 'account', {
    type: 'gl_accounts', accounts: ['5101000'], departments: dept,
  }, { indent: 1 }),
  line('cos-wine', '  Cost of Wine', 'account', {
    type: 'gl_accounts', accounts: ['5201000'], departments: dept,
  }, { indent: 1 }),
  line('cos-liquor', '  Cost of Liquor', 'account', {
    type: 'gl_accounts', accounts: ['5301000'], departments: dept,
  }, { indent: 1 }),
  line('cos-beer', '  Cost of Beer', 'account', {
    type: 'gl_accounts', accounts: ['5401000'], departments: dept,
  }, { indent: 1 }),
  line('cos-na', '  Cost of Non-Alcoholic', 'account', {
    type: 'gl_accounts', accounts: ['5501000'], departments: dept,
  }, { indent: 1 }),
  line('cos-minibar', '  Cost of Minibar', 'account', {
    type: 'gl_accounts', accounts: ['5601000'], departments: dept,
  }, { indent: 1 }),
  line('cos-ird', '  Cost of IRD', 'account', {
    type: 'gl_accounts', accounts: ['5701000'], departments: dept,
  }, { indent: 1 }),
  line('cos-retail', '  Cost of Retail', 'account', {
    type: 'gl_accounts', accounts: ['5801000'], departments: dept,
  }, { indent: 1 }),

  line('total-cos-food', '  Total Cost of Food', 'subtotal', {
    type: 'sum', lineIds: ['cos-food'],
  }, { indent: 1, underline: 'single' }),
  line('total-cos-bev', '  Total Cost of Beverage', 'subtotal', {
    type: 'sum', lineIds: ['cos-wine', 'cos-liquor', 'cos-beer', 'cos-na'],
  }, { indent: 1, underline: 'single' }),

  line('total-cos', 'TOTAL COST OF SALES', 'total', {
    type: 'sum', lineIds: ['cos-food', 'cos-wine', 'cos-liquor', 'cos-beer', 'cos-na', 'cos-minibar', 'cos-ird', 'cos-retail'],
  }, { bold: true, underline: 'single' }),

  line('cos-food-pct', '  Food Cost %', 'ratio', {
    type: 'ratio', numerator: 'total-cos-food', denominator: 'total-food-rev', format: 'percentage',
  }, { indent: 1 }),
  line('cos-bev-pct', '  Beverage Cost %', 'ratio', {
    type: 'ratio', numerator: 'total-cos-bev', denominator: 'total-bev-rev', format: 'percentage',
  }, { indent: 1 }),
  line('blank-5', '', 'blank', { type: 'none' }),

  line('gross-profit', 'GROSS PROFIT', 'net', {
    type: 'difference', minuend: 'total-revenue', subtrahend: 'total-cos',
  }, { bold: true, underline: 'single' }),
  line('blank-6', '', 'blank', { type: 'none' }),

  // ── LABOR COSTS ──────────────────────────────────────────────────────

  line('header-labor', 'LABOR COSTS', 'header', { type: 'none' }, { bold: true }),

  // Salaries & Wages
  line('labor-salaries-mgmt', '  Salaries - Management', 'account', {
    type: 'gl_accounts', accounts: ['6110000'], departments: dept,
  }, { indent: 1 }),
  line('labor-salaries-staff', '  Wages - Hourly Staff', 'account', {
    type: 'gl_accounts', accounts: ['6120000'], departments: dept,
  }, { indent: 1 }),
  line('labor-overtime', '  Overtime', 'account', {
    type: 'gl_accounts', accounts: ['6130000'], departments: dept,
  }, { indent: 1 }),
  line('total-salaries', '  Total Salaries & Wages', 'subtotal', {
    type: 'sum', lineIds: ['labor-salaries-mgmt', 'labor-salaries-staff', 'labor-overtime'],
  }, { indent: 1, underline: 'single' }),

  // Payroll Taxes
  line('labor-tax-fica', '  FICA/Social Security', 'account', {
    type: 'gl_accounts', accounts: ['6210000'], departments: dept,
  }, { indent: 1 }),
  line('labor-tax-medicare', '  Medicare', 'account', {
    type: 'gl_accounts', accounts: ['6220000'], departments: dept,
  }, { indent: 1 }),
  line('labor-tax-futa', '  FUTA', 'account', {
    type: 'gl_accounts', accounts: ['6230000'], departments: dept,
  }, { indent: 1 }),
  line('labor-tax-suta', '  SUTA', 'account', {
    type: 'gl_accounts', accounts: ['6240000'], departments: dept,
  }, { indent: 1 }),
  line('labor-tax-other', '  Other Payroll Taxes', 'account', {
    type: 'gl_accounts', accounts: ['6250000'], departments: dept,
  }, { indent: 1 }),
  line('total-taxes', '  Total Payroll Taxes', 'subtotal', {
    type: 'sum', lineIds: ['labor-tax-fica', 'labor-tax-medicare', 'labor-tax-futa', 'labor-tax-suta', 'labor-tax-other'],
  }, { indent: 1, underline: 'single' }),

  // Insurance
  line('labor-ins-health', '  Health Insurance', 'account', {
    type: 'gl_accounts', accounts: ['6310000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ins-dental', '  Dental Insurance', 'account', {
    type: 'gl_accounts', accounts: ['6320000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ins-vision', '  Vision Insurance', 'account', {
    type: 'gl_accounts', accounts: ['6330000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ins-life', '  Life Insurance', 'account', {
    type: 'gl_accounts', accounts: ['6340000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ins-disability', '  Disability Insurance', 'account', {
    type: 'gl_accounts', accounts: ['6350000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ins-workcomp', '  Workers Compensation', 'account', {
    type: 'gl_accounts', accounts: ['6360000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ins-epli', '  EPLI', 'account', {
    type: 'gl_accounts', accounts: ['6370000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ins-other', '  Other Insurance', 'account', {
    type: 'gl_accounts', accounts: ['6380000'], departments: dept,
  }, { indent: 1 }),
  line('total-insurance', '  Total Insurance', 'subtotal', {
    type: 'sum', lineIds: [
      'labor-ins-health', 'labor-ins-dental', 'labor-ins-vision', 'labor-ins-life',
      'labor-ins-disability', 'labor-ins-workcomp', 'labor-ins-epli', 'labor-ins-other',
    ],
  }, { indent: 1, underline: 'single' }),

  // Benefits
  line('labor-ben-401k', '  401(k) Match', 'account', {
    type: 'gl_accounts', accounts: ['6410000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ben-meals', '  Employee Meals', 'account', {
    type: 'gl_accounts', accounts: ['6411000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ben-housing', '  Employee Housing', 'account', {
    type: 'gl_accounts', accounts: ['6412000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ben-tuition', '  Tuition Reimbursement', 'account', {
    type: 'gl_accounts', accounts: ['6413000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ben-wellness', '  Wellness Programs', 'account', {
    type: 'gl_accounts', accounts: ['6414000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ben-eap', '  Employee Assistance', 'account', {
    type: 'gl_accounts', accounts: ['6415000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ben-relocation', '  Relocation', 'account', {
    type: 'gl_accounts', accounts: ['6416000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ben-parking', '  Employee Parking', 'account', {
    type: 'gl_accounts', accounts: ['6417000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ben-transit', '  Transit Benefits', 'account', {
    type: 'gl_accounts', accounts: ['6418000'], departments: dept,
  }, { indent: 1 }),
  line('labor-ben-other', '  Other Benefits', 'account', {
    type: 'gl_accounts', accounts: ['6419200'], departments: dept,
  }, { indent: 1 }),
  line('total-benefits', '  Total Benefits', 'subtotal', {
    type: 'sum', lineIds: [
      'labor-ben-401k', 'labor-ben-meals', 'labor-ben-housing', 'labor-ben-tuition',
      'labor-ben-wellness', 'labor-ben-eap', 'labor-ben-relocation', 'labor-ben-parking',
      'labor-ben-transit', 'labor-ben-other',
    ],
  }, { indent: 1, underline: 'single' }),

  // Bonuses
  line('labor-bonus-mgmt', '  Management Bonuses', 'account', {
    type: 'gl_accounts', accounts: ['6510000'], departments: dept,
  }, { indent: 1 }),
  line('labor-bonus-staff', '  Staff Bonuses', 'account', {
    type: 'gl_accounts', accounts: ['6520000'], departments: dept,
  }, { indent: 1 }),
  line('total-bonuses', '  Total Bonuses', 'subtotal', {
    type: 'sum', lineIds: ['labor-bonus-mgmt', 'labor-bonus-staff'],
  }, { indent: 1, underline: 'single' }),

  // Service Charge Distribution
  line('labor-svccharge', '  Service Charge Distribution', 'account', {
    type: 'gl_accounts', accounts: ['6610000'], departments: dept,
  }, { indent: 1 }),

  line('total-labor', 'TOTAL LABOR COSTS', 'total', {
    type: 'sum', lineIds: ['total-salaries', 'total-taxes', 'total-insurance', 'total-benefits', 'total-bonuses', 'labor-svccharge'],
  }, { bold: true, underline: 'single' }),
  line('labor-pct', '  Labor Cost %', 'ratio', {
    type: 'ratio', numerator: 'total-labor', denominator: 'total-revenue', format: 'percentage',
  }, { indent: 1 }),
  line('blank-7', '', 'blank', { type: 'none' }),

  // ── OTHER EXPENSES ───────────────────────────────────────────────────

  line('header-other', 'OTHER EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-kitchen-supplies', '  Kitchen Supplies', 'account', {
    type: 'gl_accounts', accounts: ['7210000', '7211000', '7212000', '7213000'], departments: dept,
  }, { indent: 1 }),
  line('exp-china-glass', '  China/Glass/Silver', 'account', {
    type: 'gl_accounts', accounts: ['7311000'], departments: dept,
  }, { indent: 1 }),
  line('exp-kitchen-smallwares', '  Kitchen Smallwares', 'account', {
    type: 'gl_accounts', accounts: ['7312000'], departments: dept,
  }, { indent: 1 }),
  line('exp-banquet-equip', '  Banquet Equipment', 'account', {
    type: 'gl_accounts', accounts: ['7313000'], departments: dept,
  }, { indent: 1 }),
  line('exp-decor-floral', '  Decor/Floral', 'account', {
    type: 'gl_accounts', accounts: ['7710000', '7711000', '7712000', '7714000'], departments: dept,
  }, { indent: 1 }),
  line('exp-equip-rental', '  Equipment Rental', 'account', {
    type: 'gl_accounts', accounts: ['7791000', '7791010', '7791020', '7791030'], departments: dept,
  }, { indent: 1 }),
  line('exp-uniforms', '  Uniforms', 'account', {
    type: 'gl_accounts', accounts: ['7610000', '7611000', '7612000'], departments: dept,
  }, { indent: 1 }),
  line('exp-guest-services', '  Guest Services', 'account', {
    type: 'gl_accounts', accounts: ['7811000', '7812000'], departments: dept,
  }, { indent: 1 }),
  line('exp-licenses', '  Licenses', 'account', {
    type: 'gl_accounts', accounts: ['7920000'], departments: dept,
  }, { indent: 1 }),
  line('exp-training', '  Training', 'account', {
    type: 'gl_accounts', accounts: ['7922000'], departments: dept,
  }, { indent: 1 }),
  line('exp-other', '  Other', 'account', {
    type: 'gl_accounts', accounts: ['7929000'], departments: dept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: [
      'exp-kitchen-supplies', 'exp-china-glass', 'exp-kitchen-smallwares', 'exp-banquet-equip',
      'exp-decor-floral', 'exp-equip-rental', 'exp-uniforms', 'exp-guest-services',
      'exp-licenses', 'exp-training', 'exp-other',
    ],
  }, { bold: true, underline: 'single' }),
  line('blank-8', '', 'blank', { type: 'none' }),

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
  line('blank-9', '', 'blank', { type: 'none' }),

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
