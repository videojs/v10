import { describe, expect, it, vi } from 'vitest';

import type { LiveButtonMediaState, LiveButtonState } from '../live-button-core';
import { LiveButtonCore } from '../live-button-core';

function createMediaState(overrides: Partial<LiveButtonMediaState> = {}): LiveButtonMediaState {
  return {
    currentTime: 0,
    seekable: [],
    liveEdgeStart: Number.NaN,
    targetLiveWindow: Number.NaN,
    seek: vi.fn(async (time: number) => time),
    ...overrides,
  };
}

function createState(overrides: Partial<LiveButtonState> = {}): LiveButtonState {
  return {
    live: false,
    timeIsLive: false,
    label: '',
    ...overrides,
  };
}

describe('LiveButtonCore', () => {
  describe('setProps', () => {
    it('uses default props', () => {
      const core = new LiveButtonCore();
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBeUndefined();
    });

    it('accepts constructor props', () => {
      const core = new LiveButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState());
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('getState', () => {
    it('reports not-live when stream is on-demand', () => {
      const core = new LiveButtonCore();
      core.setMedia(createMediaState({ targetLiveWindow: Number.NaN }));
      const state = core.getState();
      expect(state.live).toBe(false);
      expect(state.timeIsLive).toBe(false);
    });

    it('reports live for low-latency live (`targetLiveWindow === 0`)', () => {
      const core = new LiveButtonCore();
      core.setMedia(createMediaState({ targetLiveWindow: 0, seekable: [[0, 100]], liveEdgeStart: 95 }));
      const state = core.getState();
      expect(state.live).toBe(true);
    });

    it('reports live for DVR (`targetLiveWindow === Infinity`)', () => {
      const core = new LiveButtonCore();
      core.setMedia(
        createMediaState({
          targetLiveWindow: Number.POSITIVE_INFINITY,
          seekable: [[0, 1000]],
          liveEdgeStart: 990,
        })
      );
      expect(core.getState().live).toBe(true);
    });

    it('flags timeIsLive when currentTime >= liveEdgeStart', () => {
      const core = new LiveButtonCore();
      core.setMedia(
        createMediaState({
          targetLiveWindow: 0,
          seekable: [[0, 100]],
          liveEdgeStart: 95,
          currentTime: 96,
        })
      );
      expect(core.getState().timeIsLive).toBe(true);
    });

    it('clears timeIsLive when behind live', () => {
      const core = new LiveButtonCore();
      core.setMedia(
        createMediaState({
          targetLiveWindow: Number.POSITIVE_INFINITY,
          seekable: [[0, 100]],
          liveEdgeStart: 95,
          currentTime: 50,
        })
      );
      expect(core.getState().timeIsLive).toBe(false);
    });

    it('falls back to seekable end when liveEdgeStart is unknown', () => {
      const core = new LiveButtonCore();
      core.setMedia(
        createMediaState({
          targetLiveWindow: 0,
          seekable: [[0, 100]],
          liveEdgeStart: Number.NaN,
          currentTime: 95,
        })
      );
      expect(core.getState().timeIsLive).toBe(true);
    });

    it('respects custom liveEdgeOffset fallback', () => {
      const core = new LiveButtonCore({ liveEdgeOffset: 2 });
      core.setMedia(
        createMediaState({
          targetLiveWindow: 0,
          seekable: [[0, 100]],
          liveEdgeStart: Number.NaN,
          currentTime: 95,
        })
      );
      expect(core.getState().timeIsLive).toBe(false);
    });

    it('flags timeIsLive within the default 5s tolerance before liveEdgeStart', () => {
      const core = new LiveButtonCore();
      core.setMedia(
        createMediaState({
          targetLiveWindow: 0,
          seekable: [[0, 100]],
          liveEdgeStart: 95,
          currentTime: 91,
        })
      );
      expect(core.getState().timeIsLive).toBe(true);
    });

    it('clears timeIsLive when beyond the tolerance before liveEdgeStart', () => {
      const core = new LiveButtonCore();
      core.setMedia(
        createMediaState({
          targetLiveWindow: 0,
          seekable: [[0, 100]],
          liveEdgeStart: 95,
          currentTime: 89,
        })
      );
      expect(core.getState().timeIsLive).toBe(false);
    });

    it('respects custom liveEdgeTolerance', () => {
      const core = new LiveButtonCore({ liveEdgeTolerance: 0 });
      core.setMedia(
        createMediaState({
          targetLiveWindow: 0,
          seekable: [[0, 100]],
          liveEdgeStart: 95,
          currentTime: 94,
        })
      );
      expect(core.getState().timeIsLive).toBe(false);
    });
  });

  describe('getLabel', () => {
    it('returns "Seek to live edge" when behind live', () => {
      const core = new LiveButtonCore();
      expect(core.getLabel(createState({ live: true, timeIsLive: false }))).toBe('Seek to live edge');
    });

    it('returns "Playing live" when at live edge', () => {
      const core = new LiveButtonCore();
      expect(core.getLabel(createState({ live: true, timeIsLive: true }))).toBe('Playing live');
    });

    it('returns custom string label', () => {
      const core = new LiveButtonCore({ label: 'LIVE' });
      expect(core.getLabel(createState())).toBe('LIVE');
    });

    it('returns custom function label', () => {
      const core = new LiveButtonCore({ label: (state) => (state.timeIsLive ? 'LIVE' : 'GO LIVE') });
      expect(core.getLabel(createState({ timeIsLive: true }))).toBe('LIVE');
      expect(core.getLabel(createState({ timeIsLive: false }))).toBe('GO LIVE');
    });
  });

  describe('getAttrs', () => {
    it('sets aria-disabled when at live edge', () => {
      const core = new LiveButtonCore();
      const attrs = core.getAttrs(createState({ timeIsLive: true, live: true }));
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('sets aria-disabled when disabled', () => {
      const core = new LiveButtonCore({ disabled: true });
      const attrs = core.getAttrs(createState({ live: true }));
      expect(attrs['aria-disabled']).toBe('true');
    });
  });

  describe('seekToLive', () => {
    it('seeks to the end of the latest seekable range', async () => {
      const core = new LiveButtonCore();
      const media = createMediaState({
        targetLiveWindow: 0,
        seekable: [[0, 100]],
        liveEdgeStart: 95,
        currentTime: 50,
      });
      await core.seekToLive(media);
      expect(media.seek).toHaveBeenCalledWith(100);
    });

    it('uses the last seekable range when multiple are present', async () => {
      const core = new LiveButtonCore();
      const media = createMediaState({
        targetLiveWindow: 0,
        seekable: [
          [0, 50],
          [60, 200],
        ],
        liveEdgeStart: 195,
        currentTime: 70,
      });
      await core.seekToLive(media);
      expect(media.seek).toHaveBeenCalledWith(200);
    });

    it('does nothing when stream is not live', async () => {
      const core = new LiveButtonCore();
      const media = createMediaState({ targetLiveWindow: Number.NaN });
      await core.seekToLive(media);
      expect(media.seek).not.toHaveBeenCalled();
    });

    it('does nothing when already at live edge', async () => {
      const core = new LiveButtonCore();
      const media = createMediaState({
        targetLiveWindow: 0,
        seekable: [[0, 100]],
        liveEdgeStart: 95,
        currentTime: 99,
      });
      await core.seekToLive(media);
      expect(media.seek).not.toHaveBeenCalled();
    });

    it('does nothing when disabled', async () => {
      const core = new LiveButtonCore({ disabled: true });
      const media = createMediaState({
        targetLiveWindow: 0,
        seekable: [[0, 100]],
        liveEdgeStart: 95,
        currentTime: 50,
      });
      await core.seekToLive(media);
      expect(media.seek).not.toHaveBeenCalled();
    });

    it('does nothing when seekable is empty', async () => {
      const core = new LiveButtonCore();
      const media = createMediaState({
        targetLiveWindow: 0,
        seekable: [],
        liveEdgeStart: Number.NaN,
        currentTime: 0,
      });
      await core.seekToLive(media);
      expect(media.seek).not.toHaveBeenCalled();
    });
  });
});
