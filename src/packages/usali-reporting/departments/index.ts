/**
 * USALI 12th Edition Department Dimensions
 * Maps to Sage Intacct Department dimension values
 */

import { USALIDepartment, type DepartmentDimension } from '../types/usali.js';

/**
 * Default USALI department dimension values for Sage Intacct.
 * These represent the standard USALI 12th Edition departments
 * configured as Sage Intacct dimension values.
 */
export const DEFAULT_DEPARTMENTS: DepartmentDimension[] = [
  // ── Revenue Centers (Operated Departments) ──────────────────────────────

  {
    dimensionId: 'ROOMS',
    name: 'Rooms',
    usaliDepartment: USALIDepartment.ROOMS,
    sortOrder: 100,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'F&B',
    name: 'Food & Beverage',
    usaliDepartment: USALIDepartment.FOOD_AND_BEVERAGE,
    sortOrder: 200,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'SPA',
    name: 'Spa',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_SPA,
    parentId: 'OTHER_OP',
    sortOrder: 310,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'GOLF',
    name: 'Golf',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_GOLF,
    parentId: 'OTHER_OP',
    sortOrder: 320,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'PARKING',
    name: 'Parking',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_PARKING,
    parentId: 'OTHER_OP',
    sortOrder: 330,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'TELECOM',
    name: 'Telecommunications',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_TELECOM,
    parentId: 'OTHER_OP',
    sortOrder: 340,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'RETAIL',
    name: 'Retail',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_RETAIL,
    parentId: 'OTHER_OP',
    sortOrder: 350,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'RECREATION',
    name: 'Recreation',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_RECREATION,
    parentId: 'OTHER_OP',
    sortOrder: 360,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'OTHER_OP',
    name: 'Other Operated Departments',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_OTHER,
    sortOrder: 300,
    isSummary: true,
    status: 'active',
  },

  // ── Undistributed Operating Expenses ────────────────────────────────────

  {
    dimensionId: 'A&G',
    name: 'Administrative & General',
    usaliDepartment: USALIDepartment.ADMIN_AND_GENERAL,
    sortOrder: 400,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'S&M',
    name: 'Sales & Marketing',
    usaliDepartment: USALIDepartment.SALES_AND_MARKETING,
    sortOrder: 500,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'POM',
    name: 'Property Operations & Maintenance',
    usaliDepartment: USALIDepartment.PROPERTY_OPERATIONS,
    sortOrder: 600,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'UTIL',
    name: 'Utilities',
    usaliDepartment: USALIDepartment.UTILITIES,
    sortOrder: 700,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'IT',
    name: 'Information & Telecommunications',
    usaliDepartment: USALIDepartment.INFORMATION_TECHNOLOGY,
    sortOrder: 800,
    isSummary: false,
    status: 'active',
  },

  // ── Non-Operating ──────────────────────────────────────────────────────

  {
    dimensionId: 'MGMT_FEE',
    name: 'Management Fees',
    usaliDepartment: USALIDepartment.MANAGEMENT_FEES,
    sortOrder: 900,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'NON_OP',
    name: 'Non-Operating Income & Expenses',
    usaliDepartment: USALIDepartment.NON_OPERATING,
    sortOrder: 1000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'FIXED',
    name: 'Fixed Charges',
    usaliDepartment: USALIDepartment.FIXED_CHARGES,
    sortOrder: 1100,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: 'HOUSE',
    name: 'House',
    usaliDepartment: USALIDepartment.HOUSE,
    sortOrder: 1200,
    isSummary: false,
    status: 'active',
  },
];

/** Get all operated (revenue-generating) departments */
export function getOperatedDepartments(): DepartmentDimension[] {
  return DEFAULT_DEPARTMENTS.filter(d =>
    [
      USALIDepartment.ROOMS,
      USALIDepartment.FOOD_AND_BEVERAGE,
      USALIDepartment.OTHER_OPERATED_SPA,
      USALIDepartment.OTHER_OPERATED_GOLF,
      USALIDepartment.OTHER_OPERATED_PARKING,
      USALIDepartment.OTHER_OPERATED_TELECOM,
      USALIDepartment.OTHER_OPERATED_RETAIL,
      USALIDepartment.OTHER_OPERATED_RECREATION,
    ].includes(d.usaliDepartment)
  );
}

/** Get all undistributed expense departments */
export function getUndistributedDepartments(): DepartmentDimension[] {
  return DEFAULT_DEPARTMENTS.filter(d =>
    [
      USALIDepartment.ADMIN_AND_GENERAL,
      USALIDepartment.SALES_AND_MARKETING,
      USALIDepartment.PROPERTY_OPERATIONS,
      USALIDepartment.UTILITIES,
      USALIDepartment.INFORMATION_TECHNOLOGY,
    ].includes(d.usaliDepartment)
  );
}

/** Get department by USALI code */
export function getDepartmentByCode(code: USALIDepartment): DepartmentDimension | undefined {
  return DEFAULT_DEPARTMENTS.find(d => d.usaliDepartment === code);
}
