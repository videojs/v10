import { describe, expect, it } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation, PartiallyResolvedVideoTrack, Presentation } from '../../../media/types';
import { type SelectActiveCdnState, selectActiveCdn } from '../select-active-cdn';

function makeState(initial: Partial<SelectActiveCdnState> = {}): StateSignals<SelectActiveCdnState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    activeCdn: signal<string | undefined>(initial.activeCdn),
  };
}

const videoTrack = (id: string, url: string): PartiallyResolvedVideoTrack => ({
  type: 'video',
  codecs: [],
  id,
  url,
  bandwidth: 2_000_000,
  mimeType: 'video/mp4',
});

// A redundant-streams presentation: each rendition duplicated across CDNs, in
// manifest priority order (cdn-a first).
const redundant = (id = 'pres-1'): Presentation =>
  ({
    id,
    url: 'https://cdn-a.example.com/master.m3u8',
    selectionSets: [
      {
        id: 'video-set',
        type: 'video' as const,
        switchingSets: [
          {
            id: 'video-switching',
            type: 'video' as const,
            tracks: [
              videoTrack('720p-a', 'https://cdn-a.example.com/720p.m3u8'),
              videoTrack('720p-b', 'https://cdn-b.example.com/720p.m3u8'),
              videoTrack('1080p-a', 'https://cdn-a.example.com/1080p.m3u8'),
              videoTrack('1080p-b', 'https://cdn-b.example.com/1080p.m3u8'),
            ],
          },
        ],
      },
    ],
  }) as Presentation;

const flush = () => Promise.resolve().then(() => Promise.resolve());

describe('selectActiveCdn', () => {
  it('does nothing without a presentation', async () => {
    const state = makeState();
    const reactor = selectActiveCdn.setup({ state });
    await flush();
    expect(state.activeCdn.get()).toBeUndefined();
    reactor.destroy();
  });

  it('picks the primary (manifest-head) CDN on src load', async () => {
    const state = makeState({ presentation: redundant() });
    const reactor = selectActiveCdn.setup({ state });
    await flush();
    expect(state.activeCdn.get()).toBe('https://cdn-a.example.com');
    reactor.destroy();
  });

  it('picks the only CDN for a non-redundant source', async () => {
    const state = makeState({
      presentation: {
        id: 'pres-single',
        url: 'https://cdn-a.example.com/master.m3u8',
        selectionSets: [
          {
            id: 'video-set',
            type: 'video' as const,
            switchingSets: [
              { id: 's', type: 'video' as const, tracks: [videoTrack('720p', 'https://cdn-a.example.com/720p.m3u8')] },
            ],
          },
        ],
      } as Presentation,
    });
    const reactor = selectActiveCdn.setup({ state });
    await flush();
    expect(state.activeCdn.get()).toBe('https://cdn-a.example.com');
    reactor.destroy();
  });

  it('holds the pick sticky across a resolved-to-resolved presentation swap', async () => {
    const state = makeState({ presentation: redundant() });
    const reactor = selectActiveCdn.setup({ state });
    await flush();
    expect(state.activeCdn.get()).toBe('https://cdn-a.example.com');

    // Swap to a different resolved presentation whose head CDN is cdn-b, with no
    // unresolved gap. Sticky: the active CDN does not flip.
    const flipped = {
      ...redundant('pres-2'),
      selectionSets: [
        {
          id: 'video-set',
          type: 'video' as const,
          switchingSets: [
            {
              id: 'video-switching',
              type: 'video' as const,
              tracks: [
                videoTrack('720p-b', 'https://cdn-b.example.com/720p.m3u8'),
                videoTrack('720p-a', 'https://cdn-a.example.com/720p.m3u8'),
              ],
            },
          ],
        },
      ],
    } as Presentation;
    state.presentation.set(flipped);
    await flush();
    expect(state.activeCdn.get()).toBe('https://cdn-a.example.com');

    reactor.destroy();
  });

  it('clears activeCdn on src unload', async () => {
    const state = makeState({ presentation: redundant() });
    const reactor = selectActiveCdn.setup({ state });
    await flush();
    expect(state.activeCdn.get()).toBe('https://cdn-a.example.com');

    state.presentation.set(undefined);
    await flush();
    expect(state.activeCdn.get()).toBeUndefined();

    reactor.destroy();
  });

  it('clears activeCdn on destroy', async () => {
    const state = makeState({ presentation: redundant() });
    const reactor = selectActiveCdn.setup({ state });
    await flush();
    expect(state.activeCdn.get()).toBe('https://cdn-a.example.com');

    reactor.destroy();
    expect(state.activeCdn.get()).toBeUndefined();
  });

  it('re-picks after a src reset (undefined → new resolved)', async () => {
    const state = makeState({ presentation: redundant() });
    const reactor = selectActiveCdn.setup({ state });
    await flush();
    expect(state.activeCdn.get()).toBe('https://cdn-a.example.com');

    state.presentation.set(undefined);
    await flush();
    expect(state.activeCdn.get()).toBeUndefined();

    state.presentation.set(redundant('pres-2'));
    await flush();
    expect(state.activeCdn.get()).toBe('https://cdn-a.example.com');

    reactor.destroy();
  });
});
