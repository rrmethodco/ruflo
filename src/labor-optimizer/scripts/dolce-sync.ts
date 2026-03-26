/**
 * Dolce TeamWork Schedule Sync Script
 *
 * Scrapes the Schedules page from Dolce Clock for Lowland,
 * parses individual employee shifts and the Daily Analytics Summary,
 * maps Dolce roles to dashboard positions, and upserts daily
 * per-position scheduled labor into scheduled_labor.
 *
 * Env vars required:
 *   DOLCE_USERNAME, DOLCE_PASSWORD
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * Usage:
 *   npx ts-node scripts/dolce-sync.ts
 *   npx ts-node scripts/dolce-sync.ts --week 2026-03-23
 */

import { chromium, type Page } from 'playwright';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DOLCE_LOGIN_URL =
  'https://www.dolceclock.com/public/login.php?company_id=3243';
const DOLCE_SCHEDULES_URL =
  'https://www.dolceclock.com/public/?_company_id=3243';
const LOWLAND_LOCATION_ID = 'f36fdb18-a97b-48af-8456-7374dea4b0f9';

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }
  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getWeekBounds(referenceDate?: string): {
  monday: string;
  sunday: string;
  weekDates: string[];
} {
  const target = referenceDate
    ? new Date(referenceDate + 'T12:00:00')
    : new Date();
  const dow = target.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(target);
  monday.setDate(monday.getDate() + mondayOffset);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  return {
    monday: weekDates[0],
    sunday: weekDates[6],
    weekDates,
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DolceMapping {
  dolce_role_name: string;
  dashboard_position: string;
}

/** Per-day totals from the Daily Analytics Summary */
interface DailyAnalytics {
  date: string; // YYYY-MM-DD
  schedHours: number;
  schedHrlyDollars: number;
  schedSalaryDollars: number;
}

/** A single employee shift parsed from the schedule grid */
interface ParsedShift {
  employeeName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // e.g. "5:00pm"
  endTime: string; // e.g. "11:00pm"
  hours: number;
  dolceRole: string; // e.g. "Lowland server"
}

/** Aggregated hours per role per day */
interface RoleDayHours {
  date: string;
  dolceRole: string;
  totalHours: number;
}

// ---------------------------------------------------------------------------
// Time parsing
// ---------------------------------------------------------------------------

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (!match) return -1;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm === 'am' && hours === 12) hours = 0;
  if (ampm === 'pm' && hours !== 12) hours += 12;

  return hours * 60 + minutes;
}

function calcShiftHours(startStr: string, endStr: string): number {
  const startMin = parseTimeToMinutes(startStr);
  const endMin = parseTimeToMinutes(endStr);
  if (startMin < 0 || endMin < 0) return 0;

  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60; // overnight shift
  return Math.round((diff / 60) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Page text parsing: Daily Analytics Summary
// ---------------------------------------------------------------------------

/**
 * Parses the Daily Analytics Summary from the page text.
 *
 * Expected text patterns:
 *   Daily Analytics Summary
 *   Location - Lowland
 *   Mar 23, 2026
 *   ...
 *   Hours  170.5  153.5
 *   $ Hrly  $2,268  $2,286
 *   Salary  $350  $350
 *   ...
 *   Mar 24, 2026
 *   ...
 */
function parseDailyAnalytics(
  text: string,
  weekDates: string[],
): DailyAnalytics[] {
  const results: DailyAnalytics[] = [];

  // Extract the Daily Analytics Summary section
  const summaryStart = text.indexOf('Daily Analytics Summary');
  if (summaryStart < 0) {
    console.warn('[Parse] Daily Analytics Summary not found in page text');
    return results;
  }

  // The summary ends before the schedule sections (e.g. "Lowland FOH" or "Weekly Analytics")
  const summaryEndMarkers = ['Lowland FOH', 'Lowland BOH', 'Weekly Analytics'];
  let summaryEnd = text.length;
  for (const marker of summaryEndMarkers) {
    const idx = text.indexOf(marker, summaryStart);
    if (idx > summaryStart && idx < summaryEnd) {
      summaryEnd = idx;
    }
  }

  const summaryText = text.substring(summaryStart, summaryEnd);
  const lines = summaryText.split('\n').map((l) => l.trim());

  // Build a year reference from weekDates
  const yearRef = weekDates[0].substring(0, 4);

  // Months for parsing "Mar 23, 2026" or "Mar 23"
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04',
    may: '05', jun: '06', jul: '07', aug: '08',
    sep: '09', oct: '10', nov: '11', dec: '12',
  };

  // Date header regex: "Mar 23, 2026" or "Mar 23"
  const dateHeaderRegex =
    /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/i;

  let currentDate: string | null = null;
  let currentAnalytics: Partial<DailyAnalytics> = {};

  for (const line of lines) {
    // Check for date header
    const dateMatch = line.match(dateHeaderRegex);
    if (dateMatch) {
      // Save previous day if we have one
      if (currentDate && currentAnalytics.schedHours !== undefined) {
        results.push({
          date: currentDate,
          schedHours: currentAnalytics.schedHours ?? 0,
          schedHrlyDollars: currentAnalytics.schedHrlyDollars ?? 0,
          schedSalaryDollars: currentAnalytics.schedSalaryDollars ?? 0,
        });
      }

      const month = monthMap[dateMatch[1].toLowerCase()];
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || yearRef;
      currentDate = `${year}-${month}-${day}`;
      currentAnalytics = {};
      continue;
    }

    if (!currentDate) continue;

    // Parse "Hours  170.5  153.5" -> first number is scheduled
    const hoursMatch = line.match(
      /^hours?\s+([\d,.]+)\s+([\d,.]+)/i,
    );
    if (hoursMatch) {
      currentAnalytics.schedHours = parseFloat(
        hoursMatch[1].replace(/,/g, ''),
      );
      continue;
    }

    // Parse "$ Hrly  $2,268  $2,286" -> first dollar amount is scheduled
    const hrlyMatch = line.match(
      /^\$?\s*hrly\s+\$?([\d,.]+)\s+\$?([\d,.]+)/i,
    );
    if (hrlyMatch) {
      currentAnalytics.schedHrlyDollars = parseFloat(
        hrlyMatch[1].replace(/,/g, ''),
      );
      continue;
    }

    // Parse "Salary  $350  $350"
    const salaryMatch = line.match(
      /^salary\s+\$?([\d,.]+)\s+\$?([\d,.]+)/i,
    );
    if (salaryMatch) {
      currentAnalytics.schedSalaryDollars = parseFloat(
        salaryMatch[1].replace(/,/g, ''),
      );
      continue;
    }
  }

  // Don't forget the last day
  if (currentDate && currentAnalytics.schedHours !== undefined) {
    results.push({
      date: currentDate,
      schedHours: currentAnalytics.schedHours ?? 0,
      schedHrlyDollars: currentAnalytics.schedHrlyDollars ?? 0,
      schedSalaryDollars: currentAnalytics.schedSalaryDollars ?? 0,
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Page text parsing: Individual Shifts
// ---------------------------------------------------------------------------

/**
 * Parses individual shifts from the schedule grid text.
 *
 * Structure:
 *   Lowland FOH
 *   Published on Mar 20th by S Stresing
 *
 *   Bar-Nadav, Jay
 *   Hrs: Shifts:
 *   Tue  4:55pm - 9:49pm Lowland support
 *   Wed  5:00pm - 11:00pm Lowland support
 *   ...
 *
 *   Bizzozero, Jacob
 *   ...
 *
 *   Lowland BOH
 *   ...
 */
function parseShifts(
  text: string,
  weekDates: string[],
): ParsedShift[] {
  const shifts: ParsedShift[] = [];

  // Build a day-of-week to date map for this week
  const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayToDate = new Map<string, string>();
  for (let i = 0; i < 7; i++) {
    dayToDate.set(dayNames[i], weekDates[i]);
  }

  // Find schedule sections (Lowland FOH, Lowland BOH, etc.)
  const sectionRegex = /^(Lowland\s+(?:FOH|BOH|MGT)|Contract\s+Labor)/im;

  // Find the start of schedule data (after Daily Analytics)
  const scheduleMarkers = ['Lowland FOH', 'Lowland BOH'];
  let schedStart = text.length;
  for (const marker of scheduleMarkers) {
    const idx = text.indexOf(marker);
    if (idx >= 0 && idx < schedStart) {
      schedStart = idx;
    }
  }

  if (schedStart >= text.length) {
    console.warn('[Parse] No schedule sections found in page text');
    return shifts;
  }

  const schedText = text.substring(schedStart);
  const lines = schedText.split('\n').map((l) => l.trim());

  // Dolce format can be EITHER:
  // Format A: "Tue  4:55pm - 9:49pm Lowland support" (one line)
  // Format B: "2:00pm - 10:45pm" (time line) then "Cook" (role on next line)
  // We also need to track which day of the week we're in based on "Hrs: NN.NN Shifts: N" headers
  const shiftLineRegexA =
    /^(mon|tue|wed|thu|fri|sat|sun)\s+(\d{1,2}:\d{2}(?:am|pm))\s*-\s*(\d{1,2}:\d{2}(?:am|pm))\s+(.+)$/i;
  const timeOnlyRegex =
    /^(\d{1,2}:\d{2}(?:am|pm))\s*-\s*(\d{1,2}:\d{2}(?:am|pm))$/i;
  // Known role names (from Dolce)
  const knownRoles = new Set([
    'cook', 'dishwasher', 'prep', 'lowland server', 'lowland bartender',
    'lowland host', 'lowland support', 'lowland sidework', 'lead bar admin',
    'maitre\'d', 'polisher', 'foh training', 'boh training', 'key holder',
    'lowland server assistant server support', 'general manager',
    'ghost bartender', 'contract dish',
  ]);

  const nameExclusions =
    /^(lowland\s+(foh|boh|mgt)|contract\s+labor|published|hrs:|shifts:|daily|weekly|location|sched|act|hours|\$|salary|overtime|total|regular|filter|all|ready)/i;
  const namePattern = /^[A-Z][a-z'-]+,\s+[A-Z]/;

  let currentEmployee = 'Unknown';
  let currentDay = 0; // index into weekDates, tracked by "Hrs:" blocks
  let pendingTime: { start: string; end: string } | null = null;

  // Track which day we're on by counting employee "Hrs:" headers per section
  // The schedule shows Mon employees first, then Tue, etc.
  // We detect day changes from explicit day headers or Hrs blocks
  const dayHeaderRegex = /^(mon|tue|wed|thu|fri|sat|sun)(?:day)?$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Check for day header
    const dayHeaderMatch = line.match(dayHeaderRegex);
    if (dayHeaderMatch) {
      const dayIdx = dayNames.indexOf(dayHeaderMatch[1].toLowerCase().substring(0, 3));
      if (dayIdx >= 0) currentDay = dayIdx;
      continue;
    }

    // Check if this is an employee name line
    if (namePattern.test(line) && !nameExclusions.test(line)) {
      currentEmployee = line.split('\n')[0].trim();
      const hrsIdx = currentEmployee.indexOf('Hrs:');
      if (hrsIdx > 0) {
        currentEmployee = currentEmployee.substring(0, hrsIdx).trim();
      }
      pendingTime = null;
      continue;
    }

    // Format A: "Tue 4:55pm - 9:49pm Lowland support"
    const shiftMatchA = line.match(shiftLineRegexA);
    if (shiftMatchA) {
      const dayAbbrev = shiftMatchA[1].toLowerCase();
      const startTime = shiftMatchA[2].toLowerCase();
      const endTime = shiftMatchA[3].toLowerCase();
      const roleName = shiftMatchA[4].trim();

      const date = dayToDate.get(dayAbbrev);
      if (!date) continue;

      const hours = calcShiftHours(startTime, endTime);

      shifts.push({
        employeeName: currentEmployee,
        date,
        startTime,
        endTime,
        hours,
        dolceRole: roleName,
      });
      pendingTime = null;
      continue;
    }

    // Format B: time-only line "2:00pm - 10:45pm"
    const timeMatch = line.match(timeOnlyRegex);
    if (timeMatch) {
      pendingTime = {
        start: timeMatch[1].toLowerCase(),
        end: timeMatch[2].toLowerCase(),
      };
      continue;
    }

    // If previous line was a time, this line might be the role name
    if (pendingTime) {
      const normalizedLine = line.toLowerCase().trim();
      if (knownRoles.has(normalizedLine) || normalizedLine.startsWith('lowland ')) {
        const date = weekDates[currentDay] || weekDates[0];
        const hours = calcShiftHours(pendingTime.start, pendingTime.end);

        shifts.push({
          employeeName: currentEmployee,
          date,
          startTime: pendingTime.start,
          endTime: pendingTime.end,
          hours,
          dolceRole: line.trim(),
        });
        pendingTime = null;
        continue;
      }
      // Not a role name — reset pending time
      pendingTime = null;
    }

    // Track day from "Hrs: XX.XX Shifts: N" blocks — each employee has one per day
    if (/^Hrs:\s*[\d.]+\s+Shifts:\s*\d+/i.test(line)) {
      // This indicates the start of a new day's shifts for the current employee
      // We'll detect the day from the lines around it
    }
  }

  return shifts;
}

// ---------------------------------------------------------------------------
// Aggregate shifts by date + role
// ---------------------------------------------------------------------------

function aggregateShiftsByDateRole(shifts: ParsedShift[]): RoleDayHours[] {
  const agg = new Map<string, number>();

  for (const shift of shifts) {
    const key = `${shift.date}|${shift.dolceRole.toLowerCase()}`;
    agg.set(key, (agg.get(key) ?? 0) + shift.hours);
  }

  const results: RoleDayHours[] = [];
  for (const [key, totalHours] of agg) {
    const [date, dolceRole] = key.split('|');
    results.push({ date, dolceRole, totalHours });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Calculate per-position daily scheduled dollars
// ---------------------------------------------------------------------------

interface PositionDayRecord {
  date: string;
  position: string;
  scheduledDollars: number;
  scheduledHours: number;
}

function calculatePositionDayRecords(
  roleDayHours: RoleDayHours[],
  dailyAnalytics: DailyAnalytics[],
  mappingLookup: Map<string, string>,
): PositionDayRecord[] {
  const records: PositionDayRecord[] = [];

  // Build a per-date total hours from shifts (only mapped, non-excluded roles)
  const dateTotalHours = new Map<string, number>();
  const datePositionHours = new Map<string, Map<string, number>>();

  for (const rdh of roleDayHours) {
    const dashPos = findMapping(rdh.dolceRole, mappingLookup);
    if (!dashPos || dashPos === 'EXCLUDE') continue;

    dateTotalHours.set(
      rdh.date,
      (dateTotalHours.get(rdh.date) ?? 0) + rdh.totalHours,
    );

    if (!datePositionHours.has(rdh.date)) {
      datePositionHours.set(rdh.date, new Map());
    }
    const posMap = datePositionHours.get(rdh.date)!;
    posMap.set(dashPos, (posMap.get(dashPos) ?? 0) + rdh.totalHours);
  }

  // Build analytics lookup by date
  const analyticsMap = new Map<string, DailyAnalytics>();
  for (const da of dailyAnalytics) {
    analyticsMap.set(da.date, da);
  }

  // For each date, distribute the daily $ Hrly proportionally across positions
  for (const [date, posMap] of datePositionHours) {
    const totalHrs = dateTotalHours.get(date) ?? 0;
    const analytics = analyticsMap.get(date);
    const dailyDollars = analytics?.schedHrlyDollars ?? 0;

    for (const [position, posHours] of posMap) {
      let dollars: number;
      if (totalHrs > 0 && dailyDollars > 0) {
        // Distribute daily $ Hrly proportionally by hours
        dollars = Math.round((posHours / totalHrs) * dailyDollars * 100) / 100;
      } else {
        // Fallback: no analytics data, estimate at $15/hr average
        dollars = Math.round(posHours * 15 * 100) / 100;
      }

      records.push({
        date,
        position,
        scheduledDollars: dollars,
        scheduledHours: Math.round(posHours * 100) / 100,
      });
    }
  }

  return records;
}

/**
 * Find the dashboard position for a Dolce role name.
 * Tries exact match first, then partial/contains matching.
 */
function findMapping(
  dolceRole: string,
  mappingLookup: Map<string, string>,
): string | undefined {
  const lower = dolceRole.toLowerCase().trim();

  // Exact match
  if (mappingLookup.has(lower)) {
    return mappingLookup.get(lower);
  }

  // Try matching without "Lowland " prefix
  const withoutPrefix = lower.replace(/^lowland\s+/, '');
  if (mappingLookup.has(withoutPrefix)) {
    return mappingLookup.get(withoutPrefix);
  }

  // Try matching with "Lowland " prefix added
  const withPrefix = `lowland ${withoutPrefix}`;
  if (mappingLookup.has(withPrefix)) {
    return mappingLookup.get(withPrefix);
  }

  // Partial match: check if any mapping key is contained in the role
  for (const [key, value] of mappingLookup) {
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Playwright: Login + Scrape Schedules Page
// ---------------------------------------------------------------------------

async function loginToDolce(page: Page): Promise<void> {
  const username = process.env.DOLCE_USERNAME;
  const password = process.env.DOLCE_PASSWORD;
  if (!username || !password) {
    throw new Error('Missing DOLCE_USERNAME or DOLCE_PASSWORD');
  }

  console.log('[Dolce] Navigating to login page...');
  await page.goto(DOLCE_LOGIN_URL, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  console.log('[Dolce] Current URL:', page.url());
  console.log('[Dolce] Page title:', await page.title());

  // Fill credentials using placeholder text matching
  console.log('[Dolce] Entering credentials...');
  await page.waitForSelector('input[placeholder*="Username"]', {
    timeout: 15000,
  });

  // Type credentials using keyboard (more reliable than fill for some forms)
  await page.click('input[placeholder*="Username"]');
  await page.keyboard.type(username, { delay: 30 });
  await page.keyboard.press('Tab');
  await page.keyboard.type(password, { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  console.log('[Dolce] Logged in successfully');
}

async function navigateToSchedules(page: Page): Promise<void> {
  console.log('[Dolce] Navigating to Schedules page...');
  await page.goto(DOLCE_SCHEDULES_URL, {
    waitUntil: 'networkidle',
    timeout: 30000,
  });
  await page.waitForTimeout(3000);
  console.log('[Dolce] Schedules URL:', page.url());

  // Wait for schedule content to appear
  try {
    await page.waitForSelector('text=Lowland', { timeout: 20000 });
    console.log('[Dolce] Schedule page loaded');
  } catch {
    console.warn(
      '[Dolce] Warning: "Lowland" text not found on schedules page',
    );
  }
}

async function getPageText(page: Page): Promise<string> {
  console.log('[Dolce] Extracting page text...');
  const text = await page.evaluate(() => document.body.innerText);
  console.log(`[Dolce] Extracted ${text.length} characters of text`);
  return text;
}

// ---------------------------------------------------------------------------
// Supabase: Fetch mappings, upsert scheduled_labor
// ---------------------------------------------------------------------------

async function fetchDolceMappings(
  sb: SupabaseClient,
): Promise<DolceMapping[]> {
  const { data, error } = await sb
    .from('dolce_job_mapping')
    .select('dolce_role_name, dashboard_position')
    .eq('location_id', LOWLAND_LOCATION_ID);

  if (error) {
    console.error('[Dolce] Error fetching mappings:', error.message);
    return [];
  }

  return data || [];
}

async function upsertScheduledLabor(
  sb: SupabaseClient,
  records: PositionDayRecord[],
): Promise<number> {
  let upserted = 0;
  for (const rec of records) {
    if (rec.scheduledDollars === 0 && rec.scheduledHours === 0) continue;

    const { error } = await sb.from('scheduled_labor').upsert(
      {
        location_id: LOWLAND_LOCATION_ID,
        business_date: rec.date,
        position: rec.position,
        scheduled_dollars: rec.scheduledDollars,
        scheduled_hours: rec.scheduledHours,
        source: 'dolce',
      },
      { onConflict: 'location_id,business_date,position' },
    );

    if (error) {
      console.error(
        `[Dolce] Upsert error for ${rec.position} on ${rec.date}:`,
        error.message,
      );
    } else {
      upserted++;
    }
  }
  return upserted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=== Dolce Schedule Sync (Shift-Level) ===');
  console.log(`Time: ${new Date().toISOString()}`);

  // Parse --week argument
  const weekArg = process.argv.find((a) => a.startsWith('--week'));
  const weekDate = weekArg
    ? process.argv[process.argv.indexOf(weekArg) + 1]
    : undefined;
  const { monday, sunday, weekDates } = getWeekBounds(weekDate);
  console.log(`Week: ${monday} to ${sunday}`);

  const sb = getSupabase();

  // Fetch role mappings
  const mappings = await fetchDolceMappings(sb);
  console.log(`[Dolce] Loaded ${mappings.length} role mappings`);

  if (mappings.length === 0) {
    console.error('[Dolce] No role mappings found! Run seed SQL first.');
    process.exit(1);
  }

  // Build mapping lookup (lowercase key -> dashboard position)
  const mappingLookup = new Map<string, string>();
  for (const m of mappings) {
    mappingLookup.set(m.dolce_role_name.toLowerCase(), m.dashboard_position);
  }

  // Launch browser and scrape
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });
  const page = await context.newPage();

  try {
    await loginToDolce(page);
    await navigateToSchedules(page);
    const pageText = await getPageText(page);

    // Debug: save page text for troubleshooting
    if (process.env.DOLCE_DEBUG) {
      const fs = await import('fs');
      fs.writeFileSync('/tmp/dolce-page-text.txt', pageText);
      console.log('[Debug] Page text saved to /tmp/dolce-page-text.txt');
    }

    // 1. Parse Daily Analytics Summary
    const dailyAnalytics = parseDailyAnalytics(pageText, weekDates);
    console.log(
      `\n[Parse] Daily Analytics: ${dailyAnalytics.length} days found`,
    );
    for (const da of dailyAnalytics) {
      console.log(
        `  ${da.date}: ${da.schedHours} hrs, $${da.schedHrlyDollars} hrly, $${da.schedSalaryDollars} salary`,
      );
    }

    // 2. Parse shifts from Role Analytics summary at bottom of page
    // The page text contains role summary lines like:
    //   Cook	$8,503.68	8.26%	$3,202.50	9.6%	$3,664.71	9.0%
    // Extract role name and scheduled $ (first dollar amount)
    const roleWeeklyTotals = new Map<string, number>();
    const roleSummaryRegex = /^(.+?)\t\$([\d,]+\.\d{2})\t[\d.]+%/gm;
    let match;
    while ((match = roleSummaryRegex.exec(pageText)) !== null) {
      const roleName = match[1].trim();
      const dollars = parseFloat(match[2].replace(/,/g, ''));
      if (dollars > 0 && !roleName.match(/^(total|overtime|regular|salary|hourly)/i)) {
        roleWeeklyTotals.set(roleName, (roleWeeklyTotals.get(roleName) ?? 0) + dollars);
      }
    }

    console.log(`\n[Parse] Role summary totals: ${roleWeeklyTotals.size} roles found`);
    for (const [role, total] of roleWeeklyTotals) {
      console.log(`  ${role}: $${total.toFixed(2)}`);
    }

    // 2b. Also try individual shift parsing for per-day breakdown
    const shifts = parseShifts(pageText, weekDates);
    console.log(`[Parse] Individual shifts: ${shifts.length} found`);

    // Use role summary fallback if:
    // - No individual shifts parsed, OR
    // - Shifts parsed but all assigned to same day (day tracking broken)
    const uniqueDays = new Set(shifts.map(s => s.date));
    let useRoleSummaryFallback = roleWeeklyTotals.size > 0 && (shifts.length === 0 || uniqueDays.size <= 1);
    if (useRoleSummaryFallback && shifts.length > 0) {
      console.log(`[Parse] ${shifts.length} shifts found but only ${uniqueDays.size} day(s) detected — using role summary fallback`);
    }

    if (shifts.length === 0 && roleWeeklyTotals.size === 0) {
      console.warn('[Dolce] No shifts or role summaries parsed. Taking screenshot...');
      await page.screenshot({ path: '/tmp/dolce-debug.png', fullPage: true });
      console.log('[Dolce] Screenshot saved to /tmp/dolce-debug.png');
      if (dailyAnalytics.length === 0) {
        console.error('[Dolce] No data at all. Exiting.');
        process.exit(1);
      }
      console.warn('[Dolce] Falling back to daily analytics totals only');
    }

    // 3. Build per-position daily records
    let roleDayHours: RoleDayHours[];

    if (useRoleSummaryFallback) {
      // Distribute role weekly totals to daily using analytics hours proportions
      const totalWeekHrs = dailyAnalytics.reduce((s, d) => s + d.schedHours, 0);
      const dayWeights = dailyAnalytics.map(d => totalWeekHrs > 0 ? d.schedHours / totalWeekHrs : 1/7);

      // Skip per-position hours distribution — go directly to position records
      const positionRecordsDirect: PositionDayRecord[] = [];
      for (const [roleName, weeklyTotal] of roleWeeklyTotals) {
        const dashPos = findMapping(roleName, mappingLookup);
        if (!dashPos || dashPos === 'EXCLUDE') {
          console.log(`  [SKIP] "${roleName}" -> ${dashPos || 'UNMAPPED'}`);
          continue;
        }
        for (let i = 0; i < dailyAnalytics.length; i++) {
          const da = dailyAnalytics[i];
          const dayDollars = Math.round(weeklyTotal * (dayWeights[i] || 0) * 100) / 100;
          const dayHours = Math.round(da.schedHours * (dayWeights[i] || 0) * 100) / 100;
          positionRecordsDirect.push({
            date: da.date,
            position: dashPos,
            scheduledDollars: dayDollars,
            scheduledHours: dayHours,
          });
        }
      }

      // Aggregate duplicate positions per day (multiple Dolce roles -> same dashboard position)
      const aggMap = new Map<string, PositionDayRecord>();
      for (const rec of positionRecordsDirect) {
        const key = `${rec.date}|${rec.position}`;
        const existing = aggMap.get(key);
        if (existing) {
          existing.scheduledDollars += rec.scheduledDollars;
          existing.scheduledHours += rec.scheduledHours;
        } else {
          aggMap.set(key, { ...rec });
        }
      }

      const directRecords = Array.from(aggMap.values());
      console.log(`\n[Parse] Distributed ${roleWeeklyTotals.size} roles across ${dailyAnalytics.length} days -> ${directRecords.length} position records`);
      for (const rec of directRecords) {
        console.log(`  ${rec.date} | ${rec.position}: $${rec.scheduledDollars.toFixed(2)}`);
      }

      // Upsert directly and exit
      console.log(`\n[Dolce] Upserting ${directRecords.length} records to scheduled_labor...`);
      const upserted = await upsertScheduledLabor(sb, directRecords);
      console.log(`[Dolce] Successfully upserted ${upserted} records`);
      console.log('\n=== Dolce Schedule Sync Complete ===');
      await browser.close();
      return;
    } else {
      roleDayHours = aggregateShiftsByDateRole(shifts);
    }
    console.log(`[Parse] Aggregated into ${roleDayHours.length} date+role groups`);

    // Log unmapped roles
    const unmappedRoles = new Set<string>();
    for (const rdh of roleDayHours) {
      const mapped = findMapping(rdh.dolceRole, mappingLookup);
      if (!mapped) {
        unmappedRoles.add(rdh.dolceRole);
      } else if (mapped === 'EXCLUDE') {
        // silently skip
      }
    }
    if (unmappedRoles.size > 0) {
      console.warn('\n[Dolce] Unmapped Dolce roles:');
      for (const role of unmappedRoles) {
        console.warn(`  [UNMAPPED] "${role}"`);
      }
    }

    // 4. Calculate per-position daily records
    const positionRecords = calculatePositionDayRecords(
      roleDayHours,
      dailyAnalytics,
      mappingLookup,
    );

    console.log(
      `\n[Dolce] Per-position daily records: ${positionRecords.length}`,
    );
    for (const rec of positionRecords) {
      console.log(
        `  ${rec.date} | ${rec.position}: $${rec.scheduledDollars.toFixed(2)}, ${rec.scheduledHours.toFixed(1)} hrs`,
      );
    }

    // 5. Upsert to scheduled_labor
    console.log(
      `\n[Dolce] Upserting ${positionRecords.length} records to scheduled_labor...`,
    );
    const upserted = await upsertScheduledLabor(sb, positionRecords);
    console.log(`[Dolce] Successfully upserted ${upserted} records`);

    console.log('\n=== Dolce Schedule Sync Complete ===');
  } catch (err) {
    console.error('[Dolce] Fatal error:', err);
    try {
      await page.screenshot({
        path: '/tmp/dolce-error.png',
        fullPage: true,
      });
      console.log('[Dolce] Error screenshot saved to /tmp/dolce-error.png');
    } catch {
      // ignore screenshot errors
    }
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
