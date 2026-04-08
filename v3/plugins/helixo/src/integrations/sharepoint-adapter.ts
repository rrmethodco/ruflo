/**
 * Helixo SharePoint / Excel Online Adapter
 *
 * Integration with Microsoft Graph API to pull sales, labor, and budget data
 * from SharePoint lists or Excel workbooks stored in SharePoint/OneDrive.
 * Transforms spreadsheet data into Helixo domain types.
 */

import {
  type DayOfWeek,
  type HistoricalSalesRecord,
  type Logger,
  type MealPeriod,
  type SharePointConfig,
  type SpreadsheetColumnMapping,
  type SpreadsheetDataType,
  type SpreadsheetRow,
  type ToastLaborData,
  type ToastLaborEntry,
} from '../types.js';

// ============================================================================
// Helpers
// ============================================================================

const DEFAULT_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

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

function parseDateCell(val: string | number | boolean | null): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  // ISO date
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // US format MM/DD/YYYY
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  }
  return null;
}

function toNumber(val: string | number | boolean | null): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[$,\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// ============================================================================
// SharePoint Adapter
// ============================================================================

export class SharePointAdapter {
  private readonly config: SharePointConfig;
  private readonly logger: Logger;
  private readonly graphBase: string;
  private accessToken: string | undefined;
  private tokenExpiry = 0;

  constructor(config: SharePointConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger ?? { debug() {}, info() {}, warn() {}, error() {} };
    this.graphBase = config.graphBaseUrl ?? DEFAULT_GRAPH_BASE;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Fetch rows from a SharePoint-hosted Excel workbook.
   * Returns raw rows keyed by column headers.
   */
  async fetchExcelRows(worksheetName?: string, cellRange?: string): Promise<SpreadsheetRow[]> {
    await this.ensureAuthenticated();

    const sheet = worksheetName ?? this.config.worksheetName ?? 'Sheet1';
    const range = cellRange ?? this.config.cellRange;
    const itemId = this.config.excelFileItemId;
    if (!itemId) throw new Error('SharePoint config missing excelFileItemId');

    const path = range
      ? `/sites/${this.config.siteId}/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(sheet)}/range(address='${encodeURIComponent(range)}')`
      : `/sites/${this.config.siteId}/drive/items/${itemId}/workbook/worksheets/${encodeURIComponent(sheet)}/usedRange`;

    const data = await this.graphGet<GraphRangeResponse>(path);
    return this.parseRangeToRows(data);
  }

  /**
   * Fetch rows from a SharePoint list (structured data).
   */
  async fetchListItems(listId?: string): Promise<SpreadsheetRow[]> {
    await this.ensureAuthenticated();
    const id = listId ?? this.config.listId;
    if (!id) throw new Error('SharePoint config missing listId');

    const path = `/sites/${this.config.siteId}/lists/${id}/items?expand=fields&$top=500`;
    const data = await this.graphGet<GraphListResponse>(path);

    return (data.value ?? []).map(item => {
      const fields = item.fields ?? {};
      const row: SpreadsheetRow = {};
      for (const [k, v] of Object.entries(fields)) {
        row[k] = v as string | number | boolean | null;
      }
      return row;
    });
  }

  /**
   * Transform spreadsheet rows into HistoricalSalesRecords for the forecast engine.
   */
  rowsToSalesRecords(
    rows: SpreadsheetRow[],
    mapping: SpreadsheetColumnMapping,
    intervalMinutes = 15,
  ): HistoricalSalesRecord[] {
    const records: HistoricalSalesRecord[] = [];

    for (const row of rows) {
      const dateVal = mapping.date ? parseDateCell(row[mapping.date]) : null;
      if (!dateVal) continue;

      const netSales = mapping.netSales ? toNumber(row[mapping.netSales]) : 0;
      const grossSales = mapping.grossSales ? toNumber(row[mapping.grossSales]) : netSales;
      const covers = mapping.covers ? Math.round(toNumber(row[mapping.covers])) : 0;
      const checkCount = mapping.checkCount ? Math.round(toNumber(row[mapping.checkCount])) : covers;
      const avgCheck = mapping.avgCheck
        ? toNumber(row[mapping.avgCheck])
        : (checkCount > 0 ? netSales / checkCount : 0);

      // Determine meal period from column or infer from date
      let mealPeriod: MealPeriod = 'lunch';
      if (mapping.mealPeriod && row[mapping.mealPeriod]) {
        const mp = String(row[mapping.mealPeriod]).toLowerCase().trim();
        if (['breakfast', 'brunch', 'lunch', 'afternoon', 'dinner', 'late_night'].includes(mp)) {
          mealPeriod = mp as MealPeriod;
        }
      }

      // Default interval for spreadsheet data — one record per row
      const intervalStart = mealPeriod === 'breakfast' ? '08:00'
        : mealPeriod === 'brunch' ? '10:00'
        : mealPeriod === 'lunch' ? '12:00'
        : mealPeriod === 'afternoon' ? '15:00'
        : mealPeriod === 'dinner' ? '18:00'
        : '21:00';
      const endMin = parseInt(intervalStart) * 60 + parseInt(intervalStart.split(':')[1]) + intervalMinutes;
      const intervalEnd = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;

      records.push({
        date: dateVal,
        dayOfWeek: dateToDow(dateVal),
        mealPeriod,
        intervalStart,
        intervalEnd,
        netSales: Math.round(netSales * 100) / 100,
        grossSales: Math.round(grossSales * 100) / 100,
        covers,
        checkCount,
        avgCheck: Math.round(avgCheck * 100) / 100,
        menuMix: [],
      });
    }

    return records;
  }

  /**
   * Transform spreadsheet rows into labor data.
   */
  rowsToLaborData(
    rows: SpreadsheetRow[],
    mapping: SpreadsheetColumnMapping,
    businessDate: string,
  ): ToastLaborData {
    const entries: ToastLaborEntry[] = [];

    for (const row of rows) {
      const name = mapping.employeeName ? String(row[mapping.employeeName] ?? '') : '';
      const hours = mapping.laborHours ? toNumber(row[mapping.laborHours]) : 0;
      const rate = mapping.hourlyRate ? toNumber(row[mapping.hourlyRate]) : 0;
      const cost = mapping.laborCost ? toNumber(row[mapping.laborCost]) : hours * rate;
      const role = mapping.role ? String(row[mapping.role] ?? '') : '';

      if (!name && hours === 0) continue;

      const regularHours = Math.min(hours, 40);
      const overtimeHours = Math.max(0, hours - 40);

      entries.push({
        employeeGuid: name.toLowerCase().replace(/\s+/g, '_'),
        employeeName: name,
        jobTitle: role,
        clockInTime: '',
        clockOutTime: undefined,
        regularHours,
        overtimeHours,
        regularPay: cost > 0 ? cost * (regularHours / (regularHours + overtimeHours || 1)) : regularHours * rate,
        overtimePay: cost > 0 ? cost * (overtimeHours / (regularHours + overtimeHours || 1)) : overtimeHours * rate * 1.5,
        breakMinutes: hours >= 6 ? 30 : 0,
      });
    }

    return {
      businessDate,
      entries,
      totalRegularHours: entries.reduce((s, e) => s + e.regularHours, 0),
      totalOvertimeHours: entries.reduce((s, e) => s + e.overtimeHours, 0),
      totalLaborCost: entries.reduce((s, e) => s + e.regularPay + e.overtimePay, 0),
    };
  }

  /**
   * Convenience: fetch Excel data and convert directly to sales records.
   */
  async fetchSalesData(
    mapping: SpreadsheetColumnMapping,
    worksheetName?: string,
  ): Promise<HistoricalSalesRecord[]> {
    const rows = await this.fetchExcelRows(worksheetName);
    return this.rowsToSalesRecords(rows, mapping);
  }

  /**
   * Convenience: fetch Excel data and convert directly to labor data.
   */
  async fetchLaborData(
    mapping: SpreadsheetColumnMapping,
    businessDate: string,
    worksheetName?: string,
  ): Promise<ToastLaborData> {
    const rows = await this.fetchExcelRows(worksheetName);
    return this.rowsToLaborData(rows, mapping, businessDate);
  }

  /**
   * Check if the Excel file has been modified since a given timestamp.
   * Used for polling-based change detection.
   */
  async hasFileChanged(sinceTimestamp: string): Promise<{ changed: boolean; lastModified: string }> {
    await this.ensureAuthenticated();
    const itemId = this.config.excelFileItemId;
    if (!itemId) throw new Error('SharePoint config missing excelFileItemId');

    const meta = await this.graphGet<{ lastModifiedDateTime: string }>(
      `/sites/${this.config.siteId}/drive/items/${itemId}?$select=lastModifiedDateTime`,
    );

    const lastModified = meta.lastModifiedDateTime;
    return {
      changed: new Date(lastModified) > new Date(sinceTimestamp),
      lastModified,
    };
  }

  // --------------------------------------------------------------------------
  // Auth (Azure AD OAuth 2.0 Client Credentials)
  // --------------------------------------------------------------------------

  async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60_000) return;

    this.logger.info('Acquiring Microsoft Graph access token');

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    });

    const resp = await fetch(
      `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      },
    );

    if (!resp.ok) throw new Error(`Azure AD auth failed: ${resp.status} ${resp.statusText}`);
    const data = (await resp.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;
  }

  // --------------------------------------------------------------------------
  // Graph HTTP
  // --------------------------------------------------------------------------

  private async graphGet<T>(path: string): Promise<T> {
    const url = `${this.graphBase}${path}`;
    const resp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) throw new Error(`Graph API error: ${resp.status} ${resp.statusText}`);
    return resp.json() as Promise<T>;
  }

  // --------------------------------------------------------------------------
  // Range → Row Parsing
  // --------------------------------------------------------------------------

  private parseRangeToRows(range: GraphRangeResponse): SpreadsheetRow[] {
    const values = range.values ?? [];
    if (values.length < 2) return []; // Need at least header + 1 data row

    const headers = values[0].map(h => String(h ?? '').trim());
    const rows: SpreadsheetRow[] = [];

    for (let i = 1; i < values.length; i++) {
      const row: SpreadsheetRow = {};
      let hasData = false;
      for (let j = 0; j < headers.length; j++) {
        const val = values[i]?.[j] ?? null;
        row[headers[j]] = val as string | number | boolean | null;
        if (val != null && val !== '') hasData = true;
      }
      if (hasData) rows.push(row);
    }

    return rows;
  }
}

// ============================================================================
// Graph API response types (internal)
// ============================================================================

interface GraphRangeResponse {
  values?: Array<Array<string | number | boolean | null>>;
  address?: string;
  rowCount?: number;
  columnCount?: number;
}

interface GraphListResponse {
  value?: Array<{
    id: string;
    fields?: Record<string, unknown>;
  }>;
}
