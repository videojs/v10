import { describe, expect, it } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { BandwidthState } from '../../../media/abr/bandwidth-estimator';
import type {
  MaybeResolvedPresentation,
  PartiallyResolvedVideoTrack,
  Presentation,
  VideoSelectionSet,
} from '../../../media/types';
import { type QualitySwitchingConfig, type QualitySwitchingState, switchVideoQuality } from '../quality-switching';

// ============================================================================
// Test helpers
// ============================================================================

function makeState(initial: QualitySwitchingState = {}): StateSignals<QualitySwitchingState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
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

// Drain microtasks so signal-driven re-runs land before assertions.
const flush = () => Promise.resolve().then(() => Promise.resolve());

const tracks = [
  createVideoTrack('360p', 600_000),
  createVideoTrack('720p', 2_400_000),
  createVideoTrack('1080p', 4_800_000),
];

// ============================================================================
// switchVideoQuality
// ============================================================================

describe('switchVideoQuality', () => {
  describe('idle conditions', () => {
    it('does nothing without a presentation', async () => {
      const state = makeState({
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      reactor.destroy();
    });

    it('does nothing without bandwidthState', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        selectedVideoTrackId: '360p',
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');
      reactor.destroy();
    });

    it('does nothing when presentation has no video tracks', async () => {
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

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      reactor.destroy();
    });

    it('does nothing when abrDisabled is true', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(6_000_000),
        selectedVideoTrackId: '360p',
        abrDisabled: true,
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');
      reactor.destroy();
    });

    it('does nothing when already on the optimal track', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      reactor.destroy();
    });
  });

  describe('initial selection', () => {
    it('selects optimal track on first evaluation when no track is selected', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      reactor.destroy();
    });

    it('first evaluation is unthrottled (jumps multiple tiers at once)', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(6_000_000),
        selectedVideoTrackId: '360p',
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('1080p');
      reactor.destroy();
    });
  });

  describe('downgrade', () => {
    it('downgrades immediately when bandwidth drops', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      state.bandwidthState.set(createBandwidthState(800_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      reactor.destroy();
    });

    it('downgrades are not gated by upgradeMargin', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(6_000_000),
        selectedVideoTrackId: '360p',
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('1080p');

      state.bandwidthState.set(createBandwidthState(700_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      reactor.destroy();
    });
  });

  describe('upgrade', () => {
    it('applies upgrade when optimal exceeds current.bandwidth × upgradeMargin', async () => {
      // 720p (2.4M) → 1080p (4.8M): ratio is 2.0× — well above the default 1.15
      // upgradeMargin, so the upgrade applies once bandwidth is sufficient.
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '720p',
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      state.bandwidthState.set(createBandwidthState(6_000_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('1080p');

      reactor.destroy();
    });

    it('skips upgrade when optimal is within upgradeMargin of current', async () => {
      // Adjacent tiers within 15%: 1.0M → 1.1M is a 10% jump, below the
      // default 1.15 upgradeMargin, so the upgrade is skipped.
      const closeTracks = [createVideoTrack('low', 1_000_000), createVideoTrack('high', 1_100_000)];
      const state = makeState({
        presentation: createPresentation(closeTracks),
        bandwidthState: createBandwidthState(1_500_000),
        selectedVideoTrackId: 'low',
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      // Optimal at 1.5M with safetyMargin 0.85: 'high' needs 1.1M/0.85 ≈ 1.29M (fits).
      // But upgrade gate: 1.1M >= 1.0M × 1.15 → 1.15M? No (1.1 < 1.15). Skip.
      expect(state.selectedVideoTrackId.get()).toBe('low');

      reactor.destroy();
    });
  });

  describe('configuration', () => {
    it('uses custom safetyMargin', async () => {
      // safetyMargin=1.0 means tracks need bandwidth >= track.bandwidth (no
      // headroom). At 3M, 1080p (4.8M required) still doesn't fit, but 720p
      // (2.4M required) does.
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '360p',
      });

      const config: QualitySwitchingConfig = { safetyMargin: 1.0 };
      const reactor = switchVideoQuality.setup({ state, config });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      reactor.destroy();
    });

    it('uses custom upgradeMargin', async () => {
      // With upgradeMargin=1.05, the 1.0M → 1.1M upgrade clears the gate
      // (1.1 >= 1.0 × 1.05 = 1.05).
      const closeTracks = [createVideoTrack('low', 1_000_000), createVideoTrack('high', 1_100_000)];
      const state = makeState({
        presentation: createPresentation(closeTracks),
        bandwidthState: createBandwidthState(1_500_000),
        selectedVideoTrackId: 'low',
      });

      const config: QualitySwitchingConfig = { upgradeMargin: 1.05 };
      const reactor = switchVideoQuality.setup({ state, config });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('high');

      reactor.destroy();
    });

    it('uses initialBandwidth when estimate is not yet reliable', async () => {
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

      const config: QualitySwitchingConfig = { initialBandwidth: 5_000_000 };
      const reactor = switchVideoQuality.setup({ state, config });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      reactor.destroy();
    });
  });

  describe('abrDisabled', () => {
    it('disabling mid-evaluation stops further writes', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '360p',
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      state.abrDisabled.set(true);
      await flush();

      // External writer (or test) sets a manual selection — ABR must not
      // overwrite even as bandwidth changes.
      state.selectedVideoTrackId.set('360p');
      state.bandwidthState.set(createBandwidthState(6_000_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      reactor.destroy();
    });

    it('re-enabling resumes evaluation on next bandwidth tick', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '360p',
        abrDisabled: true,
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      state.abrDisabled.set(false);
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      reactor.destroy();
    });
  });

  describe('source reset', () => {
    it('handles presentation undefined → new presentation', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      // Source unload — selection clearing is selectVideoTrack's job, not
      // this behavior's; but switchVideoQuality must structurally re-enter
      // 'idle' so the next presentation starts fresh.
      state.presentation.set(undefined);
      state.selectedVideoTrackId.set(undefined);
      await flush();

      // New source with fresh tracks at low bandwidth — first decision is
      // unthrottled regardless of any prior switching history.
      state.presentation.set(createPresentation(tracks));
      state.bandwidthState.set(createBandwidthState(800_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      reactor.destroy();
    });
  });

  describe('cleanup', () => {
    it('stops reacting after destroy()', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(800_000),
        selectedVideoTrackId: '360p',
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      reactor.destroy();

      state.bandwidthState.set(createBandwidthState(6_000_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');
    });
  });
});
