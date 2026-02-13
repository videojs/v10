/** Clamp a value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Snap a value to the nearest step, offset from min. */
export function roundToStep(value: number, step: number, min: number): number {
  const nearest = Math.round((value - min) / step) * step + min;
  const dot = `${step}`.indexOf('.');
  return dot === -1 ? nearest : Number(nearest.toFixed(`${step}`.length - dot - 1));
}
