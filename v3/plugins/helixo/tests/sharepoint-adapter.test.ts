import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SharePointAdapter } from '../src/integrations/sharepoint-adapter';
import type { SharePointConfig, SpreadsheetColumnMapping } from '../src/types';

// ============================================================================
// Fixtures
// ============================================================================

const SP_CONFIG: SharePointConfig = {
  tenantId: 'test-tenant',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  siteId: 'test-site',
  excelFileItemId: 'test-item-id',
  worksheetName: 'Sheet1',
};

const AUTH_RESPONSE = {
  access_token: 'mock-token-123',
  expires_in: 3600,
};

const RANGE_RESPONSE = {
  values: [
    ['Date', 'NetSales', 'Covers', 'MealPeriod'],
    ['2026-03-01', 5000, 120, 'lunch'],
    ['2026-03-02', 6000, 150, 'dinner'],
  ],
};

const RANGE_RESPONSE_US_DATE = {
  values: [
    ['Date', 'NetSales', 'Covers'],
    ['03/15/2026', 4500, 100],
  ],
};

const LIST_RESPONSE = {
  value: [
    { id: '1', fields: { Date: '2026-03-01', NetSales: 5000, Covers: 120 } },
    { id: '2', fields: { Date: '2026-03-02', NetSales: 6000, Covers: 150 } },
  ],
};

const SALES_MAPPING: SpreadsheetColumnMapping = {
  date: 'Date',
  netSales: 'NetSales',
  covers: 'Covers',
  mealPeriod: 'MealPeriod',
};

const LABOR_MAPPING: SpreadsheetColumnMapping = {
  employeeName: 'Name',
  laborHours: 'Hours',
  hourlyRate: 'Rate',
  role: 'Role',
};

// ============================================================================
// Helper
// ============================================================================

function createMockFetch() {
  return vi.fn(async (url: string, _init?: RequestInit) => {
    // Auth endpoint
    if (url.includes('login.microsoftonline.com')) {
      return { ok: true, json: async () => AUTH_RESPONSE };
    }
    // Excel range / usedRange endpoint
    if (url.includes('/workbook/worksheets/')) {
      return { ok: true, json: async () => RANGE_RESPONSE };
    }
    // List items endpoint
    if (url.includes('/lists/') && url.includes('/items')) {
      return { ok: true, json: async () => LIST_RESPONSE };
    }
    // Drive item metadata
    if (url.includes('/drive/items/') && url.includes('$select=lastModifiedDateTime')) {
      return {
        ok: true,
        json: async () => ({ lastModifiedDateTime: '2026-03-25T10:00:00Z' }),
      };
    }
    return { ok: false, status: 404, statusText: 'Not Found' };
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('SharePointAdapter', () => {
  let adapter: SharePointAdapter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetch = createMockFetch();
    vi.stubGlobal('fetch', mockFetch);
    adapter = new SharePointAdapter(SP_CONFIG);
  });

  // --------------------------------------------------------------------------
  // ensureAuthenticated
  // --------------------------------------------------------------------------

  describe('ensureAuthenticated', () => {
    it('acquires token on first call', async () => {
      await adapter.ensureAuthenticated();

      const authCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) => c[0].includes('login.microsoftonline.com'),
      );
      expect(authCalls).toHaveLength(1);
      expect(authCalls[0][0]).toContain('test-tenant');
    });

    it('skips auth when token is still valid', async () => {
      // First call acquires token
      await adapter.ensureAuthenticated();
      // Second call should reuse it
      await adapter.ensureAuthenticated();

      const authCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) => c[0].includes('login.microsoftonline.com'),
      );
      expect(authCalls).toHaveLength(1);
    });

    it('refreshes token when within 60s of expiry', async () => {
      // First call: token expires in 1 second (will be within 60s buffer)
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('login.microsoftonline.com')) {
          return { ok: true, json: async () => ({ access_token: 'short-lived', expires_in: 1 }) };
        }
        return { ok: true, json: async () => RANGE_RESPONSE };
      });

      await adapter.ensureAuthenticated();
      // Token is set but expires_in=1 means tokenExpiry is ~1s from now, within 60s buffer
      await adapter.ensureAuthenticated();

      const authCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) => c[0].includes('login.microsoftonline.com'),
      );
      expect(authCalls).toHaveLength(2);
    });

    it('throws on auth failure', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('login.microsoftonline.com')) {
          return { ok: false, status: 401, statusText: 'Unauthorized' };
        }
        return { ok: false, status: 404, statusText: 'Not Found' };
      });

      await expect(adapter.ensureAuthenticated()).rejects.toThrow('Azure AD auth failed');
    });
  });

  // --------------------------------------------------------------------------
  // fetchExcelRows
  // --------------------------------------------------------------------------

  describe('fetchExcelRows', () => {
    it('parses range response into keyed rows using first row as headers', async () => {
      const rows = await adapter.fetchExcelRows();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        Date: '2026-03-01',
        NetSales: 5000,
        Covers: 120,
        MealPeriod: 'lunch',
      });
      expect(rows[1]).toEqual({
        Date: '2026-03-02',
        NetSales: 6000,
        Covers: 150,
        MealPeriod: 'dinner',
      });
    });

    it('skips empty rows', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('login.microsoftonline.com')) {
          return { ok: true, json: async () => AUTH_RESPONSE };
        }
        if (url.includes('/workbook/worksheets/')) {
          return {
            ok: true,
            json: async () => ({
              values: [
                ['Date', 'Sales'],
                ['2026-03-01', 100],
                [null, null],  // empty row
                ['', ''],      // empty row
                ['2026-03-03', 300],
              ],
            }),
          };
        }
        return { ok: false, status: 404, statusText: 'Not Found' };
      });

      const rows = await adapter.fetchExcelRows();
      expect(rows).toHaveLength(2);
      expect(rows[0].Date).toBe('2026-03-01');
      expect(rows[1].Date).toBe('2026-03-03');
    });

    it('uses usedRange when no cellRange specified', async () => {
      await adapter.fetchExcelRows();

      const graphCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) => c[0].includes('graph.microsoft.com'),
      );
      expect(graphCalls).toHaveLength(1);
      expect(graphCalls[0][0]).toContain('/usedRange');
    });

    it('uses specific range when cellRange is configured', async () => {
      const configWithRange: SharePointConfig = {
        ...SP_CONFIG,
        cellRange: 'A1:D100',
      };
      adapter = new SharePointAdapter(configWithRange);

      await adapter.fetchExcelRows();

      const graphCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) => c[0].includes('graph.microsoft.com'),
      );
      expect(graphCalls).toHaveLength(1);
      expect(graphCalls[0][0]).toContain("range(address='A1%3AD100')");
    });

    it('throws when excelFileItemId is missing', async () => {
      const noItemConfig: SharePointConfig = {
        ...SP_CONFIG,
        excelFileItemId: undefined,
      };
      adapter = new SharePointAdapter(noItemConfig);

      await expect(adapter.fetchExcelRows()).rejects.toThrow('missing excelFileItemId');
    });
  });

  // --------------------------------------------------------------------------
  // fetchListItems
  // --------------------------------------------------------------------------

  describe('fetchListItems', () => {
    it('transforms list items with fields into SpreadsheetRow format', async () => {
      const configWithList: SharePointConfig = { ...SP_CONFIG, listId: 'test-list-id' };
      adapter = new SharePointAdapter(configWithList);

      const rows = await adapter.fetchListItems();

      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ Date: '2026-03-01', NetSales: 5000, Covers: 120 });
      expect(rows[1]).toEqual({ Date: '2026-03-02', NetSales: 6000, Covers: 150 });
    });

    it('throws when listId is missing', async () => {
      // SP_CONFIG has no listId
      await expect(adapter.fetchListItems()).rejects.toThrow('missing listId');
    });
  });

  // --------------------------------------------------------------------------
  // rowsToSalesRecords
  // --------------------------------------------------------------------------

  describe('rowsToSalesRecords', () => {
    it('maps columns using the provided SpreadsheetColumnMapping', () => {
      const rows = [
        { Date: '2026-03-01', NetSales: 5000, Covers: 120, MealPeriod: 'lunch' },
        { Date: '2026-03-02', NetSales: 6000, Covers: 150, MealPeriod: 'dinner' },
      ];

      const records = adapter.rowsToSalesRecords(rows, SALES_MAPPING);

      expect(records).toHaveLength(2);
      expect(records[0].date).toBe('2026-03-01');
      expect(records[0].netSales).toBe(5000);
      expect(records[0].covers).toBe(120);
      expect(records[0].mealPeriod).toBe('lunch');
      expect(records[1].date).toBe('2026-03-02');
      expect(records[1].netSales).toBe(6000);
      expect(records[1].mealPeriod).toBe('dinner');
    });

    it('skips rows without a valid date', () => {
      const rows = [
        { Date: '2026-03-01', NetSales: 5000 },
        { Date: null, NetSales: 3000 },
        { Date: 'not-a-date', NetSales: 2000 },
        { Date: '2026-03-03', NetSales: 4000 },
      ];

      const records = adapter.rowsToSalesRecords(rows, SALES_MAPPING);

      expect(records).toHaveLength(2);
      expect(records[0].date).toBe('2026-03-01');
      expect(records[1].date).toBe('2026-03-03');
    });

    it('parses US date format (MM/DD/YYYY) correctly', () => {
      const rows = [{ Date: '03/15/2026', NetSales: 4500, Covers: 100 }];

      const records = adapter.rowsToSalesRecords(rows, SALES_MAPPING);

      expect(records).toHaveLength(1);
      expect(records[0].date).toBe('2026-03-15');
    });

    it('parses ISO date format correctly', () => {
      const rows = [{ Date: '2026-03-20', NetSales: 7000, Covers: 200 }];

      const records = adapter.rowsToSalesRecords(rows, SALES_MAPPING);

      expect(records).toHaveLength(1);
      expect(records[0].date).toBe('2026-03-20');
      expect(records[0].dayOfWeek).toBe('friday');
    });

    it('calculates avgCheck when not provided', () => {
      const rows = [{ Date: '2026-03-01', NetSales: 5000, Covers: 100 }];
      const mapping: SpreadsheetColumnMapping = {
        date: 'Date',
        netSales: 'NetSales',
        covers: 'Covers',
      };

      const records = adapter.rowsToSalesRecords(rows, mapping);

      // avgCheck = netSales / checkCount, where checkCount defaults to covers
      expect(records[0].avgCheck).toBe(50);
    });

    it('maps meal period strings correctly', () => {
      const rows = [
        { Date: '2026-03-01', NetSales: 1000, MealPeriod: 'breakfast' },
        { Date: '2026-03-01', NetSales: 2000, MealPeriod: 'Dinner' },
        { Date: '2026-03-01', NetSales: 3000, MealPeriod: 'late_night' },
        { Date: '2026-03-01', NetSales: 4000, MealPeriod: 'brunch' },
      ];

      const records = adapter.rowsToSalesRecords(rows, SALES_MAPPING);

      expect(records[0].mealPeriod).toBe('breakfast');
      expect(records[1].mealPeriod).toBe('dinner');
      expect(records[2].mealPeriod).toBe('late_night');
      expect(records[3].mealPeriod).toBe('brunch');
    });

    it('returns empty array for empty input', () => {
      const records = adapter.rowsToSalesRecords([], SALES_MAPPING);
      expect(records).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // rowsToLaborData
  // --------------------------------------------------------------------------

  describe('rowsToLaborData', () => {
    it('creates labor entries with correct hour/pay calculations', () => {
      const rows = [
        { Name: 'Alice Johnson', Hours: 8, Rate: 20, Role: 'Server' },
      ];

      const result = adapter.rowsToLaborData(rows, LABOR_MAPPING, '2026-03-20');

      expect(result.businessDate).toBe('2026-03-20');
      expect(result.entries).toHaveLength(1);
      const entry = result.entries[0];
      expect(entry.employeeName).toBe('Alice Johnson');
      expect(entry.jobTitle).toBe('Server');
      expect(entry.regularHours).toBe(8);
      expect(entry.overtimeHours).toBe(0);
      expect(entry.regularPay).toBe(160); // 8 * 20
      expect(entry.overtimePay).toBe(0);
      expect(entry.employeeGuid).toBe('alice_johnson');
      expect(result.totalRegularHours).toBe(8);
      expect(result.totalOvertimeHours).toBe(0);
      expect(result.totalLaborCost).toBe(160);
    });

    it('handles overtime (hours > 40)', () => {
      const rows = [
        { Name: 'Bob Smith', Hours: 45, Rate: 15, Role: 'Cook' },
      ];

      const result = adapter.rowsToLaborData(rows, LABOR_MAPPING, '2026-03-20');

      const entry = result.entries[0];
      expect(entry.regularHours).toBe(40);
      expect(entry.overtimeHours).toBe(5);
      // cost defaults to hours * rate = 45 * 15 = 675 when laborCost mapping absent
      // regularPay = cost * (regularHours / total) = 675 * (40/45) = 600
      expect(entry.regularPay).toBe(600);
      // overtimePay = cost * (overtimeHours / total) = 675 * (5/45) = 75
      expect(entry.overtimePay).toBe(75);
      expect(result.totalRegularHours).toBe(40);
      expect(result.totalOvertimeHours).toBe(5);
      expect(result.totalLaborCost).toBe(675);
    });

    it('skips entries with no name and zero hours', () => {
      const rows = [
        { Name: 'Valid Worker', Hours: 8, Rate: 15, Role: 'Server' },
        { Name: '', Hours: 0, Rate: 0, Role: '' },
        { Name: null, Hours: 0, Rate: 0, Role: '' },
      ];

      const result = adapter.rowsToLaborData(rows, LABOR_MAPPING, '2026-03-20');

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].employeeName).toBe('Valid Worker');
    });

    it('calculates break time for shifts >= 6 hours', () => {
      const rows = [
        { Name: 'Short Shift', Hours: 4, Rate: 15, Role: 'Server' },
        { Name: 'Long Shift', Hours: 8, Rate: 15, Role: 'Server' },
      ];

      const result = adapter.rowsToLaborData(rows, LABOR_MAPPING, '2026-03-20');

      expect(result.entries[0].breakMinutes).toBe(0);  // < 6 hours
      expect(result.entries[1].breakMinutes).toBe(30);  // >= 6 hours
    });
  });

  // --------------------------------------------------------------------------
  // hasFileChanged
  // --------------------------------------------------------------------------

  describe('hasFileChanged', () => {
    it('returns changed=true when file modified after timestamp', async () => {
      // Mock returns lastModifiedDateTime: '2026-03-25T10:00:00Z'
      const result = await adapter.hasFileChanged('2026-03-25T09:00:00Z');

      expect(result.changed).toBe(true);
      expect(result.lastModified).toBe('2026-03-25T10:00:00Z');
    });

    it('returns changed=false when file not modified', async () => {
      const result = await adapter.hasFileChanged('2026-03-25T11:00:00Z');

      expect(result.changed).toBe(false);
      expect(result.lastModified).toBe('2026-03-25T10:00:00Z');
    });
  });

  // --------------------------------------------------------------------------
  // Convenience methods
  // --------------------------------------------------------------------------

  describe('fetchSalesData', () => {
    it('calls fetchExcelRows then transforms to sales records', async () => {
      const records = await adapter.fetchSalesData(SALES_MAPPING);

      expect(records).toHaveLength(2);
      expect(records[0].date).toBe('2026-03-01');
      expect(records[0].netSales).toBe(5000);
      expect(records[0].covers).toBe(120);
      expect(records[0].mealPeriod).toBe('lunch');
      expect(records[1].date).toBe('2026-03-02');
      expect(records[1].netSales).toBe(6000);
      expect(records[1].mealPeriod).toBe('dinner');

      // Verify Graph API was called (auth + data)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchLaborData', () => {
    it('calls fetchExcelRows then transforms to labor data', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('login.microsoftonline.com')) {
          return { ok: true, json: async () => AUTH_RESPONSE };
        }
        if (url.includes('/workbook/worksheets/')) {
          return {
            ok: true,
            json: async () => ({
              values: [
                ['Name', 'Hours', 'Rate', 'Role'],
                ['Alice', 8, 20, 'Server'],
                ['Bob', 6, 18, 'Cook'],
              ],
            }),
          };
        }
        return { ok: false, status: 404, statusText: 'Not Found' };
      });

      const result = await adapter.fetchLaborData(LABOR_MAPPING, '2026-03-20');

      expect(result.businessDate).toBe('2026-03-20');
      expect(result.entries).toHaveLength(2);
      expect(result.entries[0].employeeName).toBe('Alice');
      expect(result.entries[0].regularPay).toBe(160); // 8 * 20
      expect(result.entries[1].employeeName).toBe('Bob');
      expect(result.entries[1].regularPay).toBe(108); // 6 * 18
      expect(result.totalLaborCost).toBe(268);
    });
  });
});
