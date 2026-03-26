import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabaseService } from '$lib/server/supabase';
import { createToastClientFromCredentials } from '$lib/server/integrations/toast/toast-client';
import { recordForecastAccuracy } from '$lib/server/domain/forecasting/forecast-accuracy';
import { adaptDOWWeights } from '$lib/server/domain/forecasting/labor-projection';
import { syncWeather } from '$lib/server/integrations/weather/weather-service';

export const GET: RequestHandler = async ({ request, url }) => {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getSupabaseService();
  const results: any[] = [];

  // Support backfill: ?from=2026-03-01&to=2026-03-24 or ?date=2026-03-24
  const fromParam = url.searchParams.get('from');
  const toParam = url.searchParams.get('to');
  const dateParam = url.searchParams.get('date');

  const dates: string[] = [];
  if (fromParam && toParam) {
    const start = new Date(fromParam);
    const end = new Date(toParam);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }
  } else if (dateParam) {
    dates.push(dateParam);
  } else {
    // Auto-detect: 10 PM EST run pulls today, 5 AM EST run pulls yesterday
    const now = new Date();
    const estOffset = -5 * 60;
    const estNow = new Date(now.getTime() + (estOffset - now.getTimezoneOffset()) * 60000);
    const estHour = estNow.getHours();
    if (estHour >= 18) {
      // Evening run (10 PM) — pull today's in-progress data
      dates.push(estNow.toISOString().split('T')[0]);
    } else {
      // Morning run (5 AM) — pull yesterday's final data
      estNow.setDate(estNow.getDate() - 1);
      dates.push(estNow.toISOString().split('T')[0]);
    }
  }

  // Get all active locations
  const { data: locations, error: locErr } = await sb
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .not('toast_guid', 'is', null);

  if (locErr || !locations) {
    return json({ error: 'Failed to fetch locations', details: locErr?.message }, { status: 500 });
  }

  for (const loc of locations) {
    if (!loc.toast_client_id || !loc.toast_client_secret || !loc.toast_guid) {
      results.push({ location: loc.name, status: 'skipped', reason: 'Missing Toast credentials' });
      continue;
    }

    const toastClient = createToastClientFromCredentials({
      clientId: loc.toast_client_id,
      clientSecret: loc.toast_client_secret,
      restaurantGuid: loc.toast_guid,
    });

    // Get job mapping for this location (once per location)
    const { data: mappings } = await sb
      .from('toast_job_mapping')
      .select('toast_job_name, dashboard_position')
      .eq('location_id', loc.id);
    const mapLookup: Record<string, string> = {};
    for (const m of (mappings || [])) {
      mapLookup[m.toast_job_name] = m.dashboard_position;
    }

    for (const syncDate of dates) {
      try {
        // Pull revenue + sales mix + PMIX in one pass (avoids double-fetching orders)
        const daySummary = await toastClient.getDaySummary(syncDate);
        const now = new Date().toISOString();

        // Upsert daily_actuals
        await sb.from('daily_actuals').upsert({
          location_id: loc.id,
          business_date: syncDate,
          revenue: daySummary.totalRevenue,
          covers: daySummary.totalCovers,
          order_count: daySummary.orderCount,
          total_discounts: daySummary.totalDiscounts,
          total_comps: daySummary.totalComps,
          synced_at: now,
        }, { onConflict: 'location_id,business_date' });

        // Upsert daily_sales_mix
        if (daySummary.salesMix.length > 0) {
          const mixRows = daySummary.salesMix.map(m => ({
            location_id: loc.id,
            business_date: syncDate,
            category: m.category,
            revenue: m.revenue,
            item_count: m.itemCount,
            pct_of_total: m.pctOfTotal,
            synced_at: now,
          }));
          await sb.from('daily_sales_mix').upsert(mixRows, {
            onConflict: 'location_id,business_date,category',
          });
        }

        // Upsert daily_pmix (top 100 items to keep reasonable)
        if (daySummary.pmix.length > 0) {
          const pmixRows = daySummary.pmix.slice(0, 100).map(p => ({
            location_id: loc.id,
            business_date: syncDate,
            item_name: p.itemName,
            item_guid: p.itemGuid,
            category: p.category,
            quantity: p.quantity,
            revenue: p.revenue,
            avg_price: p.avgPrice,
            synced_at: now,
          }));
          await sb.from('daily_pmix').upsert(pmixRows, {
            onConflict: 'location_id,business_date,item_name',
          });
        }

        // Pull hourly sales and upsert into daily_hourly_sales
        try {
          const hourlySales = await toastClient.getHourlySales(syncDate);
          if (hourlySales.length > 0) {
            const hourlyRows = hourlySales.map(h => ({
              location_id: loc.id,
              business_date: syncDate,
              hour_of_day: h.hour,
              revenue: h.revenue,
              covers: h.covers,
              order_count: h.orderCount,
            }));
            await sb.from('daily_hourly_sales').upsert(hourlyRows, {
              onConflict: 'location_id,business_date,hour_of_day',
            });
          }
        } catch (hourlyErr: any) {
          console.warn(`[Toast] Hourly sales sync failed for ${loc.name} ${syncDate}:`, hourlyErr.message);
        }

        // Pull labor by job
        const laborByJob = await toastClient.getLaborByJob(syncDate);

        // Upsert daily_labor with mapped positions
        for (const job of laborByJob) {
          const mappedPosition = mapLookup[job.jobTitle] || 'EXCLUDE';
          if (mappedPosition === 'EXCLUDE') continue;

          await sb.from('daily_labor').upsert({
            location_id: loc.id,
            business_date: syncDate,
            toast_job_name: job.jobTitle,
            mapped_position: mappedPosition,
            labor_dollars: Math.round(job.laborDollars * 100) / 100,
            regular_hours: Math.round(job.regularHours * 100) / 100,
            overtime_hours: Math.round(job.overtimeHours * 100) / 100,
            synced_at: now,
          }, { onConflict: 'location_id,business_date,toast_job_name' });
        }

        // Record forecast accuracy if an accepted forecast exists for this date
        try {
          await recordForecastAccuracy(loc.id, syncDate);
        } catch (_) { /* non-critical — don't fail sync */ }

        results.push({
          location: loc.name,
          status: 'success',
          date: syncDate,
          revenue: daySummary.totalRevenue,
          covers: daySummary.totalCovers,
          laborEntries: laborByJob.length,
          salesMixCategories: daySummary.salesMix.length,
          pmixItems: daySummary.pmix.length,
          hourlyBuckets: 'synced',
        });
      } catch (err: any) {
        results.push({ location: loc.name, status: 'error', date: syncDate, error: err.message });
      }
    }
  }

  // Sync weather for each location (non-critical)
  const weatherResults: any[] = [];
  for (const loc of locations) {
    try {
      const weatherResult = await syncWeather(loc.id);
      if (weatherResult.daysUpserted > 0) {
        weatherResults.push({ location: loc.name, days: weatherResult.daysUpserted });
      }
    } catch (_) { /* non-critical — don't fail sync */ }
  }

  // After sync, if today is Sunday (end of week), adapt DOW weights from actuals
  const now = new Date();
  const estOffset = -5 * 60;
  const estNow = new Date(now.getTime() + (estOffset - now.getTimezoneOffset()) * 60000);
  if (estNow.getDay() === 0) {
    const adaptResults: any[] = [];
    for (const loc of locations) {
      try {
        const adaptation = await adaptDOWWeights(loc.id);
        if (adaptation.changes.length > 0) {
          adaptResults.push({
            location: loc.name,
            positionsUpdated: adaptation.positionsUpdated,
            weeksAnalyzed: adaptation.weeksAnalyzed,
            changesCount: adaptation.changes.length,
          });
        }
      } catch (_) { /* non-critical */ }
    }
    return json({ synced: dates, results, weatherResults, dowWeightAdaptation: adaptResults });
  }

  return json({ synced: dates, results, weatherResults });
};
