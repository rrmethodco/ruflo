/**
 * Tests for USALI 12th Edition Reporting Package
 */

import { describe, it, expect } from 'vitest';

// We test the modules directly since they export pure data and functions
// Import paths reference source files for vitest (no build needed)

describe('USALI Reporting Package', () => {
  describe('Types & Enums', () => {
    it('should define all USALI departments', async () => {
      const { USALIDepartment } = await import('../src/packages/usali-reporting/types/usali.js');
      expect(USALIDepartment.ROOMS).toBe('ROOMS');
      expect(USALIDepartment.FOOD_AND_BEVERAGE).toBe('F&B');
      expect(USALIDepartment.ADMIN_AND_GENERAL).toBe('A&G');
      expect(USALIDepartment.SALES_AND_MARKETING).toBe('S&M');
      expect(USALIDepartment.PROPERTY_OPERATIONS).toBe('POM');
      expect(USALIDepartment.UTILITIES).toBe('UTIL');
      expect(USALIDepartment.INFORMATION_TECHNOLOGY).toBe('IT');
      expect(USALIDepartment.MANAGEMENT_FEES).toBe('MGMT_FEE');
      expect(USALIDepartment.FIXED_CHARGES).toBe('FIXED');
    });

    it('should define all USALI account categories', async () => {
      const { USALIAccountCategory } = await import('../src/packages/usali-reporting/types/usali.js');
      expect(USALIAccountCategory.REVENUE).toBe('Revenue');
      expect(USALIAccountCategory.COST_OF_SALES).toBe('Cost of Sales');
      expect(USALIAccountCategory.LABOR_COST).toBe('Labor Cost');
      expect(USALIAccountCategory.FIXED_CHARGE).toBe('Fixed Charge');
    });

    it('should define all USALI report sections', async () => {
      const { USALISection } = await import('../src/packages/usali-reporting/types/usali.js');
      expect(USALISection.SUMMARY_OPERATING_STATEMENT).toBe('Summary Operating Statement');
      expect(USALISection.ROOMS).toBe('Rooms Department');
      expect(USALISection.FOOD_AND_BEVERAGE).toBe('Food & Beverage Department');
    });
  });

  describe('Chart of Accounts', () => {
    it('should provide complete account list', async () => {
      const { ALL_ACCOUNTS } = await import('../src/packages/usali-reporting/chart-of-accounts/index.js');
      expect(ALL_ACCOUNTS.length).toBeGreaterThan(80);
    });

    it('should have revenue accounts in 4000-4999 range', async () => {
      const { REVENUE_ACCOUNTS } = await import('../src/packages/usali-reporting/chart-of-accounts/index.js');
      for (const acct of REVENUE_ACCOUNTS) {
        const num = parseInt(acct.glAccount);
        expect(num).toBeGreaterThanOrEqual(4000);
        expect(num).toBeLessThan(5000);
      }
    });

    it('should have statistical accounts in 9000+ range', async () => {
      const { STATISTICAL_ACCOUNTS } = await import('../src/packages/usali-reporting/chart-of-accounts/index.js');
      for (const acct of STATISTICAL_ACCOUNTS) {
        expect(acct.isStatistical).toBe(true);
        expect(acct.accountType).toBe('statistical');
        const num = parseInt(acct.glAccount);
        expect(num).toBeGreaterThanOrEqual(9000);
      }
    });

    it('should look up accounts by GL number', async () => {
      const { getAccount } = await import('../src/packages/usali-reporting/chart-of-accounts/index.js');
      const acct = getAccount('4000');
      expect(acct).toBeDefined();
      expect(acct!.title).toBe('Transient Room Revenue');
      expect(acct!.normalBalance).toBe('credit');
    });

    it('should filter accounts by category', async () => {
      const { getAccountsByCategory } = await import('../src/packages/usali-reporting/chart-of-accounts/index.js');
      const { USALIAccountCategory } = await import('../src/packages/usali-reporting/types/usali.js');
      const revenue = getAccountsByCategory(USALIAccountCategory.REVENUE);
      expect(revenue.length).toBeGreaterThan(20);
      for (const acct of revenue) {
        expect(acct.usaliCategory).toBe('Revenue');
      }
    });
  });

  describe('Department Dimensions', () => {
    it('should provide all USALI departments', async () => {
      const { DEFAULT_DEPARTMENTS } = await import('../src/packages/usali-reporting/departments/index.js');
      expect(DEFAULT_DEPARTMENTS.length).toBeGreaterThanOrEqual(18);
    });

    it('should return operated departments', async () => {
      const { getOperatedDepartments } = await import('../src/packages/usali-reporting/departments/index.js');
      const operated = getOperatedDepartments();
      expect(operated.length).toBeGreaterThanOrEqual(7);
      // Rooms and F&B should be in operated
      const ids = operated.map(d => d.dimensionId);
      expect(ids).toContain('ROOMS');
      expect(ids).toContain('F&B');
    });

    it('should return undistributed departments', async () => {
      const { getUndistributedDepartments } = await import('../src/packages/usali-reporting/departments/index.js');
      const undist = getUndistributedDepartments();
      expect(undist.length).toBe(5);
      const ids = undist.map(d => d.dimensionId);
      expect(ids).toContain('A&G');
      expect(ids).toContain('S&M');
      expect(ids).toContain('POM');
      expect(ids).toContain('UTIL');
      expect(ids).toContain('IT');
    });

    it('should have parent-child hierarchy for Other Operated', async () => {
      const { DEFAULT_DEPARTMENTS } = await import('../src/packages/usali-reporting/departments/index.js');
      const spa = DEFAULT_DEPARTMENTS.find(d => d.dimensionId === 'SPA');
      expect(spa).toBeDefined();
      expect(spa!.parentId).toBe('OTHER_OP');
    });
  });

  describe('Report Definitions', () => {
    it('should provide 11 standard USALI reports', async () => {
      const { ALL_REPORTS } = await import('../src/packages/usali-reporting/reports/index.js');
      expect(ALL_REPORTS.length).toBe(11);
    });

    it('should have Summary Operating Statement as first report', async () => {
      const { ALL_REPORTS } = await import('../src/packages/usali-reporting/reports/index.js');
      expect(ALL_REPORTS[0].id).toBe('usali-sos');
      expect(ALL_REPORTS[0].name).toBe('Summary Operating Statement');
    });

    it('should have GOP, EBITDA, and NOI lines in SOS', async () => {
      const { SUMMARY_OPERATING_STATEMENT } = await import('../src/packages/usali-reporting/reports/summary-operating-statement.js');
      const lineIds = SUMMARY_OPERATING_STATEMENT.lines.map(l => l.id);
      expect(lineIds).toContain('gop');
      expect(lineIds).toContain('ebitda');
      expect(lineIds).toContain('noi');
    });

    it('should have standard column structure', async () => {
      const { SUMMARY_OPERATING_STATEMENT } = await import('../src/packages/usali-reporting/reports/summary-operating-statement.js');
      const colTypes = SUMMARY_OPERATING_STATEMENT.columns.map(c => c.type);
      expect(colTypes).toContain('actual');
      expect(colTypes).toContain('budget');
      expect(colTypes).toContain('variance_amount');
      expect(colTypes).toContain('variance_percent');
      expect(colTypes).toContain('prior_year');
      expect(colTypes).toContain('percent_of_revenue');
      expect(colTypes).toContain('per_available_room');
      expect(colTypes).toContain('per_occupied_room');
    });

    it('should look up reports by ID', async () => {
      const { getReportById } = await import('../src/packages/usali-reporting/reports/index.js');
      const rooms = getReportById('usali-rooms');
      expect(rooms).toBeDefined();
      expect(rooms!.name).toBe('Rooms Department');
    });

    it('should have Rooms department filtered to ROOMS', async () => {
      const { ROOMS_DEPARTMENT } = await import('../src/packages/usali-reporting/reports/rooms-department.js');
      expect(ROOMS_DEPARTMENT.departments).toEqual(['ROOMS']);
    });

    it('should have F&B department with food cost % lines', async () => {
      const { FOOD_BEVERAGE_DEPARTMENT } = await import('../src/packages/usali-reporting/reports/food-beverage.js');
      const lineIds = FOOD_BEVERAGE_DEPARTMENT.lines.map(l => l.id);
      expect(lineIds).toContain('cos-food-pct');
      expect(lineIds).toContain('cos-bev-pct');
      expect(lineIds).toContain('gross-profit');
    });
  });

  describe('KPIs', () => {
    it('should define 18+ standard KPIs', async () => {
      const { ALL_KPIS } = await import('../src/packages/usali-reporting/kpis/index.js');
      expect(ALL_KPIS.length).toBeGreaterThanOrEqual(18);
    });

    it('should calculate RevPAR correctly', async () => {
      const { calculateKPI, REVPAR } = await import('../src/packages/usali-reporting/kpis/index.js');
      const result = calculateKPI(REVPAR, {
        'rooms-total-revenue': 500000,
        'stat-available-rooms': 3100,
      });
      expect(result).toBeCloseTo(161.29, 1);
    });

    it('should calculate ADR correctly', async () => {
      const { calculateKPI, AVERAGE_DAILY_RATE } = await import('../src/packages/usali-reporting/kpis/index.js');
      const result = calculateKPI(AVERAGE_DAILY_RATE, {
        'rooms-total-revenue': 500000,
        'stat-rooms-sold': 2480,
      });
      expect(result).toBeCloseTo(201.61, 1);
    });

    it('should calculate Occupancy % correctly', async () => {
      const { calculateKPI, OCCUPANCY_PERCENTAGE } = await import('../src/packages/usali-reporting/kpis/index.js');
      const result = calculateKPI(OCCUPANCY_PERCENTAGE, {
        'stat-occupied-rooms': 2480,
        'stat-available-rooms': 3100,
      });
      expect(result).toBeCloseTo(80.0, 0);
    });

    it('should return null for missing data', async () => {
      const { calculateKPI, REVPAR } = await import('../src/packages/usali-reporting/kpis/index.js');
      const result = calculateKPI(REVPAR, {});
      expect(result).toBeNull();
    });

    it('should return null for zero denominator', async () => {
      const { calculateKPI, REVPAR } = await import('../src/packages/usali-reporting/kpis/index.js');
      const result = calculateKPI(REVPAR, {
        'rooms-total-revenue': 500000,
        'stat-available-rooms': 0,
      });
      expect(result).toBeNull();
    });

    it('should filter KPIs by category', async () => {
      const { getKPIsByCategory } = await import('../src/packages/usali-reporting/kpis/index.js');
      const profitability = getKPIsByCategory('profitability');
      expect(profitability.length).toBeGreaterThanOrEqual(4);
      for (const kpi of profitability) {
        expect(kpi.category).toBe('profitability');
      }
    });
  });

  describe('Configuration & Mapping', () => {
    it('should create default config', async () => {
      const { createDefaultConfig } = await import('../src/packages/usali-reporting/config/default-mappings.js');
      const config = createDefaultConfig({ companyName: 'Test Hotel' });
      expect(config.companyName).toBe('Test Hotel');
      expect(config.currency).toBe('USD');
      expect(config.accountMappings.length).toBeGreaterThan(0);
      expect(config.departmentMappings.length).toBeGreaterThan(0);
    });

    it('should apply GL mapping overrides', async () => {
      const { applyGLMappings } = await import('../src/packages/usali-reporting/config/default-mappings.js');
      const { ALL_ACCOUNTS } = await import('../src/packages/usali-reporting/chart-of-accounts/index.js');

      const mapped = applyGLMappings([
        { sageGLAccount: '40100', usaliTemplateAccount: '4000', title: 'My Room Revenue' },
      ], ALL_ACCOUNTS);

      const roomRev = mapped.find(a => a.glAccount === '40100');
      expect(roomRev).toBeDefined();
      expect(roomRev!.title).toBe('My Room Revenue');
    });

    it('should apply department mapping overrides', async () => {
      const { applyDepartmentMappings } = await import('../src/packages/usali-reporting/config/default-mappings.js');
      const { DEFAULT_DEPARTMENTS } = await import('../src/packages/usali-reporting/departments/index.js');

      const mapped = applyDepartmentMappings([
        { sageDepartmentId: 'RM', usaliDepartmentId: 'ROOMS', name: 'Room Operations' },
      ], DEFAULT_DEPARTMENTS);

      const rooms = mapped.find(d => d.dimensionId === 'RM');
      expect(rooms).toBeDefined();
      expect(rooms!.name).toBe('Room Operations');
    });

    it('should validate mappings and report missing accounts', async () => {
      const { validateMappings } = await import('../src/packages/usali-reporting/config/default-mappings.js');
      const { SUMMARY_OPERATING_STATEMENT } = await import('../src/packages/usali-reporting/reports/summary-operating-statement.js');
      const { ALL_ACCOUNTS } = await import('../src/packages/usali-reporting/chart-of-accounts/index.js');
      const { DEFAULT_DEPARTMENTS } = await import('../src/packages/usali-reporting/departments/index.js');

      const result = validateMappings(SUMMARY_OPERATING_STATEMENT, ALL_ACCOUNTS, DEFAULT_DEPARTMENTS);
      // Default mappings should be valid
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('XML Export', () => {
    it('should generate valid report XML', async () => {
      const { generateReportXML } = await import('../src/packages/usali-reporting/export/sage-intacct-xml.js');
      const { SUMMARY_OPERATING_STATEMENT } = await import('../src/packages/usali-reporting/reports/summary-operating-statement.js');
      const { createDefaultConfig } = await import('../src/packages/usali-reporting/config/default-mappings.js');

      const config = createDefaultConfig({ companyName: 'Test Hotel' });
      const xml = generateReportXML(SUMMARY_OPERATING_STATEMENT, config);

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<FINANCIALREPORT>');
      expect(xml).toContain('<NAME>Summary Operating Statement</NAME>');
      expect(xml).toContain('<COMPANYNAME>Test Hotel</COMPANYNAME>');
      expect(xml).toContain('<ROWS>');
      expect(xml).toContain('<COLUMNS>');
      expect(xml).toContain('<DEPARTMENTID>');
    });

    it('should generate accounts XML', async () => {
      const { generateAccountsXML } = await import('../src/packages/usali-reporting/export/sage-intacct-xml.js');
      const { REVENUE_ACCOUNTS } = await import('../src/packages/usali-reporting/chart-of-accounts/index.js');

      const xml = generateAccountsXML(REVENUE_ACCOUNTS);
      expect(xml).toContain('<GLACCOUNT>');
      expect(xml).toContain('<ACCOUNTNO>4000</ACCOUNTNO>');
      expect(xml).toContain('Transient Room Revenue');
    });

    it('should generate departments XML', async () => {
      const { generateDepartmentsXML } = await import('../src/packages/usali-reporting/export/sage-intacct-xml.js');
      const { DEFAULT_DEPARTMENTS } = await import('../src/packages/usali-reporting/departments/index.js');

      const xml = generateDepartmentsXML(DEFAULT_DEPARTMENTS);
      expect(xml).toContain('<DEPARTMENT>');
      expect(xml).toContain('<DEPARTMENTID>ROOMS</DEPARTMENTID>');
      expect(xml).toContain('<TITLE>Rooms</TITLE>');
    });

    it('should generate full report package', async () => {
      const { generateFullReportPackage } = await import('../src/packages/usali-reporting/export/sage-intacct-xml.js');
      const { ALL_REPORTS } = await import('../src/packages/usali-reporting/reports/index.js');
      const { createDefaultConfig } = await import('../src/packages/usali-reporting/config/default-mappings.js');

      const config = createDefaultConfig({ companyName: 'Test Hotel' });
      const files = generateFullReportPackage(ALL_REPORTS, config);

      expect(files.size).toBeGreaterThanOrEqual(13); // 11 reports + accounts + departments
      expect(files.has('report-usali-sos.xml')).toBe(true);
      expect(files.has('report-usali-rooms.xml')).toBe(true);
      expect(files.has('accounts.xml')).toBe(true);
      expect(files.has('departments.xml')).toBe(true);
    });
  });

  describe('CSV Export', () => {
    it('should generate accounts CSV with headers', async () => {
      const { generateAccountsCSV } = await import('../src/packages/usali-reporting/export/csv.js');
      const { ALL_ACCOUNTS } = await import('../src/packages/usali-reporting/chart-of-accounts/index.js');

      const csv = generateAccountsCSV(ALL_ACCOUNTS);
      const lines = csv.split('\r\n').filter(l => l.length > 0);
      expect(lines[0]).toContain('ACCOUNTNO');
      expect(lines[0]).toContain('TITLE');
      expect(lines.length).toBe(ALL_ACCOUNTS.length + 1); // +1 for header
    });

    it('should generate departments CSV', async () => {
      const { generateDepartmentsCSV } = await import('../src/packages/usali-reporting/export/csv.js');
      const { DEFAULT_DEPARTMENTS } = await import('../src/packages/usali-reporting/departments/index.js');

      const csv = generateDepartmentsCSV(DEFAULT_DEPARTMENTS);
      expect(csv).toContain('DEPARTMENTID');
      expect(csv).toContain('ROOMS');
      expect(csv).toContain('Food & Beverage');
    });

    it('should generate report mapping CSV', async () => {
      const { generateReportMappingCSV } = await import('../src/packages/usali-reporting/export/csv.js');
      const { ALL_REPORTS } = await import('../src/packages/usali-reporting/reports/index.js');

      const csv = generateReportMappingCSV(ALL_REPORTS);
      expect(csv).toContain('REPORT_NAME');
      expect(csv).toContain('Summary Operating Statement');
      expect(csv).toContain('Rooms Department');
    });

    it('should generate KPI reference CSV', async () => {
      const { generateKPIReferenceCSV } = await import('../src/packages/usali-reporting/export/csv.js');
      const { ALL_KPIS } = await import('../src/packages/usali-reporting/kpis/index.js');

      const csv = generateKPIReferenceCSV(ALL_KPIS);
      expect(csv).toContain('KPI_ID');
      expect(csv).toContain('RevPAR');
      expect(csv).toContain('GOPPAR');
      expect(csv).toContain('ADR');
    });
  });

  describe('Factory Function', () => {
    it('should create a complete reporting package', async () => {
      const { createUSALIReportingPackage } = await import('../src/packages/usali-reporting/index.js');

      const pkg = createUSALIReportingPackage({
        companyName: 'Grand Hotel',
        currency: 'USD',
      });

      expect(pkg.config.companyName).toBe('Grand Hotel');
      expect(pkg.reports.length).toBe(11);
      expect(pkg.kpis.length).toBeGreaterThanOrEqual(18);
    });

    it('should create package with GL overrides', async () => {
      const { createUSALIReportingPackage } = await import('../src/packages/usali-reporting/index.js');

      const pkg = createUSALIReportingPackage({
        companyName: 'Custom Hotel',
        glMappings: [
          { sageGLAccount: '40100', usaliTemplateAccount: '4000' },
          { sageGLAccount: '40200', usaliTemplateAccount: '4010' },
        ],
      });

      expect(pkg.config.accountMappings.find(a => a.glAccount === '40100')).toBeDefined();
    });

    it('should validate the package', async () => {
      const { createUSALIReportingPackage } = await import('../src/packages/usali-reporting/index.js');

      const pkg = createUSALIReportingPackage({ companyName: 'Test Hotel' });
      const validation = pkg.validate();
      expect(validation.valid).toBe(true);
    });

    it('should export XML files', async () => {
      const { createUSALIReportingPackage } = await import('../src/packages/usali-reporting/index.js');

      const pkg = createUSALIReportingPackage({ companyName: 'Export Hotel' });
      const xmlFiles = pkg.exportXML();
      expect(xmlFiles.size).toBeGreaterThan(0);
    });

    it('should export CSV files', async () => {
      const { createUSALIReportingPackage } = await import('../src/packages/usali-reporting/index.js');

      const pkg = createUSALIReportingPackage({ companyName: 'CSV Hotel' });
      const mappingCsv = pkg.exportReportMappingCSV();
      const kpiCsv = pkg.exportKPIReferenceCSV();
      expect(mappingCsv.length).toBeGreaterThan(100);
      expect(kpiCsv.length).toBeGreaterThan(100);
    });
  });
});
