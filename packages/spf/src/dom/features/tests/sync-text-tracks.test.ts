import { describe, expect, it } from 'vitest';
import { signal } from '../../../core/signals/primitives';
import { syncTextTracks, type TextTrackSyncOwners, type TextTrackSyncState } from '../sync-text-tracks';

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

function setup(initialState: TextTrackSyncState = {}, initialOwners: TextTrackSyncOwners = {}) {
  const state = signal<TextTrackSyncState>(initialState);
  const owners = signal<TextTrackSyncOwners>(initialOwners);
  const cleanup = syncTextTracks({ state, owners });
  return { state, owners, cleanup };
}

describe('syncTextTracks', () => {
  it('creates track elements when mediaElement and presentation are available', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, owners, cleanup } = setup();

    owners.set({ ...owners.get(), mediaElement });
    state.set({ ...state.get(), presentation });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mediaElement.children.length).toBe(2);
    expect((mediaElement.children[0] as HTMLTrackElement).id).toBe('track-en');
    expect((mediaElement.children[1] as HTMLTrackElement).id).toBe('track-es');

    cleanup();
  });

  it('writes owners.textTracks Map for loadTextTrackCues', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, owners, cleanup } = setup();
    owners.set({ ...owners.get(), mediaElement });
    state.set({ ...state.get(), presentation });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const textTracks = owners.get().textTracks;
    expect(textTracks).toBeDefined();
    expect(textTracks?.size).toBe(2);
    expect(textTracks?.get('track-en')).toBe(mediaElement.children[0]);
    expect(textTracks?.get('track-es')).toBe(mediaElement.children[1]);

    cleanup();
  });

  it('does not create tracks when no mediaElement', async () => {
    const presentation = makePresentation([{ id: 'track-en', language: 'en' }]);
    const { state, owners, cleanup } = setup();

    state.set({ ...state.get(), presentation });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(owners.get().textTracks).toBeUndefined();
    cleanup();
  });

  it('does not create tracks when presentation has no text tracks', async () => {
    const mediaElement = document.createElement('video');
    const { state, owners, cleanup } = setup();

    owners.set({ ...owners.get(), mediaElement });
    state.set({
      ...state.get(),
      presentation: {
        id: 'pres-1',
        url: 'http://example.com/playlist.m3u8',
        selectionSets: [],
      } as any,
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mediaElement.children.length).toBe(0);
    cleanup();
  });

  it('sets selected track to "showing" and others to "disabled"', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, owners, cleanup } = setup({ presentation });
    owners.set({ ...owners.get(), mediaElement });
    await new Promise((resolve) => setTimeout(resolve, 50));

    state.set({ ...state.get(), selectedTextTrackId: 'track-en' });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const [enEl, esEl] = Array.from(mediaElement.children) as HTMLTrackElement[];
    expect(enEl!.track.mode).toBe('showing');
    expect(esEl!.track.mode).toBe('disabled');

    cleanup();
  });

  it('switches active track when selection changes', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, owners, cleanup } = setup({ presentation, selectedTextTrackId: 'track-en' });
    owners.set({ ...owners.get(), mediaElement });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const [enEl, esEl] = Array.from(mediaElement.children) as HTMLTrackElement[];
    expect(enEl!.track.mode).toBe('showing');
    expect(esEl!.track.mode).toBe('disabled');

    state.set({ ...state.get(), selectedTextTrackId: 'track-es' });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(enEl!.track.mode).toBe('disabled');
    expect(esEl!.track.mode).toBe('showing');

    cleanup();
  });

  it('disables all tracks when selection is cleared', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, owners, cleanup } = setup({ presentation, selectedTextTrackId: 'track-en' });
    owners.set({ ...owners.get(), mediaElement });
    await new Promise((resolve) => setTimeout(resolve, 50));

    state.set({ ...state.get(), selectedTextTrackId: undefined });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const [enEl, esEl] = Array.from(mediaElement.children) as HTMLTrackElement[];
    expect(enEl!.track.mode).toBe('disabled');
    expect(esEl!.track.mode).toBe('disabled');

    cleanup();
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

    const { owners, cleanup } = setup({ presentation, selectedTextTrackId: 'track-en' });
    owners.set({ ...owners.get(), mediaElement });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(chaptersEl.track.mode).toBe('hidden');

    cleanup();
  });

  it('bridges external mode change → selectedTextTrackId', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, owners, cleanup } = setup({ presentation });
    owners.set({ ...owners.get(), mediaElement });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate external code (e.g. captions button) showing Spanish
    const esEl = Array.from(mediaElement.children).find(
      (el) => (el as HTMLTrackElement).id === 'track-es'
    ) as HTMLTrackElement;
    esEl.track.mode = 'showing';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.get().selectedTextTrackId).toBe('track-es');

    cleanup();
  });

  it('clears selectedTextTrackId when external code disables all tracks', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { state, owners, cleanup } = setup({ presentation, selectedTextTrackId: 'track-en' });
    owners.set({ ...owners.get(), mediaElement });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate external code disabling all tracks
    const enEl = Array.from(mediaElement.children).find(
      (el) => (el as HTMLTrackElement).id === 'track-en'
    ) as HTMLTrackElement;
    enEl.track.mode = 'disabled';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.get().selectedTextTrackId).toBeUndefined();

    cleanup();
  });

  it('removes track elements on cleanup', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([
      { id: 'track-en', language: 'en' },
      { id: 'track-es', language: 'es' },
    ]);

    const { owners, cleanup } = setup({ presentation });
    owners.set({ ...owners.get(), mediaElement });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mediaElement.children.length).toBe(2);

    cleanup();
    expect(mediaElement.children.length).toBe(0);
  });

  it('clears owners.textTracks on cleanup', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([{ id: 'track-en', language: 'en' }]);

    const { owners, cleanup } = setup({ presentation });
    owners.set({ ...owners.get(), mediaElement });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(owners.get().textTracks?.size).toBe(1);

    cleanup();
    expect(owners.get().textTracks).toBeUndefined();
  });

  it('creates tracks only once (idempotent on re-runs)', async () => {
    const mediaElement = document.createElement('video');
    const presentation = makePresentation([{ id: 'track-en', language: 'en' }]);

    const { state, owners, cleanup } = setup({ presentation });
    owners.set({ ...owners.get(), mediaElement });
    await new Promise((resolve) => setTimeout(resolve, 50));

    const firstChild = mediaElement.children[0];
    expect(mediaElement.children.length).toBe(1);

    // Trigger a re-run by changing selectedTextTrackId
    state.set({ ...state.get(), selectedTextTrackId: 'track-en' });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mediaElement.children.length).toBe(1);
    expect(mediaElement.children[0]).toBe(firstChild);

    cleanup();
  });
});
