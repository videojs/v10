/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { getPreload } from '../preload';

describe('getPreload', () => {
  let video: HTMLVideoElement;

  beforeEach(() => {
    video = document.createElement('video');
  });

  describe('standard preload values', () => {
    it('should return "none" when preload is none', () => {
      video.preload = 'none';
      expect(getPreload(video)).toBe('none');
    });

    it('should return "metadata" when preload is metadata', () => {
      video.preload = 'metadata';
      expect(getPreload(video)).toBe('metadata');
    });

    it('should return "auto" when preload is auto', () => {
      video.preload = 'auto';
      expect(getPreload(video)).toBe('auto');
    });
  });

  describe('default behavior', () => {
    it('should default to metadata when preload not set', () => {
      // Spec recommends metadata as default behavior
      expect(getPreload(video)).toBe('metadata');
    });

    it('should default to metadata when preload is empty string', () => {
      video.preload = '';
      expect(getPreload(video)).toBe('metadata');
    });
  });

  describe('invalid values', () => {
    it('should normalize invalid values to metadata', () => {
      video.setAttribute('preload', 'invalid');
      expect(getPreload(video)).toBe('metadata');
    });
  });

  describe('other media elements', () => {
    it('should work with audio element', () => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      expect(getPreload(audio)).toBe('metadata');
    });
  });
});
