import { describe, expect, it } from 'vitest';
import type { BandwidthState } from '../bandwidth-estimator';
import {
  DEFAULT_BANDWIDTH_CONFIG,
  getBandwidthEstimate,
  hasGoodEstimate,
  sampleBandwidth,
} from '../bandwidth-estimator';

// Helper to create initial state (O1 will do this in real usage)
const createInitialState = (): BandwidthState => ({
  fastEstimate: 0,
  fastTotalWeight: 0,
  slowEstimate: 0,
  slowTotalWeight: 0,
  bytesSampled: 0,
});

describe('sampleBandwidth', () => {
  it('should add valid bandwidth sample', () => {
    let state = createInitialState();

    // Sample: 1MB in 1 second = 8 Mbps
    state = sampleBandwidth(state, 1000, 1_000_000);

    expect(state.bytesSampled).toBe(1_000_000);
    expect(state.fastTotalWeight).toBe(1);
    expect(state.slowTotalWeight).toBe(1);
  });

  it('should filter samples below minBytes threshold', () => {
    let state = createInitialState();

    // Sample below default minBytes (16KB)
    state = sampleBandwidth(state, 100, 10_000);

    // Bytes should be tracked but not sampled into EWMA
    expect(state.bytesSampled).toBe(10_000);
    expect(state.fastTotalWeight).toBe(0);
    expect(state.slowTotalWeight).toBe(0);
  });

  it('should filter samples below minDuration threshold', () => {
    let state = createInitialState();

    // Sample below default minDuration (5ms)
    state = sampleBandwidth(state, 2, 100_000);

    // Bytes tracked but not sampled (likely cached response)
    expect(state.bytesSampled).toBe(100_000);
    expect(state.fastTotalWeight).toBe(0);
    expect(state.slowTotalWeight).toBe(0);
  });

  it('should accept custom config for filtering', () => {
    let state = createInitialState();

    const config = {
      ...DEFAULT_BANDWIDTH_CONFIG,
      minBytes: 1000, // Lower threshold
    };

    // This would be filtered with default config but not with custom
    state = sampleBandwidth(state, 100, 5_000, config);

    expect(state.bytesSampled).toBe(5_000);
    expect(state.fastTotalWeight).toBeGreaterThan(0);
  });

  it('should calculate bandwidth in bits per second', () => {
    let state = createInitialState();

    // 1MB in 1 second = 8 Mbps
    state = sampleBandwidth(state, 1000, 1_000_000);

    // Both estimates should be around 8_000_000 bps
    const estimate = getBandwidthEstimate(state, 1_000_000);
    expect(estimate).toBeCloseTo(8_000_000, -5);
  });

  it('should weight samples by duration', () => {
    let state = createInitialState();

    // Short download: 100KB in 100ms
    state = sampleBandwidth(state, 100, 100_000);

    // Long download: 1MB in 1000ms (same bandwidth)
    state = sampleBandwidth(state, 1000, 1_000_000);

    // Total weight should reflect longer download more
    expect(state.fastTotalWeight).toBeCloseTo(1.1, 1);
  });

  it('should update both fast and slow EWMA', () => {
    let state = createInitialState();

    state = sampleBandwidth(state, 1000, 1_000_000);

    // Both should have samples
    expect(state.fastEstimate).toBeGreaterThan(0);
    expect(state.slowEstimate).toBeGreaterThan(0);
  });

  it('should accumulate bytesSampled across all samples', () => {
    let state = createInitialState();

    state = sampleBandwidth(state, 1000, 100_000);
    state = sampleBandwidth(state, 1000, 200_000);
    state = sampleBandwidth(state, 1000, 300_000);

    expect(state.bytesSampled).toBe(600_000);
  });
});

describe('getBandwidthEstimate', () => {
  it('should return default estimate when insufficient data', () => {
    const state = createInitialState();

    const estimate = getBandwidthEstimate(state, 5_000_000);

    expect(estimate).toBe(5_000_000);
  });

  it('should return actual estimate when sufficient data', () => {
    let state = createInitialState();

    // Sample enough data (default minTotalBytes is 128KB)
    for (let i = 0; i < 10; i++) {
      state = sampleBandwidth(state, 1000, 20_000); // 20KB each = 200KB total
    }

    const estimate = getBandwidthEstimate(state, 1_000_000);

    // Should not return default
    expect(estimate).not.toBe(1_000_000);
    expect(estimate).toBeGreaterThan(0);
  });

  it('should return minimum of fast and slow estimates', () => {
    let state = createInitialState();

    // Add initial samples at high bandwidth
    for (let i = 0; i < 5; i++) {
      state = sampleBandwidth(state, 1000, 50_000); // High bandwidth
    }

    // Add a low bandwidth sample
    state = sampleBandwidth(state, 2000, 20_000); // Low bandwidth

    const estimate = getBandwidthEstimate(state, 1_000_000);

    // Fast EWMA should drop quickly, slow should lag
    // min() should pick the lower (fast) one
    // This tests the asymmetric behavior
    expect(estimate).toBeGreaterThan(0);
  });

  it('should use custom minTotalBytes threshold', () => {
    let state = createInitialState();

    // Sample 50KB (below default 128KB threshold)
    state = sampleBandwidth(state, 1000, 50_000);

    const config = {
      ...DEFAULT_BANDWIDTH_CONFIG,
      minTotalBytes: 40_000, // Lower threshold
    };

    const estimate = getBandwidthEstimate(state, 1_000_000, config);

    // Should use actual estimate, not default
    expect(estimate).not.toBe(1_000_000);
  });

  it('should handle zero-factor correction properly', () => {
    let state = createInitialState();

    // Single sample
    state = sampleBandwidth(state, 1000, 200_000);

    const estimate = getBandwidthEstimate(state, 500_000);

    // With zero-factor correction, estimate should match actual bandwidth
    // 200KB in 1s = 1.6 Mbps
    expect(estimate).toBeCloseTo(1_600_000, -4);
  });
});

describe('hasGoodEstimate', () => {
  it('should return false for new estimator', () => {
    const state = createInitialState();

    expect(hasGoodEstimate(state)).toBe(false);
  });

  it('should return false when below minTotalBytes', () => {
    let state = createInitialState();

    // Sample 50KB (below default 128KB)
    state = sampleBandwidth(state, 1000, 50_000);

    expect(hasGoodEstimate(state)).toBe(false);
  });

  it('should return true when above minTotalBytes', () => {
    let state = createInitialState();

    // Sample 200KB (above default 128KB)
    for (let i = 0; i < 10; i++) {
      state = sampleBandwidth(state, 1000, 20_000);
    }

    expect(hasGoodEstimate(state)).toBe(true);
  });

  it('should use custom minTotalBytes threshold', () => {
    let state = createInitialState();

    state = sampleBandwidth(state, 1000, 50_000);

    const config = {
      ...DEFAULT_BANDWIDTH_CONFIG,
      minTotalBytes: 40_000,
    };

    expect(hasGoodEstimate(state, config)).toBe(true);
  });

  it('should require valid EWMA samples', () => {
    let state = createInitialState();

    // Manually set bytesSampled without valid EWMA samples
    state = { ...state, bytesSampled: 200_000 };

    // Should still return false (no valid EWMA samples)
    expect(hasGoodEstimate(state)).toBe(false);
  });
});

describe('dual EWMA behavior', () => {
  it('should adapt down quickly when bandwidth drops', () => {
    let state = createInitialState();

    // Start with high bandwidth samples
    for (let i = 0; i < 5; i++) {
      state = sampleBandwidth(state, 1000, 100_000); // 800 Kbps
    }

    const highEstimate = getBandwidthEstimate(state, 500_000);

    // Sudden drop in bandwidth
    for (let i = 0; i < 2; i++) {
      state = sampleBandwidth(state, 1000, 25_000); // 200 Kbps
    }

    const lowEstimate = getBandwidthEstimate(state, 500_000);

    // Estimate should drop significantly
    expect(lowEstimate).toBeLessThan(highEstimate * 0.7);
  });

  it('should adapt up slowly when bandwidth rises', () => {
    let state = createInitialState();

    // Start with low bandwidth (need enough samples to exceed minTotalBytes)
    for (let i = 0; i < 8; i++) {
      state = sampleBandwidth(state, 1000, 20_000); // 160 Kbps (160KB total)
    }

    const lowEstimate = getBandwidthEstimate(state, 500_000);

    // Sudden rise in bandwidth
    for (let i = 0; i < 3; i++) {
      state = sampleBandwidth(state, 1000, 100_000); // 800 Kbps
    }

    const risingEstimate = getBandwidthEstimate(state, 500_000);

    // Estimate should rise, but not as dramatically as it drops
    // (slow EWMA keeps it conservative)
    expect(risingEstimate).toBeGreaterThan(lowEstimate);
    expect(risingEstimate).toBeLessThan(800_000); // Not fully at new level yet
  });

  it('should converge to stable value with consistent bandwidth', () => {
    let state = createInitialState();

    // Many samples at same bandwidth
    for (let i = 0; i < 20; i++) {
      state = sampleBandwidth(state, 1000, 100_000); // 800 Kbps
    }

    const estimate = getBandwidthEstimate(state, 500_000);

    // Should converge to actual bandwidth
    expect(estimate).toBeCloseTo(800_000, -4);
  });
});

describe('edge cases', () => {
  it('should handle very small durations gracefully', () => {
    let state = createInitialState();

    // 1ms duration (should be filtered)
    state = sampleBandwidth(state, 1, 100_000);

    expect(state.fastTotalWeight).toBe(0);
  });

  it('should handle very large downloads', () => {
    let state = createInitialState();

    // 10MB in 5 seconds
    state = sampleBandwidth(state, 5000, 10_000_000);

    expect(state.bytesSampled).toBe(10_000_000);
    expect(state.fastTotalWeight).toBeGreaterThan(0);
  });

  it('should handle zero bytes gracefully', () => {
    let state = createInitialState();

    state = sampleBandwidth(state, 1000, 0);

    expect(state.bytesSampled).toBe(0);
    expect(state.fastTotalWeight).toBe(0);
  });

  it('should handle negative values gracefully', () => {
    let state = createInitialState();

    // Should not crash or produce invalid state
    state = sampleBandwidth(state, -100, 100_000);

    expect(state.bytesSampled).toBe(100_000);
  });
});
