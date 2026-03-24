import { describe, expect, it } from 'vitest';
import { stateToSignal } from '../../../core/signals/bridge';
import { createState } from '../../../core/state/create-state';
import { syncTextTrackModes, type TextTrackModeOwners, type TextTrackModeState } from '../sync-text-track-modes';

function setupSyncTextTrackModes(initialState: TextTrackModeState = {}, initialOwners: TextTrackModeOwners = {}) {
  const state = createState<TextTrackModeState>(initialState);
  const owners = createState<TextTrackModeOwners>(initialOwners);
  const [stateSignal, cleanupState] = stateToSignal(state);
  const [ownersSignal, cleanupOwners] = stateToSignal(owners);
  const cleanupEffect = syncTextTrackModes({ state: stateSignal, owners: ownersSignal });
  return {
    state,
    owners,
    cleanup: () => {
      cleanupEffect();
      cleanupState();
      cleanupOwners();
    },
  };
}

describe('syncTextTrackModes', () => {
  it('sets selected track mode to "showing"', async () => {
    const mediaElement = document.createElement('video');

    const track1 = document.createElement('track');
    track1.kind = 'subtitles';
    track1.label = 'English';
    track1.src = 'data:text/vtt,';
    mediaElement.appendChild(track1);

    const track2 = document.createElement('track');
    track2.kind = 'subtitles';
    track2.label = 'Spanish';
    track2.src = 'data:text/vtt,';
    mediaElement.appendChild(track2);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { state, cleanup } = setupSyncTextTrackModes(
      {},
      {
        textTracks: new Map([
          ['track-en', track1],
          ['track-es', track2],
        ]),
      }
    );

    state.patch({ selectedTextTrackId: 'track-en' });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(track1.track.mode).toBe('showing');
    expect(track2.track.mode).toBe('hidden');

    cleanup();
  });

  it('switches active track when selection changes', async () => {
    const mediaElement = document.createElement('video');

    const track1 = document.createElement('track');
    track1.kind = 'subtitles';
    track1.src = 'data:text/vtt,';
    mediaElement.appendChild(track1);

    const track2 = document.createElement('track');
    track2.kind = 'subtitles';
    track2.src = 'data:text/vtt,';
    mediaElement.appendChild(track2);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { state, cleanup } = setupSyncTextTrackModes(
      {},
      {
        textTracks: new Map([
          ['track-en', track1],
          ['track-es', track2],
        ]),
      }
    );

    state.patch({ selectedTextTrackId: 'track-en' });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(track1.track.mode).toBe('showing');
    expect(track2.track.mode).toBe('hidden');

    state.patch({ selectedTextTrackId: 'track-es' });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(track1.track.mode).toBe('hidden');
    expect(track2.track.mode).toBe('showing');

    cleanup();
  });

  it('hides all tracks when no selection', async () => {
    const mediaElement = document.createElement('video');

    const track1 = document.createElement('track');
    track1.kind = 'subtitles';
    track1.src = 'data:text/vtt,';
    mediaElement.appendChild(track1);

    const track2 = document.createElement('track');
    track2.kind = 'subtitles';
    track2.src = 'data:text/vtt,';
    mediaElement.appendChild(track2);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { state, cleanup } = setupSyncTextTrackModes(
      {},
      {
        textTracks: new Map([
          ['track-en', track1],
          ['track-es', track2],
        ]),
      }
    );

    state.patch({ selectedTextTrackId: 'track-en' });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(track1.track.mode).toBe('showing');

    state.patch({ selectedTextTrackId: undefined });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(track1.track.mode).toBe('hidden');
    expect(track2.track.mode).toBe('hidden');

    cleanup();
  });

  it('does nothing when textTracks not available', async () => {
    const { cleanup } = setupSyncTextTrackModes({ selectedTextTrackId: 'track-en' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    cleanup();
  });

  it('handles track selection before track elements created', async () => {
    const mediaElement = document.createElement('video');

    const track1 = document.createElement('track');
    track1.kind = 'subtitles';
    track1.src = 'data:text/vtt,';
    mediaElement.appendChild(track1);

    await new Promise((resolve) => setTimeout(resolve, 50));

    const { owners, cleanup } = setupSyncTextTrackModes({ selectedTextTrackId: 'track-en' });

    owners.patch({ textTracks: new Map([['track-en', track1]]) });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(track1.track.mode).toBe('showing');

    cleanup();
  });
});
