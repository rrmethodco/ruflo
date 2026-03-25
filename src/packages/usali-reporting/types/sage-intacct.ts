/**
 * Sage Intacct Integration Types
 * Types for generating Sage Intacct-compatible import files
 */

// ─── Sage Intacct API Objects ────────────────────────────────────────────────

export interface SageIntacctDimension {
  RECORDNO?: string;
  DIMENSIONID: string;
  NAME: string;
  PARENTID?: string;
  STATUS: 'active' | 'inactive';
  /** Custom fields for USALI mapping */
  USALI_DEPARTMENT?: string;
  USALI_CATEGORY?: string;
}

export interface SageIntacctAccount {
  ACCOUNTNO: string;
  TITLE: string;
  ACCOUNTTYPE: 'incomestatement' | 'balancesheet' | 'statistical';
  NORMALBALANCE: 'debit' | 'credit';
  STATUS: 'active' | 'inactive';
  CATEGORY?: string;
  /** Statistical accounts */
  STATISTICAL?: 'T' | 'F';
  /** Close to retained earnings */
  CLOSINGTYPE?: 'closed_to_retained_earnings' | 'non_closing';
  /** Department restriction */
  DEPARTMENTID?: string;
}

export interface SageIntacctLocation {
  LOCATIONID: string;
  NAME: string;
  PARENTID?: string;
  STATUS: 'active' | 'inactive';
  /** Total rooms for the property */
  TOTAL_ROOMS?: number;
  /** Property type */
  PROPERTY_TYPE?: string;
}

// ─── Financial Report Writer ─────────────────────────────────────────────────

export interface SageIntacctReportDefinition {
  REPORTNAME: string;
  DESCRIPTION: string;
  REPORTTYPE: 'financial';
  ROWDEFINITION: SageIntacctRowDefinition;
  COLUMNDEFINITION: SageIntacctColumnDefinition;
  FILTERS?: SageIntacctReportFilter[];
}

export interface SageIntacctRowDefinition {
  rows: SageIntacctRow[];
}

export interface SageIntacctRow {
  ROWNO: number;
  DESCRIPTION: string;
  ROWTYPE: 'account' | 'calculation' | 'header' | 'total' | 'blank';
  /** GL account number or range */
  ACCOUNTNO?: string;
  ACCOUNTNOEND?: string;
  /** Department filter for this row */
  DEPARTMENTID?: string;
  /** Formula for calculated rows */
  FORMULA?: string;
  /** Formatting */
  BOLD?: boolean;
  UNDERLINE?: 'single' | 'double';
  INDENT?: number;
  /** Sign reversal */
  REVERSENORMAL?: boolean;
}

export interface SageIntacctColumnDefinition {
  columns: SageIntacctColumn[];
}

export interface SageIntacctColumn {
  COLUMNNO: number;
  HEADER: string;
  COLUMNTYPE: 'actual' | 'budget' | 'variance' | 'percentage' | 'statistical';
  PERIODTYPE: 'current_month' | 'current_quarter' | 'ytd' | 'full_year' | 'prior_year' | 'prior_month';
  BOOKID?: string;
  /** For variance columns */
  COLUMN1?: number;
  COLUMN2?: number;
  FORMAT?: 'currency' | 'percentage' | 'integer';
  WIDTH?: number;
}

export interface SageIntacctReportFilter {
  FIELDNAME: string;
  OPERATOR: 'equal_to' | 'not_equal_to' | 'in' | 'between';
  VALUE: string;
}

// ─── CSV Import Format ───────────────────────────────────────────────────────

export interface CSVImportOptions {
  /** Include header row */
  includeHeaders: boolean;
  /** Delimiter character */
  delimiter: ',' | '\t' | '|';
  /** Quote character for text fields */
  quoteChar: '"' | "'";
  /** Line ending */
  lineEnding: '\r\n' | '\n';
  /** Date format */
  dateFormat: 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD/MM/YYYY';
}

// ─── XML Export Format ───────────────────────────────────────────────────────

export interface XMLExportOptions {
  /** XML version */
  version: '1.0';
  /** Encoding */
  encoding: 'UTF-8';
  /** Pretty print */
  prettyPrint: boolean;
  /** Indent size */
  indentSize: number;
  /** Sage Intacct API version */
  apiVersion: '3.0';
  /** Control ID for API requests */
  controlId?: string;
}

// ─── Sage Intacct Journal Entry ──────────────────────────────────────────────

export interface SageIntacctJournalEntry {
  JOURNAL: string;
  BATCH_DATE: string;
  BATCH_TITLE: string;
  ENTRIES: SageIntacctJournalLine[];
}

export interface SageIntacctJournalLine {
  ACCOUNTNO: string;
  DEBIT?: number;
  CREDIT?: number;
  DEPARTMENTID?: string;
  LOCATIONID?: string;
  MEMO?: string;
}
