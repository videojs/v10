import { HTMLVideoAdapter } from '@videojs/media/dom';
import Hls from 'hls.js';
import { describe, expect, it, vi } from 'vite-plus/test';

import { HlsJsMetadataTracksMixin } from '../metadata-tracks';

class FakeHost extends HTMLVideoAdapter {
  engine: Hls;

  constructor(engine: Hls) {
    super();
    this.engine = engine;
  }
}

const HlsJsMetadataTracks = HlsJsMetadataTracksMixin(FakeHost);

type FakeEngine = Hls & { emit(event: string): void };

function createEngine(): FakeEngine {
  const listeners = new Map<string, Set<() => void>>();

  const engine = {
    on(event: string, listener: () => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());

      listeners.get(event)!.add(listener);
    },
    emit(event: string) {
      for (const listener of listeners.get(event) ?? []) listener();
    },
  };

  // SAFETY: The mixin only registers listeners through `on`; `emit` is the test-only trigger for those listeners.
  return engine as FakeEngine;
}

interface FakeTrackOptions {
  cues?: unknown[] | null;
  default?: boolean;
  kind?: string;
  label?: string;
  mode?: TextTrackMode;
  readyState?: number;
  src?: string;
}

function createTrackElement({
  cues = [],
  default: isDefault = false,
  kind = 'metadata',
  label = '',
  mode = 'disabled',
  readyState = 2,
  src = 'track.vtt',
}: FakeTrackOptions = {}) {
  const element = document.createElement('track');

  element.default = isDefault;
  element.kind = kind;
  element.label = label;
  element.setAttribute('src', src);
  Object.defineProperty(element, 'track', {
    configurable: true,
    value: { cues, kind, label, mode },
  });
  Object.defineProperty(element, 'readyState', { configurable: true, value: readyState });
  vi.spyOn(element, 'cloneNode').mockImplementation(() =>
    createTrackElement({ cues, default: isDefault, kind, label, mode, readyState, src })
  );

  return element;
}

function createMedia(...trackElements: HTMLTrackElement[]) {
  const target = document.createElement('video');

  target.append(...trackElements);
  Object.defineProperty(target, 'textTracks', {
    configurable: true,
    value: trackElements.map((element) => element.track),
  });

  return target;
}

function emit(engine: FakeEngine, event: string) {
  engine.emit(event);
}

describe('HlsJsMetadataTracksMixin', () => {
  it.each([Hls.Events.MANIFEST_LOADED, Hls.Events.MEDIA_ATTACHED])(
    'reloads a cue-less metadata track after %s',
    (event) => {
      const engine = createEngine();
      const host = new HlsJsMetadataTracks(engine);
      const trackElement = createTrackElement();
      const target = createMedia(trackElement);

      host.attach(target);
      emit(engine, event);

      expect(trackElement.cloneNode).toHaveBeenCalledOnce();
      expect(target.querySelector('track')).not.toBe(trackElement);
    }
  );

  it('forces a default metadata track to hidden after replacing it', () => {
    const engine = createEngine();
    const host = new HlsJsMetadataTracks(engine);
    const trackElement = createTrackElement({ default: true, mode: 'disabled' });
    const target = createMedia(trackElement);

    host.attach(target);
    emit(engine, Hls.Events.MANIFEST_LOADED);

    expect(target.querySelector('track')!.track.mode).toBe('hidden');
  });

  it('keeps a loaded metadata track when it still has cues', () => {
    const engine = createEngine();
    const host = new HlsJsMetadataTracks(engine);
    const trackElement = createTrackElement({ cues: [{}], default: true, mode: 'showing' });
    const target = createMedia(trackElement);

    host.attach(target);
    emit(engine, Hls.Events.MEDIA_ATTACHED);

    expect(trackElement.cloneNode).not.toHaveBeenCalled();
    expect(target.querySelector('track')).toBe(trackElement);
    expect(trackElement.track.mode).toBe('hidden');
  });

  it('restores chapter tracks but leaves subtitle tracks alone', () => {
    const engine = createEngine();
    const host = new HlsJsMetadataTracks(engine);
    const chapters = createTrackElement({ kind: 'chapters', label: 'Chapters' });
    const subtitles = createTrackElement({ kind: 'subtitles', label: 'English', default: true, mode: 'showing' });
    const target = createMedia(chapters, subtitles);

    host.attach(target);
    emit(engine, Hls.Events.MANIFEST_LOADED);

    expect(chapters.cloneNode).toHaveBeenCalledOnce();
    expect(subtitles.cloneNode).not.toHaveBeenCalled();
    expect(subtitles.track.mode).toBe('showing');
  });

  it.each([
    { readyState: 0, src: 'track.vtt' },
    { readyState: 2, src: '' },
  ])('does not reload a track that was not previously loaded ($readyState, "$src")', ({ readyState, src }) => {
    const engine = createEngine();
    const host = new HlsJsMetadataTracks(engine);
    const trackElement = createTrackElement({ readyState, src });
    const target = createMedia(trackElement);

    host.attach(target);
    emit(engine, Hls.Events.MANIFEST_LOADED);

    expect(trackElement.cloneNode).not.toHaveBeenCalled();
  });

  it('ignores engine events until a media target is attached', () => {
    const engine = createEngine();

    new HlsJsMetadataTracks(engine);

    expect(() => emit(engine, Hls.Events.MANIFEST_LOADED)).not.toThrow();
  });
});
