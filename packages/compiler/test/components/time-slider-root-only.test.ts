/**
 * Tests for: time-slider-root-only.tsx
 * Critical: Tests Root → base element name mapping
 */

import type { CompileResult } from '../../src';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement } from '../helpers/dom';

describe('fixture: TimeSlider - Root Only', () => {
  let result: CompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/sliders/time-slider-root-only.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  it('transforms to media-time-slider (NOT media-time-slider-root)', () => {
    expect(root.tagName.toLowerCase()).toBe('media-time-slider');
  });

  it('does NOT have -root suffix', () => {
    expect(root.tagName.toLowerCase()).not.toContain('root');
  });

  it('preserves className', () => {
    expect(getClasses(root)).toContain('slider');
  });

  it('preserves orientation prop', () => {
    expect(root.getAttribute('orientation')).toBe('horizontal');
  });

  it('has no child elements (root only)', () => {
    expect(root.children.length).toBe(0);
  });

  it('extracts className', () => {
    expect(result.classNames).toContain('slider');
  });
});
