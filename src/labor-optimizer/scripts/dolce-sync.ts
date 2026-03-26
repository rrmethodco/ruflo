/**
 * Dolce TeamWork Schedule Sync Script
 *
 * Scrapes the Role Analytics report from Dolce Clock for Lowland,
 * maps roles to dashboard positions, distributes weekly totals
 * to daily using DOW weights, and upserts into scheduled_labor.
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

const DOLCE_LOGIN_URL = 'https://www.dolceclock.com/public/login.php?company_id=3243';
const LOWLAND_LOCATION_ID = 'f36fdb18-a97b-48af-8456-7374dea4b0f9';
const REPORT_TYPE_VALUE = '32|0|0|0|0|1'; // Role Analytics
const LOCATION_FILTER_VALUE = '6140';       // Lowland & The Quinte

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

function getWeekBounds(referenceDate?: string): { monday: string; sunday: string; weekDates: string[] } {
  const target = referenceDate ? new Date(referenceDate + 'T12:00:00') : new Date();
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

function formatDateMMDDYYYY(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
}

function formatDateDolce(dateStr: string): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const [y, m, d] = dateStr.split('-');
  return `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedRole {
  roleName: string;
  scheduledDollars: number;
  scheduledHours: number;
  actualDollars: number;
  actualHours: number;
  section: string; // FOH, BOH, MGT, Contract
}

interface DolceMapping {
  dolce_role_name: string;
  dashboard_position: string;
}

interface DowWeight {
  position: string;
  day_of_week: number;
  weight: number;
}

// ---------------------------------------------------------------------------
// Playwright: Login + Navigate + Scrape
// ---------------------------------------------------------------------------

async function loginToDolce(page: Page): Promise<void> {
  const username = process.env.DOLCE_USERNAME;
  const password = process.env.DOLCE_PASSWORD;
  if (!username || !password) {
    throw new Error('Missing DOLCE_USERNAME or DOLCE_PASSWORD');
  }

  console.log('[Dolce] Navigating to login page...');
  await page.goto(DOLCE_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('[Dolce] Current URL:', page.url());
  console.log('[Dolce] Page title:', await page.title());

  // Fill credentials using placeholder text matching
  console.log('[Dolce] Entering credentials...');
  await page.waitForSelector('input[placeholder*="Username"]', { timeout: 15000 });

  // Type credentials using keyboard (more reliable than fill for some forms)
  await page.click('input[placeholder*="Username"]');
  await page.keyboard.type(username, { delay: 30 });
  await page.keyboard.press('Tab');
  await page.keyboard.type(password, { delay: 30 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  console.log('[Dolce] Logged in successfully');
}

async function navigateToReport(page: Page, monday: string, sunday: string): Promise<void> {
  console.log('[Dolce] Navigating to Reports page...');

  // Navigate to reports -- try common Dolce report paths
  const reportPaths = [
    'https://www.dolceclock.com/public/reports.php',
    'https://www.dolceclock.com/public/index.php?page=reports',
  ];

  let navigated = false;
  for (const url of reportPaths) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      navigated = true;
      break;
    } catch {
      continue;
    }
  }

  if (!navigated) {
    // Try clicking a Reports link in the nav
    const reportsLink = page.locator('a:has-text("Reports"), a:has-text("reports")').first();
    if (await reportsLink.isVisible()) {
      await reportsLink.click();
      await page.waitForTimeout(2000);
    }
  }

  // Wait for page to fully load
  await page.waitForTimeout(3000);
  console.log('[Dolce] Reports URL:', page.url());

  // Select report type: Role Analytics — find all <select> elements and pick the right one
  console.log('[Dolce] Selecting Role Analytics report...');
  const allSelects = page.locator('select');
  const selectCount = await allSelects.count();
  console.log(`[Dolce] Found ${selectCount} select elements`);

  // The report type dropdown is typically the first large select on the reports page
  for (let i = 0; i < selectCount; i++) {
    const sel = allSelects.nth(i);
    const optionCount = await sel.locator('option').count();
    if (optionCount > 10) {
      // This is likely the report type dropdown
      try {
        await sel.selectOption({ value: REPORT_TYPE_VALUE });
        console.log(`[Dolce] Selected report type from select #${i} (${optionCount} options)`);
        break;
      } catch { continue; }
    }
  }
  await page.waitForTimeout(1000);

  // Select location: Lowland & The Quinte
  console.log('[Dolce] Selecting Lowland location...');
  for (let i = 0; i < selectCount; i++) {
    const sel = allSelects.nth(i);
    try {
      const options = await sel.locator('option').allTextContents();
      if (options.some(o => o.includes('Lowland'))) {
        await sel.selectOption({ value: LOCATION_FILTER_VALUE });
        console.log(`[Dolce] Selected Lowland from select #${i}`);
        break;
      }
    } catch { continue; }
  }
  await page.waitForTimeout(500);

  // Set date range
  const fromDate = formatDateDolce(monday);
  const toDate = formatDateDolce(sunday);
  console.log(`[Dolce] Setting date range: ${fromDate} - ${toDate}`);

  // Find date inputs — they're text inputs with date-like values (e.g., "Feb 1, 2026")
  const dateInputs = page.locator('input[type="text"]');
  const dateCount = await dateInputs.count();
  let fromFound = false;
  for (let i = 0; i < dateCount; i++) {
    const input = dateInputs.nth(i);
    const val = await input.inputValue().catch(() => '');
    // Look for date-like values (contains month names or date patterns)
    if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}/i.test(val)) {
      if (!fromFound) {
        await input.click({ clickCount: 3 });
        await input.fill(fromDate);
        console.log(`[Dolce] Set from-date input #${i} (was: "${val}") to ${fromDate}`);
        fromFound = true;
      } else {
        await input.click({ clickCount: 3 });
        await input.fill(toDate);
        console.log(`[Dolce] Set to-date input #${i} (was: "${val}") to ${toDate}`);
        break;
      }
    }
  }

  // Click Show Report
  console.log('[Dolce] Clicking Show Report...');
  await page.click('button:has-text("Show Report"), input[value="Show Report"]');

  // Wait for the report to render
  console.log('[Dolce] Waiting for report to render...');
  await page.waitForTimeout(5000);

  // Wait for "Lowland" heading to appear in rendered content
  try {
    await page.waitForSelector('text=Lowland', { timeout: 20000 });
    console.log('[Dolce] Report loaded successfully');
  } catch {
    console.warn('[Dolce] Warning: "Lowland" text not found in report, proceeding anyway');
  }
}

async function parseReportHTML(page: Page): Promise<ParsedRole[]> {
  console.log('[Dolce] Parsing report HTML...');

  // Get page HTML and parse in Node (avoids TypeScript compilation issues in browser context)
  const html = await page.content();
  return parseHTMLInNode(html);
}

function parseHTMLInNode(html: string): ParsedRole[] {
  // Simple regex-based parser since we can't use DOM APIs in Node without a library
  const results: ParsedRole[] = [];

  // Find sections
  const sections = ['FOH', 'BOH', 'MGT', 'Contract'];
  const sectionRegex = /Lowland\s+(FOH|BOH|MGT)|Contract\s+Labor/gi;

  // Find all table rows with role data
  // Pattern: role name in first cell, dollar amounts in subsequent cells
  const rowRegex = /<tr[^>]*>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>\s*\$?([\d,.]+)\s*<\/td>\s*<td[^>]*>\s*([\d.]+%?)\s*<\/td>\s*<td[^>]*>\s*\$?([\d,.]+)\s*<\/td>/gi;

  let currentSection = 'FOH';
  const lines = html.split('\n');

  for (const line of lines) {
    // Track section
    if (/Lowland FOH/i.test(line)) currentSection = 'FOH';
    else if (/Lowland BOH/i.test(line)) currentSection = 'BOH';
    else if (/Lowland MGT/i.test(line)) currentSection = 'MGT';
    else if (/Contract Labor/i.test(line)) currentSection = 'Contract';
  }

  // Use a more robust approach: find role-like rows
  const roleRowRegex = /<td[^>]*>\s*([A-Za-z][A-Za-z\s']+)\s*<\/td>\s*<td[^>]*>\s*\$?([\d,]+\.?\d*)\s*<\/td>/g;
  let currentSect = 'FOH';
  let match;

  // Split by section headers
  const fohStart = html.indexOf('Lowland FOH');
  const bohStart = html.indexOf('Lowland BOH');
  const mgtStart = html.indexOf('Lowland MGT');
  const contractStart = html.indexOf('Contract Labor');

  function parseSectionHTML(sectionHTML: string, section: string) {
    // Find rows: RoleName | $Sched | Lbr% | $Act | Lbr%
    const trs = sectionHTML.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
    for (const tr of trs) {
      const cells = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      if (cells.length >= 4) {
        const cellTexts = cells.map(c => c.replace(/<[^>]+>/g, '').trim());
        const roleName = cellTexts[0];
        // Skip header rows and "Hours" rows
        if (!roleName || /^(Role|Hours|Total|Status)$/i.test(roleName)) continue;
        if (/hours/i.test(roleName)) continue;

        const parseDollar = (t: string) => {
          const cleaned = t.replace(/[$,\s]/g, '');
          const val = parseFloat(cleaned);
          return isNaN(val) ? 0 : val;
        };

        const sched = parseDollar(cellTexts[1]);
        const act = parseDollar(cellTexts[3]);

        if (roleName.length > 1 && roleName.length < 50) {
          results.push({
            roleName,
            scheduledDollars: sched,
            scheduledHours: 0,
            actualDollars: act,
            actualHours: 0,
            section,
          });
        }
      }
    }
  }

  if (fohStart >= 0) {
    const fohEnd = bohStart > fohStart ? bohStart : (mgtStart > fohStart ? mgtStart : html.length);
    parseSectionHTML(html.substring(fohStart, fohEnd), 'FOH');
  }
  if (bohStart >= 0) {
    const bohEnd = mgtStart > bohStart ? mgtStart : (contractStart > bohStart ? contractStart : html.length);
    parseSectionHTML(html.substring(bohStart, bohEnd), 'BOH');
  }
  if (mgtStart >= 0) {
    const mgtEnd = contractStart > mgtStart ? contractStart : html.length;
    parseSectionHTML(html.substring(mgtStart, mgtEnd), 'MGT');
  }

  console.log(`[Dolce] Parsed ${results.length} roles from report HTML`);
  return results;
}


// ---------------------------------------------------------------------------
// Supabase: Fetch mappings + DOW weights, upsert scheduled_labor
// ---------------------------------------------------------------------------

async function fetchDolceMappings(sb: SupabaseClient): Promise<DolceMapping[]> {
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

async function fetchDowWeights(sb: SupabaseClient): Promise<DowWeight[]> {
  const { data, error } = await sb
    .from('dow_weights')
    .select('position, day_of_week, weight')
    .eq('location_id', LOWLAND_LOCATION_ID);

  if (error) {
    console.error('[Dolce] Error fetching DOW weights:', error.message);
    return [];
  }

  return data || [];
}

function distributeWeeklyToDaily(
  weeklyDollars: number,
  weeklyHours: number,
  position: string,
  weekDates: string[],
  dowWeights: DowWeight[],
): Array<{ date: string; dollars: number; hours: number }> {
  // Get weights for this position (day_of_week: 0=Sun, 1=Mon ... 6=Sat)
  const posWeights = dowWeights.filter(w => w.position === position);

  // weekDates[0] = Monday. Map index to JS day-of-week
  const indexToDow = [1, 2, 3, 4, 5, 6, 0]; // Mon=1 .. Sun=0

  const rawWeights: number[] = weekDates.map((_, i) => {
    const dow = indexToDow[i];
    const found = posWeights.find(w => w.day_of_week === dow);
    return found?.weight ?? (1 / 7); // equal split if no weights
  });

  const totalWeight = rawWeights.reduce((s, w) => s + w, 0);
  const normalizedWeights = totalWeight > 0
    ? rawWeights.map(w => w / totalWeight)
    : rawWeights.map(() => 1 / 7);

  return weekDates.map((date, i) => ({
    date,
    dollars: Math.round(weeklyDollars * normalizedWeights[i] * 100) / 100,
    hours: Math.round(weeklyHours * normalizedWeights[i] * 100) / 100,
  }));
}

async function upsertScheduledLabor(
  sb: SupabaseClient,
  records: Array<{ date: string; position: string; dollars: number; hours: number }>,
): Promise<number> {
  let upserted = 0;
  for (const rec of records) {
    if (rec.dollars === 0 && rec.hours === 0) continue;

    const { error } = await sb
      .from('scheduled_labor')
      .upsert(
        {
          location_id: LOWLAND_LOCATION_ID,
          business_date: rec.date,
          position: rec.position,
          scheduled_dollars: rec.dollars,
          scheduled_hours: rec.hours,
          source: 'dolce',
        },
        { onConflict: 'location_id,business_date,position' },
      );

    if (error) {
      console.error(`[Dolce] Upsert error for ${rec.position} on ${rec.date}:`, error.message);
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
  console.log('=== Dolce TeamWork Schedule Sync ===');
  console.log(`Time: ${new Date().toISOString()}`);

  // Parse --week argument
  const weekArg = process.argv.find(a => a.startsWith('--week'));
  const weekDate = weekArg ? process.argv[process.argv.indexOf(weekArg) + 1] : undefined;
  const { monday, sunday, weekDates } = getWeekBounds(weekDate);
  console.log(`Week: ${monday} to ${sunday}`);

  const sb = getSupabase();

  // Fetch mappings and DOW weights in parallel
  const [mappings, dowWeights] = await Promise.all([
    fetchDolceMappings(sb),
    fetchDowWeights(sb),
  ]);

  console.log(`[Dolce] Loaded ${mappings.length} role mappings, ${dowWeights.length} DOW weights`);

  if (mappings.length === 0) {
    console.error('[Dolce] No role mappings found! Run seed SQL first.');
    process.exit(1);
  }

  // Build mapping lookup
  const mappingLookup = new Map<string, string>();
  for (const m of mappings) {
    mappingLookup.set(m.dolce_role_name.toLowerCase(), m.dashboard_position);
  }

  // Launch browser and scrape
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });
  const page = await context.newPage();

  try {
    await loginToDolce(page);
    await navigateToReport(page, monday, sunday);
    const roles = await parseReportHTML(page);

    if (roles.length === 0) {
      console.warn('[Dolce] No roles parsed from report. Taking screenshot for debug...');
      await page.screenshot({ path: '/tmp/dolce-debug.png', fullPage: true });
      console.log('[Dolce] Screenshot saved to /tmp/dolce-debug.png');
      process.exit(1);
    }

    // Map roles to dashboard positions and distribute to daily
    const allRecords: Array<{ date: string; position: string; dollars: number; hours: number }> = [];

    // Aggregate by dashboard position (multiple Dolce roles may map to same position)
    const positionAgg = new Map<string, { dollars: number; hours: number }>();

    for (const role of roles) {
      const dashPos = mappingLookup.get(role.roleName.toLowerCase());
      if (!dashPos) {
        console.warn(`  [UNMAPPED] "${role.roleName}" -- skipping`);
        continue;
      }
      if (dashPos === 'EXCLUDE') {
        console.log(`  [EXCLUDED] "${role.roleName}"`);
        continue;
      }

      const existing = positionAgg.get(dashPos) || { dollars: 0, hours: 0 };
      existing.dollars += role.scheduledDollars;
      existing.hours += role.scheduledHours;
      positionAgg.set(dashPos, existing);
    }

    console.log('\n[Dolce] Position aggregates (weekly):');
    for (const [pos, agg] of positionAgg) {
      console.log(`  ${pos}: $${agg.dollars.toFixed(2)}, ${agg.hours.toFixed(1)} hrs`);

      const dailyRecords = distributeWeeklyToDaily(
        agg.dollars,
        agg.hours,
        pos,
        weekDates,
        dowWeights,
      );

      allRecords.push(...dailyRecords.map(d => ({
        date: d.date,
        position: pos,
        dollars: d.dollars,
        hours: d.hours,
      })));
    }

    // Upsert to scheduled_labor
    console.log(`\n[Dolce] Upserting ${allRecords.length} daily records to scheduled_labor...`);
    const upserted = await upsertScheduledLabor(sb, allRecords);
    console.log(`[Dolce] Successfully upserted ${upserted} records`);

    console.log('\n=== Dolce Sync Complete ===');
  } catch (err) {
    console.error('[Dolce] Fatal error:', err);
    try {
      await page.screenshot({ path: '/tmp/dolce-error.png', fullPage: true });
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
