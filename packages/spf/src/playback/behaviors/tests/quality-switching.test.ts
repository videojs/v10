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
  describe("'preconditions-unmet' state", () => {
    it('clears selectedVideoTrackId on initial entry when no presentation is set', async () => {
      // Slot invariant: in 'preconditions-unmet', the slot is empty. Even a
      // pre-seeded id is cleared, since it can't refer to anything until a
      // presentation is resolved.
      const state = makeState({
        bandwidthState: createBandwidthState(3_000_000),
        selectedVideoTrackId: 'stale-id',
      });

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
  });

  describe('default-pick on src load', () => {
    it("picks the first available video track when entering 'evaluating'", async () => {
      const presentation = createPresentation([createVideoTrack('360p', 600_000)]);
      const state = makeState({ presentation });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      reactor.destroy();
    });

    it("picks default when starting in 'disabled' (abrDisabled=true at src load)", async () => {
      const presentation = createPresentation([createVideoTrack('360p', 600_000)]);
      const state = makeState({ presentation, abrDisabled: true });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      reactor.destroy();
    });

    it('does not overwrite an existing selection on src load', async () => {
      const presentation = createPresentation(tracks);
      const state = makeState({ presentation, selectedVideoTrackId: '1080p' });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      // Without bandwidth, ABR can't override; the pre-seeded value persists.
      expect(state.selectedVideoTrackId.get()).toBe('1080p');

      reactor.destroy();
    });

    it('re-picks default after src reset (presentation undefined → new resolved)', async () => {
      const state = makeState({ presentation: createPresentation(tracks) });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      state.presentation.set(undefined);
      await flush();
      expect(state.selectedVideoTrackId.get()).toBeUndefined();

      const newPresentation = { ...createPresentation(tracks), id: 'pres-2' };
      state.presentation.set(newPresentation);
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      reactor.destroy();
    });
  });

  describe("'disabled' state (abrDisabled === true)", () => {
    it('does not run ABR while disabled', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(6_000_000),
        selectedVideoTrackId: '360p',
        abrDisabled: true,
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      // 6 Mbps would normally select 1080p, but ABR is disabled.
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      reactor.destroy();
    });

    it('preserves selection when abrDisabled toggles true mid-stream', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      state.abrDisabled.set(true);
      await flush();
      // Toggle moves us 'evaluating' → 'disabled'; the selection persists
      // (no clear on this transition — only on entering 'preconditions-unmet').
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      // Manual write while disabled — ABR must not overwrite.
      state.selectedVideoTrackId.set('360p');
      state.bandwidthState.set(createBandwidthState(6_000_000));
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('360p');

      reactor.destroy();
    });

    it('resumes ABR when abrDisabled toggles false', async () => {
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

    it('clears selection on src unload from disabled', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        selectedVideoTrackId: '720p',
        abrDisabled: true,
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      state.presentation.set(undefined);
      await flush();
      expect(state.selectedVideoTrackId.get()).toBeUndefined();

      reactor.destroy();
    });
  });

  describe('ABR — first-evaluation', () => {
    it('selects optimal track when entering with no selection and bandwidth available', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
      });

      const reactor = switchVideoQuality.setup({ state });
      await flush();
      // Default-pick fires '360p' on entry; ABR effect immediately overrides
      // to optimal (720p at 3 Mbps) since no upgradeMargin has a "previous
      // upgrade" to compare against — there's no current track in the prior
      // sense, just a fresh default.
      expect(state.selectedVideoTrackId.get()).toBe('720p');
      reactor.destroy();
    });

    it('first ABR evaluation is unthrottled (jumps multiple tiers at once)', async () => {
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

  describe('ABR — downgrade', () => {
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

  describe('ABR — upgrade', () => {
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

      const config: QualitySwitchingConfig = { safetyMargin: 1.0 };
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
