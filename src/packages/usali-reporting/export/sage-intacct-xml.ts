/**
 * Sage Intacct XML Export
 *
 * Generates XML files compatible with Sage Intacct's:
 *  - Financial Report Writer (report definitions)
 *  - Web Services API (dimension values, accounts)
 *
 * These can be imported directly into Sage Intacct or used
 * as templates for the Financial Report Writer.
 */

import type {
  USALIReportDefinition,
  ReportLineItem,
  ReportColumn,
  GLAccountMapping,
  DepartmentDimension,
  USALIReportingConfig,
} from '../types/usali.js';
import type { XMLExportOptions } from '../types/sage-intacct.js';

const DEFAULT_XML_OPTIONS: XMLExportOptions = {
  version: '1.0',
  encoding: 'UTF-8',
  prettyPrint: true,
  indentSize: 2,
  apiVersion: '3.0',
};

function indent(level: number, size: number): string {
  return ' '.repeat(level * size);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate Sage Intacct Financial Report Writer XML for a USALI report.
 */
export function generateReportXML(
  report: USALIReportDefinition,
  config: USALIReportingConfig,
  options: Partial<XMLExportOptions> = {}
): string {
  const opts = { ...DEFAULT_XML_OPTIONS, ...options };
  const ind = (level: number) => opts.prettyPrint ? indent(level, opts.indentSize) : '';
  const nl = opts.prettyPrint ? '\n' : '';

  const lines: string[] = [];
  lines.push(`<?xml version="${opts.version}" encoding="${opts.encoding}"?>${nl}`);
  lines.push(`<request>${nl}`);
  lines.push(`${ind(1)}<control>${nl}`);
  lines.push(`${ind(2)}<senderid>ruflo-usali</senderid>${nl}`);
  lines.push(`${ind(2)}<password></password>${nl}`);
  lines.push(`${ind(2)}<controlid>${opts.controlId ?? `usali-${report.id}-${Date.now()}`}</controlid>${nl}`);
  lines.push(`${ind(2)}<uniqueid>false</uniqueid>${nl}`);
  lines.push(`${ind(2)}<dtdversion>${opts.apiVersion}</dtdversion>${nl}`);
  lines.push(`${ind(1)}</control>${nl}`);
  lines.push(`${ind(1)}<operation>${nl}`);
  lines.push(`${ind(2)}<authentication>${nl}`);
  lines.push(`${ind(3)}<sessionid></sessionid>${nl}`);
  lines.push(`${ind(2)}</authentication>${nl}`);
  lines.push(`${ind(2)}<content>${nl}`);
  lines.push(`${ind(3)}<function controlid="create-report">${nl}`);
  lines.push(`${ind(4)}<create>${nl}`);
  lines.push(`${ind(5)}<FINANCIALREPORT>${nl}`);
  lines.push(`${ind(6)}<NAME>${escapeXml(report.name)}</NAME>${nl}`);
  lines.push(`${ind(6)}<DESCRIPTION>${escapeXml(report.description)}</DESCRIPTION>${nl}`);
  lines.push(`${ind(6)}<REPORTTYPE>financial</REPORTTYPE>${nl}`);
  lines.push(`${ind(6)}<COMPANYNAME>${escapeXml(config.companyName)}</COMPANYNAME>${nl}`);
  lines.push(`${ind(6)}<CURRENCY>${config.currency}</CURRENCY>${nl}`);

  // Row definitions
  lines.push(`${ind(6)}<ROWS>${nl}`);
  let rowNo = 1;
  for (const lineItem of report.lines) {
    lines.push(generateRowXML(lineItem, rowNo, ind, nl, 7));
    rowNo++;
  }
  lines.push(`${ind(6)}</ROWS>${nl}`);

  // Column definitions
  lines.push(`${ind(6)}<COLUMNS>${nl}`);
  let colNo = 1;
  for (const col of report.columns) {
    lines.push(generateColumnXML(col, colNo, ind, nl, 7));
    colNo++;
  }
  lines.push(`${ind(6)}</COLUMNS>${nl}`);

  // Department filter
  if (report.departments.length > 0) {
    lines.push(`${ind(6)}<FILTERS>${nl}`);
    lines.push(`${ind(7)}<FILTER>${nl}`);
    lines.push(`${ind(8)}<FIELDNAME>DEPARTMENTID</FIELDNAME>${nl}`);
    lines.push(`${ind(8)}<OPERATOR>in</OPERATOR>${nl}`);
    lines.push(`${ind(8)}<VALUE>${report.departments.join(',')}</VALUE>${nl}`);
    lines.push(`${ind(7)}</FILTER>${nl}`);
    lines.push(`${ind(6)}</FILTERS>${nl}`);
  }

  lines.push(`${ind(5)}</FINANCIALREPORT>${nl}`);
  lines.push(`${ind(4)}</create>${nl}`);
  lines.push(`${ind(3)}</function>${nl}`);
  lines.push(`${ind(2)}</content>${nl}`);
  lines.push(`${ind(1)}</operation>${nl}`);
  lines.push(`</request>${nl}`);

  return lines.join('');
}

function generateRowXML(
  lineItem: ReportLineItem,
  rowNo: number,
  ind: (level: number) => string,
  nl: string,
  baseIndent: number
): string {
  const lines: string[] = [];
  lines.push(`${ind(baseIndent)}<ROW>${nl}`);
  lines.push(`${ind(baseIndent + 1)}<ROWNO>${rowNo}</ROWNO>${nl}`);
  lines.push(`${ind(baseIndent + 1)}<DESCRIPTION>${escapeXml(lineItem.label)}</DESCRIPTION>${nl}`);
  lines.push(`${ind(baseIndent + 1)}<ROWTYPE>${mapRowType(lineItem.type)}</ROWTYPE>${nl}`);

  if (lineItem.source.type === 'gl_accounts') {
    lines.push(`${ind(baseIndent + 1)}<ACCOUNTNO>${lineItem.source.accounts[0]}</ACCOUNTNO>${nl}`);
    if (lineItem.source.accounts.length > 1) {
      lines.push(`${ind(baseIndent + 1)}<ACCOUNTNOEND>${lineItem.source.accounts[lineItem.source.accounts.length - 1]}</ACCOUNTNOEND>${nl}`);
    }
    if (lineItem.source.departments?.length) {
      lines.push(`${ind(baseIndent + 1)}<DEPARTMENTID>${lineItem.source.departments[0]}</DEPARTMENTID>${nl}`);
    }
  } else if (lineItem.source.type === 'gl_range') {
    lines.push(`${ind(baseIndent + 1)}<ACCOUNTNO>${lineItem.source.from}</ACCOUNTNO>${nl}`);
    lines.push(`${ind(baseIndent + 1)}<ACCOUNTNOEND>${lineItem.source.to}</ACCOUNTNOEND>${nl}`);
    if (lineItem.source.departments?.length) {
      lines.push(`${ind(baseIndent + 1)}<DEPARTMENTID>${lineItem.source.departments[0]}</DEPARTMENTID>${nl}`);
    }
  } else if (lineItem.source.type === 'sum') {
    lines.push(`${ind(baseIndent + 1)}<FORMULA>SUM(${lineItem.source.lineIds.join(',')})</FORMULA>${nl}`);
  } else if (lineItem.source.type === 'difference') {
    lines.push(`${ind(baseIndent + 1)}<FORMULA>${lineItem.source.minuend} - ${lineItem.source.subtrahend}</FORMULA>${nl}`);
  } else if (lineItem.source.type === 'ratio') {
    lines.push(`${ind(baseIndent + 1)}<FORMULA>${lineItem.source.numerator} / ${lineItem.source.denominator}</FORMULA>${nl}`);
  }

  if (lineItem.bold) {
    lines.push(`${ind(baseIndent + 1)}<BOLD>true</BOLD>${nl}`);
  }
  if (lineItem.underline && lineItem.underline !== 'none') {
    lines.push(`${ind(baseIndent + 1)}<UNDERLINE>${lineItem.underline}</UNDERLINE>${nl}`);
  }
  if (lineItem.indent > 0) {
    lines.push(`${ind(baseIndent + 1)}<INDENT>${lineItem.indent}</INDENT>${nl}`);
  }
  if (lineItem.signConvention === 'reversed') {
    lines.push(`${ind(baseIndent + 1)}<REVERSENORMAL>true</REVERSENORMAL>${nl}`);
  }

  lines.push(`${ind(baseIndent)}</ROW>${nl}`);
  return lines.join('');
}

function generateColumnXML(
  col: ReportColumn,
  colNo: number,
  ind: (level: number) => string,
  nl: string,
  baseIndent: number
): string {
  const lines: string[] = [];
  lines.push(`${ind(baseIndent)}<COLUMN>${nl}`);
  lines.push(`${ind(baseIndent + 1)}<COLUMNNO>${colNo}</COLUMNNO>${nl}`);
  lines.push(`${ind(baseIndent + 1)}<HEADER>${escapeXml(col.label)}</HEADER>${nl}`);
  lines.push(`${ind(baseIndent + 1)}<COLUMNTYPE>${mapColumnType(col.type)}</COLUMNTYPE>${nl}`);

  if (col.period) {
    lines.push(`${ind(baseIndent + 1)}<PERIODTYPE>${mapPeriodType(col.period.type)}</PERIODTYPE>${nl}`);
  }

  if (col.type === 'budget') {
    lines.push(`${ind(baseIndent + 1)}<BOOKID>budget</BOOKID>${nl}`);
  }

  if (col.sourceColumns) {
    lines.push(`${ind(baseIndent + 1)}<COLUMN1>${col.sourceColumns.actual}</COLUMN1>${nl}`);
    lines.push(`${ind(baseIndent + 1)}<COLUMN2>${col.sourceColumns.comparison}</COLUMN2>${nl}`);
  }

  lines.push(`${ind(baseIndent + 1)}<FORMAT>${col.format}</FORMAT>${nl}`);
  if (col.width) {
    lines.push(`${ind(baseIndent + 1)}<WIDTH>${col.width}</WIDTH>${nl}`);
  }

  lines.push(`${ind(baseIndent)}</COLUMN>${nl}`);
  return lines.join('');
}

function mapRowType(type: ReportLineItem['type']): string {
  switch (type) {
    case 'account': return 'account';
    case 'subtotal': return 'calculation';
    case 'total': return 'total';
    case 'net': return 'calculation';
    case 'ratio': return 'calculation';
    case 'statistic': return 'account';
    case 'header': return 'header';
    case 'separator': return 'blank';
    case 'blank': return 'blank';
    default: return 'account';
  }
}

function mapColumnType(type: ReportColumn['type']): string {
  switch (type) {
    case 'actual': return 'actual';
    case 'budget': return 'budget';
    case 'forecast': return 'budget';
    case 'prior_year': return 'actual';
    case 'variance_amount': return 'variance';
    case 'variance_percent': return 'percentage';
    case 'per_available_room': return 'statistical';
    case 'per_occupied_room': return 'statistical';
    case 'percent_of_revenue': return 'percentage';
    default: return 'actual';
  }
}

function mapPeriodType(type: string): string {
  switch (type) {
    case 'month': return 'current_month';
    case 'quarter': return 'current_quarter';
    case 'ytd': return 'ytd';
    case 'full_year': return 'full_year';
    default: return 'current_month';
  }
}

/**
 * Generate XML for batch creating GL accounts in Sage Intacct.
 */
export function generateAccountsXML(
  accounts: GLAccountMapping[],
  options: Partial<XMLExportOptions> = {}
): string {
  const opts = { ...DEFAULT_XML_OPTIONS, ...options };
  const ind = (level: number) => opts.prettyPrint ? indent(level, opts.indentSize) : '';
  const nl = opts.prettyPrint ? '\n' : '';

  const lines: string[] = [];
  lines.push(`<?xml version="${opts.version}" encoding="${opts.encoding}"?>${nl}`);
  lines.push(`<!-- USALI 12th Edition Chart of Accounts for Sage Intacct -->${nl}`);
  lines.push(`<!-- Generated by Ruflo USALI Reporting Package -->${nl}`);
  lines.push(`<request>${nl}`);
  lines.push(`${ind(1)}<control>${nl}`);
  lines.push(`${ind(2)}<senderid>ruflo-usali</senderid>${nl}`);
  lines.push(`${ind(2)}<controlid>usali-accounts-${Date.now()}</controlid>${nl}`);
  lines.push(`${ind(2)}<dtdversion>${opts.apiVersion}</dtdversion>${nl}`);
  lines.push(`${ind(1)}</control>${nl}`);
  lines.push(`${ind(1)}<operation>${nl}`);
  lines.push(`${ind(2)}<content>${nl}`);

  for (const account of accounts) {
    lines.push(`${ind(3)}<function controlid="create-${account.glAccount}">${nl}`);
    lines.push(`${ind(4)}<create>${nl}`);
    lines.push(`${ind(5)}<GLACCOUNT>${nl}`);
    lines.push(`${ind(6)}<ACCOUNTNO>${escapeXml(account.glAccount)}</ACCOUNTNO>${nl}`);
    lines.push(`${ind(6)}<TITLE>${escapeXml(account.title)}</TITLE>${nl}`);
    lines.push(`${ind(6)}<ACCOUNTTYPE>${account.accountType}</ACCOUNTTYPE>${nl}`);
    lines.push(`${ind(6)}<NORMALBALANCE>${account.normalBalance}</NORMALBALANCE>${nl}`);
    lines.push(`${ind(6)}<CLOSINGTYPE>${account.accountType === 'incomestatement' ? 'closed_to_retained_earnings' : 'non_closing'}</CLOSINGTYPE>${nl}`);
    if (account.isStatistical) {
      lines.push(`${ind(6)}<STATISTICAL>T</STATISTICAL>${nl}`);
    }
    lines.push(`${ind(6)}<STATUS>active</STATUS>${nl}`);
    lines.push(`${ind(5)}</GLACCOUNT>${nl}`);
    lines.push(`${ind(4)}</create>${nl}`);
    lines.push(`${ind(3)}</function>${nl}`);
  }

  lines.push(`${ind(2)}</content>${nl}`);
  lines.push(`${ind(1)}</operation>${nl}`);
  lines.push(`</request>${nl}`);

  return lines.join('');
}

/**
 * Generate XML for creating department dimension values in Sage Intacct.
 */
export function generateDepartmentsXML(
  departments: DepartmentDimension[],
  options: Partial<XMLExportOptions> = {}
): string {
  const opts = { ...DEFAULT_XML_OPTIONS, ...options };
  const ind = (level: number) => opts.prettyPrint ? indent(level, opts.indentSize) : '';
  const nl = opts.prettyPrint ? '\n' : '';

  const lines: string[] = [];
  lines.push(`<?xml version="${opts.version}" encoding="${opts.encoding}"?>${nl}`);
  lines.push(`<!-- USALI 12th Edition Department Dimensions for Sage Intacct -->${nl}`);
  lines.push(`<request>${nl}`);
  lines.push(`${ind(1)}<control>${nl}`);
  lines.push(`${ind(2)}<senderid>ruflo-usali</senderid>${nl}`);
  lines.push(`${ind(2)}<controlid>usali-depts-${Date.now()}</controlid>${nl}`);
  lines.push(`${ind(2)}<dtdversion>${opts.apiVersion}</dtdversion>${nl}`);
  lines.push(`${ind(1)}</control>${nl}`);
  lines.push(`${ind(1)}<operation>${nl}`);
  lines.push(`${ind(2)}<content>${nl}`);

  for (const dept of departments) {
    lines.push(`${ind(3)}<function controlid="create-dept-${dept.dimensionId}">${nl}`);
    lines.push(`${ind(4)}<create>${nl}`);
    lines.push(`${ind(5)}<DEPARTMENT>${nl}`);
    lines.push(`${ind(6)}<DEPARTMENTID>${escapeXml(dept.dimensionId)}</DEPARTMENTID>${nl}`);
    lines.push(`${ind(6)}<TITLE>${escapeXml(dept.name)}</TITLE>${nl}`);
    if (dept.parentId) {
      lines.push(`${ind(6)}<PARENTID>${escapeXml(dept.parentId)}</PARENTID>${nl}`);
    }
    lines.push(`${ind(6)}<STATUS>${dept.status}</STATUS>${nl}`);
    lines.push(`${ind(5)}</DEPARTMENT>${nl}`);
    lines.push(`${ind(4)}</create>${nl}`);
    lines.push(`${ind(3)}</function>${nl}`);
  }

  lines.push(`${ind(2)}</content>${nl}`);
  lines.push(`${ind(1)}</operation>${nl}`);
  lines.push(`</request>${nl}`);

  return lines.join('');
}

/**
 * Generate a complete report package as XML files.
 * Returns a map of filename → XML content.
 */
export function generateFullReportPackage(
  reports: USALIReportDefinition[],
  config: USALIReportingConfig,
  options: Partial<XMLExportOptions> = {}
): Map<string, string> {
  const files = new Map<string, string>();

  // Individual report definitions
  for (const report of reports) {
    const filename = `report-${report.id}.xml`;
    files.set(filename, generateReportXML(report, config, options));
  }

  // Accounts (if using default template accounts)
  files.set('accounts.xml', generateAccountsXML(config.accountMappings, options));

  // Departments
  files.set('departments.xml', generateDepartmentsXML(config.departmentMappings, options));

  return files;
}
