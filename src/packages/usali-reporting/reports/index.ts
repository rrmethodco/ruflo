export { SUMMARY_OPERATING_STATEMENT } from './summary-operating-statement.js';
export { ROOMS_DEPARTMENT } from './rooms-department.js';
export { FOOD_BEVERAGE_DEPARTMENT } from './food-beverage.js';
export {
  ADMIN_GENERAL,
  SALES_MARKETING,
  PROPERTY_OPERATIONS,
  UTILITIES,
  INFORMATION_TECHNOLOGY,
} from './undistributed-expenses.js';
export {
  NON_OPERATING,
  MANAGEMENT_FEES,
  FIXED_CHARGES,
  DEPRECIATION_AMORTIZATION,
} from './fixed-charges.js';

import { SUMMARY_OPERATING_STATEMENT } from './summary-operating-statement.js';
import { ROOMS_DEPARTMENT } from './rooms-department.js';
import { FOOD_BEVERAGE_DEPARTMENT } from './food-beverage.js';
import {
  ADMIN_GENERAL,
  SALES_MARKETING,
  PROPERTY_OPERATIONS,
  UTILITIES,
  INFORMATION_TECHNOLOGY,
} from './undistributed-expenses.js';
import {
  NON_OPERATING,
  MANAGEMENT_FEES,
  FIXED_CHARGES,
  DEPRECIATION_AMORTIZATION,
} from './fixed-charges.js';
import type { USALIReportDefinition } from '../types/usali.js';

/** All USALI report definitions in presentation order */
export const ALL_REPORTS: USALIReportDefinition[] = [
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
  DEPRECIATION_AMORTIZATION,
];

/** Get a report definition by ID */
export function getReportById(id: string): USALIReportDefinition | undefined {
  return ALL_REPORTS.find(r => r.id === id);
}
