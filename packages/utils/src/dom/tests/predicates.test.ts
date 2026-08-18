import { describe, expect, it } from 'vitest';

import { isDocument, isHTMLAudioElement, isHTMLMediaElement, isHTMLVideoElement, isShadowRoot } from '../predicates';

describe('DOM predicates', () => {
  describe('isDocument', () => {
    it('returns true for documents', () => {
      expect(isDocument(document)).toBe(true);
    });

    it('returns false for non-documents', () => {
      expect(isDocument(document.body)).toBe(false);
      expect(isDocument(null)).toBe(false);
    });
  });

  describe('isShadowRoot', () => {
    it('returns true for shadow roots', () => {
      const host = document.createElement('div');
      const shadow = host.attachShadow({ mode: 'open' });

      expect(isShadowRoot(shadow)).toBe(true);
    });

    it('returns false for non-shadow roots', () => {
      expect(isShadowRoot(document)).toBe(false);
      expect(isShadowRoot(document.body)).toBe(false);
      expect(isShadowRoot(null)).toBe(false);
    });
  });

  describe('isHTMLVideoElement', () => {
    it('returns true for video elements', () => {
      const video = document.createElement('video');
      expect(isHTMLVideoElement(video)).toBe(true);
    });

    it('returns false for audio elements', () => {
      const audio = document.createElement('audio');
      expect(isHTMLVideoElement(audio)).toBe(false);
    });

    it('returns false for other elements', () => {
      const div = document.createElement('div');
      expect(isHTMLVideoElement(div)).toBe(false);
    });

    it('returns false for non-elements', () => {
      expect(isHTMLVideoElement(null)).toBe(false);
      expect(isHTMLVideoElement(undefined)).toBe(false);
      expect(isHTMLVideoElement('video')).toBe(false);
      expect(isHTMLVideoElement({})).toBe(false);
    });
  });

  describe('isHTMLAudioElement', () => {
    it('returns true for audio elements', () => {
      const audio = document.createElement('audio');
      expect(isHTMLAudioElement(audio)).toBe(true);
    });

    it('returns false for video elements', () => {
      const video = document.createElement('video');
      expect(isHTMLAudioElement(video)).toBe(false);
    });

    it('returns false for other elements', () => {
      const div = document.createElement('div');
      expect(isHTMLAudioElement(div)).toBe(false);
    });

    it('returns false for non-elements', () => {
      expect(isHTMLAudioElement(null)).toBe(false);
      expect(isHTMLAudioElement(undefined)).toBe(false);
      expect(isHTMLAudioElement('audio')).toBe(false);
      expect(isHTMLAudioElement({})).toBe(false);
    });
  });

  describe('isHTMLMediaElement', () => {
    it('returns true for video elements', () => {
      const video = document.createElement('video');
      expect(isHTMLMediaElement(video)).toBe(true);
    });

    it('returns true for audio elements', () => {
      const audio = document.createElement('audio');
      expect(isHTMLMediaElement(audio)).toBe(true);
    });

    it('returns false for other elements', () => {
      const div = document.createElement('div');
      expect(isHTMLMediaElement(div)).toBe(false);
    });

    it('returns false for non-elements', () => {
      expect(isHTMLMediaElement(null)).toBe(false);
      expect(isHTMLMediaElement(undefined)).toBe(false);
      expect(isHTMLMediaElement('video')).toBe(false);
      expect(isHTMLMediaElement({})).toBe(false);
    });
  });
});
