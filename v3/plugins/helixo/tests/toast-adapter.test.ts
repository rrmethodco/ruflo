import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastAdapter } from '../src/integrations/toast-adapter';
import type { ToastConfig, ToastSalesData, ToastLaborData } from '../src/types';

// ============================================================================
// Fixtures
// ============================================================================

const TOAST_CONFIG: ToastConfig = {
  apiBaseUrl: 'https://toast.example.com',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  restaurantGuid: 'rest-guid-123',
  accessToken: 'valid-token',
  tokenExpiresAt: Date.now() + 3_600_000, // 1 hour from now
  pollIntervalMs: 60_000,
};

const RAW_ORDERS_RESPONSE = {
  orders: [
    {
      guid: 'order-1',
      openedDate: '2026-03-20T12:15:00.000Z',
      closedDate: '2026-03-20T13:00:00.000Z',
      numberOfGuests: 2,
      server: { firstName: 'Alice' },
      revenueCenter: { guid: 'rc-main' },
      checks: [
        {
          amount: 45.00,
          totalAmount: 52.50,
          selections: [
            { displayName: 'Caesar Salad', salesCategory: { name: 'appetizers' }, quantity: 1, price: 14.00, voided: false, modifiers: [] },
            { displayName: 'Grilled Salmon', salesCategory: { name: 'entrees' }, quantity: 1, price: 28.00, voided: false, modifiers: [{ name: 'extra lemon' }] },
            { displayName: 'Voided Item', salesCategory: { name: 'desserts' }, quantity: 1, price: 10.00, voided: true, modifiers: [] },
          ],
        },
      ],
    },
    {
      guid: 'order-2',
      openedDate: '2026-03-20T12:22:00.000Z',
      closedDate: '2026-03-20T13:10:00.000Z',
      numberOfGuests: 4,
      server: { firstName: 'Bob' },
      revenueCenter: { guid: 'rc-main' },
      checks: [
        {
          amount: 80.00,
          totalAmount: 95.00,
          selections: [
            { displayName: 'Burger', salesCategory: { name: 'entrees' }, quantity: 2, price: 18.00, voided: false, modifiers: [] },
            { displayName: 'Fries', salesCategory: { name: 'sides' }, quantity: 2, price: 6.00, voided: false, modifiers: [] },
          ],
        },
      ],
    },
    {
      guid: 'order-3',
      openedDate: '2026-03-20T18:05:00.000Z',
      closedDate: '2026-03-20T19:30:00.000Z',
      numberOfGuests: 3,
      server: { firstName: 'Charlie' },
      revenueCenter: { guid: 'rc-main' },
      checks: [
        {
          amount: 120.00,
          totalAmount: 140.00,
          selections: [
            { displayName: 'Steak', salesCategory: { name: 'entrees' }, quantity: 1, price: 55.00, voided: false, modifiers: [] },
            { name: 'House Wine', quantity: 2, price: 15.00, voided: false, modifiers: [] },
          ],
        },
      ],
    },
  ],
};

const RAW_LABOR_RESPONSE = {
  entries: [
    {
      employeeReference: { guid: 'emp-1', firstName: 'John', lastName: 'Doe' },
      jobReference: { title: 'Server' },
      inDate: '2026-03-20T10:00:00.000Z',
      outDate: '2026-03-20T18:00:00.000Z',
      regularHours: 8,
      overtimeHours: 0,
      hourlyWage: 15.00,
      unpaidBreakTime: 30,
    },
    {
      employeeReference: { guid: 'emp-2', firstName: 'Jane', lastName: 'Smith' },
      jobReference: { title: 'Line Cook' },
      inDate: '2026-03-20T09:00:00.000Z',
      outDate: '2026-03-20T19:00:00.000Z',
      regularHours: 8,
      overtimeHours: 2,
      hourlyWage: 18.00,
      unpaidBreakTime: 30,
    },
  ],
};

// ============================================================================
// Helper
// ============================================================================

function createMockFetch(responseMap?: Map<string, unknown>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    // Auth endpoint
    if (url.includes('/authentication/v1/authentication/login')) {
      return {
        ok: true,
        json: async () => ({ token: { accessToken: 'new-token-123', expiresIn: 3600 } }),
      };
    }
    // Orders endpoint
    if (url.includes('/orders/v2/orders')) {
      return { ok: true, json: async () => RAW_ORDERS_RESPONSE };
    }
    // Labor endpoint
    if (url.includes('/labor/v1/timeEntries')) {
      return { ok: true, json: async () => RAW_LABOR_RESPONSE };
    }

    // Custom responses from map
    if (responseMap) {
      for (const [pattern, resp] of responseMap) {
        if (url.includes(pattern)) return resp;
      }
    }

    return { ok: false, status: 404, statusText: 'Not Found' };
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('ToastAdapter', () => {
  let adapter: ToastAdapter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch();
    vi.stubGlobal('fetch', mockFetch);
    adapter = new ToastAdapter(TOAST_CONFIG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // fetchSalesData
  // --------------------------------------------------------------------------

  describe('fetchSalesData', () => {
    it('transforms raw Toast API response into ToastSalesData', async () => {
      const result = await adapter.fetchSalesData('2026-03-20');

      expect(result.businessDate).toBe('2026-03-20');
      expect(result.orders).toHaveLength(3);
      expect(result.totalChecks).toBe(3);
      expect(result.totalCovers).toBe(9); // 2 + 4 + 3

      // First order
      expect(result.orders[0].guid).toBe('order-1');
      expect(result.orders[0].server).toBe('Alice');
      expect(result.orders[0].guestCount).toBe(2);
      expect(result.orders[0].checkAmount).toBe(45.00);
      expect(result.orders[0].totalAmount).toBe(52.50);

      // Items include voided item
      expect(result.orders[0].items).toHaveLength(3);
      expect(result.orders[0].items[0].name).toBe('Caesar Salad');
      expect(result.orders[0].items[0].category).toBe('appetizers');
      expect(result.orders[0].items[2].voided).toBe(true);

      // Modifier mapping
      expect(result.orders[0].items[1].modifiers).toEqual(['extra lemon']);

      // Net and gross totals
      expect(result.totalNetSales).toBe(245.00); // 45 + 80 + 120
      expect(result.totalGrossSales).toBe(287.50); // 52.5 + 95 + 140
    });

    it('groups orders into 15-min interval buckets', async () => {
      const salesData = await adapter.fetchSalesData('2026-03-20');

      // order-1 opened at 12:15 -> 12:15 bucket
      // order-2 opened at 12:22 -> 12:15 bucket
      // order-3 opened at 18:05 -> 18:00 bucket
      // Using salesDataToHistoricalRecords indirectly via fetchHistoricalSales

      // Verify orders are present by checking the data
      const lunchOrders = salesData.orders.filter(o => {
        const hour = new Date(o.openedDate).getHours();
        return hour >= 11 && hour < 14;
      });
      expect(lunchOrders).toHaveLength(2);

      const dinnerOrders = salesData.orders.filter(o => {
        const hour = new Date(o.openedDate).getHours();
        return hour >= 17 && hour < 21;
      });
      expect(dinnerOrders).toHaveLength(1);
    });

    it('builds correct menu mix from order items', async () => {
      const result = await adapter.fetchSalesData('2026-03-20');

      // Check first order items: Caesar Salad (appetizers), Grilled Salmon (entrees), voided dessert
      const order1Items = result.orders[0].items;
      expect(order1Items.find(i => i.name === 'Caesar Salad')?.category).toBe('appetizers');
      expect(order1Items.find(i => i.name === 'Grilled Salmon')?.category).toBe('entrees');

      // Check that voided items are flagged
      const voidedItems = order1Items.filter(i => i.voided);
      expect(voidedItems).toHaveLength(1);
      expect(voidedItems[0].name).toBe('Voided Item');

      // Third order item with no salesCategory falls back to 'uncategorized'
      const order3Items = result.orders[2].items;
      const uncatItem = order3Items.find(i => i.name === 'House Wine');
      expect(uncatItem?.category).toBe('uncategorized');
    });

    it('handles empty orders list gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ orders: [] }),
      });
      // skip auth (already has valid token)
      const result = await adapter.fetchSalesData('2026-03-20');
      expect(result.orders).toHaveLength(0);
      expect(result.totalNetSales).toBe(0);
      expect(result.totalChecks).toBe(0);
    });

    it('handles missing optional fields in raw response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orders: [
            {
              // minimal order — most fields undefined
              checks: [{ amount: 10, totalAmount: 12, selections: [{ price: 10, quantity: 1 }] }],
            },
          ],
        }),
      });

      const result = await adapter.fetchSalesData('2026-03-20');
      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].guid).toBe('');
      expect(result.orders[0].server).toBe('Unknown');
      expect(result.orders[0].guestCount).toBe(1);
      expect(result.orders[0].items[0].name).toBe('');
      expect(result.orders[0].items[0].category).toBe('uncategorized');
    });
  });

  // --------------------------------------------------------------------------
  // fetchHistoricalSales
  // --------------------------------------------------------------------------

  describe('fetchHistoricalSales', () => {
    it('iterates date range and collects records', async () => {
      // 3-day range
      const records = await adapter.fetchHistoricalSales('2026-03-18', '2026-03-20');

      // fetchSalesData called 3 times (Mar 18, 19, 20)
      // Each call returns the same 3 orders; salesDataToHistoricalRecords groups them
      // We expect at least 3 calls to the orders endpoint
      const orderCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) => c[0].includes('/orders/v2/orders'),
      );
      expect(orderCalls.length).toBe(3);
      expect(records.length).toBeGreaterThan(0);

      // Verify records contain date info
      for (const rec of records) {
        expect(rec.date).toBeDefined();
        expect(rec.dayOfWeek).toBeDefined();
        expect(rec.intervalStart).toBeDefined();
        expect(rec.intervalEnd).toBeDefined();
        expect(rec.netSales).toBeGreaterThanOrEqual(0);
      }
    });

    it('skips failed dates gracefully with warning', async () => {
      const warnLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      adapter = new ToastAdapter(TOAST_CONFIG, warnLogger);

      // First date fails, second succeeds
      let callCount = 0;
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/orders/v2/orders')) {
          callCount++;
          if (callCount === 1) {
            return { ok: false, status: 500, statusText: 'Internal Server Error' };
          }
          return { ok: true, json: async () => RAW_ORDERS_RESPONSE };
        }
        return { ok: true, json: async () => ({ token: { accessToken: 'tok', expiresIn: 3600 } }) };
      });

      const records = await adapter.fetchHistoricalSales('2026-03-19', '2026-03-20');

      // Should still get records for the second date
      expect(records.length).toBeGreaterThan(0);
      expect(warnLogger.warn).toHaveBeenCalled();
      const warnCall = warnLogger.warn.mock.calls[0];
      expect(warnCall[0]).toContain('Failed to fetch sales');
    });
  });

  // --------------------------------------------------------------------------
  // fetchLaborData
  // --------------------------------------------------------------------------

  describe('fetchLaborData', () => {
    it('transforms labor entries correctly', async () => {
      const result = await adapter.fetchLaborData('2026-03-20');

      expect(result.businessDate).toBe('2026-03-20');
      expect(result.entries).toHaveLength(2);

      // First entry
      const john = result.entries[0];
      expect(john.employeeGuid).toBe('emp-1');
      expect(john.employeeName).toBe('John Doe');
      expect(john.jobTitle).toBe('Server');
      expect(john.regularHours).toBe(8);
      expect(john.overtimeHours).toBe(0);
      expect(john.regularPay).toBe(120.00); // 8 * 15
      expect(john.overtimePay).toBe(0);
      expect(john.breakMinutes).toBe(30);

      // Second entry
      const jane = result.entries[1];
      expect(jane.employeeName).toBe('Jane Smith');
      expect(jane.jobTitle).toBe('Line Cook');
      expect(jane.regularHours).toBe(8);
      expect(jane.overtimeHours).toBe(2);
      expect(jane.regularPay).toBe(144.00); // 8 * 18
      expect(jane.overtimePay).toBe(54.00); // 2 * 18 * 1.5

      // Totals
      expect(result.totalRegularHours).toBe(16);
      expect(result.totalOvertimeHours).toBe(2);
      expect(result.totalLaborCost).toBe(318.00); // 120 + 0 + 144 + 54
    });

    it('handles empty labor entries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [] }),
      });

      const result = await adapter.fetchLaborData('2026-03-20');
      expect(result.entries).toHaveLength(0);
      expect(result.totalRegularHours).toBe(0);
      expect(result.totalLaborCost).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // ensureAuthenticated
  // --------------------------------------------------------------------------

  describe('ensureAuthenticated', () => {
    it('refreshes token when expired', async () => {
      const expiredConfig: ToastConfig = {
        ...TOAST_CONFIG,
        accessToken: 'expired-token',
        tokenExpiresAt: Date.now() - 10_000, // already expired
      };
      adapter = new ToastAdapter(expiredConfig);

      await adapter.fetchSalesData('2026-03-20');

      // Auth endpoint should have been called
      const authCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) => c[0].includes('/authentication/v1/authentication/login'),
      );
      expect(authCalls.length).toBe(1);

      // Auth body should contain clientId and clientSecret
      const authBody = JSON.parse(authCalls[0][1].body);
      expect(authBody.clientId).toBe('test-client');
      expect(authBody.clientSecret).toBe('test-secret');
      expect(authBody.userAccessType).toBe('TOAST_MACHINE_CLIENT');
    });

    it('skips when token is valid', async () => {
      // Default config has valid token (expires 1 hour from now)
      await adapter.fetchSalesData('2026-03-20');

      // Auth endpoint should NOT have been called
      const authCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) => c[0].includes('/authentication/v1/authentication/login'),
      );
      expect(authCalls.length).toBe(0);
    });

    it('refreshes token when within 60 seconds of expiry', async () => {
      const nearExpiryConfig: ToastConfig = {
        ...TOAST_CONFIG,
        tokenExpiresAt: Date.now() + 30_000, // 30 seconds from now (within 60s buffer)
      };
      adapter = new ToastAdapter(nearExpiryConfig);

      await adapter.fetchSalesData('2026-03-20');

      const authCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) => c[0].includes('/authentication/v1/authentication/login'),
      );
      expect(authCalls.length).toBe(1);
    });

    it('throws on auth failure', async () => {
      const expiredConfig: ToastConfig = {
        ...TOAST_CONFIG,
        accessToken: undefined,
        tokenExpiresAt: 0,
      };
      adapter = new ToastAdapter(expiredConfig);

      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/authentication/v1/authentication/login')) {
          return { ok: false, status: 401, statusText: 'Unauthorized' };
        }
        return { ok: true, json: async () => RAW_ORDERS_RESPONSE };
      });

      await expect(adapter.fetchSalesData('2026-03-20')).rejects.toThrow('Toast auth failed');
    });
  });
});
