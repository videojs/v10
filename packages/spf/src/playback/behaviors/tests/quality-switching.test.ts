import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { BandwidthState } from '../../../media/abr/bandwidth-estimator';
import type { PartiallyResolvedVideoTrack, Presentation, VideoSelectionSet } from '../../../media/types';
import {
  DEFAULT_SWITCHING_CONFIG,
  type QualitySwitchingConfig,
  type QualitySwitchingState,
  switchQuality,
} from '../quality-switching';

// ============================================================================
// Test helpers
// ============================================================================

function makeState(initial: QualitySwitchingState = {}): StateSignals<QualitySwitchingState> {
  return {
    presentation: signal<Presentation | undefined>(initial.presentation),
    bandwidthState: signal<BandwidthState | undefined>(initial.bandwidthState),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    abrDisabled: signal<boolean | undefined>(initial.abrDisabled),
  };
}

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

const createBandwidthState = (bps: number): BandwidthState => ({
  fastEstimate: bps,
  fastTotalWeight: 100,
  slowEstimate: bps,
  slowTotalWeight: 100,
  bytesSampled: 500_000,
});

// Flush two levels of microtasks: one to fire the subscriber, one to process
// any state.patch() the subscriber itself triggers.
const flush = () => Promise.resolve().then(() => Promise.resolve());

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
      const state = makeState({
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const cleanup = switchQuality({ state });
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      cleanup();
    });

    it('does nothing without bandwidthState', () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      expect(state.selectedVideoTrackId.get()).toBe('360p');
      cleanup();
    });

    it('does nothing when presentation has no video tracks', () => {
      const emptyPresentation: Presentation = {
        id: 'p',
        url: 'https://example.com/playlist.m3u8',
        selectionSets: [],
      };
      const state = makeState({
        presentation: emptyPresentation,
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const cleanup = switchQuality({ state });
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      cleanup();
    });

    it('does nothing when already on the optimal track', () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const cleanup = switchQuality({ state });
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      cleanup();
    });
  });

  describe('initial selection', () => {
    it('selects optimal track on first bandwidth estimate when no track is selected', () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
      });

      const cleanup = switchQuality({ state });
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      cleanup();
    });
  });

  describe('downgrade', () => {
    it('downgrades immediately when bandwidth drops below current quality threshold', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const cleanup = switchQuality({ state });
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      state.bandwidthState.set(createBandwidthState(800_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      cleanup();
    });

    it('does not apply upgrade interval to downgrades', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(6_000_000),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      expect(state.selectedVideoTrackId.get()).toBe('1080p');

      state.bandwidthState.set(createBandwidthState(700_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      cleanup();
    });
  });

  describe('upgrade', () => {
    it('upgrades after bandwidth improves and minUpgradeInterval has passed', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(800_000),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      state.bandwidthState.set(createBandwidthState(3_000_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      vi.advanceTimersByTime(DEFAULT_SWITCHING_CONFIG.minUpgradeInterval + 1);

      state.bandwidthState.set(createBandwidthState(3_000_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      cleanup();
    });

    it('upgrades immediately on first switch (no prior upgrade)', () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      cleanup();
    });

    it('blocks second upgrade until interval passes', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      vi.advanceTimersByTime(1000);
      state.bandwidthState.set(createBandwidthState(6_000_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      vi.advanceTimersByTime(DEFAULT_SWITCHING_CONFIG.minUpgradeInterval + 1);
      state.bandwidthState.set(createBandwidthState(6_000_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('1080p');

      cleanup();
    });
  });

  describe('configuration', () => {
    it('uses custom safetyMargin', () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '360p',
      });

      const config: QualitySwitchingConfig = { safetyMargin: 1.0 };
      const cleanup = switchQuality({ state }, config);
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      cleanup();
    });

    it('uses custom minUpgradeInterval', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(800_000),
        selectedVideoTrackId: '360p',
      });

      const config: QualitySwitchingConfig = { minUpgradeInterval: 2000 };
      const cleanup = switchQuality({ state }, config);

      state.bandwidthState.set(createBandwidthState(3_000_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      vi.advanceTimersByTime(2001);
      state.bandwidthState.set(createBandwidthState(3_000_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      cleanup();
    });

    it('uses defaultBandwidth when estimate is not yet reliable (insufficient samples)', () => {
      const unreliableState: BandwidthState = {
        fastEstimate: 0,
        fastTotalWeight: 0,
        slowEstimate: 0,
        slowTotalWeight: 0,
        bytesSampled: 0,
      };

      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: unreliableState,
        selectedVideoTrackId: '360p',
      });

      const config: QualitySwitchingConfig = { defaultBandwidth: 5_000_000 };
      const cleanup = switchQuality({ state }, config);
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      cleanup();
    });
  });

  describe('cleanup', () => {
    it('stops reacting after cleanup', () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(800_000),
        selectedVideoTrackId: '360p',
      });

      const cleanup = switchQuality({ state });
      cleanup();

      vi.advanceTimersByTime(DEFAULT_SWITCHING_CONFIG.minUpgradeInterval + 1);
      state.bandwidthState.set(createBandwidthState(6_000_000));
      expect(state.selectedVideoTrackId.get()).toBe('360p');
    });
  });
});
