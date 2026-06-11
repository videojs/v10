import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type {
  AudioSelectionSet,
  AudioTrack,
  MaybeResolvedPresentation,
  PartiallyResolvedVideoTrack,
  Presentation,
  VideoSelectionSet,
  VideoTrack,
} from '../../../media/types';
import type { BandwidthState } from '../../../network/bandwidth-estimator';
import {
  applyRules,
  type SelectionRule,
  type SwitchVideoTrackConfig,
  switchAudioTrack,
  switchVideoTrack,
} from '../track-switching';

// ============================================================================
// Test helpers
// ============================================================================

interface SwitchVideoTrackState {
  presentation?: MaybeResolvedPresentation;
  bandwidthState?: BandwidthState;
  selectedVideoTrackId?: string;
  userVideoTrackSelection?: Partial<VideoTrack>;
}

function makeState(initial: Partial<SwitchVideoTrackState> = {}): StateSignals<SwitchVideoTrackState> {
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
// switchVideoTrack
// ============================================================================

describe('switchVideoTrack', () => {
  describe('lifecycle (presentation-unresolved ↔ presentation-resolved)', () => {
    it('does nothing without a presentation', async () => {
      const state = makeState({ bandwidthState: createBandwidthState(3_000_000) });

      const reactor = switchVideoTrack.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBeUndefined();
      reactor.destroy();
    });

    it('clears selectedVideoTrackId on src unload', async () => {
      const state = makeState({
        presentation: createPresentation(tracks),
        bandwidthState: createBandwidthState(3_000_000),
      });

      const reactor = switchVideoTrack.setup({ state });
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

      const reactor = switchVideoTrack.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      reactor.destroy();
      // Destroy fires the 'presentation-resolved' entry's cleanup, which clears the slot.
      expect(state.selectedVideoTrackId.get()).toBeUndefined();
    });

    it('re-picks default after src reset (presentation undefined → new resolved)', async () => {
      const state = makeState({ presentation: createPresentation(tracks) });

      const reactor = switchVideoTrack.setup({ state });
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

    it('re-picks when the candidate set changes while staying resolved (constraint-readiness seam)', async () => {
      // The playable candidate set is derived in a `computed` the effect reads
      // reactively, so the pick updates whenever that set changes — not only on
      // an unresolved→resolved gate transition. This is what readies the
      // behavior for dynamic constraints (e.g. CDN failover) that re-prune the
      // set while a presentation stays resolved.
      const state = makeState({ presentation: createPresentation(tracks) });

      const reactor = switchVideoTrack.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('720p');

      // Swap directly to a different resolved presentation (no undefined gap, so
      // the gate state stays 'presentation-resolved' and never re-enters).
      const narrowed = [createVideoTrack('480p', 1_200_000), createVideoTrack('540p', 1_500_000)];
      state.presentation.set({ ...createPresentation(narrowed), id: 'pres-2' });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('540p');

      reactor.destroy();
    });
  });

  describe('default-pick (no bandwidthState yet)', () => {
    it('picks the initialBandwidth-optimal track when bandwidthState is undefined and no selection', async () => {
      const state = makeState({ presentation: createPresentation(tracks) });

      const reactor = switchVideoTrack.setup({ state });
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

      const reactor = switchVideoTrack.setup({ state });
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

      const reactor = switchVideoTrack.setup({ state });
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

      const reactor = switchVideoTrack.setup({ state });
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

      const reactor = switchVideoTrack.setup({ state });
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

      const reactor = switchVideoTrack.setup({ state });
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

      const reactor = switchVideoTrack.setup({ state });
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

      const reactor = switchVideoTrack.setup({ state });
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

      const reactor = switchVideoTrack.setup({ state });
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

      const reactor = switchVideoTrack.setup({ state });
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

      const reactor = switchVideoTrack.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('low');

      reactor.destroy();
    });
  });

  describe('equal-bitrate resolution tie-break', () => {
    const withResolution = (track: PartiallyResolvedVideoTrack, width: number, height: number) => ({
      ...track,
      width,
      height,
    });

    it('prefers the higher-resolution rendition when bitrates are equal', async () => {
      // Same bitrate, but the lower-resolution variant is listed first — a
      // bitrate-only ranker would pick it by manifest order.
      const equalBitrate = [
        withResolution(createVideoTrack('sd', 3_000_000), 640, 360),
        withResolution(createVideoTrack('hd', 3_000_000), 1920, 1080),
      ];
      const state = makeState({
        presentation: createPresentation(equalBitrate),
        bandwidthState: createBandwidthState(6_000_000),
      });

      const reactor = switchVideoTrack.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('hd');

      reactor.destroy();
    });

    it('breaks ties by resolution among the smallest over-throughput renditions', async () => {
      // Both exceed the throughput threshold (equal, lowest bitrate) — the
      // fallback pick should still favor the higher-resolution variant.
      const overThreshold = [
        withResolution(createVideoTrack('sd', 8_000_000), 640, 360),
        withResolution(createVideoTrack('hd', 8_000_000), 1920, 1080),
      ];
      const state = makeState({
        presentation: createPresentation(overThreshold),
        bandwidthState: createBandwidthState(1_000_000),
      });

      const reactor = switchVideoTrack.setup({ state });
      await flush();
      expect(state.selectedVideoTrackId.get()).toBe('hd');

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

      const config: SwitchVideoTrackConfig = { quality: { safetyMargin: 1.0 } };
      const reactor = switchVideoTrack.setup({ state, config });
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

      const config: SwitchVideoTrackConfig = { quality: { upgradeMargin: 1.05 } };
      const reactor = switchVideoTrack.setup({ state, config });
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

      const config: SwitchVideoTrackConfig = { initialBandwidth: 5_000_000 };
      const reactor = switchVideoTrack.setup({ state, config });
      await flush();
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

      const config: SwitchVideoTrackConfig = {
        bandwidth: { minTotalBytes: 40_000 },
        initialBandwidth: 5_000_000,
      };
      const reactor = switchVideoTrack.setup({ state, config });
      await flush();
      // With the override the 800 kbps measurement is trusted and drives a
      // downgrade to 360p; at the default threshold the 5 Mbps initial
      // would have kept 720p.
      expect(state.selectedVideoTrackId.get()).toBe('360p');
      reactor.destroy();
    });
  });
});

// ============================================================================
// switchAudioTrack
//
// The audio variant shares `setupTrackSwitching` with `switchVideoTrack` —
// these tests cover the audio-specific surface: default pick (first track),
// language pinning via the user-selection filter, filter reactivity, and the
// single-candidate early-bail. The bandwidth-driven re-evaluation tests live
// above under `switchVideoTrack` and don't need duplicating; audio's
// `selectAudioCurrent` pins to the current track and is exercised here by the
// steady-state assertions.
// ============================================================================

interface SwitchAudioTrackState {
  presentation?: MaybeResolvedPresentation;
  bandwidthState?: BandwidthState;
  selectedAudioTrackId?: string;
  userAudioTrackSelection?: Partial<AudioTrack>;
}

function makeAudioState(initial: SwitchAudioTrackState = {}): StateSignals<SwitchAudioTrackState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    bandwidthState: signal<BandwidthState | undefined>(initial.bandwidthState),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
    userAudioTrackSelection: signal<Partial<AudioTrack> | undefined>(initial.userAudioTrackSelection),
  };
}

function createAudioPresentation(tracks: AudioTrack[]): Presentation {
  return {
    id: 'pres-1',
    url: 'http://example.com/playlist.m3u8',
    selectionSets: [
      {
        id: 'audio-set',
        type: 'audio' as const,
        switchingSets: [
          {
            id: 'audio-switching',
            type: 'audio' as const,
            tracks,
          },
        ],
      } as AudioSelectionSet,
    ],
    startTime: 0,
  };
}

function makeAudioTrack(id: string, overrides: Partial<AudioTrack> = {}): AudioTrack {
  return {
    type: 'audio',
    id,
    url: `http://example.com/${id}.m3u8`,
    bandwidth: 128_000,
    mimeType: 'audio/mp4',
    codecs: ['mp4a.40.2'],
    groupId: 'audio',
    name: id,
    sampleRate: 48000,
    channels: 2,
    startTime: 0,
    duration: 10,
    initialization: { url: `http://example.com/${id}-init.mp4` },
    segments: [],
    ...overrides,
  };
}

describe('switchAudioTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects the first audio track when no preference or filter', async () => {
    const state = makeAudioState({
      presentation: createAudioPresentation([makeAudioTrack('audio-en', { language: 'en' })]),
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    reactor.destroy();
  });

  it('clears selectedAudioTrackId on src unload', async () => {
    const state = makeAudioState({
      presentation: createAudioPresentation([makeAudioTrack('audio-en', { language: 'en' })]),
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    state.presentation.set(undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBeUndefined();

    reactor.destroy();
  });
});

describe('switchAudioTrack — userAudioTrackSelection filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('narrows candidates by filter (language)', async () => {
    const state = makeAudioState({
      presentation: createAudioPresentation([
        makeAudioTrack('audio-en', { language: 'en' }),
        makeAudioTrack('audio-es', { language: 'es' }),
      ]),
      userAudioTrackSelection: { language: 'es' },
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    reactor.destroy();
  });

  it('re-picks on filter change mid-presentation', async () => {
    const state = makeAudioState({
      presentation: createAudioPresentation([
        makeAudioTrack('audio-en', { language: 'en' }),
        makeAudioTrack('audio-es', { language: 'es' }),
      ]),
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    state.userAudioTrackSelection.set({ language: 'es' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    reactor.destroy();
  });

  it('filter narrowing to a single track early-bails to that track', async () => {
    const state = makeAudioState({
      presentation: createAudioPresentation([
        makeAudioTrack('audio-en', { language: 'en' }),
        makeAudioTrack('audio-es', { language: 'es' }),
      ]),
      userAudioTrackSelection: { id: 'audio-es' },
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    reactor.destroy();
  });

  it('empty filter result falls back to unfiltered candidate set', async () => {
    const state = makeAudioState({
      presentation: createAudioPresentation([makeAudioTrack('audio-en', { language: 'en' })]),
      userAudioTrackSelection: { language: 'es' }, // no Spanish track exists
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    reactor.destroy();
  });
});

// ============================================================================
// applyRules — the rule-chain composer (pure; no signals)
// ============================================================================

describe('applyRules', () => {
  const track = (id: string) => ({ id });
  const all = [track('a'), track('b'), track('c')];

  const noDeps = { state: {}, context: {}, config: {} };

  it('applies rules in order; the pick is the first survivor', () => {
    const dropA: SelectionRule<{ id: string }> = (tracks) => tracks.filter((t) => t.id !== 'a');
    const reverse: SelectionRule<{ id: string }> = (tracks) => [...tracks].reverse();
    const result = applyRules([dropA, reverse], all, noDeps);
    expect(result.map((t) => t.id)).toEqual(['c', 'b']);
  });

  it('skips a rule that returns nothing (fall-through), keeping the prior set', () => {
    const matchNone: SelectionRule<{ id: string }> = () => [];
    const result = applyRules([matchNone], all, noDeps);
    expect(result.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('stops at one survivor and does not run later rules (early-bail)', () => {
    const toA: SelectionRule<{ id: string }> = (tracks) => tracks.filter((t) => t.id === 'a');
    let laterCalled = false;
    const later: SelectionRule<{ id: string }> = (tracks) => {
      laterCalled = true;
      return tracks;
    };
    const result = applyRules([toA, later], all, noDeps);
    expect(result.map((t) => t.id)).toEqual(['a']);
    expect(laterCalled).toBe(false);
  });

  it('passes the candidate list and deps (state, context, config) through to each rule', () => {
    const deps = { state: { marker: 1 }, context: { other: 2 }, config: { tuning: 3 } };
    let received: unknown[] = [];
    const rule: SelectionRule<{ id: string }, typeof deps.state, typeof deps.context, typeof deps.config> = (
      tracks,
      ruleDeps
    ) => {
      received = [tracks, ruleDeps];
      return tracks;
    };
    applyRules([rule], all, deps);
    expect(received).toEqual([all, deps]);
  });
});
