import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SharePointWebhookListener } from '../src/integrations/sharepoint-webhook';
import type {
  SharePointConfig,
  Logger,
  HistoricalSalesRecord,
} from '../src/types';
import type { WebhookListenerConfig, WebhookPayload } from '../src/integrations/sharepoint-webhook';

// ============================================================================
// Fixtures
// ============================================================================

const SP_CONFIG: SharePointConfig = {
  tenantId: 'test-tenant',
  clientId: 'test-client',
  clientSecret: 'test-secret',
  siteId: 'test-site',
  excelFileItemId: 'test-item-id',
};

const WEBHOOK_CONFIG: WebhookListenerConfig = {
  notificationUrl: 'https://example.com/webhook',
  clientState: 'test-secret-state',
  columnMapping: { date: 'Date', netSales: 'Sales', covers: 'Covers' },
};

const EXCEL_RANGE_RESPONSE = {
  values: [
    ['Date', 'Sales', 'Covers'],
    ['2026-03-01', 5000, 120],
    ['2026-03-02', 6200, 145],
  ],
};

const FILE_META_RESPONSE = {
  lastModifiedDateTime: '2026-03-25T10:00:00Z',
};

const SUBSCRIPTION_RESPONSE = {
  id: 'sub-1',
  resource: '/sites/test-site/drive/items/test-item-id',
  changeType: 'updated',
  notificationUrl: 'https://example.com/webhook',
  expirationDateTime: '2026-03-28T10:00:00Z',
};

// ============================================================================
// Helper
// ============================================================================

function createLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function createMockFetch(overrides?: {
  subscriptionFail?: boolean;
  fileChanged?: boolean;
}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    // Auth token endpoint
    if (url.includes('login.microsoftonline.com')) {
      return {
        ok: true,
        json: async () => ({ access_token: 'tok', expires_in: 3600 }),
      };
    }

    // Subscription creation
    if (url.includes('graph.microsoft.com/v1.0/subscriptions') && init?.method === 'POST') {
      if (overrides?.subscriptionFail) {
        return { ok: false, status: 403, statusText: 'Forbidden' };
      }
      return {
        ok: true,
        json: async () => SUBSCRIPTION_RESPONSE,
      };
    }

    // Excel usedRange
    if (url.includes('usedRange')) {
      return {
        ok: true,
        json: async () => EXCEL_RANGE_RESPONSE,
      };
    }

    // File metadata (for hasFileChanged)
    if (url.includes(`items/${SP_CONFIG.excelFileItemId}`) && url.includes('$select=lastModifiedDateTime')) {
      const ts = overrides?.fileChanged
        ? '2099-01-01T00:00:00Z'
        : '2020-01-01T00:00:00Z';
      return {
        ok: true,
        json: async () => ({ lastModifiedDateTime: ts }),
      };
    }

    return { ok: false, status: 404, statusText: 'Not Found' };
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('SharePointWebhookListener', () => {
  let listener: SharePointWebhookListener;
  let mockFetch: ReturnType<typeof vi.fn>;
  let logger: Logger;

  beforeEach(() => {
    mockFetch = createMockFetch();
    vi.stubGlobal('fetch', mockFetch);
    logger = createLogger();
    listener = new SharePointWebhookListener(SP_CONFIG, WEBHOOK_CONFIG, logger);
  });

  afterEach(() => {
    listener.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // handleWebhookNotification
  // --------------------------------------------------------------------------

  describe('handleWebhookNotification', () => {
    it('returns validationToken when Graph sends a validation request', async () => {
      const payload: WebhookPayload = {
        validationToken: 'graph-validation-abc123',
      };

      const result = await listener.handleWebhookNotification(payload);

      expect(result).toBe('graph-validation-abc123');
    });

    it('processes change notifications and triggers refresh', async () => {
      const handler = vi.fn();
      listener.onDataChanged(handler);

      const payload: WebhookPayload = {
        value: [
          {
            subscriptionId: 'sub-1',
            changeType: 'updated',
            resource: '/sites/test-site/drive/items/test-item-id',
            clientState: 'test-secret-state',
            resourceData: {},
            subscriptionExpirationDateTime: '2026-03-28T10:00:00Z',
            tenantId: 'test-tenant',
            timestamp: '2026-03-25T10:05:00Z',
          },
        ],
      };

      const result = await listener.handleWebhookNotification(payload);

      expect(result).toBeUndefined();
      expect(handler).toHaveBeenCalledTimes(1);
      // Handler receives an array of HistoricalSalesRecord
      const records = handler.mock.calls[0][0] as HistoricalSalesRecord[];
      expect(records.length).toBeGreaterThan(0);
      expect(records[0].date).toBe('2026-03-01');
    });

    it('ignores notifications with mismatched clientState', async () => {
      const handler = vi.fn();
      listener.onDataChanged(handler);

      const payload: WebhookPayload = {
        value: [
          {
            subscriptionId: 'sub-1',
            changeType: 'updated',
            resource: '/sites/test-site/drive/items/test-item-id',
            clientState: 'WRONG-STATE',
            resourceData: {},
            subscriptionExpirationDateTime: '2026-03-28T10:00:00Z',
            tenantId: 'test-tenant',
            timestamp: '2026-03-25T10:05:00Z',
          },
        ],
      };

      await listener.handleWebhookNotification(payload);

      expect(handler).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Webhook client state mismatch, ignoring notification');
    });

    it('calls registered change handlers with refreshed data', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      listener.onDataChanged(handler1);
      listener.onDataChanged(handler2);

      const payload: WebhookPayload = {
        value: [
          {
            subscriptionId: 'sub-1',
            changeType: 'updated',
            resource: '/sites/test-site/drive/items/test-item-id',
            clientState: 'test-secret-state',
            resourceData: {},
            subscriptionExpirationDateTime: '2026-03-28T10:00:00Z',
            tenantId: 'test-tenant',
            timestamp: '2026-03-25T10:05:00Z',
          },
        ],
      };

      await listener.handleWebhookNotification(payload);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      // Both receive the same records
      expect(handler1.mock.calls[0][0]).toEqual(handler2.mock.calls[0][0]);
    });
  });

  // --------------------------------------------------------------------------
  // onDataChanged
  // --------------------------------------------------------------------------

  describe('onDataChanged', () => {
    it('registered handlers receive HistoricalSalesRecord[] on change', async () => {
      const received: HistoricalSalesRecord[][] = [];
      listener.onDataChanged((records) => {
        received.push(records);
      });

      await listener.refresh();

      expect(received).toHaveLength(1);
      expect(Array.isArray(received[0])).toBe(true);
      expect(received[0][0]).toMatchObject({
        date: '2026-03-01',
        netSales: 5000,
        covers: 120,
      });
    });

    it('multiple handlers are all called', async () => {
      const calls: number[] = [];
      listener.onDataChanged(() => { calls.push(1); });
      listener.onDataChanged(() => { calls.push(2); });
      listener.onDataChanged(() => { calls.push(3); });

      await listener.refresh();

      expect(calls).toEqual([1, 2, 3]);
    });

    it('handler errors are caught and logged without breaking other handlers', async () => {
      const handler1 = vi.fn(() => { throw new Error('handler1 blew up'); });
      const handler2 = vi.fn();

      listener.onDataChanged(handler1);
      listener.onDataChanged(handler2);

      await listener.refresh();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith('Change handler error', expect.objectContaining({
        error: expect.stringContaining('handler1 blew up'),
      }));
    });
  });

  // --------------------------------------------------------------------------
  // refresh
  // --------------------------------------------------------------------------

  describe('refresh', () => {
    it('fetches rows from adapter and transforms to sales records', async () => {
      const records = await listener.refresh();

      expect(records).toHaveLength(2);
      expect(records[0]).toMatchObject({
        date: '2026-03-01',
        netSales: 5000,
        covers: 120,
        menuMix: [],
      });
      expect(records[1]).toMatchObject({
        date: '2026-03-02',
        netSales: 6200,
        covers: 145,
      });
    });

    it('returns transformed records directly', async () => {
      const records = await listener.refresh();

      // Every record should have the expected shape
      for (const rec of records) {
        expect(rec.date).toBeDefined();
        expect(rec.dayOfWeek).toBeDefined();
        expect(rec.mealPeriod).toBeDefined();
        expect(rec.intervalStart).toBeDefined();
        expect(rec.intervalEnd).toBeDefined();
        expect(typeof rec.netSales).toBe('number');
        expect(typeof rec.covers).toBe('number');
      }
    });
  });

  // --------------------------------------------------------------------------
  // getStatus
  // --------------------------------------------------------------------------

  describe('getStatus', () => {
    it('returns stopped when not running', () => {
      const status = listener.getStatus();

      expect(status.running).toBe(false);
      expect(status.mode).toBe('stopped');
      expect(status.subscriptionId).toBeUndefined();
    });

    it('returns polling mode when webhook subscription fails', async () => {
      vi.stubGlobal('fetch', createMockFetch({ subscriptionFail: true }));
      listener = new SharePointWebhookListener(SP_CONFIG, WEBHOOK_CONFIG, logger);

      await listener.start();
      const status = listener.getStatus();

      expect(status.running).toBe(true);
      expect(status.mode).toBe('polling');
      expect(status.subscriptionId).toBeUndefined();
    });

    it('returns webhook mode with subscriptionId when subscription succeeds', async () => {
      await listener.start();
      const status = listener.getStatus();

      expect(status.running).toBe(true);
      expect(status.mode).toBe('webhook');
      expect(status.subscriptionId).toBe('sub-1');
    });
  });

  // --------------------------------------------------------------------------
  // start and stop lifecycle
  // --------------------------------------------------------------------------

  describe('start and stop lifecycle', () => {
    it('start() attempts webhook subscription', async () => {
      await listener.start();

      const subCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) =>
          c[0].includes('graph.microsoft.com/v1.0/subscriptions') &&
          (c[1] as RequestInit)?.method === 'POST',
      );
      expect(subCalls.length).toBe(1);
      expect(listener.getStatus().mode).toBe('webhook');
    });

    it('falls back to polling on subscription failure', async () => {
      vi.stubGlobal('fetch', createMockFetch({ subscriptionFail: true }));
      listener = new SharePointWebhookListener(SP_CONFIG, WEBHOOK_CONFIG, logger);

      await listener.start();

      expect(logger.warn).toHaveBeenCalledWith(
        'Webhook subscription failed, falling back to polling',
        expect.any(Object),
      );
      expect(listener.getStatus().mode).toBe('polling');
    });

    it('stop() sets running to false', async () => {
      await listener.start();
      expect(listener.getStatus().running).toBe(true);

      listener.stop();
      expect(listener.getStatus().running).toBe(false);
      expect(listener.getStatus().mode).toBe('stopped');
    });

    it('start() is idempotent when already running', async () => {
      await listener.start();
      await listener.start(); // second call should be a no-op

      // Only one subscription creation call
      const subCalls = mockFetch.mock.calls.filter(
        (c: [string, ...unknown[]]) =>
          c[0].includes('graph.microsoft.com/v1.0/subscriptions') &&
          (c[1] as RequestInit)?.method === 'POST',
      );
      expect(subCalls.length).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Polling fallback
  // --------------------------------------------------------------------------

  describe('polling fallback', () => {
    it('calls hasFileChanged at configured interval and triggers refresh when file changed', async () => {
      vi.useFakeTimers();
      vi.stubGlobal('fetch', createMockFetch({ subscriptionFail: true, fileChanged: true }));

      const pollConfig: WebhookListenerConfig = {
        ...WEBHOOK_CONFIG,
        pollIntervalMs: 5000,
      };
      listener = new SharePointWebhookListener(SP_CONFIG, pollConfig, logger);

      const handler = vi.fn();
      listener.onDataChanged(handler);

      await listener.start();
      expect(listener.getStatus().mode).toBe('polling');

      // Advance past one poll interval
      await vi.advanceTimersByTimeAsync(5000);

      // The polling callback should have detected a change and refreshed
      expect(handler).toHaveBeenCalledTimes(1);
      const records = handler.mock.calls[0][0] as HistoricalSalesRecord[];
      expect(records.length).toBeGreaterThan(0);
    });

    it('skips refresh when file has not changed', async () => {
      vi.useFakeTimers();
      // fileChanged: false (default) — lastModified is in the past
      vi.stubGlobal('fetch', createMockFetch({ subscriptionFail: true, fileChanged: false }));

      const pollConfig: WebhookListenerConfig = {
        ...WEBHOOK_CONFIG,
        pollIntervalMs: 5000,
      };
      listener = new SharePointWebhookListener(SP_CONFIG, pollConfig, logger);

      const handler = vi.fn();
      listener.onDataChanged(handler);

      await listener.start();

      // Advance past several poll intervals
      await vi.advanceTimersByTimeAsync(15000);

      // Handler should NOT have been called since the file didn't change
      expect(handler).not.toHaveBeenCalled();
    });

    it('stop() clears poll timer', async () => {
      vi.useFakeTimers();
      vi.stubGlobal('fetch', createMockFetch({ subscriptionFail: true, fileChanged: true }));

      const pollConfig: WebhookListenerConfig = {
        ...WEBHOOK_CONFIG,
        pollIntervalMs: 5000,
      };
      listener = new SharePointWebhookListener(SP_CONFIG, pollConfig, logger);

      const handler = vi.fn();
      listener.onDataChanged(handler);

      await listener.start();
      listener.stop();

      // Advance past poll intervals — handler should NOT be called after stop
      await vi.advanceTimersByTimeAsync(15000);

      expect(handler).not.toHaveBeenCalled();
    });
  });
});
