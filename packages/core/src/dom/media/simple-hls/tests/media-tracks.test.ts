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
      videoRenditions: signal<any>(undefined),
      selectedVideoTrackId: signal<string | undefined>(undefined),
      userVideoTrackSelection: signal<{ id?: string } | undefined>(undefined),
      audioTracks: signal<any>(undefined),
      selectedAudioTrackId: signal<string | undefined>(undefined),
      userAudioTrackSelection: signal<{ language?: string; name?: string } | undefined>(undefined),
    },
    context: {},
    destroy: async () => {},
  };
}

type FakeEngine = ReturnType<typeof createEngine>;

class FakeHost extends HTMLVideoElementHost {
  #createEngine: () => FakeEngine;
  #engine: FakeEngine;
  #src = '';

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
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
    this.#engine = this.#createEngine();
  }

  destroy() {}
}

const Host = SimpleHlsMediaMediaTracksMixin(MediaTracksMixin(FakeHost));

function rendition(
  id: string,
  width: number,
  height: number,
  bandwidth: number,
  frameRate?: { frameRateNumerator: number; frameRateDenominator?: number }
) {
  return { id, url: `${id}.m3u8`, width, height, bandwidth, codecs: ['avc1.640028'], frameRate };
}

const HD = rendition('v-1080', 1920, 1080, 6_000_000);
const SD = rendition('v-360', 640, 360, 800_000);

function audioTrack(id: string, language: string, name: string, trackIds: string[], isDefault = false) {
  return { id, language, name, default: isDefault, trackIds };
}

// Two languages, each collapsing two quality groups (hi/lo).
const EN = audioTrack('en-hi', 'en', 'English', ['en-hi', 'en-lo'], true);
const ES = audioTrack('es-hi', 'es', 'Spanish', ['es-hi', 'es-lo']);

// Drain the effect microtask and the nested microtask the rendition-list
// primitives use to dispatch add/remove/change events.
function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('SimpleHlsMediaMediaTracksMixin', () => {
  it('projects the engine renditions onto a selected video track', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.videoRenditions.set([HD, SD]);
    await flush();

    expect(host.videoTracks.length).toBe(1);
    expect(host.videoTracks[0]?.selected).toBe(true);
    expect(host.videoRenditions.length).toBe(2);
    expect([...host.videoRenditions].map((r) => r.id)).toEqual(['v-1080', 'v-360']);
    expect([...host.videoRenditions].map((r) => r.height)).toEqual([1080, 360]);
    expect([...host.videoRenditions].map((r) => r.bitrate)).toEqual([6_000_000, 800_000]);
  });

  it('reduces the model frame rate to a number on the projected rendition', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.videoRenditions.set([
      rendition('v-1080', 1920, 1080, 6_000_000, { frameRateNumerator: 30000, frameRateDenominator: 1001 }),
    ]);
    await flush();

    expect(host.videoRenditions[0]?.frameRate).toBeCloseTo(29.97, 2);
  });

  it('marks the active rendition from selectedVideoTrackId', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.videoRenditions.set([HD, SD]);
    await flush();

    engine.state.selectedVideoTrackId.set('v-360');
    await flush();

    expect([...host.videoRenditions].map((r) => r.active)).toEqual([false, true]);
  });

  it('forwards a rendition selection to userVideoTrackSelection', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.videoRenditions.set([HD, SD]);
    await flush();

    host.videoRenditions.selectedIndex = 1;
    await flush();

    expect(engine.state.userVideoTrackSelection.get()).toEqual({ id: 'v-360' });
  });

  it('hands quality back to ABR when the selection is cleared', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.videoRenditions.set([HD, SD]);
    await flush();

    host.videoRenditions.selectedIndex = 1;
    await flush();
    expect(engine.state.userVideoTrackSelection.get()).toEqual({ id: 'v-360' });

    host.videoRenditions.selectedIndex = -1;
    await flush();
    expect(engine.state.userVideoTrackSelection.get()).toBeUndefined();
  });

  it('preserves the manual pin selection across a rebuild', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.videoRenditions.set([HD, SD]);
    await flush();
    host.videoRenditions.selectedIndex = 1; // pin SD
    await flush();
    expect(engine.state.userVideoTrackSelection.get()).toEqual({ id: 'v-360' });

    // Engine emits a changed set (a rendition added) that still contains the pin.
    const UHD = rendition('v-2160', 3840, 2160, 18_000_000);
    engine.state.videoRenditions.set([HD, SD, UHD]);
    await flush();

    // The pinned rendition stays selected — the UI must not fall back to Auto.
    const { selectedIndex } = host.videoRenditions;
    expect(selectedIndex).not.toBe(-1);
    expect([...host.videoRenditions][selectedIndex]?.id).toBe('v-360');
    // Restoring the pin must not spuriously rewrite/clear the engine selection.
    expect(engine.state.userVideoTrackSelection.get()).toEqual({ id: 'v-360' });
  });

  it('reflects a programmatic userVideoTrackSelection onto the selected rendition', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.videoRenditions.set([HD, SD]);
    await flush();

    engine.state.userVideoTrackSelection.set({ id: 'v-360' });
    await flush();

    const { selectedIndex } = host.videoRenditions;
    expect([...host.videoRenditions][selectedIndex]?.id).toBe('v-360');
    // Reflection must not loop back into a rewrite.
    expect(engine.state.userVideoTrackSelection.get()).toEqual({ id: 'v-360' });
  });

  it('reflects a cleared pin as Auto (selectedIndex -1)', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.videoRenditions.set([HD, SD]);
    await flush();
    engine.state.userVideoTrackSelection.set({ id: 'v-360' });
    await flush();
    expect(host.videoRenditions.selectedIndex).not.toBe(-1);

    engine.state.userVideoTrackSelection.set(undefined);
    await flush();
    expect(host.videoRenditions.selectedIndex).toBe(-1);
  });

  it('rebuilds renditions when the engine emits a new set', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.videoRenditions.set([HD, SD]);
    await flush();
    expect(host.videoRenditions.length).toBe(2);

    engine.state.videoRenditions.set([HD]);
    await flush();

    expect([...host.videoRenditions].map((r) => r.id)).toEqual(['v-1080']);
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
    engines[1]!.state.videoRenditions.set([HD, SD]);
    await flush();
    expect(host.videoRenditions.length).toBe(2);

    // The disconnected first engine must no longer drive the projection.
    engines[0]!.state.videoRenditions.set([HD]);
    await flush();
    expect(host.videoRenditions.length).toBe(2);
  });

  it('projects the engine audio tracks (one per language)', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.audioTracks.set([EN, ES]);
    await flush();

    expect(host.audioTracks.length).toBe(2);
    expect([...host.audioTracks].map((t) => t.label)).toEqual(['English', 'Spanish']);
    expect([...host.audioTracks].map((t) => t.language)).toEqual(['en', 'es']);
    expect(host.audioTracks[0]?.kind).toBe('main'); // default
    expect(host.audioTracks[1]?.kind).toBe('alternative');
  });

  it('reflects the enabled audio track from selectedAudioTrackId (matching any quality group)', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.audioTracks.set([EN, ES]);
    // A resolved id from the *low* Spanish group still enables the Spanish track.
    engine.state.selectedAudioTrackId.set('es-lo');
    await flush();

    expect([...host.audioTracks].map((t) => t.enabled)).toEqual([false, true]);
  });

  it('feeds an enabled audio track back to userAudioTrackSelection by language + name', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.audioTracks.set([EN, ES]);
    engine.state.selectedAudioTrackId.set('en-hi');
    await flush();

    const [, spanish] = [...host.audioTracks];
    spanish!.enabled = true;
    await flush();

    expect(engine.state.userAudioTrackSelection.get()).toEqual({ language: 'es', name: 'Spanish' });
  });

  it('does not write a selection when reflection re-enables the already-playing track', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.audioTracks.set([EN, ES]);
    engine.state.selectedAudioTrackId.set('en-hi');
    await flush();

    // Reflection enabled English (the playing track); no user change happened.
    expect(host.audioTracks[0]?.enabled).toBe(true);
    expect(engine.state.userAudioTrackSelection.get()).toBeUndefined();
  });

  it('removes projected tracks on destroy', async () => {
    const engine = createEngine();
    const host = new Host(() => engine);

    engine.state.videoRenditions.set([HD, SD]);
    engine.state.audioTracks.set([EN, ES]);
    await flush();
    expect(host.videoTracks.length).toBe(1);
    expect(host.audioTracks.length).toBe(2);

    host.destroy();

    expect(host.videoTracks.length).toBe(0);
    expect(host.videoRenditions.length).toBe(0);
    expect(host.audioTracks.length).toBe(0);
  });
});
