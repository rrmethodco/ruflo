/**
 * USALI 12th Edition — Undistributed Operating Expense Schedules
 *
 * Five separate schedules for undistributed departments:
 *  1. Administrative & General
 *  2. Sales & Marketing
 *  3. Property Operations & Maintenance
 *  4. Utilities
 *  5. Information & Telecommunications
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
    type: 'gl_range', from: '6000', to: '6070', departments: agDept,
  }, { indent: 1 }),
  line('labor-benefits', '  Benefits', 'account', {
    type: 'gl_range', from: '6100', to: '6170', departments: agDept,
  }, { indent: 1 }),
  line('total-labor', 'TOTAL LABOR', 'total', {
    type: 'sum', lineIds: ['labor-salaries', 'labor-benefits'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  line('header-other', 'OTHER EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-accounting', '  Accounting & Audit', 'account', {
    type: 'gl_accounts', accounts: ['7200'], departments: agDept,
  }, { indent: 1 }),
  line('exp-legal', '  Legal Fees', 'account', {
    type: 'gl_accounts', accounts: ['7210'], departments: agDept,
  }, { indent: 1 }),
  line('exp-professional', '  Professional Fees - Other', 'account', {
    type: 'gl_accounts', accounts: ['7220'], departments: agDept,
  }, { indent: 1 }),
  line('exp-baddebt', '  Bad Debt Expense', 'account', {
    type: 'gl_accounts', accounts: ['7230'], departments: agDept,
  }, { indent: 1 }),
  line('exp-cash', '  Cash Over/Short', 'account', {
    type: 'gl_accounts', accounts: ['7240'], departments: agDept,
  }, { indent: 1 }),
  line('exp-cc', '  Credit Card Commissions', 'account', {
    type: 'gl_accounts', accounts: ['7080'], departments: agDept,
  }, { indent: 1 }),
  line('exp-donations', '  Donations', 'account', {
    type: 'gl_accounts', accounts: ['7250'], departments: agDept,
  }, { indent: 1 }),
  line('exp-dues', '  Dues & Subscriptions', 'account', {
    type: 'gl_accounts', accounts: ['7260'], departments: agDept,
  }, { indent: 1 }),
  line('exp-insurance', '  General Insurance', 'account', {
    type: 'gl_accounts', accounts: ['7270'], departments: agDept,
  }, { indent: 1 }),
  line('exp-licenses', '  Licenses & Permits', 'account', {
    type: 'gl_accounts', accounts: ['7280'], departments: agDept,
  }, { indent: 1 }),
  line('exp-loss', '  Loss & Damage', 'account', {
    type: 'gl_accounts', accounts: ['7290'], departments: agDept,
  }, { indent: 1 }),
  line('exp-operating', '  Operating Supplies', 'account', {
    type: 'gl_accounts', accounts: ['7110'], departments: agDept,
  }, { indent: 1 }),
  line('exp-printing', '  Printing & Stationery', 'account', {
    type: 'gl_accounts', accounts: ['7120'], departments: agDept,
  }, { indent: 1 }),
  line('exp-postage', '  Postage & Shipping', 'account', {
    type: 'gl_accounts', accounts: ['7130'], departments: agDept,
  }, { indent: 1 }),
  line('exp-telecom', '  Telecommunications', 'account', {
    type: 'gl_accounts', accounts: ['7140'], departments: agDept,
  }, { indent: 1 }),
  line('exp-travel', '  Travel & Entertainment', 'account', {
    type: 'gl_accounts', accounts: ['7295'], departments: agDept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: ['exp-accounting', 'exp-legal', 'exp-professional', 'exp-baddebt', 'exp-cash', 'exp-cc', 'exp-donations', 'exp-dues', 'exp-insurance', 'exp-licenses', 'exp-loss', 'exp-operating', 'exp-printing', 'exp-postage', 'exp-telecom', 'exp-travel'],
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

// ─── Sales & Marketing ───────────────────────────────────────────────────────

const smDept = [USALIDepartment.SALES_AND_MARKETING];

const SM_LINES: ReportLineItem[] = [
  line('header-labor', 'LABOR COSTS', 'header', { type: 'none' }, { bold: true }),
  line('labor-salaries', '  Salaries & Wages', 'account', {
    type: 'gl_range', from: '6000', to: '6070', departments: smDept,
  }, { indent: 1 }),
  line('labor-benefits', '  Benefits', 'account', {
    type: 'gl_range', from: '6100', to: '6170', departments: smDept,
  }, { indent: 1 }),
  line('total-labor', 'TOTAL LABOR', 'total', {
    type: 'sum', lineIds: ['labor-salaries', 'labor-benefits'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  line('header-other', 'OTHER EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-digital', '  Advertising - Digital', 'account', {
    type: 'gl_accounts', accounts: ['7300'], departments: smDept,
  }, { indent: 1 }),
  line('exp-print', '  Advertising - Print', 'account', {
    type: 'gl_accounts', accounts: ['7310'], departments: smDept,
  }, { indent: 1 }),
  line('exp-other-adv', '  Advertising - Other', 'account', {
    type: 'gl_accounts', accounts: ['7320'], departments: smDept,
  }, { indent: 1 }),
  line('exp-agency', '  Agency Fees', 'account', {
    type: 'gl_accounts', accounts: ['7330'], departments: smDept,
  }, { indent: 1 }),
  line('exp-loyalty', '  Loyalty Program', 'account', {
    type: 'gl_accounts', accounts: ['7340'], departments: smDept,
  }, { indent: 1 }),
  line('exp-pr', '  Public Relations', 'account', {
    type: 'gl_accounts', accounts: ['7350'], departments: smDept,
  }, { indent: 1 }),
  line('exp-promotions', '  Sales Promotions', 'account', {
    type: 'gl_accounts', accounts: ['7360'], departments: smDept,
  }, { indent: 1 }),
  line('exp-direct', '  Direct Marketing', 'account', {
    type: 'gl_accounts', accounts: ['7370'], departments: smDept,
  }, { indent: 1 }),
  line('exp-travel', '  Travel & Entertainment', 'account', {
    type: 'gl_accounts', accounts: ['7295'], departments: smDept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: ['exp-digital', 'exp-print', 'exp-other-adv', 'exp-agency', 'exp-loyalty', 'exp-pr', 'exp-promotions', 'exp-direct', 'exp-travel'],
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
  description: 'USALI 12th Edition Sales & Marketing Schedule — Labor, advertising, loyalty, and promotional expenses.',
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
    type: 'gl_range', from: '6000', to: '6070', departments: pomDept,
  }, { indent: 1 }),
  line('labor-benefits', '  Benefits', 'account', {
    type: 'gl_range', from: '6100', to: '6170', departments: pomDept,
  }, { indent: 1 }),
  line('total-labor', 'TOTAL LABOR', 'total', {
    type: 'sum', lineIds: ['labor-salaries', 'labor-benefits'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  line('header-other', 'OTHER EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-building', '  Building Maintenance', 'account', {
    type: 'gl_accounts', accounts: ['7400'], departments: pomDept,
  }, { indent: 1 }),
  line('exp-elevator', '  Elevator Maintenance', 'account', {
    type: 'gl_accounts', accounts: ['7410'], departments: pomDept,
  }, { indent: 1 }),
  line('exp-electrical', '  Electrical & Mechanical', 'account', {
    type: 'gl_accounts', accounts: ['7420'], departments: pomDept,
  }, { indent: 1 }),
  line('exp-supplies', '  Engineering Supplies', 'account', {
    type: 'gl_accounts', accounts: ['7430'], departments: pomDept,
  }, { indent: 1 }),
  line('exp-flooring', '  Floor Covering', 'account', {
    type: 'gl_accounts', accounts: ['7440'], departments: pomDept,
  }, { indent: 1 }),
  line('exp-furniture', '  Furniture Maintenance', 'account', {
    type: 'gl_accounts', accounts: ['7450'], departments: pomDept,
  }, { indent: 1 }),
  line('exp-grounds', '  Grounds & Landscaping', 'account', {
    type: 'gl_accounts', accounts: ['7460'], departments: pomDept,
  }, { indent: 1 }),
  line('exp-hvac', '  HVAC Maintenance', 'account', {
    type: 'gl_accounts', accounts: ['7470'], departments: pomDept,
  }, { indent: 1 }),
  line('exp-painting', '  Painting & Decorating', 'account', {
    type: 'gl_accounts', accounts: ['7480'], departments: pomDept,
  }, { indent: 1 }),
  line('exp-plumbing', '  Plumbing', 'account', {
    type: 'gl_accounts', accounts: ['7490'], departments: pomDept,
  }, { indent: 1 }),
  line('exp-pool', '  Swimming Pool', 'account', {
    type: 'gl_accounts', accounts: ['7495'], departments: pomDept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: ['exp-building', 'exp-elevator', 'exp-electrical', 'exp-supplies', 'exp-flooring', 'exp-furniture', 'exp-grounds', 'exp-hvac', 'exp-painting', 'exp-plumbing', 'exp-pool'],
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
  description: 'USALI 12th Edition POM Schedule — Engineering labor and building/grounds maintenance expenses.',
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
    type: 'gl_accounts', accounts: ['7500'], departments: utilDept,
  }, { indent: 1 }),
  line('exp-gas', '  Gas', 'account', {
    type: 'gl_accounts', accounts: ['7510'], departments: utilDept,
  }, { indent: 1 }),
  line('exp-water', '  Water & Sewer', 'account', {
    type: 'gl_accounts', accounts: ['7520'], departments: utilDept,
  }, { indent: 1 }),
  line('exp-fuel', '  Oil/Fuel', 'account', {
    type: 'gl_accounts', accounts: ['7530'], departments: utilDept,
  }, { indent: 1 }),
  line('exp-waste', '  Waste Removal', 'account', {
    type: 'gl_accounts', accounts: ['7540'], departments: utilDept,
  }, { indent: 1 }),
  line('total-util', 'TOTAL UTILITIES', 'total', {
    type: 'sum', lineIds: ['exp-electricity', 'exp-gas', 'exp-water', 'exp-fuel', 'exp-waste'],
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
  description: 'USALI 12th Edition Utilities Schedule — Electricity, gas, water, fuel, and waste removal.',
  usaliSection: USALISection.UNDISTRIBUTED_UTILITIES,
  departments: utilDept,
  lines: UTIL_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};

// ─── Information & Telecommunications ────────────────────────────────────────

const itDept = [USALIDepartment.INFORMATION_TECHNOLOGY];

const IT_LINES: ReportLineItem[] = [
  line('header-labor', 'LABOR COSTS', 'header', { type: 'none' }, { bold: true }),
  line('labor-salaries', '  Salaries & Wages', 'account', {
    type: 'gl_range', from: '6000', to: '6070', departments: itDept,
  }, { indent: 1 }),
  line('labor-benefits', '  Benefits', 'account', {
    type: 'gl_range', from: '6100', to: '6170', departments: itDept,
  }, { indent: 1 }),
  line('total-labor', 'TOTAL LABOR', 'total', {
    type: 'sum', lineIds: ['labor-salaries', 'labor-benefits'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  line('header-other', 'OTHER EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('exp-software', '  Software Licenses & SaaS', 'account', {
    type: 'gl_accounts', accounts: ['7600'], departments: itDept,
  }, { indent: 1 }),
  line('exp-hardware', '  Hardware Maintenance', 'account', {
    type: 'gl_accounts', accounts: ['7610'], departments: itDept,
  }, { indent: 1 }),
  line('exp-internet', '  Internet & Connectivity', 'account', {
    type: 'gl_accounts', accounts: ['7620'], departments: itDept,
  }, { indent: 1 }),
  line('exp-pms', '  PMS/POS Systems', 'account', {
    type: 'gl_accounts', accounts: ['7630'], departments: itDept,
  }, { indent: 1 }),
  line('exp-security', '  Cybersecurity', 'account', {
    type: 'gl_accounts', accounts: ['7640'], departments: itDept,
  }, { indent: 1 }),
  line('exp-consulting', '  IT Consulting', 'account', {
    type: 'gl_accounts', accounts: ['7650'], departments: itDept,
  }, { indent: 1 }),
  line('total-other', 'TOTAL OTHER EXPENSES', 'total', {
    type: 'sum', lineIds: ['exp-software', 'exp-hardware', 'exp-internet', 'exp-pms', 'exp-security', 'exp-consulting'],
  }, { bold: true, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  line('total-it', 'TOTAL INFORMATION & TELECOMMUNICATIONS', 'total', {
    type: 'sum', lineIds: ['total-labor', 'total-other'],
  }, { bold: true, underline: 'double' }),
  line('it-pct', '  % of Total Revenue', 'ratio', {
    type: 'ratio', numerator: 'total-it', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 1 }),
];

export const INFORMATION_TECHNOLOGY: USALIReportDefinition = {
  id: 'usali-it',
  name: 'Information & Telecommunications',
  description: 'USALI 12th Edition IT Schedule — Labor, software, hardware, connectivity, and cybersecurity expenses.',
  usaliSection: USALISection.UNDISTRIBUTED_IT,
  departments: itDept,
  lines: IT_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};
