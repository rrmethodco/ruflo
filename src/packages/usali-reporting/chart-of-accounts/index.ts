/**
 * USALI 12th Edition Chart of Accounts
 * Standard GL account structure for hospitality operations
 *
 * Account Range Convention:
 *   4000-4999  Revenue
 *   5000-5999  Cost of Sales
 *   6000-6999  Labor Costs (Salaries, Wages, Benefits)
 *   7000-7999  Other Operating Expenses
 *   8000-8499  Non-Operating Income & Expenses
 *   8500-8999  Fixed Charges
 *   9000-9499  Statistical Accounts
 */

import { USALIAccountCategory, type GLAccountMapping } from '../types/usali.js';

// ─── Revenue Accounts (4000-4999) ────────────────────────────────────────────

export const REVENUE_ACCOUNTS: GLAccountMapping[] = [
  // Rooms Revenue
  { glAccount: '4000', title: 'Transient Room Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'rooms-rev-transient', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4010', title: 'Group Room Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'rooms-rev-group', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4020', title: 'Contract Room Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'rooms-rev-contract', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4030', title: 'Other Room Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'rooms-rev-other', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4040', title: 'No-Show Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'rooms-rev-noshow', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4050', title: 'Cancellation Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'rooms-rev-cancel', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4060', title: 'Service Charges - Rooms', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'rooms-rev-svccharge', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4090', title: 'Allowances - Rooms', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'rooms-rev-allowances', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },

  // F&B Revenue
  { glAccount: '4100', title: 'Food Revenue - Restaurant', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'fb-rev-food-restaurant', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4110', title: 'Food Revenue - Banquet', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'fb-rev-food-banquet', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4120', title: 'Food Revenue - Room Service', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'fb-rev-food-roomservice', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4130', title: 'Food Revenue - Mini Bar', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'fb-rev-food-minibar', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4140', title: 'Food Revenue - Other', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'fb-rev-food-other', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4150', title: 'Beverage Revenue - Restaurant', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'fb-rev-bev-restaurant', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4160', title: 'Beverage Revenue - Banquet', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'fb-rev-bev-banquet', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4170', title: 'Beverage Revenue - Lounge/Bar', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'fb-rev-bev-bar', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4180', title: 'Beverage Revenue - Mini Bar', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'fb-rev-bev-minibar', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4190', title: 'F&B Service Charges', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'fb-rev-svccharge', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4195', title: 'Allowances - F&B', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'fb-rev-allowances', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },

  // Other Operated Department Revenue
  { glAccount: '4200', title: 'Spa Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'other-rev-spa', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4210', title: 'Golf Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'other-rev-golf', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4220', title: 'Parking Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'other-rev-parking', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4230', title: 'Telecommunications Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'other-rev-telecom', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4240', title: 'Retail/Gift Shop Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'other-rev-retail', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4250', title: 'Recreation Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'other-rev-recreation', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4290', title: 'Other Operated Revenue', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'other-rev-misc', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },

  // Rental & Other Income
  { glAccount: '4300', title: 'Rental Income', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'rental-income', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4310', title: 'Concession Income', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'concession-income', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4320', title: 'Commission Income', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'commission-income', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '4390', title: 'Miscellaneous Income', usaliCategory: USALIAccountCategory.REVENUE, usaliLineId: 'misc-income', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
];

// ─── Cost of Sales (5000-5999) ───────────────────────────────────────────────

export const COST_OF_SALES_ACCOUNTS: GLAccountMapping[] = [
  // F&B Cost of Sales
  { glAccount: '5100', title: 'Cost of Food', usaliCategory: USALIAccountCategory.COST_OF_SALES, usaliLineId: 'fb-cos-food', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '5150', title: 'Cost of Beverage', usaliCategory: USALIAccountCategory.COST_OF_SALES, usaliLineId: 'fb-cos-beverage', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },

  // Other Operated COS
  { glAccount: '5200', title: 'Cost of Spa Products', usaliCategory: USALIAccountCategory.COST_OF_SALES, usaliLineId: 'other-cos-spa', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '5210', title: 'Cost of Golf Merchandise', usaliCategory: USALIAccountCategory.COST_OF_SALES, usaliLineId: 'other-cos-golf', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '5240', title: 'Cost of Retail Merchandise', usaliCategory: USALIAccountCategory.COST_OF_SALES, usaliLineId: 'other-cos-retail', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
];

// ─── Labor Costs (6000-6999) ─────────────────────────────────────────────────

export const LABOR_ACCOUNTS: GLAccountMapping[] = [
  // Salaries & Wages
  { glAccount: '6000', title: 'Salaries & Wages - Management', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-salaries-mgmt', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6010', title: 'Salaries & Wages - Staff', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-salaries-staff', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6020', title: 'Overtime', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-overtime', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6030', title: 'Vacation & Holiday Pay', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-vacation', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6040', title: 'Sick Pay', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-sick', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6050', title: 'Bonuses & Incentives', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-bonuses', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6060', title: 'Service Charge Distribution', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-svccharge-dist', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6070', title: 'Contract Labor', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-contract', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },

  // Benefits
  { glAccount: '6100', title: 'Payroll Taxes', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-payrolltax', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6110', title: 'Employee Health Insurance', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-health', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6120', title: 'Workers Compensation', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-workcomp', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6130', title: 'Retirement/401k', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-retirement', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6140', title: 'Employee Meals', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-meals', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6150', title: 'Employee Training', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-training', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6160', title: 'Employee Relations', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-relations', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '6170', title: 'Other Benefits', usaliCategory: USALIAccountCategory.LABOR_COST, usaliLineId: 'labor-other-benefits', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
];

// ─── Other Operating Expenses (7000-7999) ────────────────────────────────────

export const OTHER_EXPENSE_ACCOUNTS: GLAccountMapping[] = [
  // Departmental Expenses
  { glAccount: '7000', title: 'Guest Supplies', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-guest-supplies', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7010', title: 'Cleaning Supplies', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-cleaning', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7020', title: 'Laundry & Linen', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-laundry', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7030', title: 'Uniforms', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-uniforms', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7040', title: 'Commissions', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-commissions', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7050', title: 'Reservation Costs', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-reservations', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7060', title: 'Travel Agent Commissions', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-ta-commissions', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7070', title: 'OTA Commissions', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-ota-commissions', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7080', title: 'Credit Card Commissions', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-cc-commissions', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7090', title: 'Complimentary Services', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-complimentary', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7100', title: 'Decorations', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-decorations', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7110', title: 'Operating Supplies', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-operating-supplies', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7120', title: 'Printing & Stationery', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-printing', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7130', title: 'Postage & Shipping', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-postage', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7140', title: 'Telecommunications Expense', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-telecom', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7150', title: 'Transportation', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'exp-transportation', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },

  // A&G Expenses
  { glAccount: '7200', title: 'Accounting & Audit', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'ag-accounting', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7210', title: 'Legal Fees', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'ag-legal', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7220', title: 'Professional Fees - Other', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'ag-professional', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7230', title: 'Bad Debt Expense', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'ag-baddebt', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7240', title: 'Cash Over/Short', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'ag-cash-overshort', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7250', title: 'Donations', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'ag-donations', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7260', title: 'Dues & Subscriptions', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'ag-dues', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7270', title: 'General Insurance', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'ag-insurance', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7280', title: 'Licenses & Permits', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'ag-licenses', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7290', title: 'Loss & Damage', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'ag-loss-damage', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7295', title: 'Travel & Entertainment', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'ag-travel', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },

  // S&M Expenses
  { glAccount: '7300', title: 'Advertising - Digital', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'sm-advertising-digital', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7310', title: 'Advertising - Print', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'sm-advertising-print', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7320', title: 'Advertising - Other', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'sm-advertising-other', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7330', title: 'Agency Fees', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'sm-agency', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7340', title: 'Loyalty Program', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'sm-loyalty', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7350', title: 'Public Relations', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'sm-pr', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7360', title: 'Sales Promotions', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'sm-promotions', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7370', title: 'Direct Marketing', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'sm-direct', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },

  // POM Expenses
  { glAccount: '7400', title: 'Building Maintenance', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'pom-building', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7410', title: 'Elevator Maintenance', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'pom-elevator', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7420', title: 'Electrical & Mechanical', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'pom-electrical', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7430', title: 'Engineering Supplies', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'pom-supplies', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7440', title: 'Floor Covering', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'pom-flooring', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7450', title: 'Furniture Maintenance', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'pom-furniture', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7460', title: 'Grounds & Landscaping', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'pom-grounds', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7470', title: 'HVAC Maintenance', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'pom-hvac', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7480', title: 'Painting & Decorating', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'pom-painting', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7490', title: 'Plumbing', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'pom-plumbing', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7495', title: 'Swimming Pool Maintenance', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'pom-pool', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },

  // Utility Expenses
  { glAccount: '7500', title: 'Electricity', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'util-electricity', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7510', title: 'Gas', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'util-gas', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7520', title: 'Water & Sewer', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'util-water', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7530', title: 'Oil/Fuel', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'util-fuel', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7540', title: 'Waste Removal', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'util-waste', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },

  // IT Expenses
  { glAccount: '7600', title: 'Software Licenses & SaaS', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'it-software', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7610', title: 'Hardware Maintenance', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'it-hardware', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7620', title: 'Internet & Connectivity', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'it-internet', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7630', title: 'PMS/POS Systems', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'it-pms', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7640', title: 'Cybersecurity', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'it-security', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '7650', title: 'IT Consulting', usaliCategory: USALIAccountCategory.OTHER_EXPENSE, usaliLineId: 'it-consulting', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
];

// ─── Non-Operating Income & Expenses (8000-8499) ─────────────────────────────

export const NON_OPERATING_ACCOUNTS: GLAccountMapping[] = [
  { glAccount: '8000', title: 'Interest Income', usaliCategory: USALIAccountCategory.NON_OPERATING_INCOME, usaliLineId: 'nonop-interest-income', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8010', title: 'Gain on Sale of Assets', usaliCategory: USALIAccountCategory.NON_OPERATING_INCOME, usaliLineId: 'nonop-gain-assets', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8020', title: 'Foreign Exchange Gain', usaliCategory: USALIAccountCategory.NON_OPERATING_INCOME, usaliLineId: 'nonop-fx-gain', normalBalance: 'credit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8050', title: 'Interest Expense', usaliCategory: USALIAccountCategory.NON_OPERATING_EXPENSE, usaliLineId: 'nonop-interest-expense', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8060', title: 'Loss on Sale of Assets', usaliCategory: USALIAccountCategory.NON_OPERATING_EXPENSE, usaliLineId: 'nonop-loss-assets', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8070', title: 'Foreign Exchange Loss', usaliCategory: USALIAccountCategory.NON_OPERATING_EXPENSE, usaliLineId: 'nonop-fx-loss', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8080', title: 'Depreciation - Building', usaliCategory: USALIAccountCategory.NON_OPERATING_EXPENSE, usaliLineId: 'nonop-depr-building', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8090', title: 'Depreciation - FF&E', usaliCategory: USALIAccountCategory.NON_OPERATING_EXPENSE, usaliLineId: 'nonop-depr-ffe', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8100', title: 'Amortization', usaliCategory: USALIAccountCategory.NON_OPERATING_EXPENSE, usaliLineId: 'nonop-amortization', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8110', title: 'Income Tax', usaliCategory: USALIAccountCategory.NON_OPERATING_EXPENSE, usaliLineId: 'nonop-income-tax', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
];

// ─── Fixed Charges (8500-8999) ───────────────────────────────────────────────

export const FIXED_CHARGE_ACCOUNTS: GLAccountMapping[] = [
  { glAccount: '8500', title: 'Property Insurance', usaliCategory: USALIAccountCategory.FIXED_CHARGE, usaliLineId: 'fixed-insurance', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8510', title: 'Property Tax', usaliCategory: USALIAccountCategory.FIXED_CHARGE, usaliLineId: 'fixed-property-tax', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8520', title: 'Ground Lease/Land Rent', usaliCategory: USALIAccountCategory.FIXED_CHARGE, usaliLineId: 'fixed-land-rent', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8530', title: 'Equipment Lease', usaliCategory: USALIAccountCategory.FIXED_CHARGE, usaliLineId: 'fixed-equip-lease', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },

  // Management Fees
  { glAccount: '8600', title: 'Base Management Fee', usaliCategory: USALIAccountCategory.MANAGEMENT_FEE, usaliLineId: 'mgmt-base-fee', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8610', title: 'Incentive Management Fee', usaliCategory: USALIAccountCategory.MANAGEMENT_FEE, usaliLineId: 'mgmt-incentive-fee', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8620', title: 'Franchise/Royalty Fee', usaliCategory: USALIAccountCategory.MANAGEMENT_FEE, usaliLineId: 'mgmt-franchise-fee', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8630', title: 'Marketing/Brand Fee', usaliCategory: USALIAccountCategory.MANAGEMENT_FEE, usaliLineId: 'mgmt-brand-fee', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
  { glAccount: '8640', title: 'Reservation Contribution', usaliCategory: USALIAccountCategory.MANAGEMENT_FEE, usaliLineId: 'mgmt-reservation', normalBalance: 'debit', accountType: 'incomestatement', isStatistical: false },
];

// ─── Statistical Accounts (9000-9499) ────────────────────────────────────────

export const STATISTICAL_ACCOUNTS: GLAccountMapping[] = [
  { glAccount: '9000', title: 'Available Rooms', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-available-rooms', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9010', title: 'Rooms Sold', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-rooms-sold', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9020', title: 'Complimentary Rooms', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-comp-rooms', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9030', title: 'Out of Order Rooms', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-ooo-rooms', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9040', title: 'Occupied Rooms', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-occupied-rooms', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9050', title: 'Total Guests', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-total-guests', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9060', title: 'Arrivals', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-arrivals', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9070', title: 'Departures', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-departures', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9080', title: 'No Shows', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-noshows', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9090', title: 'Cancellations', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-cancellations', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9100', title: 'FTE Count', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-fte', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9110', title: 'Covers - Restaurant', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-covers-restaurant', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9120', title: 'Covers - Banquet', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-covers-banquet', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9130', title: 'Spa Treatments', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-spa-treatments', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
  { glAccount: '9140', title: 'Golf Rounds', usaliCategory: USALIAccountCategory.STATISTICS, usaliLineId: 'stat-golf-rounds', normalBalance: 'debit', accountType: 'statistical', isStatistical: true },
];

// ─── Complete Chart of Accounts ──────────────────────────────────────────────

export const ALL_ACCOUNTS: GLAccountMapping[] = [
  ...REVENUE_ACCOUNTS,
  ...COST_OF_SALES_ACCOUNTS,
  ...LABOR_ACCOUNTS,
  ...OTHER_EXPENSE_ACCOUNTS,
  ...NON_OPERATING_ACCOUNTS,
  ...FIXED_CHARGE_ACCOUNTS,
  ...STATISTICAL_ACCOUNTS,
];

/** Get accounts by USALI category */
export function getAccountsByCategory(category: USALIAccountCategory): GLAccountMapping[] {
  return ALL_ACCOUNTS.filter(a => a.usaliCategory === category);
}

/** Get accounts by GL range */
export function getAccountsByRange(from: string, to: string): GLAccountMapping[] {
  return ALL_ACCOUNTS.filter(a => a.glAccount >= from && a.glAccount <= to);
}

/** Get account by GL number */
export function getAccount(glAccount: string): GLAccountMapping | undefined {
  return ALL_ACCOUNTS.find(a => a.glAccount === glAccount);
}
