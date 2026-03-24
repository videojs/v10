import { describe, expect, it } from 'vitest';
import { stateToSignal } from '../../../core/signals/bridge';
import { createState } from '../../../core/state/create-state';
import type { Presentation, TextSelectionSet } from '../../../core/types';
import { setupTextTracks, type TextTrackOwners, type TextTrackState } from '../setup-text-tracks';

function setupSetupTextTracks(initialState: TextTrackState = {}, initialOwners: TextTrackOwners = {}) {
  const state = createState<TextTrackState>(initialState);
  const owners = createState<TextTrackOwners>(initialOwners);
  const [stateSignal, cleanupState] = stateToSignal(state);
  const [ownersSignal, cleanupOwners] = stateToSignal(owners);
  const cleanupEffect = setupTextTracks({ state: stateSignal, owners: ownersSignal });
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

const textPresentation: Presentation = {
  id: 'pres-1',
  url: 'http://example.com/playlist.m3u8',
  selectionSets: [
    {
      id: 'text-set',
      type: 'text',
      switchingSets: [
        {
          id: 'text-switching',
          type: 'text',
          tracks: [
            {
              type: 'text',
              id: 'text-en',
              url: 'http://example.com/text-en.m3u8',
              bandwidth: 256,
              mimeType: 'text/vtt',
              codecs: [],
              groupId: 'subs',
              label: 'English',
              kind: 'subtitles',
              language: 'en',
            },
            {
              type: 'text',
              id: 'text-es',
              url: 'http://example.com/text-es.m3u8',
              bandwidth: 256,
              mimeType: 'text/vtt',
              codecs: [],
              groupId: 'subs',
              label: 'Spanish',
              kind: 'subtitles',
              language: 'es',
              default: true,
            },
          ],
        },
      ],
    } as TextSelectionSet,
  ],
};

describe('setupTextTracks', () => {
  it('creates track elements when mediaElement and presentation ready', async () => {
    const mediaElement = document.createElement('video');

    const { owners, cleanup } = setupSetupTextTracks({ presentation: textPresentation }, { mediaElement });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(owners.current.textTracks?.size).toBe(2);
    expect(mediaElement.children.length).toBe(2);

    const track1 = mediaElement.children[0] as HTMLTrackElement;
    expect(track1.tagName).toBe('TRACK');
    expect(track1.id).toBe('text-en');
    expect(track1.kind).toBe('subtitles');
    expect(track1.label).toBe('English');
    expect(track1.srclang).toBe('en');
    expect(track1.src).toBe('http://example.com/text-en.m3u8');
    expect(track1.default).toBe(false);

    const track2 = mediaElement.children[1] as HTMLTrackElement;
    expect(track2.tagName).toBe('TRACK');
    expect(track2.id).toBe('text-es');
    expect(track2.kind).toBe('subtitles');
    expect(track2.label).toBe('Spanish');
    expect(track2.srclang).toBe('es');
    expect(track2.src).toBe('http://example.com/text-es.m3u8');
    expect(track2.default).toBe(true);

    cleanup();
  });

  it('waits for mediaElement before creating tracks', async () => {
    const { state, owners, cleanup } = setupSetupTextTracks({ presentation: textPresentation });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(owners.current.textTracks).toBeUndefined();

    const mediaElement = document.createElement('video');
    owners.patch({ mediaElement });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(owners.current.textTracks?.size).toBe(2);

    cleanup();
  });

  it('waits for presentation before creating tracks', async () => {
    const mediaElement = document.createElement('video');
    const { state, owners, cleanup } = setupSetupTextTracks({}, { mediaElement });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(owners.current.textTracks).toBeUndefined();

    state.patch({ presentation: textPresentation });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(owners.current.textTracks?.size).toBe(2);

    cleanup();
  });

  it('does not create track elements when no text tracks in presentation', async () => {
    const presentation: Presentation = {
      id: 'pres-1',
      url: 'http://example.com/playlist.m3u8',
      selectionSets: [],
    };

    const mediaElement = document.createElement('video');
    const { owners, cleanup } = setupSetupTextTracks({ presentation }, { mediaElement });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(owners.current.textTracks).toBeUndefined();
    expect(mediaElement.children.length).toBe(0);

    cleanup();
  });

  it('only runs once (idempotent)', async () => {
    const mediaElement = document.createElement('video');

    const { state, owners, cleanup } = setupSetupTextTracks({ presentation: textPresentation }, { mediaElement });

    await new Promise((resolve) => setTimeout(resolve, 50));

    const firstTrackMap = owners.current.textTracks;
    expect(firstTrackMap?.size).toBe(2);
    expect(mediaElement.children.length).toBe(2);

    state.patch({ selectedTextTrackId: 'text-en' });

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(owners.current.textTracks).toBe(firstTrackMap);
    expect(mediaElement.children.length).toBe(2);

    cleanup();
  });

  it('removes track elements on cleanup', async () => {
    const mediaElement = document.createElement('video');

    const { cleanup } = setupSetupTextTracks({ presentation: textPresentation }, { mediaElement });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mediaElement.children.length).toBe(2);

    cleanup();
    expect(mediaElement.children.length).toBe(0);
  });
});
