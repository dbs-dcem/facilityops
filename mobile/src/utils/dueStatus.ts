import type { DueState, DueStatus, IntervalKey, Procedure, SystemKey } from '../types';

export const INTERVAL_DAYS: Record<IntervalKey, number> = {
  daily: 1, weekly: 7, monthly: 30, quarterly: 91, annual: 365,
};

export const INTERVAL_LABEL: Record<IntervalKey, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
};

export const INTERVAL_ORDER: IntervalKey[] = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];

export const SYSTEMS: Record<SystemKey, { label: string; color: string; glyph: string }> = {
  power:   { label: 'Power',         color: '#F2B441', glyph: '⚡' },
  cooling: { label: 'Cooling',       color: '#5BAEF0', glyph: '❄' },
  fire:    { label: 'Fire & Safety', color: '#FF5C5C', glyph: '◉' },
  env:     { label: 'Environmental', color: '#3DDC97', glyph: '▦' },
  custom:  { label: 'Custom',        color: '#8A99A6', glyph: '◈' },
};

export function sysInfoFor(p: Pick<Procedure, 'system' | 'systemLabel'>): { label: string; color: string; glyph: string } {
  if (p.system === 'custom') return { label: p.systemLabel ?? 'Custom', color: '#8A99A6', glyph: '◈' };
  return SYSTEMS[p.system];
}

export const STATUS_META: Record<DueState, { color: string; label: string }> = {
  overdue: { color: '#FF5C5C', label: 'OVERDUE' },
  due:     { color: '#F2B441', label: 'DUE SOON' },
  ok:      { color: '#3DDC97', label: 'ON TRACK' },
};

export function statusFor(lastCompletedAt: Date | null, interval: IntervalKey): DueStatus {
  const intervalDays = INTERVAL_DAYS[interval];
  if (!lastCompletedAt) return { state: 'overdue', remaining: -intervalDays };
  const daysSince = Math.floor((Date.now() - lastCompletedAt.getTime()) / 86_400_000);
  const remaining = intervalDays - daysSince;
  if (remaining < 0) return { state: 'overdue', remaining };
  if (remaining <= Math.max(1, Math.round(intervalDays * 0.15))) return { state: 'due', remaining };
  return { state: 'ok', remaining };
}

export function dueLabel(s: DueStatus): string {
  if (s.state === 'overdue') return `${Math.abs(s.remaining)}d overdue`;
  if (s.remaining === 0) return 'due today';
  return `due in ${s.remaining}d`;
}
