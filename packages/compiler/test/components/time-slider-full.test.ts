/**
 * Tests for: time-slider-full.tsx
 * Tests full compound component structure
 */

import type { CompileResult } from '../../src';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement, querySelector } from '../helpers/dom';

describe('fixture: TimeSlider - Full Compound', () => {
  let result: CompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/sliders/time-slider-full.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  describe('component: Root element', () => {
    it('transforms to media-time-slider', () => {
      expect(root.tagName.toLowerCase()).toBe('media-time-slider');
    });

    it('has slider class', () => {
      expect(getClasses(root)).toContain('slider');
    });

    it('has exactly 2 children (track + thumb)', () => {
      expect(root.children.length).toBe(2);
    });
  });

  describe('track element', () => {
    it('exists as media-time-slider-track', () => {
      const track = querySelector(root, 'media-time-slider-track');
      expect(track).toBeDefined();
    });

    it('is direct child of root', () => {
      const track = querySelector(root, 'media-time-slider-track');
      expect(track.parentElement).toBe(root);
    });

    it('has track class', () => {
      const track = querySelector(root, 'media-time-slider-track');
      expect(getClasses(track)).toContain('track');
    });

    it('has exactly 2 children (progress + pointer)', () => {
      const track = querySelector(root, 'media-time-slider-track');
      expect(track.children.length).toBe(2);
    });
  });

  describe('progress element', () => {
    it('exists as media-time-slider-progress', () => {
      const progress = querySelector(root, 'media-time-slider-progress');
      expect(progress).toBeDefined();
    });

    it('is child of track', () => {
      const track = querySelector(root, 'media-time-slider-track');
      const progress = querySelector(track, 'media-time-slider-progress');
      expect(progress.parentElement).toBe(track);
    });

    it('has progress class', () => {
      const progress = querySelector(root, 'media-time-slider-progress');
      expect(getClasses(progress)).toContain('progress');
    });
  });

  describe('pointer element', () => {
    it('exists as media-time-slider-pointer', () => {
      const pointer = querySelector(root, 'media-time-slider-pointer');
      expect(pointer).toBeDefined();
    });

    it('is child of track', () => {
      const track = querySelector(root, 'media-time-slider-track');
      const pointer = querySelector(track, 'media-time-slider-pointer');
      expect(pointer.parentElement).toBe(track);
    });

    it('has pointer class', () => {
      const pointer = querySelector(root, 'media-time-slider-pointer');
      expect(getClasses(pointer)).toContain('pointer');
    });
  });

  describe('thumb element', () => {
    it('exists as media-time-slider-thumb', () => {
      const thumb = querySelector(root, 'media-time-slider-thumb');
      expect(thumb).toBeDefined();
    });

    it('is direct child of root (NOT track)', () => {
      const thumb = querySelector(root, 'media-time-slider-thumb');
      expect(thumb.parentElement).toBe(root);
    });

    it('has thumb class', () => {
      const thumb = querySelector(root, 'media-time-slider-thumb');
      expect(getClasses(thumb)).toContain('thumb');
    });
  });

  describe('cSS extraction', () => {
    it('extracts all classNames', () => {
      expect(result.classNames).toEqual(expect.arrayContaining([
        'slider',
        'track',
        'progress',
        'pointer',
        'thumb',
      ]));
    });

    it('extracts exactly 5 classNames', () => {
      expect(result.classNames.length).toBe(5);
    });
  });
});
