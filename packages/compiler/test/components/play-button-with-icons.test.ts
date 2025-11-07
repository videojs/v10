/**
 * Tests for: play-button-with-icons.tsx
 */

import type { CompileResult } from '../../src';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement, querySelector } from '../helpers/dom';

describe('fixture: PlayButton - With Icons', () => {
  let result: CompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/buttons/play-button-with-icons.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  it('transforms to media-play-button element', () => {
    expect(root.tagName.toLowerCase()).toBe('media-play-button');
  });

  it('has play-btn class', () => {
    expect(getClasses(root)).toContain('play-btn');
  });

  it('has exactly 2 child elements', () => {
    expect(root.children.length).toBe(2);
  });

  it('contains media-play-icon as first child', () => {
    const playIcon = root.children[0];
    expect(playIcon?.tagName.toLowerCase()).toBe('media-play-icon');
  });

  it('play icon has correct class', () => {
    const playIcon = querySelector(root, 'media-play-icon');
    expect(getClasses(playIcon)).toContain('play-icon');
  });

  it('contains media-pause-icon as second child', () => {
    const pauseIcon = root.children[1];
    expect(pauseIcon?.tagName.toLowerCase()).toBe('media-pause-icon');
  });

  it('pause icon has correct class', () => {
    const pauseIcon = querySelector(root, 'media-pause-icon');
    expect(getClasses(pauseIcon)).toContain('pause-icon');
  });

  it('extracts all classNames', () => {
    expect(result.classNames).toEqual(expect.arrayContaining(['play-btn', 'play-icon', 'pause-icon']));
  });
});
