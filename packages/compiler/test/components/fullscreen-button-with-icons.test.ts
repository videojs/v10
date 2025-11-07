/**
 * Tests for: fullscreen-button-with-icons.tsx
 */

import type { CompileResult } from '../../src';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement, querySelector } from '../helpers/dom';

describe('fixture: FullscreenButton - With Icons', () => {
  let result: CompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/buttons/fullscreen-button-with-icons.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  it('transforms to media-fullscreen-button', () => {
    expect(root.tagName.toLowerCase()).toBe('media-fullscreen-button');
  });

  it('has fullscreen-btn class', () => {
    expect(getClasses(root)).toContain('fullscreen-btn');
  });

  it('has exactly 2 children', () => {
    expect(root.children.length).toBe(2);
  });

  it('contains media-fullscreen-enter-icon', () => {
    const icon = querySelector(root, 'media-fullscreen-enter-icon');
    expect(icon).toBeDefined();
  });

  it('enter icon has correct class', () => {
    const icon = querySelector(root, 'media-fullscreen-enter-icon');
    expect(getClasses(icon)).toContain('enter-icon');
  });

  it('contains media-fullscreen-exit-icon', () => {
    const icon = querySelector(root, 'media-fullscreen-exit-icon');
    expect(icon).toBeDefined();
  });

  it('exit icon has correct class', () => {
    const icon = querySelector(root, 'media-fullscreen-exit-icon');
    expect(getClasses(icon)).toContain('exit-icon');
  });

  it('extracts all classNames', () => {
    expect(result.classNames).toEqual(expect.arrayContaining([
      'fullscreen-btn',
      'enter-icon',
      'exit-icon',
    ]));
  });
});
