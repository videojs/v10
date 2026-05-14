import { describe, expect, it } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import {
  addSubtitlesTracksToMedia,
  getShowingSubtitlesTrackFromMedia,
  removeAllSubtitlesTracksFromMedia,
} from '../../../../media/dom/text/text-track-slots';
import type { MaybeResolvedPresentation } from '../../../../media/types';
import { createTextTracksActor, type TextTracksActor } from '../../../actors/dom/text-tracks';
import { syncTextTracks } from '../sync-text-tracks';

const baseConfig = {
  addSubtitlesTracksToMedia,
  getShowingSubtitlesTrackFromMedia,
  removeAllSubtitlesTracksFromMedia,
};

interface State {
  presentation?: MaybeResolvedPresentation;
  selectedTextTrackId?: string | undefined;
}

interface Context {
  mediaElement?: HTMLMediaElement | undefined;
  textTracksActor?: TextTracksActor<VTTCue> | undefined;
}

function makePresentation(tracks: Array<{ id: string; kind?: string; language?: string }>) {
  return {
    id: 'pres-1',
    url: 'http://example.com/playlist.m3u8',
    selectionSets: [
      {
        id: 'set-1',
        type: 'text' as const,
        switchingSets: [
          {
            id: 'sw-1',
            tracks: tracks.map((t) => ({
              id: t.id,
              type: 'text' as const,
              kind: (t.kind ?? 'subtitles') as 'subtitles',
              label: t.id,
              language: t.language ?? '',
              url: 'data:text/vtt,',
              mimeType: 'text/vtt',
              bandwidth: 0,
              groupId: 'subs',
            })),
          },
        ],
      },
    ],
  } as any;
}

function setup(initialState: State = {}, initialContext: Context = {}) {
  const state = {
    presentation: signal<MaybeResolvedPresentation | undefined>(initialState.presentation),
    selectedTextTrackId: signal<string | undefined>(initialState.selectedTextTrackId),
  };
  const context = {
    mediaElement: signal<HTMLMediaElement | undefined>(initialContext.mediaElement),
    textTracksActor: signal<TextTracksActor<VTTCue> | undefined>(initialContext.textTracksActor),
  };
  const reactor = syncTextTracks.setup({ state, context, config: baseConfig });
  return { state, context, reactor };
}

describe('syncTextTracks', () => {
  it('creates track elements when mediaElement and presentation are available', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, context, reactor } = setup();

    context.mediaElement.set(mediaElement);
    state.presentation.set(presentation);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mediaElement.children.length).toBe(2);
    expect((mediaElement.children[0] as HTMLTrackElement).id).toBe('track-en');
    expect((mediaElement.children[1] as HTMLTrackElement).id).toBe('track-es');

    reactor.destroy();
  });

  it('does not create tracks when no mediaElement', async () => {
    const presentation = makePresentation([{ id: 'track-en', language: 'en' }]);
    const { state, reactor } = setup();

    state.presentation.set(presentation);
    await new Promise((resolve) => setTimeout(resolve, 50));

    reactor.destroy();
  });

  it('does not create tracks when presentation has no text tracks', async () => {
    const mediaElement = document.createElement('video');
    const { state, context, reactor } = setup();

    context.mediaElement.set(mediaElement);
    state.presentation.set({
      id: 'pres-1',
      url: 'http://example.com/playlist.m3u8',
      selectionSets: [],
    } as any);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mediaElement.children.length).toBe(0);
    reactor.destroy();
  });

  it('sets selected track to "showing" and others to "disabled"', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, context, reactor } = setup({ presentation });
    context.mediaElement.set(mediaElement);
    await new Promise((resolve) => setTimeout(resolve, 50));

    state.selectedTextTrackId.set('track-en');
    await new Promise((resolve) => setTimeout(resolve, 50));

    const [enEl, esEl] = Array.from(mediaElement.children) as HTMLTrackElement[];
    expect(enEl!.track.mode).toBe('showing');
    expect(esEl!.track.mode).toBe('disabled');

    reactor.destroy();
  });

  it('switches active track when selection changes', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, context, reactor } = setup({ presentation, selectedTextTrackId: 'track-en' });
    context.mediaElement.set(mediaElement);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const [enEl, esEl] = Array.from(mediaElement.children) as HTMLTrackElement[];
    expect(enEl!.track.mode).toBe('showing');
    expect(esEl!.track.mode).toBe('disabled');

    state.selectedTextTrackId.set('track-es');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(enEl!.track.mode).toBe('disabled');
    expect(esEl!.track.mode).toBe('showing');

    reactor.destroy();
  });

  it('disables all tracks when selection is cleared', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, context, reactor } = setup({ presentation, selectedTextTrackId: 'track-en' });
    context.mediaElement.set(mediaElement);
    await new Promise((resolve) => setTimeout(resolve, 50));

    state.selectedTextTrackId.set(undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const [enEl, esEl] = Array.from(mediaElement.children) as HTMLTrackElement[];
    expect(enEl!.track.mode).toBe('disabled');
    expect(esEl!.track.mode).toBe('disabled');

    reactor.destroy();
  });

  it('does not touch non-subtitle/caption tracks', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([{ id: 'track-en', language: 'en' }]);

    // Add a chapters track directly (not via presentation)
    const chaptersEl = document.createElement('track');
    chaptersEl.kind = 'chapters';
    chaptersEl.id = 'chapters-en';
    chaptersEl.src = 'data:text/vtt,';
    mediaElement.appendChild(chaptersEl);
    chaptersEl.track.mode = 'hidden';

    const { context, reactor } = setup({ presentation, selectedTextTrackId: 'track-en' });
    context.mediaElement.set(mediaElement);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(chaptersEl.track.mode).toBe('hidden');

    reactor.destroy();
  });

  it('bridges external mode change → selectedTextTrackId', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, context, reactor } = setup({ presentation });
    context.mediaElement.set(mediaElement);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate external code (e.g. captions button) showing Spanish
    const esEl = Array.from(mediaElement.children).find(
      (el) => (el as HTMLTrackElement).id === 'track-es'
    ) as HTMLTrackElement;
    esEl.track.mode = 'showing';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedTextTrackId.get()).toBe('track-es');

    reactor.destroy();
  });

  it('clears selectedTextTrackId when external code disables all tracks', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, context, reactor } = setup({ presentation, selectedTextTrackId: 'track-en' });
    context.mediaElement.set(mediaElement);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate external code disabling all tracks
    const enEl = Array.from(mediaElement.children).find(
      (el) => (el as HTMLTrackElement).id === 'track-en'
    ) as HTMLTrackElement;
    enEl.track.mode = 'disabled';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedTextTrackId.get()).toBeUndefined();

    reactor.destroy();
  });

  it('removes track elements on destroy', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { context, reactor } = setup({ presentation });
    context.mediaElement.set(mediaElement);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mediaElement.children.length).toBe(2);

    reactor.destroy();
    expect(mediaElement.children.length).toBe(0);
  });

  it('removes track elements on src unload', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([{ id: 'track-en', language: 'en' }]);

    const { state, context, reactor } = setup({ presentation });
    context.mediaElement.set(mediaElement);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mediaElement.children.length).toBe(1);

    state.presentation.set(undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mediaElement.children.length).toBe(0);

    reactor.destroy();
  });

  it('preserves selectedTextTrackId on src unload (selectTextTrack owns the clear)', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([{ id: 'track-en', language: 'en' }]);

    const { state, context, reactor } = setup({ presentation, selectedTextTrackId: 'track-en' });
    context.mediaElement.set(mediaElement);
    await new Promise((resolve) => setTimeout(resolve, 50));

    state.presentation.set(undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedTextTrackId.get()).toBe('track-en');

    reactor.destroy();
  });

  it('creates tracks only once (idempotent on re-runs)', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([{ id: 'track-en', language: 'en' }]);

    const { state, context, reactor } = setup({ presentation });
    context.mediaElement.set(mediaElement);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const firstChild = mediaElement.children[0];
    expect(mediaElement.children.length).toBe(1);

    // Trigger a re-run by changing selectedTextTrackId
    state.selectedTextTrackId.set('track-en');
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mediaElement.children.length).toBe(1);
    expect(mediaElement.children[0]).toBe(firstChild);

    reactor.destroy();
  });

  it("clears the TextTracksActor cache on src unload (so a reused trackId doesn't appear pre-buffered)", async () => {
    const mediaElement = document.createElement('video');
    const textTracksActor = createTextTracksActor(mediaElement);
    const presentation = makePresentation([{ id: 'track-en', language: 'en' }]);

    const { state, reactor } = setup({ presentation }, { mediaElement, textTracksActor });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate the segment loader having populated the actor cache for
    // the current source's track-en.
    textTracksActor.send({
      type: 'add-cues',
      meta: { trackId: 'track-en', id: 'seg-0', startTime: 0, duration: 10 },
      cues: [new VTTCue(0, 2, 'A0')],
    });
    expect(textTracksActor.snapshot.get().context.segments['track-en']).toHaveLength(1);

    // Src unload — `syncTextTracks` exits 'sync-active' and should send
    // 'clear' to the actor as part of its cleanup.
    state.presentation.set(undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(textTracksActor.snapshot.get().context.loaded).toEqual({});
    expect(textTracksActor.snapshot.get().context.segments).toEqual({});

    reactor.destroy();
  });
});
