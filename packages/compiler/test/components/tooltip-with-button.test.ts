import type { TestCompileResult } from '../helpers/compile';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement, querySelector } from '../helpers/dom';

describe('fixture: Tooltip - With Button', () => {
  let result: TestCompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/interactive/tooltip-with-button.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  describe('trigger element', () => {
    it('button is extracted as first element', () => {
      expect(root.tagName.toLowerCase()).toBe('media-play-button');
    });

    it('has commandfor attribute linking to tooltip', () => {
      expect(root.getAttribute('commandfor')).toBe('play-button-tooltip');
    });

    it('preserves button className', () => {
      expect(getClasses(root)).toContain('btn');
    });

    it('contains play icon as child', () => {
      const icon = querySelector(root, 'media-play-icon');
      expect(icon).toBeDefined();
    });
  });

  describe('tooltip element', () => {
    let tooltip: Element;

    beforeAll(() => {
      // Parse full HTML to get both elements
      const parser = new DOMParser();
      const doc = parser.parseFromString(result.html, 'text/html');
      const tooltipEl = doc.querySelector('media-tooltip');
      if (!tooltipEl) throw new Error('No tooltip found');
      tooltip = tooltipEl;
    });

    it('creates media-tooltip as second element', () => {
      expect(tooltip.tagName.toLowerCase()).toBe('media-tooltip');
    });

    it('has matching ID for commandfor linking', () => {
      expect(tooltip.getAttribute('id')).toBe('play-button-tooltip');
    });

    it('has popover="manual" attribute', () => {
      expect(tooltip.getAttribute('popover')).toBe('manual');
    });

    it('preserves delay attribute from Root', () => {
      expect(tooltip.getAttribute('delay')).toBe('500');
    });

    it('preserves side attribute from Positioner', () => {
      expect(tooltip.getAttribute('side')).toBe('top');
    });

    it('contains popup content as direct children', () => {
      const span = tooltip.querySelector('span');
      expect(span?.textContent).toBe('Play');
    });
  });
});
