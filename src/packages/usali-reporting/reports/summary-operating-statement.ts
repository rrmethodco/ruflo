/**
 * USALI 12th Edition — Summary Operating Statement
 *
 * The top-level P&L view showing:
 *   Total Revenue
 * - Departmental Expenses → Departmental Income (GOP before undistributed)
 * - Undistributed Operating Expenses → Gross Operating Profit (GOP)
 * - Management Fees → Income Before Non-Operating I&E
 * - Non-Operating I&E → EBITDA
 * - Fixed Charges → Net Operating Income (NOI)
 */

import {
  USALIDepartment,
  USALISection,
  type USALIReportDefinition,
  type ReportLineItem,
  type ReportColumn,
} from '../types/usali.js';

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

const LINES: ReportLineItem[] = [
  // ── OPERATED DEPARTMENTS ─────────────────────────────────────────────

  line('header-operated', 'OPERATED DEPARTMENTS', 'header', { type: 'none' }, { bold: true }),
  line('blank-1', '', 'blank', { type: 'none' }),

  // Rooms
  line('rooms-revenue', '  Rooms Revenue', 'account', {
    type: 'gl_range', from: '4000', to: '4099',
    departments: [USALIDepartment.ROOMS],
  }, { indent: 1, signConvention: 'reversed' }),
  line('rooms-expense', '  Rooms Expense', 'account', {
    type: 'gl_range', from: '5000', to: '7199',
    departments: [USALIDepartment.ROOMS],
  }, { indent: 1 }),
  line('rooms-dept-income', '  Rooms Department Income', 'net', {
    type: 'difference', minuend: 'rooms-revenue', subtrahend: 'rooms-expense',
  }, { indent: 1, bold: true, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  // Food & Beverage
  line('fb-revenue', '  Food & Beverage Revenue', 'account', {
    type: 'gl_range', from: '4100', to: '4199',
    departments: [USALIDepartment.FOOD_AND_BEVERAGE],
  }, { indent: 1, signConvention: 'reversed' }),
  line('fb-expense', '  Food & Beverage Expense', 'account', {
    type: 'gl_range', from: '5100', to: '7199',
    departments: [USALIDepartment.FOOD_AND_BEVERAGE],
  }, { indent: 1 }),
  line('fb-dept-income', '  Food & Beverage Department Income', 'net', {
    type: 'difference', minuend: 'fb-revenue', subtrahend: 'fb-expense',
  }, { indent: 1, bold: true, underline: 'single' }),
  line('blank-3', '', 'blank', { type: 'none' }),

  // Other Operated Departments
  line('other-revenue', '  Other Operated Revenue', 'account', {
    type: 'gl_range', from: '4200', to: '4299',
    departments: [
      USALIDepartment.OTHER_OPERATED_SPA,
      USALIDepartment.OTHER_OPERATED_GOLF,
      USALIDepartment.OTHER_OPERATED_PARKING,
      USALIDepartment.OTHER_OPERATED_TELECOM,
      USALIDepartment.OTHER_OPERATED_RETAIL,
      USALIDepartment.OTHER_OPERATED_RECREATION,
    ],
  }, { indent: 1, signConvention: 'reversed' }),
  line('other-expense', '  Other Operated Expense', 'account', {
    type: 'gl_range', from: '5200', to: '7199',
    departments: [
      USALIDepartment.OTHER_OPERATED_SPA,
      USALIDepartment.OTHER_OPERATED_GOLF,
      USALIDepartment.OTHER_OPERATED_PARKING,
      USALIDepartment.OTHER_OPERATED_TELECOM,
      USALIDepartment.OTHER_OPERATED_RETAIL,
      USALIDepartment.OTHER_OPERATED_RECREATION,
    ],
  }, { indent: 1 }),
  line('other-dept-income', '  Other Operated Department Income', 'net', {
    type: 'difference', minuend: 'other-revenue', subtrahend: 'other-expense',
  }, { indent: 1, bold: true, underline: 'single' }),
  line('blank-4', '', 'blank', { type: 'none' }),

  // Miscellaneous Income
  line('misc-income', '  Rental & Other Income', 'account', {
    type: 'gl_range', from: '4300', to: '4399',
  }, { indent: 1, signConvention: 'reversed' }),
  line('blank-5', '', 'blank', { type: 'none' }),

  // ── TOTAL OPERATED DEPARTMENTS ───────────────────────────────────────

  line('total-revenue', 'TOTAL REVENUE', 'total', {
    type: 'sum', lineIds: ['rooms-revenue', 'fb-revenue', 'other-revenue', 'misc-income'],
  }, { bold: true }),
  line('total-dept-expense', 'TOTAL DEPARTMENTAL EXPENSES', 'total', {
    type: 'sum', lineIds: ['rooms-expense', 'fb-expense', 'other-expense'],
  }, { bold: true }),
  line('total-dept-income', 'TOTAL DEPARTMENTAL INCOME', 'total', {
    type: 'sum', lineIds: ['rooms-dept-income', 'fb-dept-income', 'other-dept-income', 'misc-income'],
  }, { bold: true, underline: 'double' }),
  line('blank-6', '', 'blank', { type: 'none' }),

  // ── UNDISTRIBUTED OPERATING EXPENSES ─────────────────────────────────

  line('header-undist', 'UNDISTRIBUTED OPERATING EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('ag-expense', '  Administrative & General', 'account', {
    type: 'gl_range', from: '6000', to: '7299',
    departments: [USALIDepartment.ADMIN_AND_GENERAL],
  }, { indent: 1 }),
  line('sm-expense', '  Sales & Marketing', 'account', {
    type: 'gl_range', from: '6000', to: '7399',
    departments: [USALIDepartment.SALES_AND_MARKETING],
  }, { indent: 1 }),
  line('pom-expense', '  Property Operations & Maintenance', 'account', {
    type: 'gl_range', from: '6000', to: '7499',
    departments: [USALIDepartment.PROPERTY_OPERATIONS],
  }, { indent: 1 }),
  line('util-expense', '  Utilities', 'account', {
    type: 'gl_range', from: '7500', to: '7549',
    departments: [USALIDepartment.UTILITIES],
  }, { indent: 1 }),
  line('it-expense', '  Information & Telecommunications', 'account', {
    type: 'gl_range', from: '6000', to: '7699',
    departments: [USALIDepartment.INFORMATION_TECHNOLOGY],
  }, { indent: 1 }),
  line('total-undist', 'TOTAL UNDISTRIBUTED EXPENSES', 'total', {
    type: 'sum', lineIds: ['ag-expense', 'sm-expense', 'pom-expense', 'util-expense', 'it-expense'],
  }, { bold: true, underline: 'single' }),
  line('blank-7', '', 'blank', { type: 'none' }),

  // ── GROSS OPERATING PROFIT ───────────────────────────────────────────

  line('gop', 'GROSS OPERATING PROFIT (GOP)', 'net', {
    type: 'difference', minuend: 'total-dept-income', subtrahend: 'total-undist',
  }, { bold: true, underline: 'double' }),
  line('gop-pct', '  GOP %', 'ratio', {
    type: 'ratio', numerator: 'gop', denominator: 'total-revenue', format: 'percentage',
  }, { indent: 1 }),
  line('blank-8', '', 'blank', { type: 'none' }),

  // ── MANAGEMENT FEES ──────────────────────────────────────────────────

  line('header-mgmt', 'MANAGEMENT FEES', 'header', { type: 'none' }, { bold: true }),
  line('mgmt-base', '  Base Management Fee', 'account', {
    type: 'gl_accounts', accounts: ['8600'],
    departments: [USALIDepartment.MANAGEMENT_FEES],
  }, { indent: 1 }),
  line('mgmt-incentive', '  Incentive Management Fee', 'account', {
    type: 'gl_accounts', accounts: ['8610'],
    departments: [USALIDepartment.MANAGEMENT_FEES],
  }, { indent: 1 }),
  line('mgmt-franchise', '  Franchise/Royalty Fee', 'account', {
    type: 'gl_accounts', accounts: ['8620'],
    departments: [USALIDepartment.MANAGEMENT_FEES],
  }, { indent: 1 }),
  line('mgmt-brand', '  Marketing/Brand Fee', 'account', {
    type: 'gl_accounts', accounts: ['8630'],
    departments: [USALIDepartment.MANAGEMENT_FEES],
  }, { indent: 1 }),
  line('mgmt-reservation', '  Reservation Contribution', 'account', {
    type: 'gl_accounts', accounts: ['8640'],
    departments: [USALIDepartment.MANAGEMENT_FEES],
  }, { indent: 1 }),
  line('total-mgmt', 'TOTAL MANAGEMENT FEES', 'total', {
    type: 'sum', lineIds: ['mgmt-base', 'mgmt-incentive', 'mgmt-franchise', 'mgmt-brand', 'mgmt-reservation'],
  }, { bold: true, underline: 'single' }),
  line('blank-9', '', 'blank', { type: 'none' }),

  // ── INCOME BEFORE NON-OPERATING ──────────────────────────────────────

  line('income-before-nonop', 'INCOME BEFORE NON-OPERATING I&E', 'net', {
    type: 'difference', minuend: 'gop', subtrahend: 'total-mgmt',
  }, { bold: true }),
  line('blank-10', '', 'blank', { type: 'none' }),

  // ── NON-OPERATING INCOME & EXPENSES ──────────────────────────────────

  line('header-nonop', 'NON-OPERATING INCOME & EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('nonop-income', '  Non-Operating Income', 'account', {
    type: 'gl_range', from: '8000', to: '8049',
    departments: [USALIDepartment.NON_OPERATING],
  }, { indent: 1, signConvention: 'reversed' }),
  line('nonop-expense', '  Non-Operating Expenses', 'account', {
    type: 'gl_range', from: '8050', to: '8110',
    departments: [USALIDepartment.NON_OPERATING],
  }, { indent: 1 }),
  line('total-nonop', 'NET NON-OPERATING I&E', 'net', {
    type: 'difference', minuend: 'nonop-income', subtrahend: 'nonop-expense',
  }, { bold: true, underline: 'single' }),
  line('blank-11', '', 'blank', { type: 'none' }),

  // ── EBITDA ───────────────────────────────────────────────────────────

  line('ebitda', 'EBITDA', 'net', {
    type: 'sum', lineIds: ['income-before-nonop', 'total-nonop'],
  }, { bold: true, underline: 'double' }),
  line('ebitda-pct', '  EBITDA %', 'ratio', {
    type: 'ratio', numerator: 'ebitda', denominator: 'total-revenue', format: 'percentage',
  }, { indent: 1 }),
  line('blank-12', '', 'blank', { type: 'none' }),

  // ── FIXED CHARGES ────────────────────────────────────────────────────

  line('header-fixed', 'FIXED CHARGES', 'header', { type: 'none' }, { bold: true }),
  line('fixed-insurance', '  Property Insurance', 'account', {
    type: 'gl_accounts', accounts: ['8500'],
    departments: [USALIDepartment.FIXED_CHARGES],
  }, { indent: 1 }),
  line('fixed-property-tax', '  Property Tax', 'account', {
    type: 'gl_accounts', accounts: ['8510'],
    departments: [USALIDepartment.FIXED_CHARGES],
  }, { indent: 1 }),
  line('fixed-land-rent', '  Ground Lease/Land Rent', 'account', {
    type: 'gl_accounts', accounts: ['8520'],
    departments: [USALIDepartment.FIXED_CHARGES],
  }, { indent: 1 }),
  line('fixed-equip-lease', '  Equipment Lease', 'account', {
    type: 'gl_accounts', accounts: ['8530'],
    departments: [USALIDepartment.FIXED_CHARGES],
  }, { indent: 1 }),
  line('total-fixed', 'TOTAL FIXED CHARGES', 'total', {
    type: 'sum', lineIds: ['fixed-insurance', 'fixed-property-tax', 'fixed-land-rent', 'fixed-equip-lease'],
  }, { bold: true, underline: 'single' }),
  line('blank-13', '', 'blank', { type: 'none' }),

  // ── NET OPERATING INCOME ─────────────────────────────────────────────

  line('noi', 'NET OPERATING INCOME (NOI)', 'net', {
    type: 'difference', minuend: 'ebitda', subtrahend: 'total-fixed',
  }, { bold: true, underline: 'double' }),
  line('noi-pct', '  NOI %', 'ratio', {
    type: 'ratio', numerator: 'noi', denominator: 'total-revenue', format: 'percentage',
  }, { indent: 1 }),
];

const DEFAULT_COLUMNS: ReportColumn[] = [
  {
    id: 'actual-mtd',
    label: 'Actual MTD',
    type: 'actual',
    period: { type: 'month', year: 0, month: 0 },
    format: 'currency',
    width: 120,
  },
  {
    id: 'budget-mtd',
    label: 'Budget MTD',
    type: 'budget',
    period: { type: 'month', year: 0, month: 0 },
    format: 'currency',
    width: 120,
  },
  {
    id: 'var-mtd-amt',
    label: 'Var $',
    type: 'variance_amount',
    sourceColumns: { actual: 'actual-mtd', comparison: 'budget-mtd' },
    format: 'currency',
    width: 100,
  },
  {
    id: 'var-mtd-pct',
    label: 'Var %',
    type: 'variance_percent',
    sourceColumns: { actual: 'actual-mtd', comparison: 'budget-mtd' },
    format: 'percentage',
    width: 80,
  },
  {
    id: 'actual-ytd',
    label: 'Actual YTD',
    type: 'actual',
    period: { type: 'ytd', year: 0 },
    format: 'currency',
    width: 120,
  },
  {
    id: 'budget-ytd',
    label: 'Budget YTD',
    type: 'budget',
    period: { type: 'ytd', year: 0 },
    format: 'currency',
    width: 120,
  },
  {
    id: 'var-ytd-amt',
    label: 'Var $',
    type: 'variance_amount',
    sourceColumns: { actual: 'actual-ytd', comparison: 'budget-ytd' },
    format: 'currency',
    width: 100,
  },
  {
    id: 'var-ytd-pct',
    label: 'Var %',
    type: 'variance_percent',
    sourceColumns: { actual: 'actual-ytd', comparison: 'budget-ytd' },
    format: 'percentage',
    width: 80,
  },
  {
    id: 'prior-year-mtd',
    label: 'Prior Year MTD',
    type: 'prior_year',
    period: { type: 'month', year: -1, month: 0 },
    format: 'currency',
    width: 120,
  },
  {
    id: 'pct-of-revenue',
    label: '% of Rev',
    type: 'percent_of_revenue',
    format: 'percentage',
    width: 80,
  },
  {
    id: 'par',
    label: 'PAR',
    type: 'per_available_room',
    format: 'currency',
    width: 100,
  },
  {
    id: 'por',
    label: 'POR',
    type: 'per_occupied_room',
    format: 'currency',
    width: 100,
  },
];

export const SUMMARY_OPERATING_STATEMENT: USALIReportDefinition = {
  id: 'usali-sos',
  name: 'Summary Operating Statement',
  description: 'USALI 12th Edition Summary Operating Statement — Hotel-level P&L showing revenue through NOI with departmental, undistributed, and fixed charge detail.',
  usaliSection: USALISection.SUMMARY_OPERATING_STATEMENT,
  departments: Object.values(USALIDepartment),
  lines: LINES,
  columns: DEFAULT_COLUMNS,
};
