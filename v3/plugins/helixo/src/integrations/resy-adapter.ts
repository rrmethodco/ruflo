/**
 * Helixo RESY Adapter
 *
 * Integration with RESY reservation platform. Fetches reservation data
 * and pacing information to feed into the forecast engine.
 */

import {
  type Logger,
  type ResyConfig,
  type ResyPacingEntry,
  type ResyReservation,
  type ResyReservationData,
} from '../types.js';

// ============================================================================
// RESY Adapter
// ============================================================================

export class ResyAdapter {
  private readonly config: ResyConfig;
  private readonly logger: Logger;
  private readonly venueCapacity: number;
  private authToken: string | undefined;

  constructor(config: ResyConfig, logger?: Logger, venueCapacity = 100) {
    this.config = config;
    this.logger = logger ?? { debug() {}, info() {}, warn() {}, error() {} };
    this.venueCapacity = venueCapacity;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  async fetchReservations(date: string): Promise<ResyReservationData> {
    await this.ensureAuth();

    const raw = await this.apiGet<RawResyResponse>(`/4/find`, {
      venue_id: this.config.venueId,
      day: date,
      party_size: '2', // default search
    });

    const reservations = this.transformReservations(raw);
    const pacing = this.buildPacing(reservations, date);
    const walkInEstimate = this.estimateWalkIns(reservations.length, date);

    this.logger.info('RESY reservations fetched', {
      date,
      total: reservations.length,
      covers: reservations.reduce((s, r) => s + r.partySize, 0),
      walkInEstimate,
    });

    return {
      date,
      reservations,
      totalCovers: reservations.reduce((s, r) => s + r.partySize, 0),
      totalReservations: reservations.length,
      walkInEstimate,
      pacingByHour: pacing,
    };
  }

  async fetchReservationPacing(date: string, daysOut: number): Promise<ResyPacingEntry[]> {
    const data = await this.fetchReservations(date);
    return data.pacingByHour.map(p => ({ ...p, daysOut }));
  }

  async fetchMultiDayReservations(
    startDate: string,
    endDate: string,
  ): Promise<Map<string, ResyReservationData>> {
    const results = new Map<string, ResyReservationData>();
    let current = startDate;

    while (current <= endDate) {
      try {
        const data = await this.fetchReservations(current);
        results.set(current, data);
      } catch (err) {
        this.logger.warn('Failed to fetch RESY data', { date: current, error: String(err) });
      }
      const d = new Date(current + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + 1);
      current = d.toISOString().slice(0, 10);
    }

    return results;
  }

  // --------------------------------------------------------------------------
  // Transform Raw Data
  // --------------------------------------------------------------------------

  private transformReservations(raw: RawResyResponse): ResyReservation[] {
    const results = raw.results?.venues?.[0]?.slots ?? [];
    const reservations: ResyReservation[] = [];

    for (const slot of results) {
      if (!slot.date?.start) continue;
      reservations.push({
        id: slot.config?.id ?? `resy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        dateTime: slot.date.start,
        partySize: slot.size?.min ?? 2,
        status: 'confirmed', // RESY /find endpoint returns available slots; all are confirmed
        isVIP: slot.config?.type === 'VIP' || false,
        bookedAt: slot.date.start, // RESY doesn't expose booking time in search
      });
    }

    return reservations;
  }

  private mapStatus(raw: string): ResyReservation['status'] {
    const map: Record<string, ResyReservation['status']> = {
      confirmed: 'confirmed',
      seated: 'seated',
      completed: 'completed',
      cancelled: 'cancelled',
      no_show: 'no_show',
    };
    return map[raw] ?? 'confirmed';
  }

  // --------------------------------------------------------------------------
  // Pacing Analysis
  // --------------------------------------------------------------------------

  private buildPacing(reservations: ResyReservation[], date: string): ResyPacingEntry[] {
    const hourBuckets = new Map<string, number>();

    for (const res of reservations) {
      if (res.status === 'cancelled' || res.status === 'no_show') continue;
      const hour = this.extractHour(res.dateTime);
      hourBuckets.set(hour, (hourBuckets.get(hour) ?? 0) + res.partySize);
    }

    const sortedHours = [...hourBuckets.entries()].sort(
      (a, b) => a[0].localeCompare(b[0]),
    );

    return sortedHours.map(([hour, covers]) => {
      const walkIns = Math.round(covers * 0.25); // estimate 25% walk-in ratio per hour
      return {
        hour,
        reservedCovers: covers,
        estimatedWalkIns: walkIns,
        totalExpectedCovers: covers + walkIns,
        capacityPercent: (covers + walkIns) / this.venueCapacity,
        daysOut: 0,
      };
    });
  }

  private estimateWalkIns(reservationCount: number, date: string): number {
    // Walk-in ratio varies by day of week
    const dow = new Date(date + 'T12:00:00Z').getUTCDay();
    const isWeekend = dow === 0 || dow === 5 || dow === 6;
    const walkInRatio = isWeekend ? 0.20 : 0.35; // more walk-ins on weekdays
    return Math.round(reservationCount * walkInRatio);
  }

  // --------------------------------------------------------------------------
  // Auth & HTTP
  // --------------------------------------------------------------------------

  private async ensureAuth(): Promise<void> {
    if (this.authToken) return;

    const resp = await fetch(`${this.config.apiBaseUrl}/3/auth/password`, {
      method: 'POST',
      headers: {
        'Authorization': `ResyAPI api_key="${this.config.apiKey}"`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `email=&password=`, // API key auth only
    });

    if (!resp.ok) {
      // Fall back to API-key-only mode
      this.authToken = this.config.apiKey;
      return;
    }

    const data = (await resp.json()) as { token: string };
    this.authToken = data.token;
  }

  private async apiGet<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(path, this.config.apiBaseUrl);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const resp = await fetch(url.toString(), {
      headers: {
        'Authorization': `ResyAPI api_key="${this.config.apiKey}"`,
        'X-Resy-Auth-Token': this.authToken ?? '',
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) throw new Error(`RESY API error: ${resp.status} ${resp.statusText}`);
    return resp.json() as Promise<T>;
  }

  private extractHour(dateTime: string): string {
    const d = new Date(dateTime);
    return `${String(d.getHours()).padStart(2, '0')}:00`;
  }
}

// ============================================================================
// Raw RESY API types (internal)
// ============================================================================

interface RawResyResponse {
  results?: {
    venues?: Array<{
      slots?: Array<{
        config?: { id?: string; type?: string };
        date?: { start?: string; end?: string };
        size?: { min?: number; max?: number };
        payment?: { cancellation_fee?: number };
      }>;
    }>;
  };
}
