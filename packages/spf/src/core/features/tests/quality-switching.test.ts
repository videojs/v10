import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BandwidthState } from '../../abr/bandwidth-estimator';
import { createState } from '../../state/create-state';
import type { PartiallyResolvedVideoTrack, Presentation, VideoSelectionSet } from '../../types';
import {
  DEFAULT_SWITCHING_CONFIG,
  type QualitySwitchingConfig,
  type QualitySwitchingState,
  switchQuality,
} from '../quality-switching';

// ============================================================================
// Test helpers
// ============================================================================

const createVideoTrack = (id: string, bandwidth: number): PartiallyResolvedVideoTrack => ({
  type: 'video',
  codecs: [],
  id,
  url: `https://example.com/${id}.m3u8`,
  bandwidth,
  mimeType: 'video/mp4',
});

const createPresentation = (tracks: PartiallyResolvedVideoTrack[]): Presentation =>
  ({
    id: 'presentation-1',
    url: 'https://example.com/playlist.m3u8',
    selectionSets: [
      {
        id: 'video-set',
        type: 'video' as const,
        switchingSets: [
          {
            id: 'video-switching',
            type: 'video' as const,
            tracks,
          },
        ],
      } as VideoSelectionSet,
    ],
  }) as Presentation;

/**
 * Creates a BandwidthState with sufficient samples for a reliable estimate.
 * fastEstimate/slowEstimate are set directly to the target bps value.
 * With totalWeight=100, the zero-factor correction is ~1.0, so getBandwidthEstimate
 * returns approximately the provided value.
 */
const createBandwidthState = (bps: number): BandwidthState => ({
  fastEstimate: bps,
  fastTotalWeight: 100,
  slowEstimate: bps,
  slowTotalWeight: 100,
  bytesSampled: 500_000, // Well above minTotalBytes (128 KB) — real estimate used
});

// Flush two levels of microtasks: one to fire the subscriber, one to process
// any state.patch() the subscriber itself triggers.
const flush = () => Promise.resolve().then(() => Promise.resolve());

// ABR ladder used across multiple tests
const tracks = [
  createVideoTrack('360p', 600_000),
  createVideoTrack('720p', 2_400_000),
  createVideoTrack('1080p', 4_800_000),
];

// ============================================================================
// switchQuality
// ============================================================================

describe('switchQuality', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('no-op conditions', () => {
    it('does nothing without a presentation', () => {
      const state = createState<QualitySwitchingState>({
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const cleanup = switchQuality({ state });
      expect(state.current.selectedVideoTrackId).toBe('720p');
      cleanup();
    });

    it('does nothing without bandwidthState', () => {
      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      expect(state.current.selectedVideoTrackId).toBe('360p');
      cleanup();
    });

    it('does nothing when presentation has no video tracks', () => {
      const emptyPresentation: Presentation = {
        id: 'p',
        url: 'https://example.com/playlist.m3u8',
        selectionSets: [],
      };
      const state = createState<QualitySwitchingState>({
        presentation: emptyPresentation,
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const cleanup = switchQuality({ state });
      expect(state.current.selectedVideoTrackId).toBe('720p');
      cleanup();
    });

    it('does nothing when already on the optimal track', () => {
      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        // ~3 Mbps → optimal is 720p with default safety margin
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const cleanup = switchQuality({ state });
      expect(state.current.selectedVideoTrackId).toBe('720p');
      cleanup();
    });
  });

  describe('initial selection', () => {
    it('selects optimal track on first bandwidth estimate when no track is selected', () => {
      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        // No selectedVideoTrackId yet
      });

      const cleanup = switchQuality({ state });
      // Initial subscriber fire is synchronous — result visible via #pending
      // 3 Mbps → 720p fits (needs 2.4M/0.85 ≈ 2.82 Mbps), 1080p doesn't
      expect(state.current.selectedVideoTrackId).toBe('720p');
      cleanup();
    });
  });

  describe('downgrade', () => {
    it('downgrades immediately when bandwidth drops below current quality threshold', async () => {
      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const cleanup = switchQuality({ state });
      expect(state.current.selectedVideoTrackId).toBe('720p');

      // Bandwidth drops — 800 Kbps can only fit 360p (needs 600K/0.85 ≈ 706 Kbps)
      state.patch({ bandwidthState: createBandwidthState(800_000) });
      await flush();
      expect(state.current.selectedVideoTrackId).toBe('360p');

      cleanup();
    });

    it('does not apply upgrade interval to downgrades', async () => {
      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(6_000_000),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      // First fire (synchronous): upgrade 360p → 1080p since 6 Mbps fits
      expect(state.current.selectedVideoTrackId).toBe('1080p');

      // Immediately drop bandwidth (no time passes) — should still downgrade
      state.patch({ bandwidthState: createBandwidthState(700_000) });
      await flush();
      expect(state.current.selectedVideoTrackId).toBe('360p');

      cleanup();
    });
  });

  describe('upgrade', () => {
    it('upgrades after bandwidth improves and minUpgradeInterval has passed', async () => {
      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(800_000),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      expect(state.current.selectedVideoTrackId).toBe('360p');

      // Bandwidth improves but not enough time has passed since creation
      state.patch({ bandwidthState: createBandwidthState(3_000_000) });
      await flush();
      expect(state.current.selectedVideoTrackId).toBe('360p'); // blocked

      // Advance time past the upgrade interval
      vi.advanceTimersByTime(DEFAULT_SWITCHING_CONFIG.minUpgradeInterval + 1);

      // Trigger another state change to re-evaluate
      state.patch({ bandwidthState: createBandwidthState(3_000_000) });
      await flush();
      expect(state.current.selectedVideoTrackId).toBe('720p');

      cleanup();
    });

    it('upgrades immediately on first switch (no prior upgrade)', () => {
      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      // Initial fire is synchronous — upgrade happens in the subscribe callback
      expect(state.current.selectedVideoTrackId).toBe('720p');
      cleanup();
    });

    it('blocks second upgrade until interval passes', async () => {
      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      // First upgrade: 360p → 720p (initial synchronous fire, no cooldown)
      expect(state.current.selectedVideoTrackId).toBe('720p');

      // Bandwidth jumps to 6 Mbps shortly after — 1080p desired but blocked
      vi.advanceTimersByTime(1000);
      state.patch({ bandwidthState: createBandwidthState(6_000_000) });
      await flush();
      expect(state.current.selectedVideoTrackId).toBe('720p'); // blocked

      // After interval, upgrade proceeds
      vi.advanceTimersByTime(DEFAULT_SWITCHING_CONFIG.minUpgradeInterval + 1);
      state.patch({ bandwidthState: createBandwidthState(6_000_000) });
      await flush();
      expect(state.current.selectedVideoTrackId).toBe('1080p');

      cleanup();
    });
  });

  describe('configuration', () => {
    it('uses custom safetyMargin', () => {
      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        // With safetyMargin=1.0, requiredBandwidth == trackBandwidth (no headroom)
        // 3 Mbps: 720p (2.4M) fits, 1080p (4.8M) does not
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '360p',
      });

      const config: QualitySwitchingConfig = { safetyMargin: 1.0 };
      const cleanup = switchQuality({ state }, config);
      expect(state.current.selectedVideoTrackId).toBe('720p');
      cleanup();
    });

    it('uses custom minUpgradeInterval', async () => {
      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(800_000),
        selectedVideoTrackId: '360p',
      });

      const config: QualitySwitchingConfig = { minUpgradeInterval: 2000 };
      const cleanup = switchQuality({ state }, config);

      // Bandwidth improves — blocked by interval
      state.patch({ bandwidthState: createBandwidthState(3_000_000) });
      await flush();
      expect(state.current.selectedVideoTrackId).toBe('360p'); // blocked

      // Advance only 2000ms (custom interval)
      vi.advanceTimersByTime(2001);
      state.patch({ bandwidthState: createBandwidthState(3_000_000) });
      await flush();
      expect(state.current.selectedVideoTrackId).toBe('720p');

      cleanup();
    });

    it('uses defaultBandwidth when estimate is not yet reliable (insufficient samples)', () => {
      const unreliableState: BandwidthState = {
        fastEstimate: 0,
        fastTotalWeight: 0,
        slowEstimate: 0,
        slowTotalWeight: 0,
        bytesSampled: 0, // No samples → hasGoodEstimate is false
      };

      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        bandwidthState: unreliableState,
        selectedVideoTrackId: '360p',
      });

      // With defaultBandwidth=5 Mbps: 720p (needs 2.4M/0.85 ≈ 2.82M) fits,
      // 1080p (needs 4.8M/0.85 ≈ 5.65M) does not → selects 720p
      const config: QualitySwitchingConfig = { defaultBandwidth: 5_000_000 };
      const cleanup = switchQuality({ state }, config);
      expect(state.current.selectedVideoTrackId).toBe('720p');
      cleanup();
    });
  });

  describe('cleanup', () => {
    it('stops reacting after cleanup', () => {
      const state = createState<QualitySwitchingState>({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(800_000),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      cleanup();

      // After cleanup, bandwidth changes should not trigger switches
      vi.advanceTimersByTime(DEFAULT_SWITCHING_CONFIG.minUpgradeInterval + 1);
      state.patch({ bandwidthState: createBandwidthState(6_000_000) });
      // No await needed — no subscriber fires after cleanup
      expect(state.current.selectedVideoTrackId).toBe('360p');
    });
  });
});
