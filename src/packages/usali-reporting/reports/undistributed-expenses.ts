/**
 * USALI 12th Edition — Undistributed Operating Expense Schedules
 *
 * Five separate schedules for undistributed departments:
 *  1. Administrative & General
 *  2. Information & Technology
 *  3. Sales & Marketing
 *  4. Property Operations & Maintenance
 *  5. Utilities
 *
 * GL account numbers mapped to Sage Intacct chart of accounts.
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

// ─── Administrative & General ────────────────────────────────────────────────

const agDept = [USALIDepartment.ADMIN_AND_GENERAL];

const AG_LINES: ReportLineItem[] = [
  line('header-labor', 'LABOR COSTS', 'header', { type: 'none' }, { bold: true }),
  line('labor-salaries', '  Salaries & Wages', 'account', {
    type: 'gl_range', from: '6110000', to: '6610000', departments: agDept,
  }, { indent: 1 }),
  line('total-labor', 'TOTAL LABOR', 'total', {
    type: 'sum', lineIds: ['labor-salaries'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  line('header-other', 'OTHER EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-office-admin', '  Office & Admin', 'account', {
    type: 'gl_accounts', accounts: ['8110000'], departments: agDept,
  }, { indent: 1 }),
  line('exp-office-supplies', '  Office Supplies', 'account', {
    type: 'gl_accounts', accounts: ['8111100'], departments: agDept,
  }, { indent: 1 }),
  line('exp-admin-travel', '  Admin Travel', 'account', {
    type: 'gl_accounts', accounts: ['8111500'], departments: agDept,
  }, { indent: 1 }),
  line('exp-professional', '  Professional Fees', 'account', {
    type: 'gl_accounts', accounts: ['8120000'], departments: agDept,
  }, { indent: 1 }),
  line('exp-legal', '  Legal Fees', 'account', {
    type: 'gl_accounts', accounts: ['8121000'], departments: agDept,
  }, { indent: 1 }),
  line('exp-accounting', '  Accounting & Audit', 'account', {
    type: 'gl_accounts', accounts: ['8121200'], departments: agDept,
  }, { indent: 1 }),
  line('exp-tax', '  Tax & Compliance', 'account', {
    type: 'gl_accounts', accounts: ['8121400'], departments: agDept,
  }, { indent: 1 }),
  line('exp-consulting', '  Consulting', 'account', {
    type: 'gl_accounts', accounts: ['8121500'], departments: agDept,
  }, { indent: 1 }),
  line('exp-recruiting', '  Recruiting/HR Services', 'account', {
    type: 'gl_accounts', accounts: ['8121610'], departments: agDept,
  }, { indent: 1 }),
  line('exp-appraisal', '  Asset Appraisal', 'account', {
    type: 'gl_accounts', accounts: ['8121800'], departments: agDept,
  }, { indent: 1 }),
  line('exp-environmental', '  Environmental Reports', 'account', {
    type: 'gl_accounts', accounts: ['8121900'], departments: agDept,
  }, { indent: 1 }),
  line('exp-insurance', '  Insurance (Non-Property)', 'account', {
    type: 'gl_accounts', accounts: [
      '8130000', '8131100', '8131200', '8131300', '8131400', '8131500',
      '8131600', '8131700', '8131800', '8131900', '8132000', '8132100',
      '8139000',
    ], departments: agDept,
  }, { indent: 1 }),
  line('exp-bank', '  Bank & Treasury Fees', 'account', {
    type: 'gl_accounts', accounts: ['8140000'], departments: agDept,
  }, { indent: 1 }),
  line('exp-baddebt', '  Bad Debt', 'account', {
    type: 'gl_accounts', accounts: ['8141200'], departments: agDept,
  }, { indent: 1 }),
  line('exp-cash', '  Cash Over/Short', 'account', {
    type: 'gl_accounts', accounts: ['8141400'], departments: agDept,
  }, { indent: 1 }),
  line('exp-cc', '  Credit Card Processing', 'account', {
    type: 'gl_accounts', accounts: ['8172000'], departments: agDept,
  }, { indent: 1 }),
  line('exp-other-admin', '  Other Admin', 'account', {
    type: 'gl_accounts', accounts: ['8190000'], departments: agDept,
  }, { indent: 1 }),
  line('exp-charitable', '  Charitable', 'account', {
    type: 'gl_accounts', accounts: ['8191600'], departments: agDept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: [
      'exp-office-admin', 'exp-office-supplies', 'exp-admin-travel',
      'exp-professional', 'exp-legal', 'exp-accounting', 'exp-tax',
      'exp-consulting', 'exp-recruiting', 'exp-appraisal', 'exp-environmental',
      'exp-insurance', 'exp-bank', 'exp-baddebt', 'exp-cash', 'exp-cc',
      'exp-other-admin', 'exp-charitable',
    ],
  }, { bold: true, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  line('total-ag', 'TOTAL ADMINISTRATIVE & GENERAL', 'total', {
    type: 'sum', lineIds: ['total-labor', 'total-other'],
  }, { bold: true, underline: 'double' }),
  line('ag-pct', '  % of Total Revenue', 'ratio', {
    type: 'ratio', numerator: 'total-ag', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 1 }),
];

export const ADMIN_GENERAL: USALIReportDefinition = {
  id: 'usali-ag',
  name: 'Administrative & General',
  description: 'USALI 12th Edition A&G Schedule — Labor, professional fees, insurance, and operating expenses.',
  usaliSection: USALISection.UNDISTRIBUTED_ADMIN,
  departments: agDept,
  lines: AG_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};

// ─── Information & Technology ────────────────────────────────────────────────

const itDept = [USALIDepartment.INFORMATION_TECHNOLOGY];

const IT_LINES: ReportLineItem[] = [
  line('header-labor', 'LABOR COSTS', 'header', { type: 'none' }, { bold: true }),
  line('labor-salaries', '  Salaries & Wages', 'account', {
    type: 'gl_range', from: '6110000', to: '6610000', departments: itDept,
  }, { indent: 1 }),
  line('total-labor', 'TOTAL LABOR', 'total', {
    type: 'sum', lineIds: ['labor-salaries'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  line('header-other', 'OTHER EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-systems', '  Systems & Software', 'account', {
    type: 'gl_accounts', accounts: [
      '8210000', '8211100', '8211110', '8211120', '8211200', '8211300',
      '8211400', '8211500', '8211510', '8211600', '8211610', '8211620',
      '8211700',
    ], departments: itDept,
  }, { indent: 1 }),
  line('exp-telecom', '  Telecommunications', 'account', {
    type: 'gl_accounts', accounts: [
      '8220000', '8221100', '8221110', '8221200', '8221300', '8221400',
      '8221500', '8221600',
    ], departments: itDept,
  }, { indent: 1 }),
  line('exp-support', '  IT Support & Hardware', 'account', {
    type: 'gl_accounts', accounts: [
      '8230000', '8231100', '8231200', '8231300', '8231400', '8231500',
    ], departments: itDept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: ['exp-systems', 'exp-telecom', 'exp-support'],
  }, { bold: true, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  line('total-it', 'TOTAL INFORMATION & TECHNOLOGY', 'total', {
    type: 'sum', lineIds: ['total-labor', 'total-other'],
  }, { bold: true, underline: 'double' }),
  line('it-pct', '  % of Total Revenue', 'ratio', {
    type: 'ratio', numerator: 'total-it', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 1 }),
];

export const INFORMATION_TECHNOLOGY: USALIReportDefinition = {
  id: 'usali-it',
  name: 'Information & Technology',
  description: 'USALI 12th Edition IT Schedule — Labor, systems, telecommunications, and IT support expenses.',
  usaliSection: USALISection.UNDISTRIBUTED_IT,
  departments: itDept,
  lines: IT_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};

// ─── Sales & Marketing ───────────────────────────────────────────────────────

const smDept = [USALIDepartment.SALES_AND_MARKETING];

const SM_LINES: ReportLineItem[] = [
  line('header-labor', 'LABOR COSTS', 'header', { type: 'none' }, { bold: true }),
  line('labor-salaries', '  Salaries & Wages', 'account', {
    type: 'gl_range', from: '6110000', to: '6610000', departments: smDept,
  }, { indent: 1 }),
  line('total-labor', 'TOTAL LABOR', 'total', {
    type: 'sum', lineIds: ['labor-salaries'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  line('header-other', 'OTHER EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-digital', '  Digital Advertising', 'account', {
    type: 'gl_accounts', accounts: [
      '8310000', '8311100', '8311110', '8311120', '8311130', '8311140',
      '8311150', '8311160', '8311170', '8311180', '8311190', '8311200',
      '8311210', '8311220', '8311230', '8311240',
    ], departments: smDept,
  }, { indent: 1 }),
  line('exp-pr', '  Public Relations', 'account', {
    type: 'gl_accounts', accounts: [
      '8320000', '8321100', '8321200', '8321300', '8321400', '8321500',
      '8321600', '8321700', '8321800', '8321900',
    ], departments: smDept,
  }, { indent: 1 }),
  line('exp-creative', '  Creative & Content', 'account', {
    type: 'gl_accounts', accounts: [
      '8330000', '8331100', '8331200', '8331300', '8331400', '8331500',
      '8331600', '8331700', '8331800', '8331900', '8332000', '8332100',
    ], departments: smDept,
  }, { indent: 1 }),
  line('exp-revmgmt', '  Revenue Management', 'account', {
    type: 'gl_accounts', accounts: [
      '8340000', '8341100', '8341200', '8341300', '8341400', '8341500',
      '8341600', '8341700', '8341800', '8341900',
    ], departments: smDept,
  }, { indent: 1 }),
  line('exp-promotions', '  Promotions & Loyalty', 'account', {
    type: 'gl_accounts', accounts: [
      '8350000', '8351100', '8351200', '8351300', '8351400', '8351500',
      '8351600', '8351700',
    ], departments: smDept,
  }, { indent: 1 }),
  line('exp-sales-office', '  Sales Office', 'account', {
    type: 'gl_accounts', accounts: [
      '8360000', '8361100', '8361200', '8361300', '8361400', '8361500',
      '8361600', '8361700', '8361800',
    ], departments: smDept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: [
      'exp-digital', 'exp-pr', 'exp-creative', 'exp-revmgmt',
      'exp-promotions', 'exp-sales-office',
    ],
  }, { bold: true, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  line('total-sm', 'TOTAL SALES & MARKETING', 'total', {
    type: 'sum', lineIds: ['total-labor', 'total-other'],
  }, { bold: true, underline: 'double' }),
  line('sm-pct', '  % of Total Revenue', 'ratio', {
    type: 'ratio', numerator: 'total-sm', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 1 }),
];

export const SALES_MARKETING: USALIReportDefinition = {
  id: 'usali-sm',
  name: 'Sales & Marketing',
  description: 'USALI 12th Edition Sales & Marketing Schedule — Labor, advertising, promotions, and sales office expenses.',
  usaliSection: USALISection.UNDISTRIBUTED_SALES,
  departments: smDept,
  lines: SM_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};

// ─── Property Operations & Maintenance ───────────────────────────────────────

const pomDept = [USALIDepartment.PROPERTY_OPERATIONS];

const POM_LINES: ReportLineItem[] = [
  line('header-labor', 'LABOR COSTS', 'header', { type: 'none' }, { bold: true }),
  line('labor-salaries', '  Salaries & Wages', 'account', {
    type: 'gl_range', from: '6110000', to: '6610000', departments: pomDept,
  }, { indent: 1 }),
  line('total-labor', 'TOTAL LABOR', 'total', {
    type: 'sum', lineIds: ['labor-salaries'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  line('header-other', 'OTHER EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-repairs', '  Repairs & Maintenance', 'account', {
    type: 'gl_accounts', accounts: [
      '8410000', '8411100', '8411200', '8411300', '8411400', '8411500',
      '8411600',
    ], departments: pomDept,
  }, { indent: 1 }),
  line('exp-supplies', '  Maintenance Supplies', 'account', {
    type: 'gl_accounts', accounts: [
      '8420000', '8421100', '8421200', '8421300', '8421400', '8421500',
    ], departments: pomDept,
  }, { indent: 1 }),
  line('exp-contracted', '  Contracted Maintenance', 'account', {
    type: 'gl_accounts', accounts: [
      '8430000', '8431100', '8431200', '8431300', '8431400', '8431500',
      '8431600', '8431700',
    ], departments: pomDept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: ['exp-repairs', 'exp-supplies', 'exp-contracted'],
  }, { bold: true, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  line('total-pom', 'TOTAL PROPERTY OPERATIONS & MAINTENANCE', 'total', {
    type: 'sum', lineIds: ['total-labor', 'total-other'],
  }, { bold: true, underline: 'double' }),
  line('pom-pct', '  % of Total Revenue', 'ratio', {
    type: 'ratio', numerator: 'total-pom', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 1 }),
];

export const PROPERTY_OPERATIONS: USALIReportDefinition = {
  id: 'usali-pom',
  name: 'Property Operations & Maintenance',
  description: 'USALI 12th Edition POM Schedule — Engineering labor, repairs, supplies, and contracted maintenance.',
  usaliSection: USALISection.UNDISTRIBUTED_POM,
  departments: pomDept,
  lines: POM_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};

// ─── Utilities ───────────────────────────────────────────────────────────────

const utilDept = [USALIDepartment.UTILITIES];

const UTIL_LINES: ReportLineItem[] = [
  line('header-util', 'UTILITY EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-electricity', '  Electricity', 'account', {
    type: 'gl_accounts', accounts: ['8511100'], departments: utilDept,
  }, { indent: 1 }),
  line('exp-gas', '  Natural Gas', 'account', {
    type: 'gl_accounts', accounts: ['8511200'], departments: utilDept,
  }, { indent: 1 }),
  line('exp-water', '  Water', 'account', {
    type: 'gl_accounts', accounts: ['8521100'], departments: utilDept,
  }, { indent: 1 }),
  line('exp-sewer', '  Sewer', 'account', {
    type: 'gl_accounts', accounts: ['8521200'], departments: utilDept,
  }, { indent: 1 }),
  line('exp-trash', '  Trash Removal', 'account', {
    type: 'gl_accounts', accounts: ['8531100'], departments: utilDept,
  }, { indent: 1 }),
  line('exp-recycling', '  Recycling', 'account', {
    type: 'gl_accounts', accounts: ['8531200'], departments: utilDept,
  }, { indent: 1 }),
  line('exp-grease', '  Grease Removal', 'account', {
    type: 'gl_accounts', accounts: ['8531300'], departments: utilDept,
  }, { indent: 1 }),
  line('total-util', 'TOTAL UTILITIES', 'total', {
    type: 'sum', lineIds: [
      'exp-electricity', 'exp-gas', 'exp-water', 'exp-sewer',
      'exp-trash', 'exp-recycling', 'exp-grease',
    ],
  }, { bold: true, underline: 'double' }),
  line('util-pct', '  % of Total Revenue', 'ratio', {
    type: 'ratio', numerator: 'total-util', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 1 }),
  line('util-par', '  Utilities PAR', 'ratio', {
    type: 'ratio', numerator: 'total-util', denominator: 'stat-available-rooms', format: 'currency',
  }, { indent: 1 }),
];

export const UTILITIES: USALIReportDefinition = {
  id: 'usali-util',
  name: 'Utilities',
  description: 'USALI 12th Edition Utilities Schedule — Electricity, gas, water, sewer, trash, recycling, and grease removal.',
  usaliSection: USALISection.UNDISTRIBUTED_UTILITIES,
  departments: utilDept,
  lines: UTIL_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};
