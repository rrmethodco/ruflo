/**
 * Helixo Formatting Utilities
 *
 * Pure formatting functions for the web UI. No external dependencies.
 */

/**
 * Format a number as USD currency: $1,234.56
 */
export function currency(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Format a decimal as a percentage: 0.28 -> "28.0%"
 */
export function percent(n: number, decimals = 1): string {
  return `${(n * 100).toFixed(decimals)}%`;
}

/**
 * Format large currency values in short form: $12.3K, $1.5M
 */
export function shortCurrency(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

/**
 * Format a time range from 24h HH:mm strings to "11:00 AM - 2:30 PM"
 */
export function timeRange(start: string, end: string): string {
  return `${to12Hour(start)} - ${to12Hour(end)}`;
}

/**
 * Format an ISO date string as "Mon, Mar 25"
 */
export function dayLabel(date: string): string {
  const d = new Date(date + 'T12:00:00Z');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const dayName = dayNames[d.getUTCDay()];
  const month = monthNames[d.getUTCMonth()];
  const day = d.getUTCDate();
  return `${dayName}, ${month} ${day}`;
}

/**
 * Format a plain number with locale grouping: 1234 -> "1,234"
 */
export function number(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Convert a PaceStatus value to a human-readable label.
 */
export function paceStatusLabel(status: string): string {
  switch (status) {
    case 'ahead':            return 'Ahead of Pace';
    case 'on_pace':          return 'On Pace';
    case 'behind':           return 'Behind Pace';
    case 'critical_behind':  return 'Critical — Behind';
    case 'critical_ahead':   return 'Critical — Ahead';
    default:                 return status;
  }
}

/**
 * Return a Tailwind CSS color class for a given PaceStatus.
 */
export function paceStatusColor(status: string): string {
  switch (status) {
    case 'ahead':            return 'text-emerald-600';
    case 'on_pace':          return 'text-sky-600';
    case 'behind':           return 'text-amber-600';
    case 'critical_behind':  return 'text-red-600';
    case 'critical_ahead':   return 'text-purple-600';
    default:                 return 'text-gray-500';
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

/**
 * Convert "17:30" -> "5:30 PM"
 */
function to12Hour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}
