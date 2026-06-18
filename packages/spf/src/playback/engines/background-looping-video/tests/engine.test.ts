/**
 * createBackgroundLoopingVideoEngine tests.
 *
 * The variant subtracts audio, text, ABR, and preload-monitoring behaviors
 * from the simple HLS engine, then seeds `loadActivated: true` so the
 * composition behaves as if preload has already been activated. These tests
 * confirm the seed, the absence of subtracted state slots, and the picker
 * configurability.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { snapshot } from '../../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../../media/types';
import { createBackgroundLoopingVideoEngine } from '../engine';

vi.mock('../../../../media/dom/mse/append-segment', () => ({
  appendSegment: vi.fn().mockResolvedValue(undefined),
}));

describe('createBackgroundLoopingVideoEngine', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('creates an engine with state, context, and destroy()', () => {
    const engine = createBackgroundLoopingVideoEngine();

    expect(engine.state).toBeDefined();
    expect(engine.context).toBeDefined();
    expect(typeof engine.destroy).toBe('function');

    engine.destroy();
  });

  it('seeds loadActivated: true so preload gates pass from frame 0', () => {
    const engine = createBackgroundLoopingVideoEngine();
    expect(engine.state.loadActivated.get()).toBe(true);
    engine.destroy();
  });

  it('omits subtracted state slots — no audio/text/userVideoTrackSelection signals', () => {
    const engine = createBackgroundLoopingVideoEngine();
    const state = snapshot(engine.state) as Record<string, unknown>;

    // selectedAudioTrackId is declared by calculatePresentationDuration so
    // its signal is created, but it stays undefined since no audio-selection
    // behavior is composed in.
    expect(state.selectedAudioTrackId).toBeUndefined();

    // Text-track and userVideoTrackSelection signals must not exist —
    // no behavior in this composition declares them.
    expect('selectedTextTrackId' in state).toBe(false);
    expect('userVideoTrackSelection' in state).toBe(false);

    engine.destroy();
  });

  it('omits subtracted context slots — no audio segment loader / text actors', () => {
    const engine = createBackgroundLoopingVideoEngine();
    const context = snapshot(engine.context) as Record<string, unknown>;

    // `audioBufferActor` IS declared by `endOfStream` (cross-type EOS
    // coordination), so the signal exists — but no behavior in this
    // composition writes it, so it stays `undefined`.
    expect(context.audioBufferActor).toBeUndefined();

    // The audio segment loader and both text-track actors aren't declared
    // by any behavior left in the composition — their signals don't exist.
    expect('audioSegmentLoaderActor' in context).toBe(false);
    expect('textTracksActor' in context).toBe(false);
    expect('textTrackSegmentLoaderActor' in context).toBe(false);

    engine.destroy();
  });

  it('defaults the picker to pickHighestResolutionVideoTrack', async () => {
    const engine = createBackgroundLoopingVideoEngine();

    const presentation: MaybeResolvedPresentation = {
      id: 'p',
      url: 'https://example.com/manifest.m3u8',
      startTime: 0,
      selectionSets: [
        {
          id: 'video-set',
          type: 'video',
          switchingSets: [
            {
              id: 'video-switching',
              type: 'video',
              tracks: [
                {
                  type: 'video',
                  id: '480p',
                  url: 'https://example.com/480p.m3u8',
                  bandwidth: 1_000_000,
                  mimeType: 'video/mp4',
                  codecs: ['avc1.42E01E'],
                  initialization: { url: 'init', byteRange: { offset: 0, length: 0 } },
                  segments: [],
                  startTime: 0,
                  duration: 0,
                  width: 854,
                  height: 480,
                } as never,
                {
                  type: 'video',
                  id: '1080p',
                  url: 'https://example.com/1080p.m3u8',
                  bandwidth: 4_000_000,
                  mimeType: 'video/mp4',
                  codecs: ['avc1.640028'],
                  initialization: { url: 'init', byteRange: { offset: 0, length: 0 } },
                  segments: [],
                  startTime: 0,
                  duration: 0,
                  width: 1920,
                  height: 1080,
                } as never,
              ],
            },
          ],
        },
      ],
    };

    engine.state.presentation.set(presentation);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(engine.state.selectedVideoTrackId.get()).toBe('1080p');
    engine.destroy();
  });

  it('honors a custom picker override from config', async () => {
    const engine = createBackgroundLoopingVideoEngine({
      picker: () => 'forced-pick',
    });

    const presentation: MaybeResolvedPresentation = {
      id: 'p',
      url: 'https://example.com/manifest.m3u8',
      startTime: 0,
      selectionSets: [
        {
          id: 'video-set',
          type: 'video',
          switchingSets: [
            {
              id: 'video-switching',
              type: 'video',
              tracks: [
                {
                  type: 'video',
                  id: '480p',
                  url: 'https://example.com/480p.m3u8',
                  bandwidth: 1_000_000,
                  mimeType: 'video/mp4',
                  codecs: ['avc1.42E01E'],
                  initialization: { url: 'init', byteRange: { offset: 0, length: 0 } },
                  segments: [],
                  startTime: 0,
                  duration: 0,
                  width: 854,
                  height: 480,
                } as never,
              ],
            },
          ],
        },
      ],
    };

    engine.state.presentation.set(presentation);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(engine.state.selectedVideoTrackId.get()).toBe('forced-pick');
    engine.destroy();
  });
});
