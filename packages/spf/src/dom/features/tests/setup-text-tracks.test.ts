import { describe, expect, it } from 'vitest';
import { createState } from '../../../core/state/create-state';
import type { Presentation, TextSelectionSet } from '../../../core/types';
import {
  canSetupTextTracks,
  setupTextTracks,
  shouldSetupTextTracks,
  type TextTrackOwners,
  type TextTrackState,
} from '../setup-text-tracks';

describe('setupTextTracks', () => {
  describe('canSetupTextTracks', () => {
    it('returns false when no mediaElement', () => {
      const state: TextTrackState = {
        presentation: {
          id: 'pres-1',
          url: 'http://example.com/playlist.m3u8',
          selectionSets: [],
        },
      };
      const owners: TextTrackOwners = {};

      expect(canSetupTextTracks(state, owners)).toBe(false);
    });

    it('returns false when no presentation', () => {
      const state: TextTrackState = {};
      const owners: TextTrackOwners = {
        mediaElement: document.createElement('video'),
      };

      expect(canSetupTextTracks(state, owners)).toBe(false);
    });

    it('returns false when presentation not resolved (no selectionSets)', () => {
      const state: TextTrackState = {
        presentation: {
          id: 'pres-1',
          url: 'http://example.com/playlist.m3u8',
        },
      };
      const owners: TextTrackOwners = {
        mediaElement: document.createElement('video'),
      };

      expect(canSetupTextTracks(state, owners)).toBe(false);
    });

    it('returns true when mediaElement and presentation resolved', () => {
      const state: TextTrackState = {
        presentation: {
          id: 'pres-1',
          url: 'http://example.com/playlist.m3u8',
          selectionSets: [],
        },
      };
      const owners: TextTrackOwners = {
        mediaElement: document.createElement('video'),
      };

      expect(canSetupTextTracks(state, owners)).toBe(true);
    });
  });

  describe('shouldSetupTextTracks', () => {
    it('returns true when textTracks not set', () => {
      const owners: TextTrackOwners = {
        mediaElement: document.createElement('video'),
      };

      expect(shouldSetupTextTracks(owners)).toBe(true);
    });

    it('returns false when textTracks already set', () => {
      const owners: TextTrackOwners = {
        mediaElement: document.createElement('video'),
        textTracks: new Map(),
      };

      expect(shouldSetupTextTracks(owners)).toBe(false);
    });
  });

  describe('setupTextTracks orchestration', () => {
    it('creates track elements when mediaElement and presentation ready', async () => {
      const presentation: Presentation = {
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

      const state = createState<TextTrackState>({});
      const owners = createState<TextTrackOwners>({});

      const cleanup = setupTextTracks({ state, owners });

      // Patch owners first (mediaElement)
      const mediaElement = document.createElement('video');
      owners.patch({ mediaElement });

      // Then patch state (presentation)
      state.patch({ presentation });

      // Wait for orchestration to run
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify track elements created
      expect(owners.current.textTracks).toBeDefined();
      expect(owners.current.textTracks?.size).toBe(2);

      // Verify track elements in DOM
      expect(mediaElement.children.length).toBe(2);

      // Verify first track element
      const track1 = mediaElement.children[0] as HTMLTrackElement;
      expect(track1.tagName).toBe('TRACK');
      expect(track1.kind).toBe('subtitles');
      expect(track1.label).toBe('English');
      expect(track1.srclang).toBe('en');
      expect(track1.src).toBe('http://example.com/text-en.m3u8');
      expect(track1.dataset.trackId).toBe('text-en');
      expect(track1.default).toBe(false);

      // Verify second track element
      const track2 = mediaElement.children[1] as HTMLTrackElement;
      expect(track2.tagName).toBe('TRACK');
      expect(track2.kind).toBe('subtitles');
      expect(track2.label).toBe('Spanish');
      expect(track2.srclang).toBe('es');
      expect(track2.src).toBe('http://example.com/text-es.m3u8');
      expect(track2.dataset.trackId).toBe('text-es');
      expect(track2.default).toBe(true);

      cleanup();
    });

    it('does not create track elements when no text tracks', async () => {
      const presentation: Presentation = {
        id: 'pres-1',
        url: 'http://example.com/playlist.m3u8',
        selectionSets: [],
      };

      const state = createState<TextTrackState>({});
      const owners = createState<TextTrackOwners>({});

      const cleanup = setupTextTracks({ state, owners });

      const mediaElement = document.createElement('video');
      owners.patch({ mediaElement });
      state.patch({ presentation });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not create textTracks map when no tracks
      expect(owners.current.textTracks).toBeUndefined();
      expect(mediaElement.children.length).toBe(0);

      cleanup();
    });

    it('only runs once (idempotent)', async () => {
      const presentation: Presentation = {
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
                ],
              },
            ],
          } as TextSelectionSet,
        ],
      };

      const state = createState<TextTrackState>({});
      const owners = createState<TextTrackOwners>({});

      const cleanup = setupTextTracks({ state, owners });

      const mediaElement = document.createElement('video');
      owners.patch({ mediaElement });
      state.patch({ presentation });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const firstTrackMap = owners.current.textTracks;
      expect(firstTrackMap?.size).toBe(1);
      expect(mediaElement.children.length).toBe(1);

      // Trigger another state update
      state.patch({ selectedTextTrackId: 'text-en' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not create duplicate track elements
      expect(owners.current.textTracks).toBe(firstTrackMap);
      expect(mediaElement.children.length).toBe(1);

      cleanup();
    });
  });
});
