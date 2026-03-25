/**
 * USALI 12th Edition — Non-Operating I&E, Management Fees, Fixed Charges,
 * and Depreciation & Amortization
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

// ─── Non-Operating Income & Expenses ─────────────────────────────────────────

const nonOpDept = [USALIDepartment.NON_OPERATING];

const NON_OP_LINES: ReportLineItem[] = [
  line('header-income', 'NON-OPERATING INCOME', 'header', { type: 'none' }, { bold: true }),
  line('interest-income', '  Interest Income', 'account', {
    type: 'gl_accounts', accounts: ['8712000', '8712100', '8712200', '8712300'], departments: nonOpDept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('total-income', 'TOTAL NON-OPERATING INCOME', 'total', {
    type: 'sum', lineIds: ['interest-income'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  line('header-expense', 'NON-OPERATING EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('financing-costs', '  Financing Costs', 'account', {
    type: 'gl_accounts', accounts: ['8711000', '8711100', '8711200', '8711300'], departments: nonOpDept,
  }, { indent: 1 }),
  line('gains-losses', '  Gains & Losses', 'account', {
    type: 'gl_accounts', accounts: ['8713000', '8713100', '8713200'], departments: nonOpDept,
  }, { indent: 1 }),
  line('other-nonop', '  Other Non-Operating', 'account', {
    type: 'gl_accounts', accounts: ['8719000', '8719100', '8719200'], departments: nonOpDept,
  }, { indent: 1 }),
  line('total-expense', 'TOTAL NON-OPERATING EXPENSES', 'total', {
    type: 'sum', lineIds: ['financing-costs', 'gains-losses', 'other-nonop'],
  }, { bold: true, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  line('net-nonop', 'NET NON-OPERATING INCOME/(EXPENSES)', 'net', {
    type: 'difference', minuend: 'total-income', subtrahend: 'total-expense',
  }, { bold: true, underline: 'double' }),
];

export const NON_OPERATING: USALIReportDefinition = {
  id: 'usali-nonop',
  name: 'Non-Operating Income & Expenses',
  description: 'USALI 12th Edition Non-Operating I&E Schedule — Interest income, financing costs, gains/losses, and other non-operating items.',
  usaliSection: USALISection.NON_OPERATING,
  departments: nonOpDept,
  lines: NON_OP_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};

// ─── Management Fees ─────────────────────────────────────────────────────────

const mgmtDept = [USALIDepartment.MANAGEMENT_FEES];

const MGMT_LINES: ReportLineItem[] = [
  line('header-mgmt', 'MANAGEMENT FEES', 'header', { type: 'none' }, { bold: true }),
  line('mgmt-parent', '  Management Fees (Parent)', 'account', {
    type: 'gl_accounts', accounts: ['8600000'], departments: mgmtDept,
  }, { indent: 1 }),
  line('base-fee', '  Base Management Fee', 'account', {
    type: 'gl_accounts', accounts: ['8611100'], departments: mgmtDept,
  }, { indent: 1 }),
  line('base-pct', '    % of Total Revenue', 'ratio', {
    type: 'ratio', numerator: 'base-fee', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 2 }),
  line('incentive-fee', '  Incentive Management Fee', 'account', {
    type: 'gl_accounts', accounts: ['8611200'], departments: mgmtDept,
  }, { indent: 1 }),
  line('asset-mgmt-fee', '  Asset Management Fee', 'account', {
    type: 'gl_accounts', accounts: ['8611300'], departments: mgmtDept,
  }, { indent: 1 }),
  line('centralized-fee', '  Centralized Services Fee', 'account', {
    type: 'gl_accounts', accounts: ['8611400'], departments: mgmtDept,
  }, { indent: 1 }),
  line('owner-fee', '  Owner Fee', 'account', {
    type: 'gl_accounts', accounts: ['8611500'], departments: mgmtDept,
  }, { indent: 1 }),
  line('license-fee', '  License Fee', 'account', {
    type: 'gl_accounts', accounts: ['8611600'], departments: mgmtDept,
  }, { indent: 1 }),
  line('total-mgmt', 'TOTAL MANAGEMENT FEES', 'total', {
    type: 'sum', lineIds: [
      'mgmt-parent', 'base-fee', 'incentive-fee', 'asset-mgmt-fee',
      'centralized-fee', 'owner-fee', 'license-fee',
    ],
  }, { bold: true, underline: 'double' }),
  line('mgmt-pct', '  Total Fees % of Revenue', 'ratio', {
    type: 'ratio', numerator: 'total-mgmt', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 1 }),
];

export const MANAGEMENT_FEES: USALIReportDefinition = {
  id: 'usali-mgmt',
  name: 'Management Fees',
  description: 'USALI 12th Edition Management Fees Schedule — Base, incentive, asset, centralized, owner, and license fees.',
  usaliSection: USALISection.MANAGEMENT_FEES,
  departments: mgmtDept,
  lines: MGMT_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};

// ─── Fixed Charges ───────────────────────────────────────────────────────────

const fixedDept = [
  USALIDepartment.RENT,
  USALIDepartment.INSURANCE,
  USALIDepartment.PROPERTY_TAXES,
  USALIDepartment.OTHER_FIXED_CHARGES,
];

const FIXED_LINES: ReportLineItem[] = [
  line('header-fixed', 'FIXED CHARGES', 'header', { type: 'none' }, { bold: true }),
  line('rent', '  Rent', 'account', {
    type: 'gl_accounts', accounts: ['8811100', '8811200', '8811400'], departments: [USALIDepartment.RENT],
  }, { indent: 1 }),
  line('property-insurance', '  Property Insurance', 'account', {
    type: 'gl_accounts', accounts: ['8821100', '8821200', '8821300', '8821400'], departments: [USALIDepartment.INSURANCE],
  }, { indent: 1 }),
  line('real-estate-taxes', '  Real Estate Taxes', 'account', {
    type: 'gl_accounts', accounts: ['8831100', '8831200', '8831300'], departments: [USALIDepartment.PROPERTY_TAXES],
  }, { indent: 1 }),
  line('franchise-brand', '  Franchise/Brand Fees', 'account', {
    type: 'gl_accounts', accounts: ['8841100', '8841200', '8841300'], departments: [USALIDepartment.OTHER_FIXED_CHARGES],
  }, { indent: 1 }),
  line('other-fixed', '  Other Fixed Charges', 'account', {
    type: 'gl_accounts', accounts: ['8850000', '8851100', '8851900'], departments: [USALIDepartment.OTHER_FIXED_CHARGES],
  }, { indent: 1 }),
  line('total-fixed', 'TOTAL FIXED CHARGES', 'total', {
    type: 'sum', lineIds: ['rent', 'property-insurance', 'real-estate-taxes', 'franchise-brand', 'other-fixed'],
  }, { bold: true, underline: 'double' }),
  line('fixed-pct', '  % of Total Revenue', 'ratio', {
    type: 'ratio', numerator: 'total-fixed', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 1 }),
  line('fixed-par', '  Fixed Charges PAR', 'ratio', {
    type: 'ratio', numerator: 'total-fixed', denominator: 'stat-available-rooms', format: 'currency',
  }, { indent: 1 }),
];

export const FIXED_CHARGES: USALIReportDefinition = {
  id: 'usali-fixed',
  name: 'Fixed Charges',
  description: 'USALI 12th Edition Fixed Charges Schedule — Rent, property insurance, real estate taxes, franchise fees, and other fixed charges.',
  usaliSection: USALISection.FIXED_CHARGES,
  departments: fixedDept,
  lines: FIXED_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};

// ─── Depreciation & Amortization ─────────────────────────────────────────────

const daDept = [USALIDepartment.DEPRECIATION];

const DA_LINES: ReportLineItem[] = [
  line('header-da', 'DEPRECIATION & AMORTIZATION', 'header', { type: 'none' }, { bold: true }),
  line('depr-building', '  Depreciation - Building', 'account', {
    type: 'gl_accounts', accounts: ['8910000', '8911000', '8911100', '8911200', '8911300'], departments: daDept,
  }, { indent: 1 }),
  line('depr-ffe', '  Depreciation - FF&E', 'account', {
    type: 'gl_accounts', accounts: [
      '8912000', '8912100', '8912200', '8912300', '8912400', '8912500',
      '8912600',
    ], departments: daDept,
  }, { indent: 1 }),
  line('depr-systems', '  Depreciation - Systems', 'account', {
    type: 'gl_accounts', accounts: ['8913000', '8913100', '8913200', '8913300', '8913400'], departments: daDept,
  }, { indent: 1 }),
  line('amort-intangibles', '  Amortization - Intangibles', 'account', {
    type: 'gl_accounts', accounts: [
      '8920000', '8921000', '8921100', '8921200', '8921300', '8921400',
      '8921500',
    ], departments: daDept,
  }, { indent: 1 }),
  line('amort-other', '  Amortization - Other', 'account', {
    type: 'gl_accounts', accounts: ['8922000', '8922100', '8922200'], departments: daDept,
  }, { indent: 1 }),
  line('total-da', 'TOTAL DEPRECIATION & AMORTIZATION', 'total', {
    type: 'sum', lineIds: [
      'depr-building', 'depr-ffe', 'depr-systems',
      'amort-intangibles', 'amort-other',
    ],
  }, { bold: true, underline: 'double' }),
  line('da-pct', '  % of Total Revenue', 'ratio', {
    type: 'ratio', numerator: 'total-da', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 1 }),
];

export const DEPRECIATION_AMORTIZATION: USALIReportDefinition = {
  id: 'usali-da',
  name: 'Depreciation & Amortization',
  description: 'USALI 12th Edition D&A Schedule — Building, FF&E, and systems depreciation plus intangible and other amortization.',
  usaliSection: USALISection.DEPRECIATION_AMORTIZATION,
  departments: daDept,
  lines: DA_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};
