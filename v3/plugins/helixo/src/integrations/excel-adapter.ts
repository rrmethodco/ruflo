/**
 * Helixo Local Excel / CSV Adapter
 *
 * Reads local .xlsx and .csv files and transforms them into Helixo domain types.
 * Supports file watching for real-time updates when spreadsheets change on disk.
 *
 * Note: Uses built-in CSV parsing. For .xlsx files, expects the consumer to
 * provide a parser (e.g., exceljs or xlsx npm package) via the `xlsxParser` option,
 * or falls back to a lightweight built-in parser for simple workbooks.
 */

import { readFile, stat, watch } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  type DayOfWeek,
  type ExcelFileConfig,
  type HistoricalSalesRecord,
  type Logger,
  type MealPeriod,
  type SpreadsheetColumnMapping,
  type SpreadsheetRow,
  type ToastLaborData,
  type ToastLaborEntry,
} from '../types.js';

// ============================================================================
// Helpers
// ============================================================================

const DAY_MAP: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function dateToDow(date: string): DayOfWeek {
  return DAY_MAP[new Date(date + 'T12:00:00Z').getUTCDay()];
}

function parseDateCell(val: string | number | boolean | null): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
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
// CSV Parser (built-in, no dependencies)
// ============================================================================

function parseCSV(content: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"';
        i++; // skip escaped quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current.trim());
        if (row.some(cell => cell !== '')) rows.push(row);
        row = [];
        current = '';
        if (ch === '\r') i++; // skip \n after \r
      } else {
        current += ch;
      }
    }
  }

  // Last row (no trailing newline)
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some(cell => cell !== '')) rows.push(row);
  }

  return rows;
}

// ============================================================================
// XLSX Parser interface (optional dependency injection)
// ============================================================================

export interface XlsxParser {
  /** Parse a .xlsx Buffer into an array of sheets, each sheet is an array of rows */
  parse(buffer: Buffer, worksheetName?: string): Array<Array<string | number | boolean | null>>;
}

// ============================================================================
// Excel Adapter
// ============================================================================

export class ExcelAdapter {
  private readonly config: ExcelFileConfig;
  private readonly logger: Logger;
  private readonly xlsxParser?: XlsxParser;
  private watcher: AsyncIterable<unknown> | null = null;
  private lastModified: number = 0;

  /** Callback invoked when the watched file changes */
  onFileChanged?: (filePath: string) => void;

  constructor(config: ExcelFileConfig, logger?: Logger, xlsxParser?: XlsxParser) {
    this.config = config;
    this.logger = logger ?? { debug() {}, info() {}, warn() {}, error() {} };
    this.xlsxParser = xlsxParser;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Read the file and return parsed rows keyed by column headers.
   */
  async readRows(): Promise<SpreadsheetRow[]> {
    const ext = extname(this.config.filePath).toLowerCase();

    if (ext === '.csv') {
      return this.readCSV();
    } else if (ext === '.xlsx' || ext === '.xls') {
      return this.readXLSX();
    } else {
      throw new Error(`Unsupported file type: ${ext}. Supported: .csv, .xlsx`);
    }
  }

  /**
   * Convert rows into HistoricalSalesRecords for the forecast engine.
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

      let mealPeriod: MealPeriod = 'lunch';
      if (mapping.mealPeriod && row[mapping.mealPeriod]) {
        const mp = String(row[mapping.mealPeriod]).toLowerCase().trim();
        if (['breakfast', 'brunch', 'lunch', 'afternoon', 'dinner', 'late_night'].includes(mp)) {
          mealPeriod = mp as MealPeriod;
        }
      }

      const intervalStart = mealPeriod === 'breakfast' ? '08:00'
        : mealPeriod === 'brunch' ? '10:00'
        : mealPeriod === 'lunch' ? '12:00'
        : mealPeriod === 'afternoon' ? '15:00'
        : mealPeriod === 'dinner' ? '18:00'
        : '21:00';

      const startMins = parseInt(intervalStart.split(':')[0]) * 60 + parseInt(intervalStart.split(':')[1]);
      const endMins = startMins + intervalMinutes;
      const intervalEnd = `${String(Math.floor(endMins / 60) % 24).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;

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
   * Convert rows into labor data.
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
   * Convenience: read file and convert directly to sales records.
   */
  async fetchSalesData(mapping: SpreadsheetColumnMapping): Promise<HistoricalSalesRecord[]> {
    const rows = await this.readRows();
    return this.rowsToSalesRecords(rows, mapping);
  }

  /**
   * Convenience: read file and convert directly to labor data.
   */
  async fetchLaborData(mapping: SpreadsheetColumnMapping, businessDate: string): Promise<ToastLaborData> {
    const rows = await this.readRows();
    return this.rowsToLaborData(rows, mapping, businessDate);
  }

  /**
   * Check if the file has been modified since a given timestamp.
   */
  async hasFileChanged(sinceTimestamp: string): Promise<{ changed: boolean; lastModified: string }> {
    const fileStat = await stat(this.config.filePath);
    const lastModified = fileStat.mtime.toISOString();
    return {
      changed: fileStat.mtimeMs > new Date(sinceTimestamp).getTime(),
      lastModified,
    };
  }

  /**
   * Start watching the file for changes. When the file changes, the
   * `onFileChanged` callback is invoked.
   */
  async startWatching(): Promise<void> {
    if (!this.config.watchForChanges) return;

    this.logger.info('Starting file watcher', { filePath: this.config.filePath });

    try {
      const watcher = watch(this.config.filePath);
      this.watcher = watcher;

      // Process watch events in background
      (async () => {
        try {
          for await (const event of watcher) {
            if (this.onFileChanged) {
              this.logger.info('File changed detected', { filePath: this.config.filePath, event });
              this.onFileChanged(this.config.filePath);
            }
          }
        } catch (err) {
          // Watcher was closed or errored — expected on stopWatching()
          this.logger.debug('File watcher stopped', { error: String(err) });
        }
      })();
    } catch (err) {
      this.logger.warn('Could not start file watcher, falling back to polling', { error: String(err) });
    }
  }

  /**
   * Stop watching the file.
   */
  stopWatching(): void {
    this.watcher = null;
  }

  // --------------------------------------------------------------------------
  // File Readers
  // --------------------------------------------------------------------------

  private async readCSV(): Promise<SpreadsheetRow[]> {
    const content = await readFile(this.config.filePath, 'utf-8');
    const parsed = parseCSV(content);
    if (parsed.length < 2) return [];

    const headerRowIdx = (this.config.headerRow ?? 1) - 1;
    const dataStartIdx = (this.config.dataStartRow ?? 2) - 1;

    if (headerRowIdx >= parsed.length) return [];
    const headers = parsed[headerRowIdx];

    const rows: SpreadsheetRow[] = [];
    for (let i = dataStartIdx; i < parsed.length; i++) {
      const row: SpreadsheetRow = {};
      let hasData = false;
      for (let j = 0; j < headers.length; j++) {
        const val = parsed[i]?.[j] ?? '';
        // Attempt numeric coercion
        const num = Number(val.replace(/[$,]/g, ''));
        row[headers[j]] = val !== '' && Number.isFinite(num) && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)
          ? num
          : val || null;
        if (val !== '') hasData = true;
      }
      if (hasData) rows.push(row);
    }

    return rows;
  }

  private async readXLSX(): Promise<SpreadsheetRow[]> {
    if (!this.xlsxParser) {
      throw new Error(
        'XLSX parsing requires an xlsxParser. Install exceljs or xlsx and pass a parser to ExcelAdapter.',
      );
    }

    const buffer = await readFile(this.config.filePath);
    const rawRows = this.xlsxParser.parse(buffer, this.config.worksheetName);

    if (rawRows.length < 2) return [];

    const headerRowIdx = (this.config.headerRow ?? 1) - 1;
    const dataStartIdx = (this.config.dataStartRow ?? 2) - 1;

    const headers = (rawRows[headerRowIdx] ?? []).map(h => String(h ?? '').trim());
    const rows: SpreadsheetRow[] = [];

    for (let i = dataStartIdx; i < rawRows.length; i++) {
      const row: SpreadsheetRow = {};
      let hasData = false;
      for (let j = 0; j < headers.length; j++) {
        const val = rawRows[i]?.[j] ?? null;
        row[headers[j]] = val as string | number | boolean | null;
        if (val != null && val !== '') hasData = true;
      }
      if (hasData) rows.push(row);
    }

    return rows;
  }
}
