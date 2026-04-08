/**
 * Helixo Shared Utilities
 * Common time, math, and date functions used across all engines.
 */

import type { DayOfWeek } from './types.js';

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function dateToDayOfWeek(date: string): DayOfWeek {
  const DAY_ORDER: DayOfWeek[] = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  ];
  const d = new Date(date + 'T12:00:00Z');
  const js = d.getUTCDay();
  return DAY_ORDER[(js + 6) % 7];
}

export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function stddev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const avg = mean(vals);
  const variance = vals.reduce((s, v) => s + (v - avg) ** 2, 0) / (vals.length - 1);
  return Math.sqrt(variance);
}

export function removeOutliers(vals: number[], threshold: number): number[] {
  if (vals.length < 3) return vals;
  const avg = mean(vals);
  const sd = stddev(vals);
  if (sd === 0) return vals;
  return vals.filter(v => Math.abs(v - avg) / sd <= threshold);
}

export function weightedMean(vals: number[], weights: number[]): number {
  if (vals.length === 0) return 0;
  let sumW = 0;
  let sumVW = 0;
  for (let i = 0; i < vals.length; i++) {
    sumVW += vals[i] * weights[i];
    sumW += weights[i];
  }
  return sumW > 0 ? sumVW / sumW : 0;
}
