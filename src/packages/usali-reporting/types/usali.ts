/**
 * USALI 12th Edition Type Definitions
 * Uniform System of Accounts for the Lodging Industry
 */

// ─── USALI Department Codes ───────────────────────────────────────────────────

export enum USALIDepartment {
  // Revenue Centers (Operated Departments)
  ROOMS = 'ROOMS',
  FOOD_AND_BEVERAGE = 'F&B',
  OTHER_OPERATED_SPA = 'SPA',
  OTHER_OPERATED_GOLF = 'GOLF',
  OTHER_OPERATED_PARKING = 'PARKING',
  OTHER_OPERATED_TELECOM = 'TELECOM',
  OTHER_OPERATED_RETAIL = 'RETAIL',
  OTHER_OPERATED_RECREATION = 'RECREATION',
  OTHER_OPERATED_OTHER = 'OTHER_OP',

  // Undistributed Operating Expenses
  ADMIN_AND_GENERAL = 'A&G',
  SALES_AND_MARKETING = 'S&M',
  PROPERTY_OPERATIONS = 'POM',
  UTILITIES = 'UTIL',
  INFORMATION_TECHNOLOGY = 'IT',

  // Non-Operating
  MANAGEMENT_FEES = 'MGMT_FEE',
  NON_OPERATING = 'NON_OP',
  FIXED_CHARGES = 'FIXED',
  HOUSE = 'HOUSE',
}

// ─── Account Categories ──────────────────────────────────────────────────────

export enum USALIAccountCategory {
  REVENUE = 'Revenue',
  COST_OF_SALES = 'Cost of Sales',
  LABOR_COST = 'Labor Cost',
  OTHER_EXPENSE = 'Other Expense',
  STATISTICS = 'Statistics',
  NON_OPERATING_INCOME = 'Non-Operating Income',
  NON_OPERATING_EXPENSE = 'Non-Operating Expense',
  FIXED_CHARGE = 'Fixed Charge',
  MANAGEMENT_FEE = 'Management Fee',
}

// ─── Report Line Item Types ──────────────────────────────────────────────────

export type LineItemType =
  | 'account'
  | 'subtotal'
  | 'total'
  | 'net'
  | 'ratio'
  | 'statistic'
  | 'header'
  | 'separator'
  | 'blank';

export interface ReportLineItem {
  id: string;
  label: string;
  type: LineItemType;
  /** GL account range or computed reference */
  source: LineItemSource;
  /** Indentation level for report formatting */
  indent: number;
  /** Whether to show as percentage of a reference line */
  showAsPercentOf?: string;
  /** Sign convention: 'natural' (debit=positive) or 'reversed' (credit=positive) */
  signConvention: 'natural' | 'reversed';
  /** Bold formatting */
  bold?: boolean;
  /** Underline style */
  underline?: 'single' | 'double' | 'none';
}

export type LineItemSource =
  | { type: 'gl_range'; from: string; to: string; departments?: USALIDepartment[] }
  | { type: 'gl_accounts'; accounts: string[]; departments?: USALIDepartment[] }
  | { type: 'sum'; lineIds: string[] }
  | { type: 'difference'; minuend: string; subtrahend: string }
  | { type: 'ratio'; numerator: string; denominator: string; format: 'percentage' | 'decimal' | 'currency' }
  | { type: 'statistic'; statisticId: string }
  | { type: 'formula'; expression: string }
  | { type: 'none' };

// ─── Report Definitions ──────────────────────────────────────────────────────

export interface USALIReportDefinition {
  id: string;
  name: string;
  description: string;
  usaliSection: USALISection;
  departments: USALIDepartment[];
  lines: ReportLineItem[];
  columns: ReportColumn[];
}

export enum USALISection {
  SUMMARY_OPERATING_STATEMENT = 'Summary Operating Statement',
  ROOMS = 'Rooms Department',
  FOOD_AND_BEVERAGE = 'Food & Beverage Department',
  OTHER_OPERATED = 'Other Operated Departments',
  UNDISTRIBUTED_ADMIN = 'Administrative & General',
  UNDISTRIBUTED_SALES = 'Sales & Marketing',
  UNDISTRIBUTED_POM = 'Property Operations & Maintenance',
  UNDISTRIBUTED_UTILITIES = 'Utilities',
  UNDISTRIBUTED_IT = 'Information & Telecommunications',
  NON_OPERATING = 'Non-Operating Income & Expenses',
  MANAGEMENT_FEES = 'Management Fees',
  FIXED_CHARGES = 'Fixed Charges',
}

export interface ReportColumn {
  id: string;
  label: string;
  type: ReportColumnType;
  /** Period reference for actual/budget columns */
  period?: ReportPeriod;
  /** Source column for variance calculations */
  sourceColumns?: { actual: string; comparison: string };
  /** Format: currency, percentage, integer, decimal */
  format: 'currency' | 'percentage' | 'integer' | 'decimal';
  width?: number;
}

export type ReportColumnType =
  | 'actual'
  | 'budget'
  | 'forecast'
  | 'prior_year'
  | 'variance_amount'
  | 'variance_percent'
  | 'per_available_room'
  | 'per_occupied_room'
  | 'percent_of_revenue';

export interface ReportPeriod {
  type: 'month' | 'quarter' | 'ytd' | 'full_year' | 'custom';
  year: number;
  month?: number;
  quarter?: number;
  startDate?: string;
  endDate?: string;
}

// ─── GL Account Mapping ──────────────────────────────────────────────────────

export interface GLAccountMapping {
  /** Sage Intacct GL account number */
  glAccount: string;
  /** GL account title */
  title: string;
  /** USALI category */
  usaliCategory: USALIAccountCategory;
  /** USALI report line reference */
  usaliLineId: string;
  /** Normal balance */
  normalBalance: 'debit' | 'credit';
  /** Account type in Sage Intacct */
  accountType: SageIntacctAccountType;
  /** Whether this is a statistical account */
  isStatistical: boolean;
}

export type SageIntacctAccountType =
  | 'incomestatement'
  | 'balancesheet'
  | 'statistical';

// ─── Department Dimension ────────────────────────────────────────────────────

export interface DepartmentDimension {
  /** Dimension ID in Sage Intacct */
  dimensionId: string;
  /** Display name */
  name: string;
  /** USALI department mapping */
  usaliDepartment: USALIDepartment;
  /** Parent department for hierarchy */
  parentId?: string;
  /** Sort order */
  sortOrder: number;
  /** Whether this is a summary/rollup department */
  isSummary: boolean;
  /** Status in Sage Intacct */
  status: 'active' | 'inactive';
}

// ─── Location Dimension (Multi-Property) ─────────────────────────────────────

export interface LocationDimension {
  locationId: string;
  name: string;
  propertyType: PropertyType;
  totalRooms: number;
  status: 'active' | 'inactive';
  parentLocationId?: string;
}

export type PropertyType =
  | 'full_service'
  | 'limited_service'
  | 'resort'
  | 'extended_stay'
  | 'boutique'
  | 'convention'
  | 'casino'
  | 'other';

// ─── Statistics & KPIs ───────────────────────────────────────────────────────

export interface USALIStatistic {
  id: string;
  name: string;
  abbreviation: string;
  formula: string;
  unit: 'currency' | 'percentage' | 'number' | 'ratio';
  description: string;
  category: StatisticCategory;
}

export type StatisticCategory =
  | 'occupancy'
  | 'rate'
  | 'revenue'
  | 'profitability'
  | 'labor'
  | 'cost';

// ─── Report Output ───────────────────────────────────────────────────────────

export interface ReportOutput {
  report: USALIReportDefinition;
  period: ReportPeriod;
  location?: LocationDimension;
  data: ReportRow[];
  generatedAt: string;
  currency: string;
}

export interface ReportRow {
  lineItem: ReportLineItem;
  values: Record<string, number | null>;
}

// ─── Configuration ───────────────────────────────────────────────────────────

export interface USALIReportingConfig {
  /** Company name */
  companyName: string;
  /** Default currency code */
  currency: string;
  /** Fiscal year start month (1-12) */
  fiscalYearStartMonth: number;
  /** Available locations/properties */
  locations: LocationDimension[];
  /** GL account mappings */
  accountMappings: GLAccountMapping[];
  /** Department dimension mappings */
  departmentMappings: DepartmentDimension[];
  /** Custom report columns beyond defaults */
  additionalColumns?: ReportColumn[];
  /** Whether to include per-available-room metrics */
  includeParMetrics: boolean;
  /** Whether to include per-occupied-room metrics */
  includePorMetrics: boolean;
  /** Include prior year comparisons */
  includePriorYear: boolean;
  /** Include budget comparisons */
  includeBudget: boolean;
}
