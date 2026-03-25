/**
 * CSV Export for Sage Intacct
 *
 * Generates CSV files for importing:
 *  - Department dimension values
 *  - GL account structure
 *  - Location dimension values
 *  - Statistical accounts
 *  - Report mapping reference
 */

import type {
  GLAccountMapping,
  DepartmentDimension,
  LocationDimension,
  USALIReportDefinition,
} from '../types/usali.js';
import type { CSVImportOptions } from '../types/sage-intacct.js';

const DEFAULT_CSV_OPTIONS: CSVImportOptions = {
  includeHeaders: true,
  delimiter: ',',
  quoteChar: '"',
  lineEnding: '\r\n',
  dateFormat: 'MM/DD/YYYY',
};

function quote(value: string, quoteChar: string): string {
  if (value.includes(quoteChar) || value.includes(',') || value.includes('\n')) {
    return `${quoteChar}${value.replace(new RegExp(quoteChar, 'g'), quoteChar + quoteChar)}${quoteChar}`;
  }
  return value;
}

function csvRow(values: string[], options: CSVImportOptions): string {
  return values.map(v => quote(v, options.quoteChar)).join(options.delimiter) + options.lineEnding;
}

/**
 * Generate CSV for GL account import into Sage Intacct.
 *
 * Columns: ACCOUNTNO, TITLE, ACCOUNTTYPE, NORMALBALANCE, STATISTICAL, STATUS,
 *          USALI_CATEGORY, USALI_LINE_ID
 */
export function generateAccountsCSV(
  accounts: GLAccountMapping[],
  options: Partial<CSVImportOptions> = {}
): string {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  let output = '';

  if (opts.includeHeaders) {
    output += csvRow([
      'ACCOUNTNO', 'TITLE', 'ACCOUNTTYPE', 'NORMALBALANCE',
      'STATISTICAL', 'STATUS', 'USALI_CATEGORY', 'USALI_LINE_ID',
    ], opts);
  }

  for (const acct of accounts) {
    output += csvRow([
      acct.glAccount,
      acct.title,
      acct.accountType,
      acct.normalBalance,
      acct.isStatistical ? 'T' : 'F',
      'active',
      acct.usaliCategory,
      acct.usaliLineId,
    ], opts);
  }

  return output;
}

/**
 * Generate CSV for department dimension import into Sage Intacct.
 *
 * Columns: DEPARTMENTID, NAME, PARENTID, STATUS, USALI_DEPARTMENT, SORT_ORDER
 */
export function generateDepartmentsCSV(
  departments: DepartmentDimension[],
  options: Partial<CSVImportOptions> = {}
): string {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  let output = '';

  if (opts.includeHeaders) {
    output += csvRow([
      'DEPARTMENTID', 'NAME', 'PARENTID', 'STATUS',
      'USALI_DEPARTMENT', 'SORT_ORDER', 'IS_SUMMARY',
    ], opts);
  }

  for (const dept of departments) {
    output += csvRow([
      dept.dimensionId,
      dept.name,
      dept.parentId ?? '',
      dept.status,
      dept.usaliDepartment,
      String(dept.sortOrder),
      dept.isSummary ? 'Y' : 'N',
    ], opts);
  }

  return output;
}

/**
 * Generate CSV for location dimension import into Sage Intacct.
 *
 * Columns: LOCATIONID, NAME, PROPERTY_TYPE, TOTAL_ROOMS, STATUS, PARENTID
 */
export function generateLocationsCSV(
  locations: LocationDimension[],
  options: Partial<CSVImportOptions> = {}
): string {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  let output = '';

  if (opts.includeHeaders) {
    output += csvRow([
      'LOCATIONID', 'NAME', 'PROPERTY_TYPE', 'TOTAL_ROOMS',
      'STATUS', 'PARENTID',
    ], opts);
  }

  for (const loc of locations) {
    output += csvRow([
      loc.locationId,
      loc.name,
      loc.propertyType,
      String(loc.totalRooms),
      loc.status,
      loc.parentLocationId ?? '',
    ], opts);
  }

  return output;
}

/**
 * Generate a report line mapping CSV.
 * Useful as a reference for mapping your existing GLs to USALI structure.
 *
 * Columns: REPORT, LINE_ID, LABEL, TYPE, SOURCE_TYPE, GL_FROM, GL_TO,
 *          DEPARTMENTS, SIGN_CONVENTION
 */
export function generateReportMappingCSV(
  reports: USALIReportDefinition[],
  options: Partial<CSVImportOptions> = {}
): string {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  let output = '';

  if (opts.includeHeaders) {
    output += csvRow([
      'REPORT_NAME', 'LINE_ID', 'LABEL', 'LINE_TYPE', 'SOURCE_TYPE',
      'GL_ACCOUNTS_OR_RANGE', 'DEPARTMENTS', 'SIGN_CONVENTION', 'FORMULA',
    ], opts);
  }

  for (const report of reports) {
    for (const lineItem of report.lines) {
      let glRef = '';
      let departments = '';
      let formula = '';

      switch (lineItem.source.type) {
        case 'gl_accounts':
          glRef = lineItem.source.accounts.join('; ');
          departments = lineItem.source.departments?.join('; ') ?? '';
          break;
        case 'gl_range':
          glRef = `${lineItem.source.from} - ${lineItem.source.to}`;
          departments = lineItem.source.departments?.join('; ') ?? '';
          break;
        case 'sum':
          formula = `SUM(${lineItem.source.lineIds.join(', ')})`;
          break;
        case 'difference':
          formula = `${lineItem.source.minuend} - ${lineItem.source.subtrahend}`;
          break;
        case 'ratio':
          formula = `${lineItem.source.numerator} / ${lineItem.source.denominator}`;
          break;
        case 'statistic':
          glRef = lineItem.source.statisticId;
          break;
      }

      output += csvRow([
        report.name,
        lineItem.id,
        lineItem.label.trim(),
        lineItem.type,
        lineItem.source.type,
        glRef,
        departments,
        lineItem.signConvention,
        formula,
      ], opts);
    }
  }

  return output;
}

/**
 * Generate a KPI reference CSV.
 */
export function generateKPIReferenceCSV(
  kpis: Array<{ id: string; name: string; abbreviation: string; formula: string; unit: string; category: string }>,
  options: Partial<CSVImportOptions> = {}
): string {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  let output = '';

  if (opts.includeHeaders) {
    output += csvRow(['KPI_ID', 'NAME', 'ABBREVIATION', 'FORMULA', 'UNIT', 'CATEGORY'], opts);
  }

  for (const kpi of kpis) {
    output += csvRow([kpi.id, kpi.name, kpi.abbreviation, kpi.formula, kpi.unit, kpi.category], opts);
  }

  return output;
}
