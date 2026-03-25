/**
 * Helixo - Restaurant Revenue Forecasting & Labor Optimization
 * Core Type Definitions
 *
 * Domain model covering: revenue forecasting, labor optimization,
 * auto-scheduling, real-time pace monitoring, and POS/reservation integrations.
 */

import { z } from 'zod';

// ============================================================================
// Common Types
// ============================================================================

export interface Logger {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

export interface MCPTool {
  name: string;
  description: string;
  category: string;
  version: string;
  tags: string[];
  cacheable: boolean;
  cacheTTL: number;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
  handler: (input: Record<string, unknown>, context?: ToolContext) => Promise<MCPToolResult>;
}

export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    durationMs?: number;
    cached?: boolean;
  };
}

export interface ToolContext {
  logger?: Logger;
  config?: HelixoConfig;
}

// ============================================================================
// Restaurant & Venue Configuration
// ============================================================================

export type RestaurantType = 'fine_dining' | 'casual_dining' | 'fast_casual' | 'quick_service' | 'bar_lounge' | 'cafe';
export type MealPeriod = 'breakfast' | 'brunch' | 'lunch' | 'afternoon' | 'dinner' | 'late_night';
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface RestaurantProfile {
  id: string;
  name: string;
  type: RestaurantType;
  seats: number;
  avgTurnTime: Record<MealPeriod, number>; // minutes per turn by meal period
  avgCheckSize: Record<MealPeriod, number>; // dollars by meal period
  operatingHours: Record<DayOfWeek, ServiceWindow[]>;
  laborTargets: LaborTargets;
  minimumStaffing: MinimumStaffing;
  revenueCenter?: string; // Toast revenue center ID
  resyVenueId?: string;
}

export interface ServiceWindow {
  period: MealPeriod;
  open: string;  // HH:mm 24h format
  close: string; // HH:mm 24h format
}

// ============================================================================
// Revenue Forecasting Types
// ============================================================================

export interface HistoricalSalesRecord {
  date: string;            // ISO date
  dayOfWeek: DayOfWeek;
  mealPeriod: MealPeriod;
  intervalStart: string;   // HH:mm
  intervalEnd: string;     // HH:mm
  netSales: number;
  grossSales: number;
  covers: number;
  checkCount: number;
  avgCheck: number;
  menuMix: MenuMixEntry[];
  weather?: WeatherCondition;
  isHoliday?: boolean;
  isEvent?: boolean;
  eventName?: string;
}

export interface MenuMixEntry {
  category: string;  // appetizers, entrees, desserts, beverages, alcohol
  salesAmount: number;
  quantity: number;
  percentOfTotal: number;
}

export interface WeatherCondition {
  tempF: number;
  precipitation: 'none' | 'light_rain' | 'heavy_rain' | 'snow' | 'extreme';
  description: string;
}

/** A single 15-minute interval forecast */
export interface IntervalForecast {
  intervalStart: string;   // HH:mm
  intervalEnd: string;     // HH:mm
  projectedSales: number;
  projectedCovers: number;
  projectedChecks: number;
  confidenceLow: number;   // lower bound (e.g., 10th percentile)
  confidenceHigh: number;  // upper bound (e.g., 90th percentile)
  confidence: number;      // 0-1 confidence score
}

/** Full forecast for a single meal period */
export interface MealPeriodForecast {
  mealPeriod: MealPeriod;
  date: string;
  dayOfWeek: DayOfWeek;
  totalProjectedSales: number;
  totalProjectedCovers: number;
  avgProjectedCheck: number;
  intervals: IntervalForecast[];
  confidenceScore: number;
  factorsApplied: ForecastFactor[];
  comparisonToLastYear?: {
    salesDelta: number;
    coversDelta: number;
    percentChange: number;
  };
}

/** Full day forecast */
export interface DailyForecast {
  date: string;
  dayOfWeek: DayOfWeek;
  mealPeriods: MealPeriodForecast[];
  totalDaySales: number;
  totalDayCovers: number;
  weatherForecast?: WeatherCondition;
  isHoliday: boolean;
  isEvent: boolean;
  eventDetails?: string;
}

export interface WeeklyForecast {
  weekStartDate: string;
  weekEndDate: string;
  days: DailyForecast[];
  totalWeekSales: number;
  totalWeekCovers: number;
  compToLastWeek: number;   // percentage
  compToLastYear: number;   // percentage
}

/** Factors that influence the forecast */
export interface ForecastFactor {
  name: string;
  type: 'multiplier' | 'additive' | 'override';
  value: number;
  source: 'historical_trend' | 'seasonality' | 'weather' | 'holiday' | 'event'
    | 'day_of_week' | 'reservation_pace' | 'manual_override' | 'menu_change'
    | 'comp_set' | 'marketing_promotion';
  confidence: number;
  description: string;
}

/** Weights for the multi-variable regression model */
export interface ForecastModelWeights {
  historicalAverage: number;       // base weight for trailing averages
  dayOfWeekPattern: number;        // day-of-week seasonality
  weeklyTrend: number;             // week-over-week trend
  yearOverYearTrend: number;       // year-over-year comp
  seasonalityIndex: number;        // monthly/quarterly seasonality
  weatherImpact: number;           // weather adjustment factor
  holidayImpact: number;           // holiday/special day impact
  eventImpact: number;             // local event impact
  reservationPace: number;         // reservation pacing signal
  recentMomentum: number;          // last 2-4 weeks momentum
}

export const DEFAULT_FORECAST_WEIGHTS: ForecastModelWeights = {
  historicalAverage: 0.25,
  dayOfWeekPattern: 0.20,
  weeklyTrend: 0.10,
  yearOverYearTrend: 0.08,
  seasonalityIndex: 0.08,
  weatherImpact: 0.07,
  holidayImpact: 0.05,
  eventImpact: 0.04,
  reservationPace: 0.08,
  recentMomentum: 0.05,
};

// ============================================================================
// Labor Optimization Types
// ============================================================================

export type StaffRole = 'server' | 'bartender' | 'host' | 'busser' | 'runner' | 'barback'
  | 'line_cook' | 'prep_cook' | 'sous_chef' | 'exec_chef' | 'dishwasher'
  | 'expo' | 'manager' | 'sommelier' | 'barista';

export type StaffDepartment = 'foh' | 'boh' | 'management';

export const ROLE_DEPARTMENTS: Record<StaffRole, StaffDepartment> = {
  server: 'foh', bartender: 'foh', host: 'foh', busser: 'foh',
  runner: 'foh', barback: 'foh', sommelier: 'foh', barista: 'foh',
  line_cook: 'boh', prep_cook: 'boh', sous_chef: 'boh',
  exec_chef: 'boh', dishwasher: 'boh', expo: 'boh',
  manager: 'management',
};

export interface LaborTargets {
  totalLaborPercent: number;      // target total labor as % of revenue (e.g., 0.28)
  fohLaborPercent: number;        // FOH labor target % of revenue
  bohLaborPercent: number;        // BOH labor target % of revenue
  managementLaborPercent: number; // management labor % of revenue
  overtimeThresholdHours: number; // weekly OT threshold (typically 40)
  maxWeeklyHoursPerEmployee: number;
  breakRequirementMinutes: number; // e.g., 30 min per 6-hour shift
  breakThresholdHours: number;    // shift length triggering break
}

export const DEFAULT_LABOR_TARGETS: Record<RestaurantType, LaborTargets> = {
  fine_dining: {
    totalLaborPercent: 0.33, fohLaborPercent: 0.15, bohLaborPercent: 0.14,
    managementLaborPercent: 0.04, overtimeThresholdHours: 40,
    maxWeeklyHoursPerEmployee: 50, breakRequirementMinutes: 30, breakThresholdHours: 6,
  },
  casual_dining: {
    totalLaborPercent: 0.30, fohLaborPercent: 0.13, bohLaborPercent: 0.13,
    managementLaborPercent: 0.04, overtimeThresholdHours: 40,
    maxWeeklyHoursPerEmployee: 48, breakRequirementMinutes: 30, breakThresholdHours: 6,
  },
  fast_casual: {
    totalLaborPercent: 0.28, fohLaborPercent: 0.12, bohLaborPercent: 0.12,
    managementLaborPercent: 0.04, overtimeThresholdHours: 40,
    maxWeeklyHoursPerEmployee: 45, breakRequirementMinutes: 30, breakThresholdHours: 6,
  },
  quick_service: {
    totalLaborPercent: 0.26, fohLaborPercent: 0.14, bohLaborPercent: 0.09,
    managementLaborPercent: 0.03, overtimeThresholdHours: 40,
    maxWeeklyHoursPerEmployee: 45, breakRequirementMinutes: 30, breakThresholdHours: 6,
  },
  bar_lounge: {
    totalLaborPercent: 0.24, fohLaborPercent: 0.13, bohLaborPercent: 0.07,
    managementLaborPercent: 0.04, overtimeThresholdHours: 40,
    maxWeeklyHoursPerEmployee: 48, breakRequirementMinutes: 30, breakThresholdHours: 6,
  },
  cafe: {
    totalLaborPercent: 0.32, fohLaborPercent: 0.16, bohLaborPercent: 0.12,
    managementLaborPercent: 0.04, overtimeThresholdHours: 40,
    maxWeeklyHoursPerEmployee: 45, breakRequirementMinutes: 30, breakThresholdHours: 6,
  },
};

export interface MinimumStaffing {
  /** Minimum staff per role per meal period, regardless of volume */
  byRole: Partial<Record<StaffRole, Record<MealPeriod, number>>>;
  /** Absolute minimums per department when venue is open */
  byDepartment: Record<StaffDepartment, number>;
}

export interface StaffMember {
  id: string;
  name: string;
  roles: StaffRole[];    // trained roles (can work multiple positions)
  primaryRole: StaffRole;
  department: StaffDepartment;
  hourlyRate: number;
  overtimeRate: number;  // typically 1.5x hourlyRate
  maxHoursPerWeek: number;
  availability: WeeklyAvailability;
  skillLevel: number;    // 1-5, affects covers-per-labor-hour capacity
  hireDate: string;
  isMinor: boolean;      // special hour restrictions
  certifications?: string[]; // e.g., 'alcohol_service', 'food_safety'
}

export interface WeeklyAvailability {
  [day: string]: AvailabilityWindow[]; // DayOfWeek -> windows
}

export interface AvailabilityWindow {
  start: string; // HH:mm
  end: string;   // HH:mm
  preferred: boolean; // employee preference vs just available
}

/** Labor model output for a single interval */
export interface IntervalLaborRequirement {
  intervalStart: string;
  intervalEnd: string;
  projectedSales: number;
  projectedCovers: number;
  staffingByRole: Record<StaffRole, number>; // headcount per role
  totalFOHHeads: number;
  totalBOHHeads: number;
  totalLaborHours: number;
  projectedLaborCost: number;
  laborCostPercent: number;
  coversPerLaborHour: number;
  revenuePerLaborHour: number;
}

/** Full labor plan for a meal period */
export interface MealPeriodLaborPlan {
  mealPeriod: MealPeriod;
  date: string;
  intervals: IntervalLaborRequirement[];
  totalLaborHours: number;
  totalLaborCost: number;
  laborCostPercent: number;
  avgCoversPerLaborHour: number;
  avgRevenuePerLaborHour: number;
  staffingPeakByRole: Record<StaffRole, number>;
  staggeredStarts: StaggeredStart[];
}

export interface StaggeredStart {
  role: StaffRole;
  startTime: string;
  endTime: string;
  headcount: number;
  reason: string; // e.g., "ramp up for dinner rush"
}

export interface DailyLaborPlan {
  date: string;
  mealPeriods: MealPeriodLaborPlan[];
  totalDayLaborHours: number;
  totalDayLaborCost: number;
  dayLaborCostPercent: number;
  prepHours: number;       // non-revenue generating prep time
  sideWorkHours: number;   // sidework allocation
  breakHours: number;      // break time built in
}

// ============================================================================
// Auto-Scheduling Types
// ============================================================================

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  role: StaffRole;
  date: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  estimatedCost: number;
  isOpen: boolean;      // unfilled shift
  notes?: string;
}

export interface DailySchedule {
  date: string;
  shifts: Shift[];
  totalScheduledHours: number;
  totalScheduledCost: number;
  laborCostPercent: number;
  openShifts: Shift[];
  coverageGaps: CoverageGap[];
  constraints: ScheduleConstraintResult[];
}

export interface WeeklySchedule {
  weekStartDate: string;
  weekEndDate: string;
  days: DailySchedule[];
  totalWeeklyHours: number;
  totalWeeklyCost: number;
  employeeSummaries: EmployeeWeekSummary[];
  overtimeAlerts: OvertimeAlert[];
  laborBudgetVariance: number;
}

export interface EmployeeWeekSummary {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  shiftsScheduled: number;
  totalCost: number;
  hoursVsMax: number; // how close to max weekly hours
}

export interface CoverageGap {
  date: string;
  intervalStart: string;
  intervalEnd: string;
  role: StaffRole;
  neededCount: number;
  scheduledCount: number;
  deficit: number;
  severity: 'critical' | 'warning' | 'info';
}

export interface OvertimeAlert {
  employeeId: string;
  employeeName: string;
  projectedHours: number;
  threshold: number;
  overtimeHours: number;
  additionalCost: number;
}

export interface ScheduleConstraint {
  type: 'availability' | 'max_hours' | 'min_rest' | 'skill_required'
    | 'overtime_limit' | 'break_required' | 'minor_restriction'
    | 'consecutive_days' | 'role_certified';
  description: string;
  priority: 'hard' | 'soft'; // hard = must satisfy, soft = prefer
  weight: number; // for soft constraints, optimization weight
}

export interface ScheduleConstraintResult {
  constraint: ScheduleConstraint;
  satisfied: boolean;
  violation?: string;
  affectedEmployees?: string[];
}

// ============================================================================
// Real-Time Pace Monitoring Types
// ============================================================================

export interface PaceSnapshot {
  timestamp: string;
  mealPeriod: MealPeriod;
  currentInterval: string;      // HH:mm of current 15-min interval
  elapsedIntervals: number;
  remainingIntervals: number;
  actualSalesSoFar: number;
  projectedSalesAtPace: number; // extrapolated final based on current pace
  originalForecast: number;     // what we predicted
  pacePercent: number;          // actual/projected as percentage
  actualCoversSoFar: number;
  projectedCoversAtPace: number;
  paceStatus: PaceStatus;
  intervalDetails: IntervalPaceDetail[];
  recommendations: PaceRecommendation[];
}

export type PaceStatus = 'ahead' | 'on_pace' | 'behind' | 'critical_behind' | 'critical_ahead';

export interface IntervalPaceDetail {
  intervalStart: string;
  intervalEnd: string;
  forecastedSales: number;
  actualSales: number;
  forecastedCovers: number;
  actualCovers: number;
  variance: number;       // actual - forecasted
  variancePercent: number; // (actual - forecasted) / forecasted
  status: 'completed' | 'current' | 'upcoming';
}

export interface PaceRecommendation {
  type: 'cut_staff' | 'call_staff' | 'extend_shift' | 'adjust_forecast'
    | 'alert_manager' | 'hold_steady';
  urgency: 'immediate' | 'within_15min' | 'within_30min' | 'informational';
  role?: StaffRole;
  headcountChange?: number; // positive = add, negative = cut
  estimatedSavings?: number;
  description: string;
  reasoning: string;
}

// ============================================================================
// Integration Types - Toast POS
// ============================================================================

export interface ToastConfig {
  apiBaseUrl: string;
  clientId: string;
  clientSecret: string;
  restaurantGuid: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  pollIntervalMs: number;    // how often to poll for real-time data
}

export interface ToastSalesData {
  businessDate: string;
  orders: ToastOrder[];
  totalNetSales: number;
  totalGrossSales: number;
  totalChecks: number;
  totalCovers: number;
  voidAmount: number;
  discountAmount: number;
  tipAmount: number;
}

export interface ToastOrder {
  guid: string;
  openedDate: string;
  closedDate?: string;
  server: string;
  checkAmount: number;
  totalAmount: number;
  guestCount: number;
  revenueCenter: string;
  items: ToastOrderItem[];
}

export interface ToastOrderItem {
  name: string;
  category: string;
  quantity: number;
  price: number;
  voided: boolean;
  modifiers?: string[];
}

export interface ToastLaborData {
  businessDate: string;
  entries: ToastLaborEntry[];
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalLaborCost: number;
}

export interface ToastLaborEntry {
  employeeGuid: string;
  employeeName: string;
  jobTitle: string;
  clockInTime: string;
  clockOutTime?: string;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  breakMinutes: number;
}

// ============================================================================
// Integration Types - RESY
// ============================================================================

export interface ResyConfig {
  apiKey: string;
  apiSecret: string;
  venueId: string;
  apiBaseUrl: string;
  pollIntervalMs: number;
}

export interface ResyReservationData {
  date: string;
  reservations: ResyReservation[];
  totalCovers: number;
  totalReservations: number;
  walkInEstimate: number; // based on historical walk-in ratio
  pacingByHour: ResyPacingEntry[];
}

export interface ResyReservation {
  id: string;
  dateTime: string;    // ISO datetime of reservation
  partySize: number;
  status: 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  tableId?: string;
  specialRequests?: string;
  isVIP: boolean;
  bookedAt: string;    // when the reservation was made
}

export interface ResyPacingEntry {
  hour: string;        // HH:00
  reservedCovers: number;
  estimatedWalkIns: number;
  totalExpectedCovers: number;
  capacityPercent: number;
  daysOut: number;     // how many days before the date
}

// ============================================================================
// Integration Types - SharePoint / Excel
// ============================================================================

export interface SharePointConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  siteId: string;                // SharePoint site ID
  driveId?: string;              // OneDrive/SharePoint drive ID (auto-discovered if omitted)
  listId?: string;               // SharePoint list ID for structured data
  excelFileItemId?: string;      // Item ID of Excel file in SharePoint
  worksheetName?: string;        // Specific worksheet to read (default: first sheet)
  cellRange?: string;            // Cell range to read (e.g., "A1:Z100", default: usedRange)
  graphBaseUrl?: string;         // Microsoft Graph API base (default: https://graph.microsoft.com/v1.0)
  pollIntervalMs?: number;       // Polling interval for change detection (default: 120000)
  webhookUrl?: string;           // Public URL for Graph webhook notifications
  webhookSecret?: string;        // Shared secret for webhook validation
}

export interface ExcelFileConfig {
  filePath: string;              // Path to local .xlsx or .csv file
  worksheetName?: string;        // Specific worksheet (default: first sheet)
  headerRow?: number;            // Row number containing headers (default: 1)
  dataStartRow?: number;         // First data row (default: 2)
  watchForChanges?: boolean;     // Enable file watcher (default: false)
  pollIntervalMs?: number;       // Fallback poll interval if watch not supported (default: 60000)
}

/** Column mapping tells the adapter how to extract Helixo data from spreadsheet columns */
export interface SpreadsheetColumnMapping {
  date?: string;                 // Column header for date
  mealPeriod?: string;           // Column header for meal period
  netSales?: string;             // Column header for net sales
  grossSales?: string;           // Column header for gross sales
  covers?: string;               // Column header for cover count
  checkCount?: string;           // Column header for check count
  avgCheck?: string;             // Column header for average check
  laborHours?: string;           // Column header for labor hours
  laborCost?: string;            // Column header for labor cost
  employeeName?: string;         // Column header for employee name
  role?: string;                 // Column header for staff role
  hourlyRate?: string;           // Column header for hourly rate
  budgetSales?: string;          // Column header for budget target
}

export type SpreadsheetDataType = 'sales' | 'labor' | 'staff' | 'budget';

export interface SharePointChangeNotification {
  subscriptionId: string;
  changeType: 'created' | 'updated' | 'deleted';
  resource: string;
  resourceData: {
    id: string;
    type: string;
  };
  tenantId: string;
  clientState?: string;
  timestamp: string;
}

export interface SharePointSubscription {
  id: string;
  resource: string;
  changeType: string;
  notificationUrl: string;
  expirationDateTime: string;
  clientState?: string;
}

/** Parsed spreadsheet row — keys are column headers, values are cell contents */
export type SpreadsheetRow = Record<string, string | number | boolean | null>;

// ============================================================================
// Helixo Configuration
// ============================================================================

export interface HelixoConfig {
  restaurant: RestaurantProfile;
  forecast: ForecastConfig;
  labor: LaborConfig;
  scheduling: SchedulingConfig;
  paceMonitor: PaceMonitorConfig;
  toast?: ToastConfig;
  resy?: ResyConfig;
  sharepoint?: SharePointConfig;
  excel?: ExcelFileConfig;
  columnMapping?: SpreadsheetColumnMapping;
}

export interface ForecastConfig {
  weights: ForecastModelWeights;
  trailingWeeks: number;        // how many weeks of history to consider (default 8)
  yearOverYearWeeks: number;    // weeks of YoY data to pull (default 4)
  intervalMinutes: number;      // forecast granularity (default 15)
  confidenceLevel: number;      // confidence interval width (default 0.80)
  minDataPointsForForecast: number; // minimum historical data points (default 4)
  outlierStdDevThreshold: number;   // outlier removal threshold (default 2.5)
  weatherEnabled: boolean;
  reservationPaceEnabled: boolean;
  holidayBoostMultiplier?: number;   // default 1.15
  eventBoostMultiplier?: number;     // default 1.10
  extremeWeatherMultiplier?: number; // default 0.50
  highTempThresholdF?: number;       // default 95
  lowTempThresholdF?: number;        // default 20
}

export interface LaborConfig {
  targets: LaborTargets;
  minimumStaffing: MinimumStaffing;
  roleProductivity: Partial<Record<StaffRole, RoleProductivity>>;
  prepTimeAllocation: number;    // percentage of BOH hours for prep (default 0.20)
  sideWorkAllocation: number;    // percentage of FOH hours for sidework (default 0.08)
  rampUpIntervals: number;       // intervals before service to start staffing (default 2)
  rampDownIntervals: number;     // intervals to keep staff after projected drop (default 1)
  rampUpStaffPercent?: number;   // default 0.6 — staff at ramp-up intervals as fraction of next peak
  rampDownStaffPercent?: number; // default 0.5 — staff at ramp-down intervals as fraction of prev peak
}

export interface RoleProductivity {
  coversPerHour: number;      // max covers one person in this role can handle
  revenuePerHour: number;     // target revenue per labor hour for role
  stationsOrTables: number;   // e.g., server sections, line stations
}

export const DEFAULT_ROLE_PRODUCTIVITY: Record<StaffRole, RoleProductivity> = {
  server:     { coversPerHour: 12, revenuePerHour: 150, stationsOrTables: 4 },
  bartender:  { coversPerHour: 20, revenuePerHour: 200, stationsOrTables: 1 },
  host:       { coversPerHour: 40, revenuePerHour: 0, stationsOrTables: 1 },
  busser:     { coversPerHour: 25, revenuePerHour: 0, stationsOrTables: 6 },
  runner:     { coversPerHour: 20, revenuePerHour: 0, stationsOrTables: 0 },
  barback:    { coversPerHour: 30, revenuePerHour: 0, stationsOrTables: 1 },
  line_cook:  { coversPerHour: 15, revenuePerHour: 120, stationsOrTables: 1 },
  prep_cook:  { coversPerHour: 0, revenuePerHour: 0, stationsOrTables: 1 },
  sous_chef:  { coversPerHour: 10, revenuePerHour: 100, stationsOrTables: 2 },
  exec_chef:  { coversPerHour: 0, revenuePerHour: 0, stationsOrTables: 0 },
  dishwasher: { coversPerHour: 40, revenuePerHour: 0, stationsOrTables: 1 },
  expo:       { coversPerHour: 30, revenuePerHour: 0, stationsOrTables: 1 },
  manager:    { coversPerHour: 0, revenuePerHour: 0, stationsOrTables: 0 },
  sommelier:  { coversPerHour: 15, revenuePerHour: 180, stationsOrTables: 6 },
  barista:    { coversPerHour: 25, revenuePerHour: 80, stationsOrTables: 1 },
};

export interface SchedulingConfig {
  minRestBetweenShifts: number;    // hours (default 10)
  maxConsecutiveDays: number;       // before required day off (default 6)
  shiftMinHours: number;            // minimum shift length (default 4)
  shiftMaxHours: number;            // maximum shift length (default 12)
  preferredShiftLength: number;     // ideal shift in hours (default 8)
  autoFillOpenShifts: boolean;
  balanceHoursAcrossStaff: boolean; // distribute hours fairly
  seniorityWeight: number;          // weight for seniority in scheduling (0-1)
  preferenceWeight: number;         // weight for employee preference (0-1)
}

export interface PaceMonitorConfig {
  updateIntervalMs: number;     // how often to recalculate pace (default 60000)
  aheadThreshold: number;       // % above forecast to flag as ahead (default 1.10)
  behindThreshold: number;      // % below forecast to flag as behind (default 0.90)
  criticalAheadThreshold: number;  // severe ahead (default 1.25)
  criticalBehindThreshold: number; // severe behind (default 0.75)
  autoRecommendCuts: boolean;      // auto-recommend labor cuts
  autoRecommendCalls: boolean;     // auto-recommend calling in staff
  lookAheadIntervals: number;      // how many intervals ahead to project (default 4)
  blendedHourlyRate?: number;      // default 14, used for savings estimates
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_FORECAST_CONFIG: ForecastConfig = {
  weights: DEFAULT_FORECAST_WEIGHTS,
  trailingWeeks: 8,
  yearOverYearWeeks: 4,
  intervalMinutes: 15,
  confidenceLevel: 0.80,
  minDataPointsForForecast: 4,
  outlierStdDevThreshold: 2.5,
  weatherEnabled: true,
  reservationPaceEnabled: true,
};

export const DEFAULT_LABOR_CONFIG: LaborConfig = {
  targets: DEFAULT_LABOR_TARGETS.casual_dining,
  minimumStaffing: {
    byRole: {},
    byDepartment: { foh: 2, boh: 2, management: 1 },
  },
  roleProductivity: DEFAULT_ROLE_PRODUCTIVITY,
  prepTimeAllocation: 0.20,
  sideWorkAllocation: 0.08,
  rampUpIntervals: 2,
  rampDownIntervals: 1,
};

export const DEFAULT_SCHEDULING_CONFIG: SchedulingConfig = {
  minRestBetweenShifts: 10,
  maxConsecutiveDays: 6,
  shiftMinHours: 4,
  shiftMaxHours: 12,
  preferredShiftLength: 8,
  autoFillOpenShifts: true,
  balanceHoursAcrossStaff: true,
  seniorityWeight: 0.3,
  preferenceWeight: 0.4,
};

export const DEFAULT_PACE_MONITOR_CONFIG: PaceMonitorConfig = {
  updateIntervalMs: 60000,
  aheadThreshold: 1.10,
  behindThreshold: 0.90,
  criticalAheadThreshold: 1.25,
  criticalBehindThreshold: 0.75,
  autoRecommendCuts: true,
  autoRecommendCalls: true,
  lookAheadIntervals: 4,
};

// ============================================================================
// Zod Validation Schemas (System Boundary Input Validation)
// ============================================================================

export const ForecastRequestSchema = z.object({
  restaurantId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealPeriods: z.array(z.enum(['breakfast', 'brunch', 'lunch', 'afternoon', 'dinner', 'late_night'])).optional(),
  includeWeather: z.boolean().optional(),
  includeReservations: z.boolean().optional(),
  overrides: z.record(z.number()).optional(),
});

export const LaborPlanRequestSchema = z.object({
  restaurantId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  forecast: z.object({
    totalProjectedSales: z.number().positive(),
    totalProjectedCovers: z.number().int().positive(),
  }).optional(),
  overrideTargets: z.object({
    totalLaborPercent: z.number().min(0.05).max(0.60),
  }).optional(),
});

export const ScheduleRequestSchema = z.object({
  restaurantId: z.string().min(1),
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  staff: z.array(z.object({
    id: z.string(),
    name: z.string(),
    roles: z.array(z.string()),
    primaryRole: z.string(),
    hourlyRate: z.number().positive(),
  })).min(1),
});

export const PaceUpdateSchema = z.object({
  restaurantId: z.string().min(1),
  mealPeriod: z.enum(['breakfast', 'brunch', 'lunch', 'afternoon', 'dinner', 'late_night']),
  currentSales: z.number().min(0),
  currentCovers: z.number().int().min(0),
  timestamp: z.string().optional(),
});

export type ForecastRequest = z.infer<typeof ForecastRequestSchema>;
export type LaborPlanRequest = z.infer<typeof LaborPlanRequestSchema>;
export type ScheduleRequest = z.infer<typeof ScheduleRequestSchema>;
export type PaceUpdate = z.infer<typeof PaceUpdateSchema>;

// ============================================================================
// Forecast Review & Acceptance Workflow (planned — not yet implemented in engines)
// ============================================================================

export type ForecastStatus = 'draft' | 'pending_review' | 'accepted' | 'adjusted' | 'locked';

/** Comparative data points shown alongside the Helixo forecast */
export interface ForecastComparisons {
  sameWeekLastYear: ComparativePeriod | null;
  trailingTwoWeeks: ComparativePeriod;
  budgetTarget: BudgetTarget | null;
  bestWeekLast52: ComparativePeriod | null;
  worstWeekLast52: ComparativePeriod | null;
  sameDayOfWeekAvg4Weeks: number; // 4-week same-DOW average
  sameDayOfWeekAvg8Weeks: number; // 8-week same-DOW average
}

export interface ComparativePeriod {
  label: string;
  dateRange: string;
  totalSales: number;
  totalCovers: number;
  avgCheck: number;
  byMealPeriod: Record<MealPeriod, { sales: number; covers: number }>;
}

export interface BudgetTarget {
  dailySales: number;
  weeklySales: number;
  laborCostPercent: number;
  coverTarget: number;
  source: string; // e.g., "2026 Annual Budget"
}

/** The forecast proposal shown to the user for review */
export interface ForecastProposal {
  id: string;
  restaurantId: string;
  status: ForecastStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;

  /** The Helixo-calculated forecast */
  helixoForecast: DailyForecast;

  /** Comparison data points for context */
  comparisons: ForecastComparisons;

  /** User adjustments (overrides applied on top of helixo forecast) */
  adjustments: ForecastAdjustment[];

  /** The final accepted numbers (= helixo forecast + adjustments) */
  acceptedForecast?: DailyForecast;

  /** Notes from the reviewer */
  reviewNotes?: string;
}

export interface ForecastAdjustment {
  mealPeriod: MealPeriod;
  field: 'sales' | 'covers' | 'avgCheck';
  originalValue: number;
  adjustedValue: number;
  reason: string;
  adjustedBy: string;
  adjustedAt: string;
}

export interface WeeklyForecastProposal {
  id: string;
  restaurantId: string;
  weekStartDate: string;
  weekEndDate: string;
  status: ForecastStatus;
  dailyProposals: ForecastProposal[];
  weeklyComparisons: ForecastComparisons;
  totalHelixoForecastSales: number;
  totalAcceptedSales?: number;
  totalBudgetTarget?: number;
}
