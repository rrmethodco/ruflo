/**
 * USALI 12th Edition Department Dimensions
 * Maps to actual Sage Intacct Department dimension IDs.
 *
 * Source: Sage Intacct dimension export (DEPARTMENT).
 */

import {
  USALIDepartment,
  type DepartmentDimension,
  type USALIDepartmentCategory,
} from '../types/usali.js';

// ─── Default Department Dimensions ───────────────────────────────────────────
// Every entry uses the numeric Sage Intacct dimension ID as `dimensionId`.
// Parent (summary/rollup) departments have `isSummary: true`.
// Sub-departments reference their parent via `parentId`.

export const DEFAULT_DEPARTMENTS: DepartmentDimension[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // OPERATED DEPARTMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 10000 Rooms ────────────────────────────────────────────────────────────
  {
    dimensionId: '10000',
    name: 'Rooms',
    usaliDepartment: USALIDepartment.ROOMS,
    usaliCategory: 'operated',
    sortOrder: 10000,
    isSummary: true,
    status: 'active',
  },
  {
    dimensionId: '10100',
    name: 'Guest Services',
    usaliDepartment: USALIDepartment.ROOMS_GUEST_SERVICES,
    usaliCategory: 'operated',
    parentId: '10000',
    sortOrder: 10100,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '10200',
    name: 'Housekeeping',
    usaliDepartment: USALIDepartment.ROOMS_HOUSEKEEPING,
    usaliCategory: 'operated',
    parentId: '10000',
    sortOrder: 10200,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '10300',
    name: 'Telephone / Communications',
    usaliDepartment: USALIDepartment.ROOMS_TELEPHONE,
    usaliCategory: 'operated',
    parentId: '10000',
    sortOrder: 10300,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '10400',
    name: 'Internet Access',
    usaliDepartment: USALIDepartment.ROOMS_INTERNET,
    usaliCategory: 'operated',
    parentId: '10000',
    sortOrder: 10400,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '10500',
    name: 'Laundry / Valet',
    usaliDepartment: USALIDepartment.ROOMS_LAUNDRY,
    usaliCategory: 'operated',
    parentId: '10000',
    sortOrder: 10500,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '10600',
    name: 'Mini-Bar',
    usaliDepartment: USALIDepartment.ROOMS_MINIBAR,
    usaliCategory: 'operated',
    parentId: '10000',
    sortOrder: 10600,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '10700',
    name: 'Other Rooms Income',
    usaliDepartment: USALIDepartment.ROOMS_OTHER,
    usaliCategory: 'operated',
    parentId: '10000',
    sortOrder: 10700,
    isSummary: false,
    status: 'active',
  },

  // ── 20000 Food and Beverage ────────────────────────────────────────────────
  {
    dimensionId: '20000',
    name: 'Food and Beverage',
    usaliDepartment: USALIDepartment.FOOD_AND_BEVERAGE,
    usaliCategory: 'operated',
    sortOrder: 20000,
    isSummary: true,
    status: 'active',
  },
  {
    dimensionId: '21000',
    name: 'Restaurant',
    usaliDepartment: USALIDepartment.FB_RESTAURANT,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21000,
    isSummary: false,
    status: 'active',
  },

  // ── Named Restaurant Outlets (21001–21011) ────────────────────────────────
  {
    dimensionId: '21001',
    name: "Wm. Mulerin's Sons",
    usaliDepartment: USALIDepartment.FB_WM_MULERINS,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21001,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '21002',
    name: 'HIROKI-PHL',
    usaliDepartment: USALIDepartment.FB_HIROKI_PHL,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21002,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '21003',
    name: 'Lowland',
    usaliDepartment: USALIDepartment.FB_LOWLAND,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21003,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '21004',
    name: 'Rosemary Rose',
    usaliDepartment: USALIDepartment.FB_ROSEMARY_ROSE,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21004,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '21005',
    name: 'Le Supreme & Bar Rotunda',
    usaliDepartment: USALIDepartment.FB_LE_SUPREME,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21005,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '21006',
    name: 'HIROKI-SAN Detroit',
    usaliDepartment: USALIDepartment.FB_HIROKI_DET,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21006,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '21007',
    name: "Kamper's",
    usaliDepartment: USALIDepartment.FB_KAMPERS,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21007,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '21008',
    name: 'Anthology',
    usaliDepartment: USALIDepartment.FB_ANTHOLOGY,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21008,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '21009',
    name: 'The Quoin Restaurant',
    usaliDepartment: USALIDepartment.FB_QUOIN,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21009,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '21010',
    name: 'Little Wing',
    usaliDepartment: USALIDepartment.FB_LITTLE_WING,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21010,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '21011',
    name: 'Vessel',
    usaliDepartment: USALIDepartment.FB_VESSEL,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 21011,
    isSummary: false,
    status: 'active',
  },

  // ── F&B Standard Sub-departments ──────────────────────────────────────────
  {
    dimensionId: '22000',
    name: 'Bar / Lounge',
    usaliDepartment: USALIDepartment.FB_BAR_LOUNGE,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 22000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '23000',
    name: 'Banquets / Catering',
    usaliDepartment: USALIDepartment.FB_BANQUETS,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 23000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '24000',
    name: 'In-Room Dining',
    usaliDepartment: USALIDepartment.FB_IN_ROOM_DINING,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 24000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '25000',
    name: 'Mini-Bar (F&B)',
    usaliDepartment: USALIDepartment.FB_MINIBAR,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 25000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '26000',
    name: 'Other F&B',
    usaliDepartment: USALIDepartment.FB_OTHER,
    usaliCategory: 'operated',
    parentId: '20000',
    sortOrder: 26000,
    isSummary: false,
    status: 'active',
  },

  // ── 30000 Other Operated Departments ───────────────────────────────────────
  {
    dimensionId: '30000',
    name: 'Other Operated Departments',
    usaliDepartment: USALIDepartment.OTHER_OPERATED,
    usaliCategory: 'operated',
    sortOrder: 30000,
    isSummary: true,
    status: 'active',
  },
  {
    dimensionId: '31000',
    name: 'Spa',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_SPA,
    usaliCategory: 'operated',
    parentId: '30000',
    sortOrder: 31000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '32000',
    name: 'Parking',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_PARKING,
    usaliCategory: 'operated',
    parentId: '30000',
    sortOrder: 32000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '33000',
    name: 'Retail',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_RETAIL,
    usaliCategory: 'operated',
    parentId: '30000',
    sortOrder: 33000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '34000',
    name: 'Recreation',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_RECREATION,
    usaliCategory: 'operated',
    parentId: '30000',
    sortOrder: 34000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '35000',
    name: 'Business Center',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_BUSINESS_CENTER,
    usaliCategory: 'operated',
    parentId: '30000',
    sortOrder: 35000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '36000',
    name: 'Golf',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_GOLF,
    usaliCategory: 'operated',
    parentId: '30000',
    sortOrder: 36000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '37000',
    name: 'Other Operated',
    usaliDepartment: USALIDepartment.OTHER_OPERATED_OTHER,
    usaliCategory: 'operated',
    parentId: '30000',
    sortOrder: 37000,
    isSummary: false,
    status: 'active',
  },

  // ── 40000 Miscellaneous Income ─────────────────────────────────────────────
  {
    dimensionId: '40000',
    name: 'Miscellaneous Income',
    usaliDepartment: USALIDepartment.MISCELLANEOUS_INCOME,
    usaliCategory: 'miscellaneous',
    sortOrder: 40000,
    isSummary: true,
    status: 'active',
  },
  {
    dimensionId: '41000',
    name: 'Rental Income',
    usaliDepartment: USALIDepartment.MISC_RENTAL,
    usaliCategory: 'miscellaneous',
    parentId: '40000',
    sortOrder: 41000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '42000',
    name: 'Commissions',
    usaliDepartment: USALIDepartment.MISC_COMMISSIONS,
    usaliCategory: 'miscellaneous',
    parentId: '40000',
    sortOrder: 42000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '43000',
    name: 'Cancellation / No-Show Fees',
    usaliDepartment: USALIDepartment.MISC_CANCEL_NOSHOW,
    usaliCategory: 'miscellaneous',
    parentId: '40000',
    sortOrder: 43000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '44000',
    name: 'Other Income',
    usaliDepartment: USALIDepartment.MISC_OTHER,
    usaliCategory: 'miscellaneous',
    parentId: '40000',
    sortOrder: 44000,
    isSummary: false,
    status: 'active',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UNDISTRIBUTED OPERATING EXPENSES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 50000 Administrative & General ─────────────────────────────────────────
  {
    dimensionId: '50000',
    name: 'Administrative & General',
    usaliDepartment: USALIDepartment.ADMIN_AND_GENERAL,
    usaliCategory: 'undistributed',
    sortOrder: 50000,
    isSummary: true,
    status: 'active',
  },
  {
    dimensionId: '51000',
    name: 'Executive Office',
    usaliDepartment: USALIDepartment.AG_EXECUTIVE,
    usaliCategory: 'undistributed',
    parentId: '50000',
    sortOrder: 51000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '52000',
    name: 'Accounting',
    usaliDepartment: USALIDepartment.AG_ACCOUNTING,
    usaliCategory: 'undistributed',
    parentId: '50000',
    sortOrder: 52000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '53000',
    name: 'Human Resources',
    usaliDepartment: USALIDepartment.AG_HUMAN_RESOURCES,
    usaliCategory: 'undistributed',
    parentId: '50000',
    sortOrder: 53000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '54000',
    name: 'Legal & Professional Fees',
    usaliDepartment: USALIDepartment.AG_LEGAL,
    usaliCategory: 'undistributed',
    parentId: '50000',
    sortOrder: 54000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '55000',
    name: 'Purchasing',
    usaliDepartment: USALIDepartment.AG_PURCHASING,
    usaliCategory: 'undistributed',
    parentId: '50000',
    sortOrder: 55000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '56000',
    name: 'Office Operations',
    usaliDepartment: USALIDepartment.AG_OFFICE,
    usaliCategory: 'undistributed',
    parentId: '50000',
    sortOrder: 56000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '57000',
    name: 'Risk Management / Security',
    usaliDepartment: USALIDepartment.AG_RISK_SECURITY,
    usaliCategory: 'undistributed',
    parentId: '50000',
    sortOrder: 57000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '58000',
    name: 'Corporate Allocations',
    usaliDepartment: USALIDepartment.AG_CORPORATE,
    usaliCategory: 'undistributed',
    parentId: '50000',
    sortOrder: 58000,
    isSummary: false,
    status: 'active',
  },

  // ── 60000 Information & Technology ─────────────────────────────────────────
  {
    dimensionId: '60000',
    name: 'Information & Technology',
    usaliDepartment: USALIDepartment.INFORMATION_TECHNOLOGY,
    usaliCategory: 'undistributed',
    sortOrder: 60000,
    isSummary: true,
    status: 'active',
  },
  {
    dimensionId: '61000',
    name: 'Property Systems',
    usaliDepartment: USALIDepartment.IT_PROPERTY_SYSTEMS,
    usaliCategory: 'undistributed',
    parentId: '60000',
    sortOrder: 61000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '62000',
    name: 'Enterprise Applications',
    usaliDepartment: USALIDepartment.IT_ENTERPRISE_APPS,
    usaliCategory: 'undistributed',
    parentId: '60000',
    sortOrder: 62000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '63000',
    name: 'Telecommunications',
    usaliDepartment: USALIDepartment.IT_TELECOM,
    usaliCategory: 'undistributed',
    parentId: '60000',
    sortOrder: 63000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '64000',
    name: 'Data, BI, & Analytics',
    usaliDepartment: USALIDepartment.IT_DATA_BI,
    usaliCategory: 'undistributed',
    parentId: '60000',
    sortOrder: 64000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '65000',
    name: 'IT Infrastructure',
    usaliDepartment: USALIDepartment.IT_INFRASTRUCTURE,
    usaliCategory: 'undistributed',
    parentId: '60000',
    sortOrder: 65000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '66000',
    name: 'Cybersecurity & Compliance',
    usaliDepartment: USALIDepartment.IT_CYBERSECURITY,
    usaliCategory: 'undistributed',
    parentId: '60000',
    sortOrder: 66000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '67000',
    name: 'IT Labor & Support',
    usaliDepartment: USALIDepartment.IT_LABOR,
    usaliCategory: 'undistributed',
    parentId: '60000',
    sortOrder: 67000,
    isSummary: false,
    status: 'active',
  },

  // ── 70000 Sales & Marketing ────────────────────────────────────────────────
  {
    dimensionId: '70000',
    name: 'Sales & Marketing',
    usaliDepartment: USALIDepartment.SALES_AND_MARKETING,
    usaliCategory: 'undistributed',
    sortOrder: 70000,
    isSummary: true,
    status: 'active',
  },
  {
    dimensionId: '71000',
    name: 'Sales Group & Catering',
    usaliDepartment: USALIDepartment.SM_SALES_GROUP,
    usaliCategory: 'undistributed',
    parentId: '70000',
    sortOrder: 71000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '72000',
    name: 'Sales Transient & Leisure',
    usaliDepartment: USALIDepartment.SM_SALES_TRANSIENT,
    usaliCategory: 'undistributed',
    parentId: '70000',
    sortOrder: 72000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '73000',
    name: 'Marketing Brand & Digital',
    usaliDepartment: USALIDepartment.SM_MARKETING_BRAND,
    usaliCategory: 'undistributed',
    parentId: '70000',
    sortOrder: 73000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '74000',
    name: 'Revenue Management',
    usaliDepartment: USALIDepartment.SM_REVENUE_MGMT,
    usaliCategory: 'undistributed',
    parentId: '70000',
    sortOrder: 74000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '75000',
    name: 'Public Relations',
    usaliDepartment: USALIDepartment.SM_PUBLIC_RELATIONS,
    usaliCategory: 'undistributed',
    parentId: '70000',
    sortOrder: 75000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '76000',
    name: 'Loyalty & Partnerships',
    usaliDepartment: USALIDepartment.SM_LOYALTY,
    usaliCategory: 'undistributed',
    parentId: '70000',
    sortOrder: 76000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '77000',
    name: 'Sales Administration & Support',
    usaliDepartment: USALIDepartment.SM_SALES_ADMIN,
    usaliCategory: 'undistributed',
    parentId: '70000',
    sortOrder: 77000,
    isSummary: false,
    status: 'active',
  },

  // ── 80000 Property, Operations & Maintenance ──────────────────────────────
  {
    dimensionId: '80000',
    name: 'Property, Operations & Maintenance',
    usaliDepartment: USALIDepartment.PROPERTY_OPERATIONS,
    usaliCategory: 'undistributed',
    sortOrder: 80000,
    isSummary: true,
    status: 'active',
  },
  {
    dimensionId: '81000',
    name: 'Engineering - Labor',
    usaliDepartment: USALIDepartment.POM_ENGINEERING_LABOR,
    usaliCategory: 'undistributed',
    parentId: '80000',
    sortOrder: 81000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '82000',
    name: 'Engineering - Materials & Support',
    usaliDepartment: USALIDepartment.POM_ENGINEERING_MATERIALS,
    usaliCategory: 'undistributed',
    parentId: '80000',
    sortOrder: 82000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '83000',
    name: 'Contracted Services',
    usaliDepartment: USALIDepartment.POM_CONTRACTED,
    usaliCategory: 'undistributed',
    parentId: '80000',
    sortOrder: 83000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '84000',
    name: 'Grounds & Landscaping',
    usaliDepartment: USALIDepartment.POM_GROUNDS,
    usaliCategory: 'undistributed',
    parentId: '80000',
    sortOrder: 84000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '85000',
    name: 'Housekeeping Support',
    usaliDepartment: USALIDepartment.POM_HK_SUPPORT,
    usaliCategory: 'undistributed',
    parentId: '80000',
    sortOrder: 85000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '86000',
    name: 'Waste Removal & Recycling',
    usaliDepartment: USALIDepartment.POM_WASTE,
    usaliCategory: 'undistributed',
    parentId: '80000',
    sortOrder: 86000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '87000',
    name: 'Life Safety & Compliance',
    usaliDepartment: USALIDepartment.POM_LIFE_SAFETY,
    usaliCategory: 'undistributed',
    parentId: '80000',
    sortOrder: 87000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '88000',
    name: 'Workshops, Tools, & Equipment',
    usaliDepartment: USALIDepartment.POM_WORKSHOPS,
    usaliCategory: 'undistributed',
    parentId: '80000',
    sortOrder: 88000,
    isSummary: false,
    status: 'active',
  },

  // ── 90000 Utilities ────────────────────────────────────────────────────────
  {
    dimensionId: '90000',
    name: 'Utilities',
    usaliDepartment: USALIDepartment.UTILITIES,
    usaliCategory: 'undistributed',
    sortOrder: 90000,
    isSummary: false,
    status: 'active',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FIXED CHARGES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    dimensionId: '11000',
    name: 'Management Fees',
    usaliDepartment: USALIDepartment.MANAGEMENT_FEES,
    usaliCategory: 'fixed_charges',
    sortOrder: 11000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '12000',
    name: 'Rent',
    usaliDepartment: USALIDepartment.RENT,
    usaliCategory: 'fixed_charges',
    sortOrder: 12000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '13000',
    name: 'Property Taxes',
    usaliDepartment: USALIDepartment.PROPERTY_TAXES,
    usaliCategory: 'fixed_charges',
    sortOrder: 13000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '14000',
    name: 'Insurance',
    usaliDepartment: USALIDepartment.INSURANCE,
    usaliCategory: 'fixed_charges',
    sortOrder: 14000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '15000',
    name: 'Other Fixed Charges',
    usaliDepartment: USALIDepartment.OTHER_FIXED_CHARGES,
    usaliCategory: 'fixed_charges',
    sortOrder: 15000,
    isSummary: false,
    status: 'active',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NON-OPERATING
  // ═══════════════════════════════════════════════════════════════════════════

  {
    dimensionId: '16000',
    name: 'Interest Expense',
    usaliDepartment: USALIDepartment.INTEREST_EXPENSE,
    usaliCategory: 'non_operating',
    sortOrder: 16000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '17000',
    name: 'Depreciation',
    usaliDepartment: USALIDepartment.DEPRECIATION,
    usaliCategory: 'non_operating',
    sortOrder: 17000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '18000',
    name: 'Amortization',
    usaliDepartment: USALIDepartment.AMORTIZATION,
    usaliCategory: 'non_operating',
    sortOrder: 18000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '19000',
    name: 'Income Taxes',
    usaliDepartment: USALIDepartment.INCOME_TAXES,
    usaliCategory: 'non_operating',
    sortOrder: 19000,
    isSummary: false,
    status: 'active',
  },
  {
    dimensionId: '98000',
    name: 'Non-Operating',
    usaliDepartment: USALIDepartment.NON_OPERATING,
    usaliCategory: 'non_operating',
    sortOrder: 98000,
    isSummary: true,
    status: 'active',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // HOUSE / UNDISTRIBUTED
  // ═══════════════════════════════════════════════════════════════════════════

  {
    dimensionId: '99000',
    name: 'Undistributed',
    usaliDepartment: USALIDepartment.UNDISTRIBUTED,
    usaliCategory: 'house',
    sortOrder: 99000,
    isSummary: true,
    status: 'active',
  },
];

// ─── Lookup Indexes (built once) ─────────────────────────────────────────────

const _byCode = new Map<USALIDepartment, DepartmentDimension>(
  DEFAULT_DEPARTMENTS.map(d => [d.usaliDepartment, d]),
);

const _byId = new Map<string, DepartmentDimension>(
  DEFAULT_DEPARTMENTS.map(d => [d.dimensionId, d]),
);

const _byParent = new Map<string, DepartmentDimension[]>();
for (const d of DEFAULT_DEPARTMENTS) {
  if (d.parentId) {
    const siblings = _byParent.get(d.parentId) ?? [];
    siblings.push(d);
    _byParent.set(d.parentId, siblings);
  }
}

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Top-level operated (revenue-generating) departments: Rooms, F&B, Other Operated */
const OPERATED_IDS = new Set(['10000', '20000', '30000']);

export function getOperatedDepartments(): DepartmentDimension[] {
  return DEFAULT_DEPARTMENTS.filter(d => OPERATED_IDS.has(d.dimensionId));
}

/** Top-level undistributed operating expense departments */
const UNDISTRIBUTED_IDS = new Set(['50000', '60000', '70000', '80000', '90000']);

export function getUndistributedDepartments(): DepartmentDimension[] {
  return DEFAULT_DEPARTMENTS.filter(d => UNDISTRIBUTED_IDS.has(d.dimensionId));
}

/** Fixed charge departments (11000-15000) */
export function getFixedChargeDepartments(): DepartmentDimension[] {
  return DEFAULT_DEPARTMENTS.filter(d => d.usaliCategory === 'fixed_charges');
}

/** Non-operating departments (16000-19000, 98000) */
export function getNonOperatingDepartments(): DepartmentDimension[] {
  return DEFAULT_DEPARTMENTS.filter(d => d.usaliCategory === 'non_operating');
}

/** Get department by USALI enum code */
export function getDepartmentByCode(
  code: USALIDepartment,
): DepartmentDimension | undefined {
  return _byCode.get(code);
}

/** Get department by Sage Intacct dimension ID (e.g., "10000", "21005") */
export function getDepartmentById(
  id: string,
): DepartmentDimension | undefined {
  return _byId.get(id);
}

/** Get all sub-departments for a given parent dimension ID */
export function getSubDepartments(parentId: string): DepartmentDimension[] {
  return _byParent.get(parentId) ?? [];
}

/** Named F&B restaurant outlets (21001-21011) */
const FB_OUTLET_IDS = new Set([
  '21001', '21002', '21003', '21004', '21005',
  '21006', '21007', '21008', '21009', '21010', '21011',
]);

export function getFBOutlets(): DepartmentDimension[] {
  return DEFAULT_DEPARTMENTS.filter(d => FB_OUTLET_IDS.has(d.dimensionId));
}
