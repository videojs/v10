/**
 * Exponentially Weighted Moving Average (EWMA)
 *
 * Pure functional implementation of EWMA calculations.
 * Based on Shaka Player's EWMA algorithm.
 */

/**
 * Calculate alpha (decay factor) from half-life.
 *
 * Alpha determines how quickly old data "expires":
 * - alpha close to 1 = slow decay (long memory)
 * - alpha close to 0 = fast decay (short memory)
 *
 * @param halfLife - The quantity of prior samples (by weight) that make up
 *   half of the new estimate. Must be positive.
 * @returns Alpha value between 0 and 1
 *
 * @example
 * const alpha = calculateAlpha(2); // ≈ 0.7071 for 2-second half-life
 */
export function calculateAlpha(halfLife: number): number {
  return Math.exp(Math.log(0.5) / halfLife);
}

/**
 * Calculate exponentially weighted moving average.
 *
 * Updates an estimate by blending a new value with the previous estimate,
 * weighted by the sample duration. Longer samples have more influence.
 *
 * @param prevEstimate - Previous EWMA estimate
 * @param value - New sample value to incorporate
 * @param weight - Sample weight (typically duration in seconds)
 * @param halfLife - Half-life for decay (typically 2-5 seconds)
 * @returns Updated EWMA estimate
 *
 * @example
 * let estimate = 0;
 * estimate = calculateEwma(estimate, 1_000_000, 1, 2); // First sample
 * estimate = calculateEwma(estimate, 2_000_000, 1, 2); // Second sample
 */
export function calculateEwma(prevEstimate: number, value: number, weight: number, halfLife: number): number {
  const alpha = calculateAlpha(halfLife);
  const adjAlpha = alpha ** weight;
  return value * (1 - adjAlpha) + adjAlpha * prevEstimate;
}

/**
 * Apply zero-factor correction to EWMA estimate.
 *
 * The zero-factor correction compensates for bias when starting from zero.
 * Without this correction, early estimates would be artificially low.
 *
 * As totalWeight increases, the correction factor approaches 1, meaning
 * the estimate becomes more reliable and needs less correction.
 *
 * @param estimate - Raw EWMA estimate (uncorrected)
 * @param totalWeight - Accumulated weight from all samples
 * @param halfLife - Half-life used in EWMA calculation
 * @returns Corrected estimate, or 0 if totalWeight is 0
 *
 * @example
 * const raw = calculateEwma(0, 1_000_000, 1, 2);
 * const corrected = applyZeroFactor(raw, 1, 2); // ≈ 1_000_000
 */
export function applyZeroFactor(estimate: number, totalWeight: number, halfLife: number): number {
  if (totalWeight === 0) {
    return 0;
  }

  const alpha = calculateAlpha(halfLife);
  const zeroFactor = 1 - alpha ** totalWeight;
  return estimate / zeroFactor;
}
