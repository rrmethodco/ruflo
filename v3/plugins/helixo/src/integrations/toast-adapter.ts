/**
 * Helixo Toast POS Adapter
 *
 * Integration layer for Toast POS API. Fetches sales, labor, and menu data
 * and transforms it into Helixo domain types for forecasting and optimization.
 */

import {
  type HistoricalSalesRecord,
  type Logger,
  type MealPeriod,
  type MenuMixEntry,
  type ToastConfig,
  type ToastLaborData,
  type ToastOrder,
  type ToastSalesData,
  type DayOfWeek,
} from '../types.js';

// ============================================================================
// Helpers
// ============================================================================

const DAY_MAP: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function dateToDow(date: string): DayOfWeek {
  return DAY_MAP[new Date(date + 'T12:00:00Z').getUTCDay()];
}

function timeToMealPeriod(timeStr: string): MealPeriod {
  const [h] = timeStr.split(':').map(Number);
  if (h < 11) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 16) return 'afternoon';
  if (h < 21) return 'dinner';
  return 'late_night';
}

function roundToInterval(timeStr: string, intervalMinutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + m;
  const rounded = Math.floor(totalMin / intervalMinutes) * intervalMinutes;
  const rh = Math.floor(rounded / 60) % 24;
  const rm = rounded % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  const rh = Math.floor(total / 60) % 24;
  const rm = total % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
}

// ============================================================================
// Toast Adapter
// ============================================================================

export class ToastAdapter {
  private readonly config: ToastConfig;
  private readonly logger: Logger;
  private accessToken: string | undefined;
  private tokenExpiry: number;

  constructor(config: ToastConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger ?? { debug() {}, info() {}, warn() {}, error() {} };
    this.accessToken = config.accessToken;
    this.tokenExpiry = config.tokenExpiresAt ?? 0;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  async fetchSalesData(businessDate: string): Promise<ToastSalesData> {
    await this.ensureAuthenticated();
    const data = await this.apiGet<RawToastOrders>(`/orders/v2/orders`, {
      businessDate,
      pageSize: '500',
    });

    return this.transformSalesData(businessDate, data);
  }

  async fetchLaborData(businessDate: string): Promise<ToastLaborData> {
    await this.ensureAuthenticated();
    const data = await this.apiGet<RawToastLabor>(`/labor/v1/timeEntries`, {
      businessDate,
    });

    return this.transformLaborData(businessDate, data);
  }

  async fetchHistoricalSales(
    startDate: string,
    endDate: string,
    intervalMinutes = 15,
  ): Promise<HistoricalSalesRecord[]> {
    const records: HistoricalSalesRecord[] = [];

    // Iterate date range
    let current = startDate;
    while (current <= endDate) {
      try {
        const salesData = await this.fetchSalesData(current);
        const dayRecords = this.salesDataToHistoricalRecords(salesData, intervalMinutes);
        records.push(...dayRecords);
      } catch (err) {
        this.logger.warn('Failed to fetch sales for date', { date: current, error: String(err) });
      }
      // Next day
      const d = new Date(current + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      current = d.toISOString().slice(0, 10);
    }

    return records;
  }

  // --------------------------------------------------------------------------
  // Data Transformation
  // --------------------------------------------------------------------------

  private salesDataToHistoricalRecords(
    sales: ToastSalesData,
    intervalMinutes: number,
  ): HistoricalSalesRecord[] {
    // Group orders by interval
    const intervalMap = new Map<string, ToastOrder[]>();

    for (const order of sales.orders) {
      const openTime = this.extractTime(order.openedDate);
      const intervalStart = roundToInterval(openTime, intervalMinutes);
      if (!intervalMap.has(intervalStart)) intervalMap.set(intervalStart, []);
      intervalMap.get(intervalStart)!.push(order);
    }

    const records: HistoricalSalesRecord[] = [];
    const dow = dateToDow(sales.businessDate);

    for (const [intervalStart, orders] of intervalMap) {
      const intervalEnd = addMinutes(intervalStart, intervalMinutes);
      const mealPeriod = timeToMealPeriod(intervalStart);

      const netSales = orders.reduce((s, o) => s + o.checkAmount, 0);
      const grossSales = orders.reduce((s, o) => s + o.totalAmount, 0);
      const covers = orders.reduce((s, o) => s + o.guestCount, 0);
      const checkCount = orders.length;

      // Build menu mix
      const categoryTotals = new Map<string, { sales: number; qty: number }>();
      for (const order of orders) {
        for (const item of order.items) {
          if (item.voided) continue;
          const cat = item.category || 'uncategorized';
          const existing = categoryTotals.get(cat) ?? { sales: 0, qty: 0 };
          existing.sales += item.price * item.quantity;
          existing.qty += item.quantity;
          categoryTotals.set(cat, existing);
        }
      }

      const menuMix: MenuMixEntry[] = [];
      for (const [category, data] of categoryTotals) {
        menuMix.push({
          category,
          salesAmount: data.sales,
          quantity: data.qty,
          percentOfTotal: netSales > 0 ? data.sales / netSales : 0,
        });
      }

      records.push({
        date: sales.businessDate,
        dayOfWeek: dow,
        mealPeriod,
        intervalStart,
        intervalEnd,
        netSales: Math.round(netSales * 100) / 100,
        grossSales: Math.round(grossSales * 100) / 100,
        covers,
        checkCount,
        avgCheck: checkCount > 0 ? Math.round((netSales / checkCount) * 100) / 100 : 0,
        menuMix,
      });
    }

    return records;
  }

  private transformSalesData(businessDate: string, raw: RawToastOrders): ToastSalesData {
    const orders: ToastOrder[] = (raw.orders ?? []).map(o => ({
      guid: o.guid ?? '',
      openedDate: o.openedDate ?? '',
      closedDate: o.closedDate,
      server: o.server?.firstName ?? 'Unknown',
      checkAmount: o.checks?.reduce((s: number, c: RawCheck) => s + (c.amount ?? 0), 0) ?? 0,
      totalAmount: o.checks?.reduce((s: number, c: RawCheck) => s + (c.totalAmount ?? 0), 0) ?? 0,
      guestCount: o.numberOfGuests ?? 1,
      revenueCenter: o.revenueCenter?.guid ?? '',
      items: (o.checks ?? []).flatMap((c: RawCheck) =>
        (c.selections ?? []).map((sel: RawSelection) => ({
          name: sel.displayName ?? sel.name ?? '',
          category: sel.salesCategory?.name ?? 'uncategorized',
          quantity: sel.quantity ?? 1,
          price: sel.price ?? 0,
          voided: sel.voided ?? false,
          modifiers: sel.modifiers?.map((m: { name?: string }) => m.name ?? '') ?? [],
        })),
      ),
    }));

    return {
      businessDate,
      orders,
      totalNetSales: orders.reduce((s, o) => s + o.checkAmount, 0),
      totalGrossSales: orders.reduce((s, o) => s + o.totalAmount, 0),
      totalChecks: orders.length,
      totalCovers: orders.reduce((s, o) => s + o.guestCount, 0),
      voidAmount: 0,
      discountAmount: 0,
      tipAmount: 0,
    };
  }

  private transformLaborData(businessDate: string, raw: RawToastLabor): ToastLaborData {
    const entries = (raw.entries ?? []).map(e => ({
      employeeGuid: e.employeeReference?.guid ?? '',
      employeeName: `${e.employeeReference?.firstName ?? ''} ${e.employeeReference?.lastName ?? ''}`.trim(),
      jobTitle: e.jobReference?.title ?? '',
      clockInTime: e.inDate ?? '',
      clockOutTime: e.outDate,
      regularHours: e.regularHours ?? 0,
      overtimeHours: e.overtimeHours ?? 0,
      regularPay: (e.regularHours ?? 0) * (e.hourlyWage ?? 0),
      overtimePay: (e.overtimeHours ?? 0) * (e.hourlyWage ?? 0) * 1.5,
      breakMinutes: e.unpaidBreakTime ?? 0,
    }));

    return {
      businessDate,
      entries,
      totalRegularHours: entries.reduce((s, e) => s + e.regularHours, 0),
      totalOvertimeHours: entries.reduce((s, e) => s + e.overtimeHours, 0),
      totalLaborCost: entries.reduce((s, e) => s + e.regularPay + e.overtimePay, 0),
    };
  }

  // --------------------------------------------------------------------------
  // Auth & HTTP
  // --------------------------------------------------------------------------

  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60_000) return;

    this.logger.info('Refreshing Toast API token');
    const body = {
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      userAccessType: 'TOAST_MACHINE_CLIENT',
    };

    const resp = await fetch(`${this.config.apiBaseUrl}/authentication/v1/authentication/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error(`Toast auth failed: ${resp.status} ${resp.statusText}`);
    const data = (await resp.json()) as { token: { accessToken: string; expiresIn: number } };
    this.accessToken = data.token.accessToken;
    this.tokenExpiry = Date.now() + data.token.expiresIn * 1000;
  }

  private async apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.config.apiBaseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    url.searchParams.set('restaurantExternalId', this.config.restaurantGuid);

    const resp = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Toast-Restaurant-External-ID': this.config.restaurantGuid,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) throw new Error(`Toast API error: ${resp.status} ${resp.statusText}`);
    return resp.json() as Promise<T>;
  }

  private extractTime(isoDate: string): string {
    const d = new Date(isoDate);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}

// ============================================================================
// Raw Toast API response types (internal)
// ============================================================================

interface RawToastOrders {
  orders?: Array<{
    guid?: string;
    openedDate?: string;
    closedDate?: string;
    numberOfGuests?: number;
    server?: { firstName?: string };
    revenueCenter?: { guid?: string };
    checks?: RawCheck[];
  }>;
}

interface RawCheck {
  amount?: number;
  totalAmount?: number;
  selections?: RawSelection[];
}

interface RawSelection {
  name?: string;
  displayName?: string;
  salesCategory?: { name?: string };
  quantity?: number;
  price?: number;
  voided?: boolean;
  modifiers?: Array<{ name?: string }>;
}

interface RawToastLabor {
  entries?: Array<{
    employeeReference?: { guid?: string; firstName?: string; lastName?: string };
    jobReference?: { title?: string };
    inDate?: string;
    outDate?: string;
    regularHours?: number;
    overtimeHours?: number;
    hourlyWage?: number;
    unpaidBreakTime?: number;
  }>;
}
