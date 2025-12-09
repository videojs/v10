/**
 * Tests for: mute-button-with-icons.tsx
 */

import type { CompileResult } from '../../src';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement, querySelector } from '../helpers/dom';

describe('fixture: MuteButton - With Icons', () => {
  let result: CompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/buttons/mute-button-with-icons.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  it('transforms to media-mute-button', () => {
    expect(root.tagName.toLowerCase()).toBe('media-mute-button');
  });

  it('has mute-btn class', () => {
    expect(getClasses(root)).toContain('mute-btn');
  });

  it('has exactly 3 children (volume icons)', () => {
    expect(root.children.length).toBe(3);
  });

  it('contains media-volume-high-icon', () => {
    const icon = querySelector(root, 'media-volume-high-icon');
    expect(icon).toBeDefined();
  });

  it('volume-high icon has correct class', () => {
    const icon = querySelector(root, 'media-volume-high-icon');
    expect(getClasses(icon)).toContain('volume-high');
  });

  it('contains media-volume-low-icon', () => {
    const icon = querySelector(root, 'media-volume-low-icon');
    expect(icon).toBeDefined();
  });

  it('volume-low icon has correct class', () => {
    const icon = querySelector(root, 'media-volume-low-icon');
    expect(getClasses(icon)).toContain('volume-low');
  });

  it('contains media-volume-off-icon', () => {
    const icon = querySelector(root, 'media-volume-off-icon');
    expect(icon).toBeDefined();
  });

  it('volume-off icon has correct class', () => {
    const icon = querySelector(root, 'media-volume-off-icon');
    expect(getClasses(icon)).toContain('volume-off');
  });

  it('extracts all classNames', () => {
    expect(result.classNames).toEqual(expect.arrayContaining([
      'mute-btn',
      'volume-high',
      'volume-low',
      'volume-off',
    ]));
  });
});
