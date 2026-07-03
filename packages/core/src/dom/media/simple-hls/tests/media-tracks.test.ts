import { signal } from '@videojs/spf';
import type { SimpleHlsMediaAPI } from '@videojs/spf/hls';
import { describe, expect, it } from 'vitest';
import { MediaTracksMixin } from '../../../../core/media/media-tracks';
import { HTMLVideoElementHost } from '../../video-host';
import { SimpleHlsMediaMediaTracksMixin } from '../media-tracks';

type SimpleHlsEngine = SimpleHlsMediaAPI['engine'];

function createEngine() {
  return {
    state: {
      presentation: signal<any>(undefined),
      selectedVideoTrackId: signal<string | undefined>(undefined),
      userVideoTrackSelection: signal<{ id?: string } | undefined>(undefined),
    },
    context: {},
    destroy: async () => {},
  };
}

type FakeEngine = ReturnType<typeof createEngine>;

class FakeHost extends HTMLVideoElementHost {
  #createEngine: () => FakeEngine;
  #engine: FakeEngine;

  constructor(create: () => FakeEngine) {
    super();
    this.#createEngine = create;
    this.#engine = create();
  }

  get engine() {
    return this.#engine as unknown as SimpleHlsEngine;
  }

  // Mirror the real adapter: a new src destroys the engine and starts a fresh one.
  get src() {
    return this.#engine.state.presentation.get()?.url ?? '';
  }

  set src(value: string) {
    this.#engine = this.#createEngine();
    if (value) this.#engine.state.presentation.set({ url: value });
  }

  destroy() {}
}

const Host = SimpleHlsMediaMediaTracksMixin(MediaTracksMixin(FakeHost));

function videoTrack(id: string, width: number, height: number, bandwidth: number) {
  return { id, type: 'video', url: `${id}.m3u8`, width, height, bandwidth, codecs: ['avc1.640028'] };
}

function presentationWith(tracks: Array<ReturnType<typeof videoTrack>>) {
  return {
    url: 'https://example.com/master.m3u8',
    id: 'presentation',
    selectionSets: [
      { id: 'video-selection', type: 'video', switchingSets: [{ id: 'video-switching', type: 'video', tracks }] },
    ],
  };
}

const HD = videoTrack('v-1080', 1920, 1080, 6_000_000);
const SD = videoTrack('v-360', 640, 360, 800_000);

// Drain the effect microtask and the nested microtask the rendition-list
// primitives use to dispatch add/remove/change events.
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('SimpleHlsMediaMediaTracksMixin', () => {
  it('projects the engine presentation onto a selected video track with renditions', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.presentation.set(presentationWith([HD, SD]));
    await flush();

    expect(host.videoTracks.length).toBe(1);
    expect(host.videoTracks[0]?.selected).toBe(true);
    expect(host.videoRenditions.length).toBe(2);
    expect([...host.videoRenditions].map((rendition) => rendition.id)).toEqual(['v-1080', 'v-360']);
    expect([...host.videoRenditions].map((rendition) => rendition.height)).toEqual([1080, 360]);
    expect([...host.videoRenditions].map((rendition) => rendition.bitrate)).toEqual([6_000_000, 800_000]);
  });

  it('marks the active rendition from selectedVideoTrackId', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.presentation.set(presentationWith([HD, SD]));
    await flush();

    engine.state.selectedVideoTrackId.set('v-360');
    await flush();

    expect([...host.videoRenditions].map((rendition) => rendition.active)).toEqual([false, true]);
  });

  it('forwards a rendition selection to userVideoTrackSelection', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.presentation.set(presentationWith([HD, SD]));
    await flush();

    host.videoRenditions.selectedIndex = 1;
    await flush();

    expect(engine.state.userVideoTrackSelection.get()).toEqual({ id: 'v-360' });
  });

  it('hands quality back to ABR when the selection is cleared', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.presentation.set(presentationWith([HD, SD]));
    await flush();

    host.videoRenditions.selectedIndex = 1;
    await flush();
    expect(engine.state.userVideoTrackSelection.get()).toEqual({ id: 'v-360' });

    host.videoRenditions.selectedIndex = -1;
    await flush();
    expect(engine.state.userVideoTrackSelection.get()).toBeUndefined();
  });

  it('does not rebuild renditions when a resolve mutates presentation without changing the track set', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    let added = 0;
    let removed = 0;
    host.videoRenditions.addEventListener('addrendition', () => added++);
    host.videoRenditions.addEventListener('removerendition', () => removed++);

    engine.state.presentation.set(presentationWith([HD, SD]));
    await flush();
    expect(added).toBe(2);

    // A media-playlist resolution replaces the presentation object with the
    // same renditions — the projection should be a no-op.
    engine.state.presentation.set(presentationWith([HD, SD]));
    await flush();

    expect(added).toBe(2);
    expect(removed).toBe(0);
  });

  it('rebuilds renditions when the track set changes', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.presentation.set(presentationWith([HD, SD]));
    await flush();
    expect(host.videoRenditions.length).toBe(2);

    engine.state.presentation.set(presentationWith([HD]));
    await flush();

    expect([...host.videoRenditions].map((rendition) => rendition.id)).toEqual(['v-1080']);
  });

  it('re-wires the projection to the fresh engine created on src change', async () => {
    const engines: FakeEngine[] = [];
    const host = new Host(() => {
      const engine = createEngine();
      engines.push(engine);
      return engine;
    });

    // src change tears down engine[0] and creates engine[1].
    host.src = 'https://example.com/next.m3u8';
    engines[1]!.state.presentation.set(presentationWith([HD, SD]));
    await flush();
    expect(host.videoRenditions.length).toBe(2);

    // The disconnected first engine must no longer drive the projection.
    engines[0]!.state.presentation.set(presentationWith([HD]));
    await flush();
    expect(host.videoRenditions.length).toBe(2);
  });

  it('removes projected tracks on destroy', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.presentation.set(presentationWith([HD, SD]));
    await flush();
    expect(host.videoTracks.length).toBe(1);

    host.destroy();

    expect(host.videoTracks.length).toBe(0);
    expect(host.videoRenditions.length).toBe(0);
  });
});
