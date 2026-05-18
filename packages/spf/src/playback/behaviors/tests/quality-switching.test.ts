import { describe, expect, it, vi } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type {
  MaybeResolvedPresentation,
  PartiallyResolvedVideoTrack,
  Presentation,
  VideoSelectionSet,
  VideoTrack,
} from '../../../media/types';
import type { BandwidthState } from '../../../network/bandwidth-estimator';
import { type QualitySwitchingConfig, type QualitySwitchingState, switchVideoQuality } from '../quality-switching';

// ============================================================================
// Test helpers
// ============================================================================

function makeState(initial: QualitySwitchingState = {}): StateSignals<QualitySwitchingState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    bandwidthState: signal<BandwidthState | undefined>(initial.bandwidthState),
    selectedVideoTrackId: signal<string | undefined>(initial.selectedVideoTrackId),
    userVideoTrackSelection: signal<Partial<VideoTrack> | undefined>(initial.userVideoTrackSelection),
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
  describe('lifecycle (presentation-unresolved ↔ presentation-resolved)', () => {
    it('does nothing without a presentation', async () => {
      const state = makeState({ bandwidthState: createBandwidthState(3_000_000) });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBeUndefined();
      reactor.destroy();
    });

    it('clears selectedVideoTrackId on src unload', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      state.presentation.set(undefined);
      await flush();
      expect(state.selectedVideoTrackId.get()).toBeUndefined();

      reactor.destroy();
    });

    it('clears selectedVideoTrackId on destroy', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      reactor.destroy();
      // Destroy fires the 'presentation-resolved' entry's cleanup, which clears the slot.
      expect(state.selectedVideoTrackId.get()).toBeUndefined();
    });

    it('re-picks default after src reset (presentation undefined → new resolved)', async () => {
      const state = makeState({ presentation: createPresentation(tracks) });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      // initialBandwidth-driven default — see "default-pick" describe.
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      state.presentation.set(undefined);
      await flush();
      expect(state.selectedVideoTrackId.get()).toBeUndefined();

      const newPresentation = { ...createPresentation(tracks), id: 'pres-2' };
      state.presentation.set(newPresentation);
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      reactor.destroy();
    });
  });

  describe('default-pick (no bandwidthState yet)', () => {
    it('picks the initialBandwidth-optimal track when bandwidthState is undefined and no selection', async () => {
      const state = makeState({ presentation: createPresentation(tracks) });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      // Default initialBandwidth is 5 Mbps; 1080p (4.8 Mbps) requires
      // 5.65 Mbps with safetyMargin 0.85, so the optimal is 720p.
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      reactor.destroy();
    });

    it('applies initialBandwidth-driven downgrade when bandwidthState is undefined', async () => {
      // 1080p preselected, but at default initialBandwidth (5 Mbps) the
      // optimal is 720p — so we downgrade immediately. Pre-refactor this
      // branch preserved the existing selection; that protective behavior
      // never fired in production (engine seeds bandwidthState) and is now
      // unified with the pre-trust path.
      const state = makeState({ presentation: createPresentation(tracks), selectedVideoTrackId: '1080p' });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      reactor.destroy();
    });
  });

  describe('userVideoTrackSelection (filter)', () => {
    it('locks to a specific track when filter narrows to exactly one candidate', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(6_000_000),
        userVideoTrackSelection: { id: '360p' },
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      // Bandwidth would normally select 1080p, but the filter locks to 360p.
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      reactor.destroy();
    });

    it('does not re-run ABR while filter narrows to exactly one (no bandwidth subscription)', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        userVideoTrackSelection: { id: '720p' },
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      // Mutate bandwidth dramatically. Under the exact-1 short-circuit, the
      // effect doesn't subscribe to bandwidthState, so changes don't
      // re-fire it and the locked selection holds.
      const setSpy = vi.spyOn(state.selectedVideoTrackId, 'set');
      state.bandwidthState.set(createBandwidthState(6_000_000));
      await flush();
      state.bandwidthState.set(createBandwidthState(500_000));
      await flush();

      expect(state.selectedVideoTrackId.get()).toBe('720p');
      // The slot was not written during the bandwidth changes.
      expect(setSpy).not.toHaveBeenCalled();

      reactor.destroy();
    });

    it('resumes ABR when filter is cleared', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(6_000_000),
        userVideoTrackSelection: { id: '360p' },
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      state.userVideoTrackSelection.set(undefined);
      await flush();
      // ABR resumes, picks optimal at 6 Mbps.
      expect(state.selectedVideoTrackId.get()).toBe('1080p');

      reactor.destroy();
    });

    it('falls back to all tracks when filter matches no candidate', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        userVideoTrackSelection: { id: 'nonexistent-from-old-src' },
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      // Filter matches zero tracks → fall back to full candidate set →
      // ABR picks optimal at 3 Mbps.
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      reactor.destroy();
    });

    it('runs ABR within filter when it narrows to multiple candidates', async () => {
      // Two tracks at the same height — a `{ height: 1080 }` filter would
      // narrow to both but not one. ABR picks among the matches.
      const t1080a = { ...createVideoTrack('1080-low', 3_000_000), height: 1080, width: 1920 };
      const t1080b = { ...createVideoTrack('1080-high', 5_500_000), height: 1080, width: 1920 };
      const t720 = { ...createVideoTrack('720p', 2_400_000), height: 720, width: 1280 };

      const state = makeState({
        presentation: createPresentation([t720, t1080a, t1080b]),
        bandwidthState: createBandwidthState(8_000_000),
        userVideoTrackSelection: { height: 1080 },
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      // Among 1080a (3M) and 1080b (5.5M), 8 Mbps fits both; selectQuality
      // picks the highest bandwidth track (5.5M → 1080-high).
      expect(state.selectedVideoTrackId.get()).toBe('1080-high');

      reactor.destroy();
    });
  });

  describe('ABR downgrade', () => {
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

  describe('ABR upgrade', () => {
    it('applies upgrade when optimal exceeds current.bandwidth × upgradeMargin', async () => {
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
      // 1.0M → 1.1M is 10%, below the default 1.15 upgradeMargin → skip.
      const closeTracks = [createVideoTrack('low', 1_000_000), createVideoTrack('high', 1_100_000)];
      const state = makeState({
        presentation: createPresentation(closeTracks),
        bandwidthState: createBandwidthState(1_500_000),
        selectedVideoTrackId: 'low',
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('low');

      reactor.destroy();
    });
  });

  describe('configuration', () => {
    it('uses custom safetyMargin', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: '360p',
      });

      const config: QualitySwitchingConfig = { quality: { safetyMargin: 1.0 } };
      const reactor = switchVideoQuality.setup({ state, config });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      reactor.destroy();
    });

    it('uses custom upgradeMargin', async () => {
      const closeTracks = [createVideoTrack('low', 1_000_000), createVideoTrack('high', 1_100_000)];
      const state = makeState({
        presentation: createPresentation(closeTracks),
        bandwidthState: createBandwidthState(1_500_000),
        selectedVideoTrackId: 'low',
      });

      const config: QualitySwitchingConfig = { quality: { upgradeMargin: 1.05 } };
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

    it('uses custom picker for initial pick; ABR adjusts from there', async () => {
      // Picker pins the initial pick to 360p (lowest, regardless of bandwidth).
      // At 6 Mbps, ABR would default-pick 1080p; the picker overrides for
      // the initial pick. Subsequent ABR upgrade applies normally.
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(6_000_000),
      });

      const config: QualitySwitchingConfig = { picker: () => '360p' };
      const reactor = switchVideoQuality.setup({ state, config });
      await flush();
      // Picker drives the initial selection.
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      // Bumping bandwidth re-fires the effect; the slot is no longer empty,
      // so ABR runs and upgrades to 1080p (at 6 Mbps with default margins).
      state.bandwidthState.set(createBandwidthState(6_000_001));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('1080p');

      reactor.destroy();
    });

    it('picker returning undefined falls back to bandwidth-aware default', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
      });

      const config: QualitySwitchingConfig = { picker: () => undefined };
      const reactor = switchVideoQuality.setup({ state, config });
      await flush();
      // 3 Mbps with default safetyMargin 0.85 → 720p (1080p needs 5.65 Mbps).
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      reactor.destroy();
    });

    it('uses custom minTotalBytes threshold to trust the measured estimate sooner', async () => {
      // 800 kbps measured, only 50 KB sampled — below the default 128 KB
      // threshold (would fall back to initialBandwidth) but above our
      // custom 40 KB override.
      const partialState: BandwidthState = {
        fastEstimate: 800_000,
        fastTotalWeight: 10,
        slowEstimate: 800_000,
        slowTotalWeight: 10,
        bytesSampled: 50_000,
      };

      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: partialState,
        selectedVideoTrackId: '720p',
      });

      const config: QualitySwitchingConfig = {
        bandwidth: { minTotalBytes: 40_000 },
        initialBandwidth: 5_000_000,
      };
      const reactor = switchVideoQuality.setup({ state, config });
      await flush();
      // With the override the 800 kbps measurement is trusted and drives a
      // downgrade to 360p; at the default threshold the 5 Mbps initial
      // would have kept 720p.
      expect(state.selectedVideoTrackId.get()).toBe('360p');
      reactor.destroy();
    });
  });
});
