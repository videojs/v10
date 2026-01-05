import { describe, expect, it } from 'vitest';

import { isHTMLAudio, isHTMLMedia, isHTMLVideo } from '../predicate';

describe('predicate', () => {
  describe('isHTMLVideo', () => {
    it('returns true for video elements', () => {
      const video = document.createElement('video');
      expect(isHTMLVideo(video)).toBe(true);
    });

    it('returns false for audio elements', () => {
      const audio = document.createElement('audio');
      expect(isHTMLVideo(audio)).toBe(false);
    });

    it('returns false for other elements', () => {
      const div = document.createElement('div');
      expect(isHTMLVideo(div)).toBe(false);
    });

    it('returns false for non-elements', () => {
      expect(isHTMLVideo(null)).toBe(false);
      expect(isHTMLVideo(undefined)).toBe(false);
      expect(isHTMLVideo('video')).toBe(false);
      expect(isHTMLVideo({})).toBe(false);
    });
  });

  describe('isHTMLAudio', () => {
    it('returns true for audio elements', () => {
      const audio = document.createElement('audio');
      expect(isHTMLAudio(audio)).toBe(true);
    });

    it('returns false for video elements', () => {
      const video = document.createElement('video');
      expect(isHTMLAudio(video)).toBe(false);
    });

    it('returns false for other elements', () => {
      const div = document.createElement('div');
      expect(isHTMLAudio(div)).toBe(false);
    });

    it('returns false for non-elements', () => {
      expect(isHTMLAudio(null)).toBe(false);
      expect(isHTMLAudio(undefined)).toBe(false);
      expect(isHTMLAudio('audio')).toBe(false);
      expect(isHTMLAudio({})).toBe(false);
    });
  });

  describe('isHTMLMedia', () => {
    it('returns true for video elements', () => {
      const video = document.createElement('video');
      expect(isHTMLMedia(video)).toBe(true);
    });

    it('returns true for audio elements', () => {
      const audio = document.createElement('audio');
      expect(isHTMLMedia(audio)).toBe(true);
    });

    it('returns false for other elements', () => {
      const div = document.createElement('div');
      expect(isHTMLMedia(div)).toBe(false);
    });

    it('returns false for non-elements', () => {
      expect(isHTMLMedia(null)).toBe(false);
      expect(isHTMLMedia(undefined)).toBe(false);
      expect(isHTMLMedia('video')).toBe(false);
      expect(isHTMLMedia({})).toBe(false);
    });
  });
});
