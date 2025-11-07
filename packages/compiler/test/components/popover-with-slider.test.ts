/**
 * Tests for: popover-with-slider.tsx
 */

import type { TestCompileResult } from '../helpers/compile';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement } from '../helpers/dom';

describe('fixture: Popover - With Slider', () => {
  let result: TestCompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/interactive/popover-with-slider.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  describe('trigger element', () => {
    it('button is extracted as first element', () => {
      expect(root.tagName.toLowerCase()).toBe('media-mute-button');
    });

    it('has commandfor attribute linking to popover', () => {
      expect(root.getAttribute('commandfor')).toBe('mute-button-popover');
    });

    it('has command="toggle-popover" attribute', () => {
      expect(root.getAttribute('command')).toBe('toggle-popover');
    });

    it('preserves button className', () => {
      expect(getClasses(root)).toContain('btn');
    });
  });

  describe('popover element', () => {
    let popover: Element;

    beforeAll(() => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(result.html, 'text/html');
      const popoverEl = doc.querySelector('media-popover');
      if (!popoverEl) throw new Error('No popover found');
      popover = popoverEl;
    });

    it('creates media-popover as second element', () => {
      expect(popover.tagName.toLowerCase()).toBe('media-popover');
    });

    it('has matching ID for commandfor linking', () => {
      expect(popover.getAttribute('id')).toBe('mute-button-popover');
    });

    it('has popover="manual" attribute', () => {
      expect(popover.getAttribute('popover')).toBe('manual');
    });

    it('has open-on-hover attribute', () => {
      expect(popover.hasAttribute('open-on-hover')).toBe(true);
    });

    it('preserves delay attribute', () => {
      expect(popover.getAttribute('delay')).toBe('200');
    });

    it('preserves close-delay attribute', () => {
      expect(popover.getAttribute('close-delay')).toBe('100');
    });

    it('preserves side attribute from Positioner', () => {
      expect(popover.getAttribute('side')).toBe('top');
    });

    it('contains volume slider as direct child', () => {
      const slider = popover.querySelector('media-volume-slider');
      expect(slider).toBeDefined();
    });
  });
});
