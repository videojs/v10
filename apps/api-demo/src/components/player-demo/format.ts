import type { TimeRangeLike } from '@videojs/core';

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function num(value: number): string {
  if (Number.isNaN(value)) return 'NaN';
  if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

export function quote(value: string): string {
  return `"${value}"`;
}

export function ranges(value: TimeRangeLike): string {
  if (!value || value.length === 0) return '(empty)';
  const parts: string[] = [];
  for (let i = 0; i < value.length; i++) parts.push(`${num(value.start(i))}–${num(value.end(i))}`);
  return `[${parts.join(', ')}]`;
}
