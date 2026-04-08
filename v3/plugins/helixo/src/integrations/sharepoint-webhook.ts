/**
 * Helixo SharePoint Webhook Listener
 *
 * Handles Microsoft Graph webhook subscriptions for real-time change
 * notifications from SharePoint. When a file or list changes, the listener
 * triggers a data refresh pipeline that re-fetches, transforms, and
 * pushes updated data to connected consumers (e.g., Supabase, in-memory cache).
 */

import {
  type Logger,
  type SharePointConfig,
  type SharePointChangeNotification,
  type SharePointSubscription,
  type SpreadsheetColumnMapping,
  type HistoricalSalesRecord,
} from '../types.js';
import { SharePointAdapter } from './sharepoint-adapter.js';

// ============================================================================
// Types
// ============================================================================

export type ChangeHandler = (records: HistoricalSalesRecord[]) => void | Promise<void>;

export interface WebhookListenerConfig {
  /** Public URL where Graph sends POST notifications */
  notificationUrl: string;
  /** Shared secret for validating webhook payloads */
  clientState?: string;
  /** Subscription lifetime in minutes (max 4230 for drive items = ~2.9 days) */
  expirationMinutes?: number;
  /** Polling interval in ms as fallback when webhooks are unavailable */
  pollIntervalMs?: number;
  /** Column mapping for data transformation */
  columnMapping: SpreadsheetColumnMapping;
}

// ============================================================================
// SharePoint Webhook Listener
// ============================================================================

export class SharePointWebhookListener {
  private readonly adapter: SharePointAdapter;
  private readonly spConfig: SharePointConfig;
  private readonly webhookConfig: WebhookListenerConfig;
  private readonly logger: Logger;

  private subscription: SharePointSubscription | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastChecked: string;
  private changeHandlers: ChangeHandler[] = [];
  private running = false;

  constructor(
    spConfig: SharePointConfig,
    webhookConfig: WebhookListenerConfig,
    logger?: Logger,
  ) {
    this.spConfig = spConfig;
    this.webhookConfig = webhookConfig;
    this.logger = logger ?? { debug() {}, info() {}, warn() {}, error() {} };
    this.adapter = new SharePointAdapter(spConfig, this.logger);
    this.lastChecked = new Date().toISOString();
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /** Register a handler that runs whenever SharePoint data changes */
  onDataChanged(handler: ChangeHandler): void {
    this.changeHandlers.push(handler);
  }

  /**
   * Start listening for changes. Attempts webhook subscription first,
   * falls back to polling if webhooks aren't available.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    this.logger.info('Starting SharePoint change listener');

    try {
      await this.createSubscription();
      this.logger.info('Webhook subscription created', { subscriptionId: this.subscription?.id });
    } catch (err) {
      this.logger.warn('Webhook subscription failed, falling back to polling', { error: String(err) });
      this.startPolling();
    }
  }

  /** Stop listening for changes */
  stop(): void {
    this.running = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.logger.info('SharePoint change listener stopped');
  }

  /**
   * Handle an incoming webhook notification from Microsoft Graph.
   * Call this from your HTTP endpoint handler.
   *
   * @returns `validationToken` string if this is a subscription validation request,
   *          or `undefined` if it was a change notification that was processed.
   */
  async handleWebhookNotification(
    body: WebhookPayload,
  ): Promise<string | undefined> {
    // Subscription validation — Graph sends a validation token that must be echoed back
    if (body.validationToken) {
      this.logger.info('Webhook validation request received');
      return body.validationToken;
    }

    // Change notifications
    const notifications = body.value ?? [];
    for (const notification of notifications) {
      // Validate client state
      if (this.webhookConfig.clientState && notification.clientState !== this.webhookConfig.clientState) {
        this.logger.warn('Webhook client state mismatch, ignoring notification');
        continue;
      }

      this.logger.info('SharePoint change notification received', {
        changeType: notification.changeType,
        resource: notification.resource,
      });

      await this.refreshAndNotify();
    }

    return undefined;
  }

  /** Manually trigger a data refresh (useful for testing or on-demand sync) */
  async refresh(): Promise<HistoricalSalesRecord[]> {
    return this.refreshAndNotify();
  }

  /** Get current subscription status */
  getStatus(): { running: boolean; mode: 'webhook' | 'polling' | 'stopped'; subscriptionId?: string; lastChecked: string } {
    if (!this.running) return { running: false, mode: 'stopped', lastChecked: this.lastChecked };
    return {
      running: true,
      mode: this.subscription ? 'webhook' : 'polling',
      subscriptionId: this.subscription?.id,
      lastChecked: this.lastChecked,
    };
  }

  // --------------------------------------------------------------------------
  // Webhook Subscription Management
  // --------------------------------------------------------------------------

  private async createSubscription(): Promise<void> {
    await this.adapter.ensureAuthenticated();

    const itemId = this.spConfig.excelFileItemId;
    if (!itemId) throw new Error('excelFileItemId required for webhook subscription');

    const expirationMinutes = this.webhookConfig.expirationMinutes ?? 4230;
    const expiration = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const body = {
      changeType: 'updated',
      notificationUrl: this.webhookConfig.notificationUrl,
      resource: `/sites/${this.spConfig.siteId}/drive/items/${itemId}`,
      expirationDateTime: expiration.toISOString(),
      clientState: this.webhookConfig.clientState ?? '',
    };

    const resp = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(this.adapter as unknown as { accessToken: string }).accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error(`Subscription creation failed: ${resp.status} ${resp.statusText}`);

    const data = (await resp.json()) as SharePointSubscription;
    this.subscription = data;

    // Schedule renewal before expiration (renew at 80% of lifetime)
    const renewMs = expirationMinutes * 60 * 1000 * 0.8;
    setTimeout(() => this.renewSubscription(), renewMs);
  }

  private async renewSubscription(): Promise<void> {
    if (!this.running || !this.subscription) return;

    try {
      const expirationMinutes = this.webhookConfig.expirationMinutes ?? 4230;
      const expiration = new Date(Date.now() + expirationMinutes * 60 * 1000);

      const resp = await fetch(
        `https://graph.microsoft.com/v1.0/subscriptions/${this.subscription.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${(this.adapter as unknown as { accessToken: string }).accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expirationDateTime: expiration.toISOString() }),
        },
      );

      if (!resp.ok) {
        this.logger.warn('Webhook renewal failed, falling back to polling');
        this.subscription = null;
        this.startPolling();
        return;
      }

      this.logger.info('Webhook subscription renewed', { subscriptionId: this.subscription.id });

      // Schedule next renewal
      const renewMs = expirationMinutes * 60 * 1000 * 0.8;
      setTimeout(() => this.renewSubscription(), renewMs);
    } catch (err) {
      this.logger.error('Webhook renewal error', { error: String(err) });
      this.subscription = null;
      this.startPolling();
    }
  }

  // --------------------------------------------------------------------------
  // Polling Fallback
  // --------------------------------------------------------------------------

  private startPolling(): void {
    if (this.pollTimer) return;

    const interval = this.webhookConfig.pollIntervalMs ?? this.spConfig.pollIntervalMs ?? 120_000;
    this.logger.info('Starting polling for changes', { intervalMs: interval });

    this.pollTimer = setInterval(async () => {
      try {
        const result = await this.adapter.hasFileChanged(this.lastChecked);
        if (result.changed) {
          this.logger.info('Polling detected file change', { lastModified: result.lastModified });
          await this.refreshAndNotify();
        }
      } catch (err) {
        this.logger.warn('Polling check failed', { error: String(err) });
      }
    }, interval);
  }

  // --------------------------------------------------------------------------
  // Data Refresh
  // --------------------------------------------------------------------------

  private async refreshAndNotify(): Promise<HistoricalSalesRecord[]> {
    this.lastChecked = new Date().toISOString();

    const rows = await this.adapter.fetchExcelRows();
    const records = this.adapter.rowsToSalesRecords(rows, this.webhookConfig.columnMapping);

    this.logger.info('Data refreshed from SharePoint', { recordCount: records.length });

    // Notify all handlers
    for (const handler of this.changeHandlers) {
      try {
        await handler(records);
      } catch (err) {
        this.logger.error('Change handler error', { error: String(err) });
      }
    }

    return records;
  }
}

// ============================================================================
// Webhook payload types
// ============================================================================

export interface WebhookPayload {
  validationToken?: string;
  value?: SharePointChangeNotification[];
}
