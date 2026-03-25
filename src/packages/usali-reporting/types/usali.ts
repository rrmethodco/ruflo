/**
 * USALI 12th Edition Type Definitions
 * Uniform System of Accounts for the Lodging Industry
 *
 * Mapped to actual Sage Intacct dimension values and GL account structure.
 */

// ─── USALI Department Codes ───────────────────────────────────────────────────
// These map to the Sage Intacct DEPARTMENT dimension IDs.

export enum USALIDepartment {
  // ── Revenue Centers (Operated Departments) ──────────────────────────────
  ROOMS = 'ROOMS',
  ROOMS_GUEST_SERVICES = 'ROOMS_GUEST_SVC',
  ROOMS_HOUSEKEEPING = 'ROOMS_HK',
  ROOMS_TELEPHONE = 'ROOMS_TEL',
  ROOMS_INTERNET = 'ROOMS_INTERNET',
  ROOMS_LAUNDRY = 'ROOMS_LAUNDRY',
  ROOMS_MINIBAR = 'ROOMS_MINIBAR',
  ROOMS_OTHER = 'ROOMS_OTHER',

  FOOD_AND_BEVERAGE = 'F&B',
  FB_RESTAURANT = 'FB_REST',
  FB_BAR_LOUNGE = 'FB_BAR',
  FB_BANQUETS = 'FB_BANQUET',
  FB_IN_ROOM_DINING = 'FB_IRD',
  FB_MINIBAR = 'FB_MINIBAR',
  FB_OTHER = 'FB_OTHER',

  // Named restaurant outlets
  FB_WM_MULERINS = 'FB_WM_MULERINS',
  FB_HIROKI_PHL = 'FB_HIROKI_PHL',
  FB_LOWLAND = 'FB_LOWLAND',
  FB_ROSEMARY_ROSE = 'FB_ROSEMARY_ROSE',
  FB_LE_SUPREME = 'FB_LE_SUPREME',
  FB_HIROKI_DET = 'FB_HIROKI_DET',
  FB_KAMPERS = 'FB_KAMPERS',
  FB_ANTHOLOGY = 'FB_ANTHOLOGY',
  FB_QUOIN = 'FB_QUOIN',
  FB_LITTLE_WING = 'FB_LITTLE_WING',
  FB_VESSEL = 'FB_VESSEL',

  OTHER_OPERATED = 'OTHER_OP',
  OTHER_OPERATED_SPA = 'SPA',
  OTHER_OPERATED_PARKING = 'PARKING',
  OTHER_OPERATED_RETAIL = 'RETAIL',
  OTHER_OPERATED_RECREATION = 'RECREATION',
  OTHER_OPERATED_BUSINESS_CENTER = 'BIZ_CTR',
  OTHER_OPERATED_GOLF = 'GOLF',
  OTHER_OPERATED_OTHER = 'OTHER_OP_OTHER',

  MISCELLANEOUS_INCOME = 'MISC_INCOME',
  MISC_RENTAL = 'MISC_RENTAL',
  MISC_COMMISSIONS = 'MISC_COMMISSION',
  MISC_CANCEL_NOSHOW = 'MISC_CANCEL',
  MISC_OTHER = 'MISC_OTHER',

  // ── Undistributed Operating Expenses ────────────────────────────────────
  ADMIN_AND_GENERAL = 'A&G',
  AG_EXECUTIVE = 'AG_EXEC',
  AG_ACCOUNTING = 'AG_ACCT',
  AG_HUMAN_RESOURCES = 'AG_HR',
  AG_LEGAL = 'AG_LEGAL',
  AG_PURCHASING = 'AG_PURCH',
  AG_OFFICE = 'AG_OFFICE',
  AG_RISK_SECURITY = 'AG_RISK',
  AG_CORPORATE = 'AG_CORP',

  INFORMATION_TECHNOLOGY = 'IT',
  IT_PROPERTY_SYSTEMS = 'IT_PROP',
  IT_ENTERPRISE_APPS = 'IT_ENTERPRISE',
  IT_TELECOM = 'IT_TELECOM',
  IT_DATA_BI = 'IT_DATA',
  IT_INFRASTRUCTURE = 'IT_INFRA',
  IT_CYBERSECURITY = 'IT_CYBER',
  IT_LABOR = 'IT_LABOR',

  SALES_AND_MARKETING = 'S&M',
  SM_SALES_GROUP = 'SM_GRP',
  SM_SALES_TRANSIENT = 'SM_TRANS',
  SM_MARKETING_BRAND = 'SM_BRAND',
  SM_REVENUE_MGMT = 'SM_REVMGMT',
  SM_PUBLIC_RELATIONS = 'SM_PR',
  SM_LOYALTY = 'SM_LOYALTY',
  SM_SALES_ADMIN = 'SM_ADMIN',

  PROPERTY_OPERATIONS = 'POM',
  POM_ENGINEERING_LABOR = 'POM_ENG_LABOR',
  POM_ENGINEERING_MATERIALS = 'POM_ENG_MAT',
  POM_CONTRACTED = 'POM_CONTRACT',
  POM_GROUNDS = 'POM_GROUNDS',
  POM_HK_SUPPORT = 'POM_HK',
  POM_WASTE = 'POM_WASTE',
  POM_LIFE_SAFETY = 'POM_SAFETY',
  POM_WORKSHOPS = 'POM_WORKSHOP',

  UTILITIES = 'UTIL',

  // ── Fixed Charges ──────────────────────────────────────────────────────
  MANAGEMENT_FEES = 'MGMT_FEE',
  RENT = 'RENT',
  PROPERTY_TAXES = 'PROP_TAX',
  INSURANCE = 'INSURANCE',
  OTHER_FIXED_CHARGES = 'OTHER_FIXED',

  // ── Non-Operating ──────────────────────────────────────────────────────
  NON_OPERATING = 'NON_OP',
  INTEREST_EXPENSE = 'INTEREST',
  DEPRECIATION = 'DEPRECIATION',
  AMORTIZATION = 'AMORTIZATION',
  INCOME_TAXES = 'INCOME_TAX',

  // ── Corporate / House ──────────────────────────────────────────────────
  UNDISTRIBUTED = 'UNDIST',
  HOUSE = 'HOUSE',
}

// ─── Department Category ──────────────────────────────────────────────────────

export type USALIDepartmentCategory =
  | 'operated'
  | 'undistributed'
  | 'fixed_charges'
  | 'non_operating'
  | 'miscellaneous'
  | 'house';

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
  DEPRECIATION_AMORTIZATION = 'Depreciation & Amortization',
  BALANCE_SHEET = 'Balance Sheet',
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
  | { type: 'gl_range'; from: string; to: string; departments?: string[] }
  | { type: 'gl_accounts'; accounts: string[]; departments?: string[] }
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
  departments: string[];
  lines: ReportLineItem[];
  columns: ReportColumn[];
}

export enum USALISection {
  SUMMARY_OPERATING_STATEMENT = 'Summary Operating Statement',
  ROOMS = 'Rooms Department',
  FOOD_AND_BEVERAGE = 'Food & Beverage Department',
  OTHER_OPERATED = 'Other Operated Departments',
  MISCELLANEOUS_INCOME = 'Miscellaneous Income',
  UNDISTRIBUTED_ADMIN = 'Administrative & General',
  UNDISTRIBUTED_IT = 'Information & Technology',
  UNDISTRIBUTED_SALES = 'Sales & Marketing',
  UNDISTRIBUTED_POM = 'Property Operations & Maintenance',
  UNDISTRIBUTED_UTILITIES = 'Utilities',
  NON_OPERATING = 'Non-Operating Income & Expenses',
  MANAGEMENT_FEES = 'Management Fees',
  FIXED_CHARGES = 'Fixed Charges',
  DEPRECIATION_AMORTIZATION = 'Depreciation & Amortization',
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
  /** Whether department dimension is required */
  requireDepartment?: boolean;
  /** Whether location dimension is required */
  requireLocation?: boolean;
}

export type SageIntacctAccountType =
  | 'incomestatement'
  | 'balancesheet'
  | 'statistical';

// ─── Department Dimension ────────────────────────────────────────────────────

export interface DepartmentDimension {
  /** Sage Intacct Department dimension ID (e.g., "10000") */
  dimensionId: string;
  /** Display name */
  name: string;
  /** USALI department mapping */
  usaliDepartment: USALIDepartment;
  /** USALI category for grouping */
  usaliCategory: USALIDepartmentCategory;
  /** Parent department ID for hierarchy */
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
