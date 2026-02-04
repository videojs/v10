import { describe, expect, it } from 'vitest';
import type {
  Presentation,
  UnresolvedAudioTrack,
  UnresolvedTextTrack,
  UnresolvedVideoTrack,
  VideoTrack,
} from '../index';
import { hasPresentationDuration, isResolvedTrack } from '../index';

describe('Type Guards', () => {
  describe('isResolvedTrack', () => {
    it('returns true for resolved video track (has segments)', () => {
      const resolved: VideoTrack = {
        type: 'video',
        id: 'video-0',
        url: 'https://example.com/video.m3u8',
        baseUrl: 'https://example.com/video.m3u8',
        bandwidth: 1400000,
        width: 1280,
        height: 720,
        codecs: ['avc1.4d401f'],
        frameRate: { frameRateNumerator: 30 },
        mimeType: 'video/mp4',
        par: '1:1',
        sar: '1:1',
        scanType: 'progressive',
        duration: 10,
        initialization: { url: 'https://example.com/init.mp4' },
        segments: [],
      };

      expect(isResolvedTrack(resolved)).toBe(true);
    });

    it('returns false for unresolved video track (no segments)', () => {
      const unresolved: UnresolvedVideoTrack = {
        type: 'video',
        id: 'video-0',
        url: 'https://example.com/video.m3u8',
        bandwidth: 1400000,
        mimeType: 'video/mp4',
        par: '1:1',
        sar: '1:1',
        scanType: 'progressive',
      };

      expect(isResolvedTrack(unresolved)).toBe(false);
    });

    it('narrows UnresolvedVideoTrack | VideoTrack to VideoTrack', () => {
      const track: UnresolvedVideoTrack | VideoTrack = {
        type: 'video',
        id: 'video-0',
        url: 'https://example.com/video.m3u8',
        baseUrl: 'https://example.com/video.m3u8',
        bandwidth: 1400000,
        width: 1280,
        height: 720,
        codecs: ['avc1.4d401f'],
        frameRate: { frameRateNumerator: 30 },
        mimeType: 'video/mp4',
        par: '1:1',
        sar: '1:1',
        scanType: 'progressive',
        duration: 10,
        initialization: { url: 'https://example.com/init.mp4' },
        segments: [],
      };

      if (isResolvedTrack(track)) {
        // TypeScript should know track is VideoTrack here
        const segments = track.segments;
        expect(segments).toBeDefined();
      }
    });

    it('works for audio tracks', () => {
      const unresolved: UnresolvedAudioTrack = {
        type: 'audio',
        id: 'audio-0',
        url: 'https://example.com/audio.m3u8',
        groupId: 'audio',
        name: 'Default',
        mimeType: 'audio/mp4',
        bandwidth: 0,
        sampleRate: 48000,
        channels: 2,
      };

      expect(isResolvedTrack(unresolved)).toBe(false);
    });

    it('works for text tracks', () => {
      const unresolved: UnresolvedTextTrack = {
        type: 'text',
        id: 'text-0',
        url: 'https://example.com/subs.m3u8',
        groupId: 'subs',
        label: 'English',
        kind: 'subtitles',
        mimeType: 'text/vtt',
        bandwidth: 0,
        codecs: [],
      };

      expect(isResolvedTrack(unresolved)).toBe(false);
    });
  });

  describe('hasPresentationDuration', () => {
    it('returns true when presentation has duration', () => {
      const presentation: Presentation = {
        id: 'presentation-0',
        baseUrl: 'https://example.com/master.m3u8',
        url: 'https://example.com/master.m3u8',
        startTime: 0,
        duration: 100,
        endTime: 100,
        selectionSets: [],
      };

      expect(hasPresentationDuration(presentation)).toBe(true);
    });

    it('returns false when presentation has undefined duration', () => {
      const presentation: Presentation = {
        id: 'presentation-0',
        baseUrl: 'https://example.com/master.m3u8',
        url: 'https://example.com/master.m3u8',
        startTime: 0,
        duration: undefined,
        endTime: undefined,
        selectionSets: [],
      };

      expect(hasPresentationDuration(presentation)).toBe(false);
    });

    it('narrows type to include required duration and endTime', () => {
      const presentation: Presentation = {
        id: 'presentation-0',
        baseUrl: 'https://example.com/master.m3u8',
        url: 'https://example.com/master.m3u8',
        startTime: 0,
        duration: 100,
        endTime: 100,
        selectionSets: [],
      };

      if (hasPresentationDuration(presentation)) {
        // TypeScript knows duration and endTime are numbers (not undefined)
        const d: number = presentation.duration;
        const e: number = presentation.endTime;
        expect(d).toBe(100);
        expect(e).toBe(100);
      }
    });
  });
});
