import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResyAdapter } from '../src/integrations/resy-adapter';
import type { ResyConfig } from '../src/types';

// ============================================================================
// Fixtures
// ============================================================================

const RESY_CONFIG: ResyConfig = {
  apiKey: 'test-resy-api-key',
  apiSecret: 'test-resy-secret',
  venueId: 'venue-42',
  apiBaseUrl: 'https://api.resy.com',
  pollIntervalMs: 60_000,
};

/** A Wednesday date (2026-03-18 is a Wednesday) */
const WEEKDAY_DATE = '2026-03-18';

/** A Saturday date (2026-03-21 is a Saturday) */
const WEEKEND_DATE = '2026-03-21';

const RAW_RESY_RESPONSE = {
  results: {
    venues: [
      {
        slots: [
          {
            config: { id: 'slot-1', type: 'Standard' },
            date: { start: '2026-03-18T18:00:00.000Z', end: '2026-03-18T20:00:00.000Z' },
            size: { min: 4, max: 6 },
            payment: { cancellation_fee: 25 },
          },
          {
            config: { id: 'slot-2', type: 'VIP' },
            date: { start: '2026-03-18T19:30:00.000Z', end: '2026-03-18T21:30:00.000Z' },
            size: { min: 2, max: 4 },
            payment: { cancellation_fee: 50 },
          },
          {
            config: { id: 'slot-3', type: 'Standard' },
            date: { start: '2026-03-18T18:00:00.000Z', end: '2026-03-18T20:00:00.000Z' },
            size: { min: 6, max: 8 },
            payment: {},
          },
          {
            // Slot with no date.start — should be skipped
            config: { id: 'slot-4' },
            date: {},
            size: { min: 2 },
          },
        ],
      },
    ],
  },
};

// ============================================================================
// Helper
// ============================================================================

function createMockFetch() {
  return vi.fn(async (url: string, init?: RequestInit) => {
    // Auth endpoint
    if (url.includes('/3/auth/password')) {
      return {
        ok: true,
        json: async () => ({ token: 'resy-auth-token-abc' }),
      };
    }
    // Find endpoint
    if (url.includes('/4/find')) {
      return { ok: true, json: async () => RAW_RESY_RESPONSE };
    }
    return { ok: false, status: 404, statusText: 'Not Found' };
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('ResyAdapter', () => {
  let adapter: ResyAdapter;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = createMockFetch();
    vi.stubGlobal('fetch', mockFetch);
    adapter = new ResyAdapter(RESY_CONFIG);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // fetchReservations
  // --------------------------------------------------------------------------

  describe('fetchReservations', () => {
    it('transforms RESY API slots to reservations', async () => {
      const result = await adapter.fetchReservations(WEEKDAY_DATE);

      expect(result.date).toBe(WEEKDAY_DATE);
      // Slot-4 has no date.start, so it is skipped
      expect(result.reservations).toHaveLength(3);
      expect(result.totalReservations).toBe(3);

      // First reservation
      expect(result.reservations[0].id).toBe('slot-1');
      expect(result.reservations[0].dateTime).toBe('2026-03-18T18:00:00.000Z');
      expect(result.reservations[0].partySize).toBe(4);
      expect(result.reservations[0].status).toBe('confirmed');
      expect(result.reservations[0].isVIP).toBe(false);

      // VIP reservation
      expect(result.reservations[1].id).toBe('slot-2');
      expect(result.reservations[1].isVIP).toBe(true);
      expect(result.reservations[1].partySize).toBe(2);
    });

    it('calculates correct pacing by hour', async () => {
      const result = await adapter.fetchReservations(WEEKDAY_DATE);

      expect(result.pacingByHour.length).toBeGreaterThan(0);

      // All confirmed reservations: slot-1 (4 covers @18:00), slot-2 (2 covers @19:00), slot-3 (6 covers @18:00)
      // Hours should be grouped by extracted hour
      for (const entry of result.pacingByHour) {
        expect(entry.hour).toMatch(/^\d{2}:00$/);
        expect(entry.reservedCovers).toBeGreaterThan(0);
        expect(entry.estimatedWalkIns).toBe(Math.round(entry.reservedCovers * 0.25));
        expect(entry.totalExpectedCovers).toBe(entry.reservedCovers + entry.estimatedWalkIns);
        expect(entry.capacityPercent).toBe(entry.totalExpectedCovers / 100);
        expect(entry.daysOut).toBe(0);
      }
    });

    it('calculates totalCovers from all reservation party sizes', async () => {
      const result = await adapter.fetchReservations(WEEKDAY_DATE);

      // 4 + 2 + 6 = 12 total covers
      expect(result.totalCovers).toBe(12);
    });

    it('estimates walk-ins based on day of week', async () => {
      // Weekday: walk-in ratio = 0.35
      const weekdayResult = await adapter.fetchReservations(WEEKDAY_DATE);
      // 3 reservations * 0.35 = 1.05 => Math.round => 1
      expect(weekdayResult.walkInEstimate).toBe(Math.round(3 * 0.35));

      // Weekend (Saturday): walk-in ratio = 0.20
      const weekendResult = await adapter.fetchReservations(WEEKEND_DATE);
      expect(weekendResult.walkInEstimate).toBe(Math.round(3 * 0.20));
    });

    it('handles empty slots gracefully', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/3/auth/password')) {
          return { ok: true, json: async () => ({ token: 'tok' }) };
        }
        if (url.includes('/4/find')) {
          return { ok: true, json: async () => ({ results: { venues: [{ slots: [] }] } }) };
        }
        return { ok: false, status: 404, statusText: 'Not Found' };
      });

      const result = await adapter.fetchReservations(WEEKDAY_DATE);
      expect(result.reservations).toHaveLength(0);
      expect(result.totalCovers).toBe(0);
      expect(result.totalReservations).toBe(0);
      expect(result.pacingByHour).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // fetchMultiDayReservations
  // --------------------------------------------------------------------------

  describe('fetchMultiDayReservations', () => {
    it('iterates date range', async () => {
      const results = await adapter.fetchMultiDayReservations('2026-03-18', '2026-03-20');

      expect(results.size).toBe(3);
      expect(results.has('2026-03-18')).toBe(true);
      expect(results.has('2026-03-19')).toBe(true);
      expect(results.has('2026-03-20')).toBe(true);

      // Each entry should have reservation data
      for (const [date, data] of results) {
        expect(data.date).toBe(date);
        expect(data.reservations).toBeDefined();
        expect(data.pacingByHour).toBeDefined();
      }
    });

    it('skips failed dates gracefully', async () => {
      const warnLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
      adapter = new ResyAdapter(RESY_CONFIG, warnLogger);

      let findCallCount = 0;
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/3/auth/password')) {
          return { ok: true, json: async () => ({ token: 'tok' }) };
        }
        if (url.includes('/4/find')) {
          findCallCount++;
          if (findCallCount === 1) {
            return { ok: false, status: 500, statusText: 'Server Error' };
          }
          return { ok: true, json: async () => RAW_RESY_RESPONSE };
        }
        return { ok: false, status: 404, statusText: 'Not Found' };
      });

      const results = await adapter.fetchMultiDayReservations('2026-03-18', '2026-03-19');

      // First date failed, second succeeded
      expect(results.size).toBe(1);
      expect(results.has('2026-03-19')).toBe(true);
      expect(warnLogger.warn).toHaveBeenCalled();
      expect(warnLogger.warn.mock.calls[0][0]).toContain('Failed to fetch RESY data');
    });
  });

  // --------------------------------------------------------------------------
  // buildPacing
  // --------------------------------------------------------------------------

  describe('buildPacing', () => {
    it('filters out cancelled and no-show reservations', async () => {
      // Create response with cancelled/no_show slots
      const mixedResponse = {
        results: {
          venues: [
            {
              slots: [
                {
                  config: { id: 'active-1' },
                  date: { start: '2026-03-18T18:00:00.000Z' },
                  size: { min: 4 },
                  payment: { cancellation_fee: 25 },
                },
                {
                  config: { id: 'active-2' },
                  date: { start: '2026-03-18T19:00:00.000Z' },
                  size: { min: 2 },
                  payment: {},
                },
              ],
            },
          ],
        },
      };

      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/3/auth/password')) {
          return { ok: true, json: async () => ({ token: 'tok' }) };
        }
        if (url.includes('/4/find')) {
          return { ok: true, json: async () => mixedResponse };
        }
        return { ok: false, status: 404, statusText: 'Not Found' };
      });

      const result = await adapter.fetchReservations(WEEKDAY_DATE);

      // All slots from search API come as "confirmed" — none are cancelled/no_show
      // So all 2 reservations should appear in pacing
      const totalPacingCovers = result.pacingByHour.reduce((s, p) => s + p.reservedCovers, 0);
      expect(totalPacingCovers).toBe(6); // 4 + 2
    });
  });

  // --------------------------------------------------------------------------
  // Auth
  // --------------------------------------------------------------------------

  describe('auth', () => {
    it('falls back to API key on failure', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url.includes('/3/auth/password')) {
          return { ok: false, status: 401, statusText: 'Unauthorized' };
        }
        if (url.includes('/4/find')) {
          return { ok: true, json: async () => RAW_RESY_RESPONSE };
        }
        return { ok: false, status: 404, statusText: 'Not Found' };
      });

      // Should not throw — falls back to API key
      const result = await adapter.fetchReservations(WEEKDAY_DATE);
      expect(result.reservations.length).toBeGreaterThan(0);

      // Verify the find call used the API key header
      const findCall = mockFetch.mock.calls.find(
        (c: [string, ...unknown[]]) => c[0].includes('/4/find'),
      );
      expect(findCall).toBeDefined();
      const headers = findCall![1]?.headers as Record<string, string>;
      expect(headers['Authorization']).toContain(RESY_CONFIG.apiKey);
    });

    it('uses auth token on successful login', async () => {
      const result = await adapter.fetchReservations(WEEKDAY_DATE);
      expect(result).toBeDefined();

      // Verify the find call used the auth token
      const findCall = mockFetch.mock.calls.find(
        (c: [string, ...unknown[]]) => c[0].includes('/4/find'),
      );
      const headers = findCall![1]?.headers as Record<string, string>;
      expect(headers['X-Resy-Auth-Token']).toBe('resy-auth-token-abc');
    });

    it('does not re-authenticate if already authenticated', async () => {
      await adapter.fetchReservations(WEEKDAY_DATE);
      await adapter.fetchReservations(WEEKDAY_DATE);

      const authCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) => c[0].includes('/3/auth/password'),
      );
      // Only one auth call despite two fetches
      expect(authCalls.length).toBe(1);
    });
  });
});
