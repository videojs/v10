/**
 * Tests for: volume-slider-full.tsx
 */

import type { CompileResult } from '../../src';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement, querySelector } from '../helpers/dom';

describe('fixture: VolumeSlider - Full Compound', () => {
  let result: CompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/sliders/volume-slider-full.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  describe('root element', () => {
    it('transforms to media-volume-slider', () => {
      expect(root.tagName.toLowerCase()).toBe('media-volume-slider');
    });

    it('has slider class', () => {
      expect(getClasses(root)).toContain('slider');
    });

    it('has orientation attribute', () => {
      expect(root.getAttribute('orientation')).toBe('vertical');
    });

    it('has exactly 2 children (track + thumb)', () => {
      expect(root.children.length).toBe(2);
    });
  });

  describe('track element', () => {
    it('exists as media-volume-slider-track', () => {
      const track = querySelector(root, 'media-volume-slider-track');
      expect(track).toBeDefined();
    });

    it('is direct child of root', () => {
      const track = querySelector(root, 'media-volume-slider-track');
      expect(track.parentElement).toBe(root);
    });

    it('has track class', () => {
      const track = querySelector(root, 'media-volume-slider-track');
      expect(getClasses(track)).toContain('track');
    });

    it('has exactly 1 child (progress)', () => {
      const track = querySelector(root, 'media-volume-slider-track');
      expect(track.children.length).toBe(1);
    });
  });

  describe('progress element', () => {
    it('exists as media-volume-slider-progress', () => {
      const progress = querySelector(root, 'media-volume-slider-progress');
      expect(progress).toBeDefined();
    });

    it('is child of track', () => {
      const track = querySelector(root, 'media-volume-slider-track');
      const progress = querySelector(track, 'media-volume-slider-progress');
      expect(progress.parentElement).toBe(track);
    });

    it('has progress class', () => {
      const progress = querySelector(root, 'media-volume-slider-progress');
      expect(getClasses(progress)).toContain('progress');
    });
  });

  describe('thumb element', () => {
    it('exists as media-volume-slider-thumb', () => {
      const thumb = querySelector(root, 'media-volume-slider-thumb');
      expect(thumb).toBeDefined();
    });

    it('is direct child of root', () => {
      const thumb = querySelector(root, 'media-volume-slider-thumb');
      expect(thumb.parentElement).toBe(root);
    });

    it('has thumb class', () => {
      const thumb = querySelector(root, 'media-volume-slider-thumb');
      expect(getClasses(thumb)).toContain('thumb');
    });
  });

  describe('compiler CSS extraction', () => {
    it('extracts all classNames', () => {
      expect(result.classNames).toEqual(expect.arrayContaining([
        'slider',
        'track',
        'progress',
        'thumb',
      ]));
    });

    it('extracts exactly 4 classNames', () => {
      expect(result.classNames.length).toBe(4);
    });
  });
});
