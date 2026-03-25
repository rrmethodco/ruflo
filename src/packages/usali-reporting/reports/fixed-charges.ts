/**
 * USALI 12th Edition — Non-Operating I&E, Management Fees, and Fixed Charges
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
    type: 'gl_accounts', accounts: ['8000'], departments: nonOpDept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('gain-assets', '  Gain on Sale of Assets', 'account', {
    type: 'gl_accounts', accounts: ['8010'], departments: nonOpDept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('fx-gain', '  Foreign Exchange Gain', 'account', {
    type: 'gl_accounts', accounts: ['8020'], departments: nonOpDept,
  }, { indent: 1, signConvention: 'reversed' }),
  line('total-income', 'TOTAL NON-OPERATING INCOME', 'total', {
    type: 'sum', lineIds: ['interest-income', 'gain-assets', 'fx-gain'],
  }, { bold: true, underline: 'single' }),
  line('blank-1', '', 'blank', { type: 'none' }),

  line('header-expense', 'NON-OPERATING EXPENSES', 'header', { type: 'none' }, { bold: true }),
  line('interest-expense', '  Interest Expense', 'account', {
    type: 'gl_accounts', accounts: ['8050'], departments: nonOpDept,
  }, { indent: 1 }),
  line('loss-assets', '  Loss on Sale of Assets', 'account', {
    type: 'gl_accounts', accounts: ['8060'], departments: nonOpDept,
  }, { indent: 1 }),
  line('fx-loss', '  Foreign Exchange Loss', 'account', {
    type: 'gl_accounts', accounts: ['8070'], departments: nonOpDept,
  }, { indent: 1 }),
  line('depr-building', '  Depreciation - Building', 'account', {
    type: 'gl_accounts', accounts: ['8080'], departments: nonOpDept,
  }, { indent: 1 }),
  line('depr-ffe', '  Depreciation - FF&E', 'account', {
    type: 'gl_accounts', accounts: ['8090'], departments: nonOpDept,
  }, { indent: 1 }),
  line('amortization', '  Amortization', 'account', {
    type: 'gl_accounts', accounts: ['8100'], departments: nonOpDept,
  }, { indent: 1 }),
  line('income-tax', '  Income Tax', 'account', {
    type: 'gl_accounts', accounts: ['8110'], departments: nonOpDept,
  }, { indent: 1 }),
  line('total-expense', 'TOTAL NON-OPERATING EXPENSES', 'total', {
    type: 'sum', lineIds: ['interest-expense', 'loss-assets', 'fx-loss', 'depr-building', 'depr-ffe', 'amortization', 'income-tax'],
  }, { bold: true, underline: 'single' }),
  line('blank-2', '', 'blank', { type: 'none' }),

  line('net-nonop', 'NET NON-OPERATING INCOME/(EXPENSES)', 'net', {
    type: 'difference', minuend: 'total-income', subtrahend: 'total-expense',
  }, { bold: true, underline: 'double' }),
];

export const NON_OPERATING: USALIReportDefinition = {
  id: 'usali-nonop',
  name: 'Non-Operating Income & Expenses',
  description: 'USALI 12th Edition Non-Operating I&E Schedule — Interest, gains/losses, depreciation, amortization, and income tax.',
  usaliSection: USALISection.NON_OPERATING,
  departments: nonOpDept,
  lines: NON_OP_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};

// ─── Management Fees ─────────────────────────────────────────────────────────

const mgmtDept = [USALIDepartment.MANAGEMENT_FEES];

const MGMT_LINES: ReportLineItem[] = [
  line('header-mgmt', 'MANAGEMENT FEES', 'header', { type: 'none' }, { bold: true }),
  line('base-fee', '  Base Management Fee', 'account', {
    type: 'gl_accounts', accounts: ['8600'], departments: mgmtDept,
  }, { indent: 1 }),
  line('base-pct', '    % of Total Revenue', 'ratio', {
    type: 'ratio', numerator: 'base-fee', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 2 }),
  line('incentive-fee', '  Incentive Management Fee', 'account', {
    type: 'gl_accounts', accounts: ['8610'], departments: mgmtDept,
  }, { indent: 1 }),
  line('franchise-fee', '  Franchise/Royalty Fee', 'account', {
    type: 'gl_accounts', accounts: ['8620'], departments: mgmtDept,
  }, { indent: 1 }),
  line('brand-fee', '  Marketing/Brand Fee', 'account', {
    type: 'gl_accounts', accounts: ['8630'], departments: mgmtDept,
  }, { indent: 1 }),
  line('reservation-fee', '  Reservation Contribution', 'account', {
    type: 'gl_accounts', accounts: ['8640'], departments: mgmtDept,
  }, { indent: 1 }),
  line('total-mgmt', 'TOTAL MANAGEMENT FEES', 'total', {
    type: 'sum', lineIds: ['base-fee', 'incentive-fee', 'franchise-fee', 'brand-fee', 'reservation-fee'],
  }, { bold: true, underline: 'double' }),
  line('mgmt-pct', '  Total Fees % of Revenue', 'ratio', {
    type: 'ratio', numerator: 'total-mgmt', denominator: 'total-hotel-revenue', format: 'percentage',
  }, { indent: 1 }),
];

export const MANAGEMENT_FEES: USALIReportDefinition = {
  id: 'usali-mgmt',
  name: 'Management Fees',
  description: 'USALI 12th Edition Management Fees Schedule — Base, incentive, franchise, brand, and reservation fees.',
  usaliSection: USALISection.MANAGEMENT_FEES,
  departments: mgmtDept,
  lines: MGMT_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};

// ─── Fixed Charges ───────────────────────────────────────────────────────────

const fixedDept = [USALIDepartment.FIXED_CHARGES];

const FIXED_LINES: ReportLineItem[] = [
  line('header-fixed', 'FIXED CHARGES', 'header', { type: 'none' }, { bold: true }),
  line('insurance', '  Property Insurance', 'account', {
    type: 'gl_accounts', accounts: ['8500'], departments: fixedDept,
  }, { indent: 1 }),
  line('property-tax', '  Property Tax', 'account', {
    type: 'gl_accounts', accounts: ['8510'], departments: fixedDept,
  }, { indent: 1 }),
  line('land-rent', '  Ground Lease/Land Rent', 'account', {
    type: 'gl_accounts', accounts: ['8520'], departments: fixedDept,
  }, { indent: 1 }),
  line('equip-lease', '  Equipment Lease', 'account', {
    type: 'gl_accounts', accounts: ['8530'], departments: fixedDept,
  }, { indent: 1 }),
  line('total-fixed', 'TOTAL FIXED CHARGES', 'total', {
    type: 'sum', lineIds: ['insurance', 'property-tax', 'land-rent', 'equip-lease'],
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
  description: 'USALI 12th Edition Fixed Charges Schedule — Insurance, property tax, ground lease, and equipment lease.',
  usaliSection: USALISection.FIXED_CHARGES,
  departments: fixedDept,
  lines: FIXED_LINES,
  columns: SUMMARY_OPERATING_STATEMENT.columns,
};
