/**
 * @ruflo/usali-reporting
 *
 * USALI 12th Edition Financial Reporting Package for Sage Intacct
 *
 * Provides complete USALI-compliant financial report structures,
 * GL account mappings, department dimensions, KPI calculations,
 * and Sage Intacct export (XML/CSV).
 *
 * Usage:
 *   import { createUSALIReportingPackage } from '@ruflo/usali-reporting';
 *
 *   const pkg = createUSALIReportingPackage({
 *     companyName: 'My Hotel',
 *     currency: 'USD',
 *     glMappings: [...],    // Map your Sage GL numbers to USALI
 *     deptMappings: [...],  // Map your Sage department IDs to USALI
 *   });
 *
 *   // Get all report definitions
 *   const reports = pkg.reports;
 *
 *   // Export to Sage Intacct XML
 *   const xmlFiles = pkg.exportXML();
 *
 *   // Export mapping reference CSV
 *   const csv = pkg.exportReportMappingCSV();
 */

// Types
export * from './types/index.js';

// Reports
export {
  ALL_REPORTS,
  getReportById,
  SUMMARY_OPERATING_STATEMENT,
  ROOMS_DEPARTMENT,
  FOOD_BEVERAGE_DEPARTMENT,
  ADMIN_GENERAL,
  SALES_MARKETING,
  PROPERTY_OPERATIONS,
  UTILITIES,
  INFORMATION_TECHNOLOGY,
  NON_OPERATING,
  MANAGEMENT_FEES,
  FIXED_CHARGES,
} from './reports/index.js';

// Chart of Accounts
export {
  ALL_ACCOUNTS,
  REVENUE_ACCOUNTS,
  COST_OF_SALES_ACCOUNTS,
  LABOR_ACCOUNTS,
  OTHER_EXPENSE_ACCOUNTS,
  NON_OPERATING_ACCOUNTS,
  FIXED_CHARGE_ACCOUNTS,
  STATISTICAL_ACCOUNTS,
  getAccountsByCategory,
  getAccountsByRange,
  getAccount,
} from './chart-of-accounts/index.js';

// Departments
export {
  DEFAULT_DEPARTMENTS,
  getOperatedDepartments,
  getUndistributedDepartments,
  getDepartmentByCode,
} from './departments/index.js';

// KPIs
export {
  ALL_KPIS,
  getKPIsByCategory,
  getKPI,
  calculateKPI,
  OCCUPANCY_PERCENTAGE,
  AVERAGE_DAILY_RATE,
  REVPAR,
  TREVPAR,
  REVPAG,
  FB_REVPOR,
  GOPPAR,
  GOP_MARGIN,
  EBITDA_MARGIN,
  NOI_MARGIN,
  NOPPAR,
  CPOR,
  TOTAL_CPOR,
  FOOD_COST_PCT,
  BEVERAGE_COST_PCT,
  LABOR_COST_PCT,
  LABOR_CPOR,
  REVENUE_PER_FTE,
} from './kpis/index.js';

// Configuration & Mapping
export {
  createDefaultConfig,
  applyGLMappings,
  applyDepartmentMappings,
  remapReportLines,
  validateMappings,
  type GLMappingOverride,
  type DepartmentMappingOverride,
} from './config/default-mappings.js';

// Export
export {
  generateReportXML,
  generateAccountsXML,
  generateDepartmentsXML,
  generateFullReportPackage,
  generateAccountsCSV,
  generateDepartmentsCSV,
  generateLocationsCSV,
  generateReportMappingCSV,
  generateKPIReferenceCSV,
} from './export/index.js';

// ─── Convenience Factory ─────────────────────────────────────────────────────

import type { USALIReportingConfig, USALIReportDefinition } from './types/usali.js';
import { ALL_REPORTS } from './reports/index.js';
import { ALL_KPIS } from './kpis/index.js';
import {
  createDefaultConfig,
  applyGLMappings,
  applyDepartmentMappings,
  remapReportLines,
  validateMappings,
  type GLMappingOverride,
  type DepartmentMappingOverride,
} from './config/default-mappings.js';
import { generateFullReportPackage } from './export/sage-intacct-xml.js';
import { generateReportMappingCSV, generateKPIReferenceCSV } from './export/csv.js';

export interface USALIPackageOptions {
  companyName: string;
  currency?: string;
  fiscalYearStartMonth?: number;
  /** Map your Sage Intacct GL account numbers to USALI template accounts */
  glMappings?: GLMappingOverride[];
  /** Map your Sage Intacct department dimension IDs to USALI departments */
  deptMappings?: DepartmentMappingOverride[];
  /** Include PAR (Per Available Room) metrics */
  includeParMetrics?: boolean;
  /** Include POR (Per Occupied Room) metrics */
  includePorMetrics?: boolean;
  /** Include prior year comparison columns */
  includePriorYear?: boolean;
  /** Include budget comparison columns */
  includeBudget?: boolean;
}

export interface USALIReportingPackage {
  config: USALIReportingConfig;
  reports: USALIReportDefinition[];
  kpis: typeof ALL_KPIS;
  /** Validate all account and department references */
  validate(): { valid: boolean; errors: string[] };
  /** Export all reports as Sage Intacct XML */
  exportXML(): Map<string, string>;
  /** Export report mapping reference as CSV */
  exportReportMappingCSV(): string;
  /** Export KPI reference as CSV */
  exportKPIReferenceCSV(): string;
}

/**
 * Create a fully configured USALI reporting package.
 *
 * Pass your Sage Intacct GL and department mapping overrides
 * to customize the package for your environment.
 */
export function createUSALIReportingPackage(options: USALIPackageOptions): USALIReportingPackage {
  const glMappings = options.glMappings ?? [];
  const deptMappings = options.deptMappings ?? [];

  // Build config with overrides applied
  const mappedAccounts = glMappings.length > 0
    ? applyGLMappings(glMappings)
    : undefined;

  const mappedDepartments = deptMappings.length > 0
    ? applyDepartmentMappings(deptMappings)
    : undefined;

  const config = createDefaultConfig({
    companyName: options.companyName,
    currency: options.currency,
    fiscalYearStartMonth: options.fiscalYearStartMonth,
    accountMappings: mappedAccounts,
    departmentMappings: mappedDepartments,
    includeParMetrics: options.includeParMetrics,
    includePorMetrics: options.includePorMetrics,
    includePriorYear: options.includePriorYear,
    includeBudget: options.includeBudget,
  });

  // Remap all reports if GL or department overrides provided
  const reports = (glMappings.length > 0 || deptMappings.length > 0)
    ? ALL_REPORTS.map(r => remapReportLines(r, glMappings, deptMappings))
    : [...ALL_REPORTS];

  return {
    config,
    reports,
    kpis: ALL_KPIS,

    validate() {
      const allErrors: string[] = [];
      for (const report of reports) {
        const result = validateMappings(report, config.accountMappings, config.departmentMappings);
        allErrors.push(...result.errors);
      }
      return { valid: allErrors.length === 0, errors: allErrors };
    },

    exportXML() {
      return generateFullReportPackage(reports, config);
    },

    exportReportMappingCSV() {
      return generateReportMappingCSV(reports);
    },

    exportKPIReferenceCSV() {
      return generateKPIReferenceCSV(ALL_KPIS);
    },
  };
}
