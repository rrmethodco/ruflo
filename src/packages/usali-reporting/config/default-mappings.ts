/**
 * Default Configuration & Mapping Engine
 *
 * Provides the ability to map YOUR Sage Intacct GL accounts and
 * department dimension values to the USALI report structure.
 */

import type {
  USALIReportingConfig,
  GLAccountMapping,
  DepartmentDimension,
  USALIReportDefinition,
  ReportLineItem,
  LocationDimension,
} from '../types/usali.js';
import { ALL_ACCOUNTS } from '../chart-of-accounts/index.js';
import { DEFAULT_DEPARTMENTS } from '../departments/index.js';

/**
 * Create a default configuration.
 * Override with your actual Sage Intacct values.
 */
export function createDefaultConfig(overrides: Partial<USALIReportingConfig> = {}): USALIReportingConfig {
  return {
    companyName: overrides.companyName ?? 'Hotel Property',
    currency: overrides.currency ?? 'USD',
    fiscalYearStartMonth: overrides.fiscalYearStartMonth ?? 1,
    locations: overrides.locations ?? [],
    accountMappings: overrides.accountMappings ?? ALL_ACCOUNTS,
    departmentMappings: overrides.departmentMappings ?? DEFAULT_DEPARTMENTS,
    includeParMetrics: overrides.includeParMetrics ?? true,
    includePorMetrics: overrides.includePorMetrics ?? true,
    includePriorYear: overrides.includePriorYear ?? true,
    includeBudget: overrides.includeBudget ?? true,
    additionalColumns: overrides.additionalColumns,
  };
}

/**
 * GL Account Mapper — maps your actual Sage Intacct GL numbers
 * to the USALI template account numbers.
 *
 * Example: If your Sage Intacct uses "40100" for Transient Room Revenue
 * instead of the template "4000", provide the mapping.
 */
export interface GLMappingOverride {
  /** Your actual Sage Intacct GL account number */
  sageGLAccount: string;
  /** The USALI template GL account it maps to */
  usaliTemplateAccount: string;
  /** Optional: override the title */
  title?: string;
}

/**
 * Department Mapping Override — maps your actual Sage Intacct
 * department dimension values to USALI departments.
 */
export interface DepartmentMappingOverride {
  /** Your actual Sage Intacct department dimension ID */
  sageDepartmentId: string;
  /** The USALI template department ID it maps to */
  usaliDepartmentId: string;
  /** Optional: override the display name */
  name?: string;
}

/**
 * Apply GL mapping overrides to the default chart of accounts.
 * Returns a new account list with your Sage Intacct GL numbers.
 */
export function applyGLMappings(
  overrides: GLMappingOverride[],
  baseAccounts: GLAccountMapping[] = ALL_ACCOUNTS
): GLAccountMapping[] {
  const overrideMap = new Map(overrides.map(o => [o.usaliTemplateAccount, o]));

  return baseAccounts.map(account => {
    const override = overrideMap.get(account.glAccount);
    if (!override) return account;

    return {
      ...account,
      glAccount: override.sageGLAccount,
      title: override.title ?? account.title,
    };
  });
}

/**
 * Apply department mapping overrides.
 * Returns departments with your Sage Intacct dimension IDs.
 */
export function applyDepartmentMappings(
  overrides: DepartmentMappingOverride[],
  baseDepartments: DepartmentDimension[] = DEFAULT_DEPARTMENTS
): DepartmentDimension[] {
  const overrideMap = new Map(overrides.map(o => [o.usaliDepartmentId, o]));

  return baseDepartments.map(dept => {
    const override = overrideMap.get(dept.dimensionId);
    if (!override) return dept;

    return {
      ...dept,
      dimensionId: override.sageDepartmentId,
      name: override.name ?? dept.name,
    };
  });
}

/**
 * Remap report line items to use your actual GL account numbers
 * after applying GL mapping overrides.
 */
export function remapReportLines(
  report: USALIReportDefinition,
  glOverrides: GLMappingOverride[],
  deptOverrides: DepartmentMappingOverride[]
): USALIReportDefinition {
  const glMap = new Map(glOverrides.map(o => [o.usaliTemplateAccount, o.sageGLAccount]));
  const deptMap = new Map(deptOverrides.map(o => [o.usaliDepartmentId, o.sageDepartmentId]));

  const remappedLines = report.lines.map(lineItem => {
    const source = lineItem.source;

    switch (source.type) {
      case 'gl_accounts': {
        const remappedAccounts = source.accounts.map(a => glMap.get(a) ?? a);
        const remappedDepts = source.departments?.map(d => {
          const mapped = deptMap.get(d);
          return (mapped ?? d) as any;
        });
        return {
          ...lineItem,
          source: { ...source, accounts: remappedAccounts, departments: remappedDepts },
        };
      }
      case 'gl_range': {
        const remappedFrom = glMap.get(source.from) ?? source.from;
        const remappedTo = glMap.get(source.to) ?? source.to;
        const remappedDepts = source.departments?.map(d => {
          const mapped = deptMap.get(d);
          return (mapped ?? d) as any;
        });
        return {
          ...lineItem,
          source: { ...source, from: remappedFrom, to: remappedTo, departments: remappedDepts },
        };
      }
      default:
        return lineItem;
    }
  });

  return { ...report, lines: remappedLines };
}

/**
 * Validate that all GL accounts referenced in report lines
 * exist in the account mappings.
 */
export function validateMappings(
  report: USALIReportDefinition,
  accounts: GLAccountMapping[],
  departments: DepartmentDimension[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const accountSet = new Set(accounts.map(a => a.glAccount));
  const deptSet = new Set(departments.map(d => d.dimensionId));

  for (const lineItem of report.lines) {
    const source = lineItem.source;

    if (source.type === 'gl_accounts') {
      for (const acct of source.accounts) {
        if (!accountSet.has(acct)) {
          errors.push(`Line "${lineItem.label}": GL account ${acct} not found in account mappings`);
        }
      }
    }

    if (source.type === 'gl_accounts' || source.type === 'gl_range') {
      const deps = 'departments' in source ? source.departments : undefined;
      if (deps) {
        for (const dept of deps) {
          if (!deptSet.has(dept)) {
            errors.push(`Line "${lineItem.label}": Department ${dept} not found in department mappings`);
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
