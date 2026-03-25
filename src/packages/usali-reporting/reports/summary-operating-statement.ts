/**
 * USALI 12th Edition — Summary Operating Statement
 *
 * The top-level P&L view showing:
 *   Total Revenue
 * - Departmental Expenses → Departmental Income (GOP before undistributed)
 * - Undistributed Operating Expenses → Gross Operating Profit (GOP)
 * - Management Fees → Income Before Non-Operating I&E
 * - Non-Operating I&E → EBITDA
 * - D&A → EBITDA after D&A
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
    type: 'gl_range', from: '4110010', to: '4110450',
    departments: [USALIDepartment.ROOMS],
  }, { indent: 1, signConvention: 'reversed' }),
  line('rooms-labor', '  Rooms Labor', 'account', {
    type: 'gl_range', from: '6110000', to: '6610000',
    departments: [USALIDepartment.ROOMS],
  }, { indent: 1 }),
  line('rooms-other-expense', '  Rooms Other Expenses', 'account', {
    type: 'gl_range', from: '7110000', to: '7929000',
    departments: [USALIDepartment.ROOMS],
  }, { indent: 1 }),
  line('rooms-expense', '  Rooms Expense', 'total', {
    type: 'sum', lineIds: ['rooms-labor', 'rooms-other-expense'],
  }, { indent: 1 }),
  line('rooms-dept-income', '  Rooms Department Income', 'net', {
    type: 'difference', minuend: 'rooms-revenue', subtrahend: 'rooms-expense',
  }, { indent: 1, bold: true, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  // Food & Beverage
  line('fb-revenue', '  Food & Beverage Revenue', 'account', {
    type: 'gl_range', from: '4210000', to: '4210350',
    departments: [USALIDepartment.FOOD_AND_BEVERAGE],
  }, { indent: 1, signConvention: 'reversed' }),
  line('fb-cogs', '  F&B Cost of Sales', 'account', {
    type: 'gl_range', from: '5101000', to: '5801000',
    departments: [USALIDepartment.FOOD_AND_BEVERAGE],
  }, { indent: 1 }),
  line('fb-labor', '  F&B Labor', 'account', {
    type: 'gl_range', from: '6110000', to: '6610000',
    departments: [USALIDepartment.FOOD_AND_BEVERAGE],
  }, { indent: 1 }),
  line('fb-other-expense', '  F&B Other Expenses', 'account', {
    type: 'gl_range', from: '7110000', to: '7929000',
    departments: [USALIDepartment.FOOD_AND_BEVERAGE],
  }, { indent: 1 }),
  line('fb-expense', '  Food & Beverage Expense', 'total', {
    type: 'sum', lineIds: ['fb-cogs', 'fb-labor', 'fb-other-expense'],
  }, { indent: 1 }),
  line('fb-dept-income', '  Food & Beverage Department Income', 'net', {
    type: 'difference', minuend: 'fb-revenue', subtrahend: 'fb-expense',
  }, { indent: 1, bold: true, underline: 'single' }),
  line('blank-3', '', 'blank', { type: 'none' }),

  // Other Operated Departments
  line('other-revenue', '  Other Operated Revenue', 'account', {
    type: 'gl_range', from: '4310000', to: '4399030',
    departments: [
      USALIDepartment.OTHER_OPERATED_SPA,
      USALIDepartment.OTHER_OPERATED_PARKING,
      USALIDepartment.OTHER_OPERATED_RETAIL,
      USALIDepartment.OTHER_OPERATED_RECREATION,
      USALIDepartment.OTHER_OPERATED_BUSINESS_CENTER,
      USALIDepartment.OTHER_OPERATED_GOLF,
      USALIDepartment.OTHER_OPERATED_OTHER,
    ],
  }, { indent: 1, signConvention: 'reversed' }),
  line('other-expense', '  Other Operated Expense', 'account', {
    type: 'gl_range', from: '5101000', to: '7929000',
    departments: [
      USALIDepartment.OTHER_OPERATED_SPA,
      USALIDepartment.OTHER_OPERATED_PARKING,
      USALIDepartment.OTHER_OPERATED_RETAIL,
      USALIDepartment.OTHER_OPERATED_RECREATION,
      USALIDepartment.OTHER_OPERATED_BUSINESS_CENTER,
      USALIDepartment.OTHER_OPERATED_GOLF,
      USALIDepartment.OTHER_OPERATED_OTHER,
    ],
  }, { indent: 1 }),
  line('other-dept-income', '  Other Operated Department Income', 'net', {
    type: 'difference', minuend: 'other-revenue', subtrahend: 'other-expense',
  }, { indent: 1, bold: true, underline: 'single' }),
  line('blank-4', '', 'blank', { type: 'none' }),

  // Miscellaneous Income
  line('misc-income', '  Rental & Other Income', 'account', {
    type: 'gl_range', from: '4399000', to: '4399030',
    departments: [USALIDepartment.MISCELLANEOUS_INCOME],
  }, { indent: 1, signConvention: 'reversed' }),
  line('blank-4a', '', 'blank', { type: 'none' }),

  // Residential Rental Income
  line('residential-rental', '  Residential Rental Income', 'account', {
    type: 'gl_range', from: '4421000', to: '4421300',
  }, { indent: 1, signConvention: 'reversed' }),

  // Retail Rental Income
  line('retail-rental', '  Retail Rental Income', 'account', {
    type: 'gl_range', from: '4431000', to: '4431300',
  }, { indent: 1, signConvention: 'reversed' }),

  // Fee Revenue
  line('fee-revenue', '  Fee Revenue', 'account', {
    type: 'gl_range', from: '4811000', to: '4819000',
  }, { indent: 1, signConvention: 'reversed' }),
  line('blank-5', '', 'blank', { type: 'none' }),

  // ── TOTAL OPERATED DEPARTMENTS ───────────────────────────────────────

  line('total-revenue', 'TOTAL REVENUE', 'total', {
    type: 'sum', lineIds: [
      'rooms-revenue', 'fb-revenue', 'other-revenue',
      'misc-income', 'residential-rental', 'retail-rental', 'fee-revenue',
    ],
  }, { bold: true }),
  line('total-dept-expense', 'TOTAL DEPARTMENTAL EXPENSES', 'total', {
    type: 'sum', lineIds: ['rooms-expense', 'fb-expense', 'other-expense'],
  }, { bold: true }),
  line('total-dept-income', 'TOTAL DEPARTMENTAL INCOME', 'total', {
    type: 'sum', lineIds: [
      'rooms-dept-income', 'fb-dept-income', 'other-dept-income',
      'misc-income', 'residential-rental', 'retail-rental', 'fee-revenue',
    ],
  }, { bold: true, underline: 'double' }),
  line('blank-6', '', 'blank', { type: 'none' }),

  // ── UNDISTRIBUTED OPERATING EXPENSES ─────────────────────────────────

  line('header-undist', 'UNDISTRIBUTED OPERATING EXPENSES', 'header', { type: 'none' }, { bold: true }),

  // A&G
  line('ag-labor', '  A&G Labor', 'account', {
    type: 'gl_range', from: '6110000', to: '6610000',
    departments: [USALIDepartment.ADMIN_AND_GENERAL],
  }, { indent: 1 }),
  line('ag-other', '  A&G Other Expenses', 'account', {
    type: 'gl_range', from: '8110000', to: '8190000',
    departments: [USALIDepartment.ADMIN_AND_GENERAL],
  }, { indent: 1 }),
  line('ag-expense', '  Administrative & General', 'total', {
    type: 'sum', lineIds: ['ag-labor', 'ag-other'],
  }, { indent: 1 }),

  // IT
  line('it-labor', '  IT Labor', 'account', {
    type: 'gl_range', from: '6110000', to: '6610000',
    departments: [USALIDepartment.INFORMATION_TECHNOLOGY],
  }, { indent: 1 }),
  line('it-other', '  IT Other Expenses', 'account', {
    type: 'gl_range', from: '8210000', to: '8231500',
    departments: [USALIDepartment.INFORMATION_TECHNOLOGY],
  }, { indent: 1 }),
  line('it-expense', '  Information & Telecommunications', 'total', {
    type: 'sum', lineIds: ['it-labor', 'it-other'],
  }, { indent: 1 }),

  // S&M
  line('sm-labor', '  S&M Labor', 'account', {
    type: 'gl_range', from: '6110000', to: '6610000',
    departments: [USALIDepartment.SALES_AND_MARKETING],
  }, { indent: 1 }),
  line('sm-other', '  S&M Other Expenses', 'account', {
    type: 'gl_range', from: '8310000', to: '8361800',
    departments: [USALIDepartment.SALES_AND_MARKETING],
  }, { indent: 1 }),
  line('sm-expense', '  Sales & Marketing', 'total', {
    type: 'sum', lineIds: ['sm-labor', 'sm-other'],
  }, { indent: 1 }),

  // POM
  line('pom-labor', '  POM Labor', 'account', {
    type: 'gl_range', from: '6110000', to: '6610000',
    departments: [USALIDepartment.PROPERTY_OPERATIONS],
  }, { indent: 1 }),
  line('pom-other', '  POM Other Expenses', 'account', {
    type: 'gl_range', from: '8410000', to: '8431700',
    departments: [USALIDepartment.PROPERTY_OPERATIONS],
  }, { indent: 1 }),
  line('pom-expense', '  Property Operations & Maintenance', 'total', {
    type: 'sum', lineIds: ['pom-labor', 'pom-other'],
  }, { indent: 1 }),

  // Utilities
  line('util-expense', '  Utilities', 'account', {
    type: 'gl_range', from: '8511100', to: '8531500',
    departments: [USALIDepartment.UTILITIES],
  }, { indent: 1 }),

  line('total-undist', 'TOTAL UNDISTRIBUTED EXPENSES', 'total', {
    type: 'sum', lineIds: ['ag-expense', 'it-expense', 'sm-expense', 'pom-expense', 'util-expense'],
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
    type: 'gl_accounts', accounts: ['8611100'],
    departments: [USALIDepartment.MANAGEMENT_FEES],
  }, { indent: 1 }),
  line('mgmt-incentive', '  Incentive Management Fee', 'account', {
    type: 'gl_accounts', accounts: ['8611200'],
    departments: [USALIDepartment.MANAGEMENT_FEES],
  }, { indent: 1 }),
  line('mgmt-asset', '  Asset Management Fee', 'account', {
    type: 'gl_accounts', accounts: ['8611300'],
    departments: [USALIDepartment.MANAGEMENT_FEES],
  }, { indent: 1 }),
  line('mgmt-centralized', '  Centralized Services Fee', 'account', {
    type: 'gl_accounts', accounts: ['8611400'],
    departments: [USALIDepartment.MANAGEMENT_FEES],
  }, { indent: 1 }),
  line('mgmt-owner', '  Owner Fee', 'account', {
    type: 'gl_accounts', accounts: ['8611500'],
    departments: [USALIDepartment.MANAGEMENT_FEES],
  }, { indent: 1 }),
  line('mgmt-license', '  License Fee', 'account', {
    type: 'gl_accounts', accounts: ['8611600'],
    departments: [USALIDepartment.MANAGEMENT_FEES],
  }, { indent: 1 }),
  line('total-mgmt', 'TOTAL MANAGEMENT FEES', 'total', {
    type: 'sum', lineIds: [
      'mgmt-base', 'mgmt-incentive', 'mgmt-asset',
      'mgmt-centralized', 'mgmt-owner', 'mgmt-license',
    ],
  }, { bold: true, underline: 'single' }),
  line('blank-9', '', 'blank', { type: 'none' }),

  // ── INCOME BEFORE NON-OPERATING ──────────────────────────────────────

  line('income-before-nonop', 'INCOME BEFORE NON-OPERATING I&E', 'net', {
    type: 'difference', minuend: 'gop', subtrahend: 'total-mgmt',
  }, { bold: true }),
  line('blank-10', '', 'blank', { type: 'none' }),

  // ── NON-OPERATING INCOME & EXPENSES ──────────────────────────────────

  line('header-nonop', 'NON-OPERATING INCOME & EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('nonop-interest-income', '  Interest Income', 'account', {
    type: 'gl_range', from: '8712000', to: '8712300',
    departments: [USALIDepartment.NON_OPERATING],
  }, { indent: 1, signConvention: 'reversed' }),
  line('nonop-financing', '  Financing Costs', 'account', {
    type: 'gl_range', from: '8711000', to: '8711300',
    departments: [USALIDepartment.NON_OPERATING],
  }, { indent: 1 }),
  line('nonop-gains-losses', '  Gains & Losses', 'account', {
    type: 'gl_range', from: '8713000', to: '8713200',
    departments: [USALIDepartment.NON_OPERATING],
  }, { indent: 1 }),
  line('nonop-other', '  Other Non-Operating', 'account', {
    type: 'gl_range', from: '8719000', to: '8719200',
    departments: [USALIDepartment.NON_OPERATING],
  }, { indent: 1 }),
  line('total-nonop', 'NET NON-OPERATING I&E', 'net', {
    type: 'sum', lineIds: [
      'nonop-interest-income', 'nonop-financing', 'nonop-gains-losses', 'nonop-other',
    ],
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

  // ── DEPRECIATION & AMORTIZATION ────────────────────────────────────

  line('header-da', 'DEPRECIATION & AMORTIZATION', 'header', { type: 'none' }, { bold: true }),
  line('da-depreciation', '  Depreciation', 'account', {
    type: 'gl_range', from: '8910000', to: '8913400',
    departments: [USALIDepartment.DEPRECIATION],
  }, { indent: 1 }),
  line('da-amortization', '  Amortization', 'account', {
    type: 'gl_range', from: '8920000', to: '8922200',
    departments: [USALIDepartment.AMORTIZATION],
  }, { indent: 1 }),
  line('total-da', 'TOTAL DEPRECIATION & AMORTIZATION', 'total', {
    type: 'sum', lineIds: ['da-depreciation', 'da-amortization'],
  }, { bold: true, underline: 'single' }),
  line('blank-12a', '', 'blank', { type: 'none' }),

  line('ebitda-after-da', 'EBITDA AFTER D&A', 'net', {
    type: 'difference', minuend: 'ebitda', subtrahend: 'total-da',
  }, { bold: true }),
  line('blank-12b', '', 'blank', { type: 'none' }),

  // ── FIXED CHARGES ────────────────────────────────────────────────────

  line('header-fixed', 'FIXED CHARGES', 'header', { type: 'none' }, { bold: true }),
  line('fixed-rent', '  Rent', 'account', {
    type: 'gl_range', from: '8811100', to: '8811400',
    departments: [USALIDepartment.RENT],
  }, { indent: 1 }),
  line('fixed-insurance', '  Property Insurance', 'account', {
    type: 'gl_range', from: '8821100', to: '8821400',
    departments: [USALIDepartment.INSURANCE],
  }, { indent: 1 }),
  line('fixed-property-tax', '  Real Estate Taxes', 'account', {
    type: 'gl_range', from: '8831100', to: '8831300',
    departments: [USALIDepartment.PROPERTY_TAXES],
  }, { indent: 1 }),
  line('fixed-franchise', '  Franchise/Brand Fees', 'account', {
    type: 'gl_range', from: '8841100', to: '8841300',
    departments: [USALIDepartment.OTHER_FIXED_CHARGES],
  }, { indent: 1 }),
  line('fixed-other', '  Other Fixed Charges', 'account', {
    type: 'gl_range', from: '8850000', to: '8851900',
    departments: [USALIDepartment.OTHER_FIXED_CHARGES],
  }, { indent: 1 }),
  line('total-fixed', 'TOTAL FIXED CHARGES', 'total', {
    type: 'sum', lineIds: [
      'fixed-rent', 'fixed-insurance', 'fixed-property-tax',
      'fixed-franchise', 'fixed-other',
    ],
  }, { bold: true, underline: 'single' }),
  line('blank-13', '', 'blank', { type: 'none' }),

  // ── NET OPERATING INCOME ─────────────────────────────────────────────

  line('noi', 'NET OPERATING INCOME (NOI)', 'net', {
    type: 'difference', minuend: 'ebitda-after-da', subtrahend: 'total-fixed',
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
