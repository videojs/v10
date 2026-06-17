import { describe, expect, it } from 'vitest';
import { signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';
import type { FetchText } from '../../../network/fetch';
import { failoverFetch } from '../failover-fetch';

const presentationWithVideo = (url: string): MaybeResolvedPresentation => ({
  url: 'https://cdn-a.example.com/master.m3u8',
  selectionSets: [
    {
      id: 'video-set',
      type: 'video',
      switchingSets: [{ id: 'sw', type: 'video', tracks: [{ id: 'v0', type: 'video', url, bandwidth: 0 }] }],
    },
  ] as MaybeResolvedPresentation['selectionSets'],
});

// A query-keyed getCdnId (e.g. Mux's `cdn=`), falling back to origin when the
// param is absent — as it is on segment URLs after relative resolution.
const byCdnParam = (url: string) => new URL(url).searchParams.get('cdn') ?? new URL(url).origin;

const makeState = (presentation: MaybeResolvedPresentation, selectedId: string | undefined) => ({
  presentation: signal<MaybeResolvedPresentation | undefined>(presentation),
  selectedVideoTrackId: signal<string | undefined>(selectedId),
  failedCdns: signal<string[] | undefined>(undefined),
});

const reject: FetchText = async () => {
  throw new Error('boom');
};

// The segment URL has dropped the playlist's `?cdn=` param during relative
// resolution, so it's not a valid CDN-identity source.
const segment = { url: 'https://cdn-a.example.com/0.ts' };

describe('failoverFetch', () => {
  it('trips the selected track CDN — not the failed addressable — on a failed fetch', async () => {
    const state = makeState(presentationWithVideo('https://cdn-a.example.com/r.m3u8?cdn=fastly'), 'v0');
    const fetch = failoverFetch(reject, state, { selectedKey: 'selectedVideoTrackId', getCdnId: byCdnParam });

    await expect(fetch(segment)).rejects.toThrow('boom');
    // Keyed on the track URL (`cdn=fastly`), not the param-less segment URL.
    expect(state.failedCdns.get()).toEqual(['fastly']);
    expect(byCdnParam(segment.url)).not.toBe('fastly');
  });

  it('does not trip on an aborted fetch', async () => {
    const state = makeState(presentationWithVideo('https://cdn-a.example.com/r.m3u8?cdn=fastly'), 'v0');
    const fetch = failoverFetch(reject, state, { selectedKey: 'selectedVideoTrackId', getCdnId: byCdnParam });
    const controller = new AbortController();
    controller.abort();

    await expect(fetch(segment, { signal: controller.signal })).rejects.toThrow();
    expect(state.failedCdns.get()).toBeUndefined();
  });

  it('no-ops when the selected track cannot be located', async () => {
    const state = makeState(presentationWithVideo('https://cdn-a.example.com/r.m3u8?cdn=fastly'), 'missing');
    const fetch = failoverFetch(reject, state, { selectedKey: 'selectedVideoTrackId', getCdnId: byCdnParam });

    await expect(fetch(segment)).rejects.toThrow();
    expect(state.failedCdns.get()).toBeUndefined();
  });

  it('passes a successful fetch through unchanged', async () => {
    const state = makeState(presentationWithVideo('https://cdn-a.example.com/r.m3u8'), 'v0');
    const ok: FetchText = async () => 'body';
    const fetch = failoverFetch(ok, state, { selectedKey: 'selectedVideoTrackId' });

    await expect(fetch(segment)).resolves.toBe('body');
    expect(state.failedCdns.get()).toBeUndefined();
  });
});
