import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExcelAdapter, type XlsxParser } from '../src/integrations/excel-adapter';
import type { ExcelFileConfig, SpreadsheetColumnMapping, Logger } from '../src/types';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  stat: vi.fn(),
  watch: vi.fn(),
}));

import { readFile, stat, watch } from 'node:fs/promises';

const mockReadFile = vi.mocked(readFile);
const mockStat = vi.mocked(stat);
const mockWatch = vi.mocked(watch);

// ============================================================================
// Fixtures
// ============================================================================

const CSV_CONTENT = `Date,Meal Period,Net Sales,Covers,Check Count,Avg Check
2026-03-01,lunch,5000,120,100,50
2026-03-02,dinner,8000,200,180,44.44
`;

const CSV_WITH_DOLLAR_SIGNS = `Date,Meal Period,Net Sales,Covers
2026-03-01,lunch,"$1,234.56",120
2026-03-02,dinner,"$8,000.00",200
`;

const CSV_WITH_QUOTES = `Name,Description,Value
Alice,"She said ""hello"" loudly",100
Bob,"Contains, commas, inside",200
`;

const CSV_US_DATES = `Date,Net Sales
03/15/2026,5000
12/01/2026,8000
`;

const LABOR_CSV = `Employee,Role,Hours,Rate,Cost
John Doe,Server,35,15,525
Jane Smith,Line Cook,45,18,810
`;

const EMPTY_CSV = '';

const HEADERS_ONLY_CSV = `Date,Meal Period,Net Sales
`;

function makeConfig(overrides: Partial<ExcelFileConfig> = {}): ExcelFileConfig {
  return { filePath: '/data/sales.csv', headerRow: 1, dataStartRow: 2, ...overrides };
}

function makeLogger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

// ============================================================================
// Tests
// ============================================================================

describe('ExcelAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // readRows — CSV
  // --------------------------------------------------------------------------

  describe('readRows (CSV)', () => {
    it('parses CSV content into rows with headers from the first row', async () => {
      mockReadFile.mockResolvedValue(CSV_CONTENT);
      const adapter = new ExcelAdapter(makeConfig());

      const rows = await adapter.readRows();

      expect(rows).toHaveLength(2);
      expect(rows[0]['Date']).toBe('2026-03-01');
      expect(rows[0]['Meal Period']).toBe('lunch');
      expect(rows[0]['Net Sales']).toBe(5000);
      expect(rows[0]['Covers']).toBe(120);
      expect(rows[0]['Check Count']).toBe(100);
      expect(rows[0]['Avg Check']).toBe(50);

      expect(rows[1]['Date']).toBe('2026-03-02');
      expect(rows[1]['Meal Period']).toBe('dinner');
      expect(rows[1]['Net Sales']).toBe(8000);
    });

    it('handles quoted CSV fields with commas inside', async () => {
      mockReadFile.mockResolvedValue(CSV_WITH_QUOTES);
      const adapter = new ExcelAdapter(makeConfig());

      const rows = await adapter.readRows();

      expect(rows).toHaveLength(2);
      expect(rows[1]['Description']).toBe('Contains, commas, inside');
    });

    it('handles escaped quotes ("") in CSV', async () => {
      mockReadFile.mockResolvedValue(CSV_WITH_QUOTES);
      const adapter = new ExcelAdapter(makeConfig());

      const rows = await adapter.readRows();

      expect(rows[0]['Description']).toBe('She said "hello" loudly');
    });

    it('respects headerRow and dataStartRow config', async () => {
      const csvWithExtra = `Metadata row ignored
Date,Net Sales
2026-03-01,5000
2026-03-02,8000
`;
      mockReadFile.mockResolvedValue(csvWithExtra);
      const adapter = new ExcelAdapter(makeConfig({ headerRow: 2, dataStartRow: 3 }));

      const rows = await adapter.readRows();

      expect(rows).toHaveLength(2);
      expect(rows[0]['Date']).toBe('2026-03-01');
      expect(rows[0]['Net Sales']).toBe(5000);
    });

    it('coerces numeric values automatically', async () => {
      mockReadFile.mockResolvedValue(CSV_CONTENT);
      const adapter = new ExcelAdapter(makeConfig());

      const rows = await adapter.readRows();

      expect(typeof rows[0]['Net Sales']).toBe('number');
      expect(typeof rows[0]['Covers']).toBe('number');
      expect(rows[1]['Avg Check']).toBe(44.44);
    });

    it('preserves date-like strings (MM/DD/YYYY) as strings, not numbers', async () => {
      mockReadFile.mockResolvedValue(CSV_US_DATES);
      const adapter = new ExcelAdapter(makeConfig());

      const rows = await adapter.readRows();

      expect(rows[0]['Date']).toBe('03/15/2026');
      expect(typeof rows[0]['Date']).toBe('string');
      expect(rows[1]['Date']).toBe('12/01/2026');
    });

    it('returns empty array for empty files', async () => {
      mockReadFile.mockResolvedValue(EMPTY_CSV);
      const adapter = new ExcelAdapter(makeConfig());

      const rows = await adapter.readRows();

      expect(rows).toEqual([]);
    });

    it('returns empty array for files with only headers', async () => {
      mockReadFile.mockResolvedValue(HEADERS_ONLY_CSV);
      const adapter = new ExcelAdapter(makeConfig());

      const rows = await adapter.readRows();

      expect(rows).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // readRows — XLSX
  // --------------------------------------------------------------------------

  describe('readRows (XLSX)', () => {
    it('throws error when no xlsxParser is provided', async () => {
      const adapter = new ExcelAdapter(makeConfig({ filePath: '/data/sales.xlsx' }));

      await expect(adapter.readRows()).rejects.toThrow(
        'XLSX parsing requires an xlsxParser',
      );
    });

    it('uses xlsxParser.parse when provided', async () => {
      const mockBuffer = Buffer.from('fake-xlsx');
      mockReadFile.mockResolvedValue(mockBuffer as any);

      const mockParser: XlsxParser = {
        parse: vi.fn().mockReturnValue([
          ['Date', 'Net Sales'],
          ['2026-03-01', 5000],
          ['2026-03-02', 8000],
        ]),
      };

      const adapter = new ExcelAdapter(
        makeConfig({ filePath: '/data/sales.xlsx' }),
        undefined,
        mockParser,
      );

      const rows = await adapter.readRows();

      expect(mockParser.parse).toHaveBeenCalledWith(mockBuffer, undefined);
      expect(rows).toHaveLength(2);
      expect(rows[0]['Date']).toBe('2026-03-01');
      expect(rows[0]['Net Sales']).toBe(5000);
    });

    it('passes worksheetName to parser', async () => {
      const mockBuffer = Buffer.from('fake-xlsx');
      mockReadFile.mockResolvedValue(mockBuffer as any);

      const mockParser: XlsxParser = {
        parse: vi.fn().mockReturnValue([
          ['Col A'],
          ['val1'],
        ]),
      };

      const adapter = new ExcelAdapter(
        makeConfig({ filePath: '/data/report.xlsx', worksheetName: 'Sheet2' }),
        undefined,
        mockParser,
      );

      await adapter.readRows();

      expect(mockParser.parse).toHaveBeenCalledWith(mockBuffer, 'Sheet2');
    });
  });

  // --------------------------------------------------------------------------
  // rowsToSalesRecords
  // --------------------------------------------------------------------------

  describe('rowsToSalesRecords', () => {
    const mapping: SpreadsheetColumnMapping = {
      date: 'Date',
      mealPeriod: 'Meal Period',
      netSales: 'Net Sales',
      covers: 'Covers',
      checkCount: 'Check Count',
      avgCheck: 'Avg Check',
    };

    it('maps columns using SpreadsheetColumnMapping', () => {
      const adapter = new ExcelAdapter(makeConfig());
      const rows = [
        { 'Date': '2026-03-01', 'Meal Period': 'lunch', 'Net Sales': 5000, 'Covers': 120, 'Check Count': 100, 'Avg Check': 50 },
      ];

      const records = adapter.rowsToSalesRecords(rows, mapping);

      expect(records).toHaveLength(1);
      expect(records[0].date).toBe('2026-03-01');
      expect(records[0].mealPeriod).toBe('lunch');
      expect(records[0].netSales).toBe(5000);
      expect(records[0].covers).toBe(120);
      expect(records[0].checkCount).toBe(100);
      expect(records[0].avgCheck).toBe(50);
      expect(records[0].dayOfWeek).toBeDefined();
      expect(records[0].menuMix).toEqual([]);
    });

    it('skips rows without a valid date', () => {
      const adapter = new ExcelAdapter(makeConfig());
      const rows = [
        { 'Date': 'not-a-date', 'Meal Period': 'lunch', 'Net Sales': 100 },
        { 'Date': null, 'Meal Period': 'dinner', 'Net Sales': 200 },
        { 'Date': '2026-03-01', 'Meal Period': 'lunch', 'Net Sales': 300 },
      ];

      const records = adapter.rowsToSalesRecords(rows, mapping);

      expect(records).toHaveLength(1);
      expect(records[0].netSales).toBe(300);
    });

    it('handles dollar signs and commas in numeric fields', () => {
      const adapter = new ExcelAdapter(makeConfig());
      const rows = [
        { 'Date': '2026-03-01', 'Net Sales': '$1,234.56', 'Covers': '120' },
      ];

      const records = adapter.rowsToSalesRecords(rows, mapping);

      expect(records[0].netSales).toBe(1234.56);
      expect(records[0].covers).toBe(120);
    });

    it('maps meal period correctly', () => {
      const adapter = new ExcelAdapter(makeConfig());
      const meals: Array<{ input: string; expected: string }> = [
        { input: 'breakfast', expected: 'breakfast' },
        { input: 'Dinner', expected: 'dinner' },
        { input: 'LUNCH', expected: 'lunch' },
        { input: 'late_night', expected: 'late_night' },
      ];

      for (const { input, expected } of meals) {
        const rows = [{ 'Date': '2026-03-01', 'Meal Period': input }];
        const records = adapter.rowsToSalesRecords(rows, mapping);
        expect(records[0].mealPeriod).toBe(expected);
      }
    });

    it('computes interval start/end based on meal period', () => {
      const adapter = new ExcelAdapter(makeConfig());

      const expectedIntervals: Record<string, { start: string; end: string }> = {
        breakfast: { start: '08:00', end: '08:15' },
        brunch: { start: '10:00', end: '10:15' },
        lunch: { start: '12:00', end: '12:15' },
        afternoon: { start: '15:00', end: '15:15' },
        dinner: { start: '18:00', end: '18:15' },
        late_night: { start: '21:00', end: '21:15' },
      };

      for (const [meal, { start, end }] of Object.entries(expectedIntervals)) {
        const rows = [{ 'Date': '2026-03-01', 'Meal Period': meal }];
        const records = adapter.rowsToSalesRecords(rows, mapping);
        expect(records[0].intervalStart).toBe(start);
        expect(records[0].intervalEnd).toBe(end);
      }
    });

    it('parses US-format dates (MM/DD/YYYY) into ISO format', () => {
      const adapter = new ExcelAdapter(makeConfig());
      const rows = [{ 'Date': '03/15/2026', 'Net Sales': 100 }];

      const records = adapter.rowsToSalesRecords(rows, mapping);

      expect(records[0].date).toBe('2026-03-15');
    });
  });

  // --------------------------------------------------------------------------
  // rowsToLaborData
  // --------------------------------------------------------------------------

  describe('rowsToLaborData', () => {
    const laborMapping: SpreadsheetColumnMapping = {
      employeeName: 'Employee',
      role: 'Role',
      laborHours: 'Hours',
      hourlyRate: 'Rate',
      laborCost: 'Cost',
    };

    it('creates entries with correct pay calculations', () => {
      const adapter = new ExcelAdapter(makeConfig());
      const rows = [
        { 'Employee': 'John Doe', 'Role': 'Server', 'Hours': 35, 'Rate': 15, 'Cost': 525 },
      ];

      const result = adapter.rowsToLaborData(rows, laborMapping, '2026-03-20');

      expect(result.businessDate).toBe('2026-03-20');
      expect(result.entries).toHaveLength(1);

      const entry = result.entries[0];
      expect(entry.employeeName).toBe('John Doe');
      expect(entry.employeeGuid).toBe('john_doe');
      expect(entry.jobTitle).toBe('Server');
      expect(entry.regularHours).toBe(35);
      expect(entry.overtimeHours).toBe(0);
      expect(entry.breakMinutes).toBe(30); // hours >= 6
      expect(result.totalRegularHours).toBe(35);
      expect(result.totalOvertimeHours).toBe(0);
    });

    it('handles overtime (hours > 40)', () => {
      const adapter = new ExcelAdapter(makeConfig());
      const rows = [
        { 'Employee': 'Jane Smith', 'Role': 'Cook', 'Hours': 45, 'Rate': 18 },
      ];

      // When laborCost mapping is absent, cost = hours * rate = 810
      // regularPay = cost * (regularHours / total) = 810 * (40/45) = 720
      // overtimePay = cost * (overtimeHours / total) = 810 * (5/45) = 90
      const noLaborCostMapping: SpreadsheetColumnMapping = {
        employeeName: 'Employee',
        role: 'Role',
        laborHours: 'Hours',
        hourlyRate: 'Rate',
      };

      const result = adapter.rowsToLaborData(rows, noLaborCostMapping, '2026-03-20');

      const entry = result.entries[0];
      expect(entry.regularHours).toBe(40);
      expect(entry.overtimeHours).toBe(5);
      expect(entry.regularPay).toBe(720); // 810 * (40/45)
      expect(entry.overtimePay).toBe(90); // 810 * (5/45)
      expect(result.totalOvertimeHours).toBe(5);
      expect(result.totalLaborCost).toBe(810); // 720 + 90
    });

    it('skips empty entries (no name and zero hours)', () => {
      const adapter = new ExcelAdapter(makeConfig());
      const rows = [
        { 'Employee': '', 'Role': '', 'Hours': 0, 'Rate': 0, 'Cost': 0 },
        { 'Employee': 'Alice', 'Role': 'Server', 'Hours': 8, 'Rate': 15, 'Cost': 120 },
      ];

      const result = adapter.rowsToLaborData(rows, laborMapping, '2026-03-20');

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].employeeName).toBe('Alice');
    });
  });

  // --------------------------------------------------------------------------
  // hasFileChanged
  // --------------------------------------------------------------------------

  describe('hasFileChanged', () => {
    it('returns changed=true when file was modified after timestamp', async () => {
      const now = new Date('2026-03-20T12:00:00Z');
      mockStat.mockResolvedValue({
        mtime: new Date('2026-03-20T14:00:00Z'),
        mtimeMs: new Date('2026-03-20T14:00:00Z').getTime(),
      } as any);

      const adapter = new ExcelAdapter(makeConfig());
      const result = await adapter.hasFileChanged('2026-03-20T12:00:00Z');

      expect(result.changed).toBe(true);
      expect(result.lastModified).toBe('2026-03-20T14:00:00.000Z');
    });

    it('returns changed=false when file was not modified after timestamp', async () => {
      mockStat.mockResolvedValue({
        mtime: new Date('2026-03-20T10:00:00Z'),
        mtimeMs: new Date('2026-03-20T10:00:00Z').getTime(),
      } as any);

      const adapter = new ExcelAdapter(makeConfig());
      const result = await adapter.hasFileChanged('2026-03-20T12:00:00Z');

      expect(result.changed).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // fetchSalesData / fetchLaborData (convenience)
  // --------------------------------------------------------------------------

  describe('fetchSalesData', () => {
    it('reads file and transforms to sales records in one call', async () => {
      mockReadFile.mockResolvedValue(CSV_CONTENT);
      const adapter = new ExcelAdapter(makeConfig());
      const mapping: SpreadsheetColumnMapping = {
        date: 'Date',
        mealPeriod: 'Meal Period',
        netSales: 'Net Sales',
        covers: 'Covers',
        checkCount: 'Check Count',
        avgCheck: 'Avg Check',
      };

      const records = await adapter.fetchSalesData(mapping);

      expect(records).toHaveLength(2);
      expect(records[0].date).toBe('2026-03-01');
      expect(records[0].mealPeriod).toBe('lunch');
      expect(records[0].netSales).toBe(5000);
      expect(records[1].date).toBe('2026-03-02');
      expect(records[1].mealPeriod).toBe('dinner');
    });
  });

  describe('fetchLaborData', () => {
    it('reads file and transforms to labor data in one call', async () => {
      mockReadFile.mockResolvedValue(LABOR_CSV);
      const adapter = new ExcelAdapter(makeConfig());
      const mapping: SpreadsheetColumnMapping = {
        employeeName: 'Employee',
        role: 'Role',
        laborHours: 'Hours',
        hourlyRate: 'Rate',
        laborCost: 'Cost',
      };

      const result = await adapter.fetchLaborData(mapping, '2026-03-20');

      expect(result.businessDate).toBe('2026-03-20');
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].employeeName).toBe('John Doe');
      expect(result.entries[1].employeeName).toBe('Jane Smith');
      expect(result.totalRegularHours).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // startWatching / stopWatching
  // --------------------------------------------------------------------------

  describe('startWatching / stopWatching', () => {
    it('calls fs.watch when watchForChanges=true', async () => {
      const mockAsyncIterable = {
        [Symbol.asyncIterator]: vi.fn().mockReturnValue({
          next: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        }),
      };
      mockWatch.mockReturnValue(mockAsyncIterable as any);

      const logger = makeLogger();
      const adapter = new ExcelAdapter(
        makeConfig({ watchForChanges: true }),
        logger,
      );

      await adapter.startWatching();

      expect(mockWatch).toHaveBeenCalledWith('/data/sales.csv');
      expect(logger.info).toHaveBeenCalledWith(
        'Starting file watcher',
        expect.objectContaining({ filePath: '/data/sales.csv' }),
      );
    });

    it('skips watching when watchForChanges=false', async () => {
      const adapter = new ExcelAdapter(makeConfig({ watchForChanges: false }));

      await adapter.startWatching();

      expect(mockWatch).not.toHaveBeenCalled();
    });

    it('skips watching when watchForChanges is undefined', async () => {
      const adapter = new ExcelAdapter(makeConfig());

      await adapter.startWatching();

      expect(mockWatch).not.toHaveBeenCalled();
    });

    it('stopWatching clears the watcher', async () => {
      const mockAsyncIterable = {
        [Symbol.asyncIterator]: vi.fn().mockReturnValue({
          next: vi.fn().mockResolvedValue({ done: true, value: undefined }),
        }),
      };
      mockWatch.mockReturnValue(mockAsyncIterable as any);

      const adapter = new ExcelAdapter(makeConfig({ watchForChanges: true }));
      await adapter.startWatching();
      adapter.stopWatching();

      // No error thrown, watcher is cleared
      expect(mockWatch).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Unsupported file type
  // --------------------------------------------------------------------------

  describe('unsupported file type', () => {
    it('throws for unsupported extensions', async () => {
      const adapter = new ExcelAdapter(makeConfig({ filePath: '/data/file.txt' }));

      await expect(adapter.readRows()).rejects.toThrow('Unsupported file type: .txt');
    });
  });
});
