import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../core/signals/primitives';
import {
  type SelectedTextTrackFromDomOwners,
  type SelectedTextTrackFromDomState,
  syncSelectedTextTrackFromDom,
} from '../sync-selected-text-track-from-dom';

function setup(initialState: SelectedTextTrackFromDomState = {}, initialOwners: SelectedTextTrackFromDomOwners = {}) {
  const state = signal<SelectedTextTrackFromDomState>(initialState);
  const owners = signal<SelectedTextTrackFromDomOwners>(initialOwners);
  const cleanup = syncSelectedTextTrackFromDom({ state, owners });
  return { state, owners, cleanup };
}

function createSubtitleTrack(mediaElement: HTMLMediaElement, id: string): HTMLTrackElement {
  const trackEl = document.createElement('track');
  trackEl.kind = 'subtitles';
  trackEl.label = id;
  trackEl.id = id;
  trackEl.src = 'data:text/vtt,';
  mediaElement.appendChild(trackEl);
  return trackEl;
}

describe('syncSelectedTextTrackFromDom', () => {
  it('does nothing when no mediaElement', async () => {
    const { state, cleanup } = setup();

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.get().selectedTextTrackId).toBeUndefined();

    cleanup();
  });

  it('patches selectedTextTrackId when a subtitle track mode changes to "showing"', async () => {
    const mediaElement = document.createElement('video');
    const trackEl = createSubtitleTrack(mediaElement, 'track-en');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { state, cleanup } = setup({}, { mediaElement });

    trackEl.track.mode = 'showing';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(state.get().selectedTextTrackId).toBe('track-en');
    });

    cleanup();
  });

  it('patches selectedTextTrackId when a captions track mode changes to "showing"', async () => {
    const mediaElement = document.createElement('video');
    const trackEl = document.createElement('track');
    trackEl.kind = 'captions';
    trackEl.id = 'track-cc';
    trackEl.src = 'data:text/vtt,';
    mediaElement.appendChild(trackEl);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { state, cleanup } = setup({}, { mediaElement });

    trackEl.track.mode = 'showing';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(state.get().selectedTextTrackId).toBe('track-cc');
    });

    cleanup();
  });

  it('clears selectedTextTrackId when no subtitle/caption track is showing', async () => {
    const mediaElement = document.createElement('video');
    const trackEl = createSubtitleTrack(mediaElement, 'track-en');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { state, cleanup } = setup({ selectedTextTrackId: 'track-en' }, { mediaElement });

    trackEl.track.mode = 'disabled';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(state.get().selectedTextTrackId).toBeUndefined();
    });

    cleanup();
  });

  it('clears textBufferState for the deselected track when disabling', async () => {
    const mediaElement = document.createElement('video');
    const trackEl = createSubtitleTrack(mediaElement, 'track-en');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { state, cleanup } = setup(
      {
        selectedTextTrackId: 'track-en',
        textBufferState: {
          'track-en': { segments: [{ id: 'seg-0' }, { id: 'seg-1' }] },
        },
      },
      { mediaElement }
    );

    trackEl.track.mode = 'disabled';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(state.get().selectedTextTrackId).toBeUndefined();
      expect(state.get().textBufferState?.['track-en']).toBeUndefined();
    });

    cleanup();
  });

  it('does not modify textBufferState for other tracks when disabling one', async () => {
    const mediaElement = document.createElement('video');
    const trackEl = createSubtitleTrack(mediaElement, 'track-en');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { state, cleanup } = setup(
      {
        selectedTextTrackId: 'track-en',
        textBufferState: {
          'track-en': { segments: [{ id: 'seg-0' }] },
          'track-fr': { segments: [{ id: 'seg-0' }] },
        },
      },
      { mediaElement }
    );

    trackEl.track.mode = 'disabled';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(state.get().textBufferState?.['track-en']).toBeUndefined();
    });

    expect(state.get().textBufferState?.['track-fr']).toEqual({ segments: [{ id: 'seg-0' }] });

    cleanup();
  });

  it('ignores non-subtitle/caption track kinds', async () => {
    const mediaElement = document.createElement('video');
    const chapterEl = document.createElement('track');
    chapterEl.kind = 'chapters';
    chapterEl.id = 'chapters-track';
    chapterEl.src = 'data:text/vtt,';
    mediaElement.appendChild(chapterEl);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { state, cleanup } = setup({}, { mediaElement });

    chapterEl.track.mode = 'showing';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.get().selectedTextTrackId).toBeUndefined();

    cleanup();
  });

  it('does not patch when selectedTextTrackId already matches the showing track', async () => {
    const mediaElement = document.createElement('video');
    const trackEl = createSubtitleTrack(mediaElement, 'track-en');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const stateSignal = signal<SelectedTextTrackFromDomState>({ selectedTextTrackId: 'track-en' });
    const ownersSignal = signal<SelectedTextTrackFromDomOwners>({ mediaElement });

    const setSpy = vi.spyOn(stateSignal, 'set');

    const cleanupEffect = syncSelectedTextTrackFromDom({ state: stateSignal, owners: ownersSignal });

    trackEl.track.mode = 'showing';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(setSpy).not.toHaveBeenCalled();

    cleanupEffect();
  });

  it('does not re-register listener when owners updates but mediaElement is unchanged', async () => {
    const mediaElement = document.createElement('video');

    const stateSignal = signal<SelectedTextTrackFromDomState>({});
    const ownersSignal = signal<SelectedTextTrackFromDomOwners & { videoBuffer?: unknown }>({ mediaElement });

    const addEventListenerSpy = vi.spyOn(mediaElement.textTracks, 'addEventListener');

    const cleanupEffect = syncSelectedTextTrackFromDom({ state: stateSignal, owners: ownersSignal });

    await new Promise((resolve) => setTimeout(resolve, 20));
    const callsBefore = addEventListenerSpy.mock.calls.length;

    ownersSignal.set({ ...ownersSignal.get(), videoBuffer: {} as any });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);

    cleanupEffect();
  });

  it('starts listening when mediaElement is added later', async () => {
    const { state, owners, cleanup } = setup();

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.get().selectedTextTrackId).toBeUndefined();

    const mediaElement = document.createElement('video');
    const trackEl = createSubtitleTrack(mediaElement, 'track-en');
    await new Promise((resolve) => setTimeout(resolve, 50));

    owners.set({ ...owners.get(), mediaElement });

    trackEl.track.mode = 'showing';
    mediaElement.textTracks.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(state.get().selectedTextTrackId).toBe('track-en');
    });

    cleanup();
  });

  it('stops listening to old mediaElement when replaced', async () => {
    const element1 = document.createElement('video');
    const trackEl1 = createSubtitleTrack(element1, 'track-en');

    const element2 = document.createElement('video');
    const trackEl2 = createSubtitleTrack(element2, 'track-fr');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { state, owners, cleanup } = setup({}, { mediaElement: element1 });

    owners.set({ ...owners.get(), mediaElement: element2 });
    await new Promise((resolve) => setTimeout(resolve, 20));

    trackEl1.track.mode = 'showing';
    element1.textTracks.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.get().selectedTextTrackId).toBeUndefined();

    trackEl2.track.mode = 'showing';
    element2.textTracks.dispatchEvent(new Event('change'));

    await vi.waitFor(() => {
      expect(state.get().selectedTextTrackId).toBe('track-fr');
    });

    cleanup();
  });

  it('removes listener on cleanup', async () => {
    const mediaElement = document.createElement('video');
    const trackEl = createSubtitleTrack(mediaElement, 'track-en');

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { state, cleanup } = setup({}, { mediaElement });
    cleanup();

    trackEl.track.mode = 'showing';
    mediaElement.textTracks.dispatchEvent(new Event('change'));
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.get().selectedTextTrackId).toBeUndefined();
  });
});
