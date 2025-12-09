/**
 * Tests for: play-button-simple.tsx
 * One test per assertion for red/green TDD workflow
 */

import type { CompileResult } from '../../src';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compileForTest as compile } from '../helpers/compile';
import { getClasses, parseElement } from '../helpers/dom';

describe('fixture: PlayButton - Simple', () => {
  let result: CompileResult;
  let root: Element;

  beforeAll(() => {
    const source = readFileSync(
      join(__dirname, '../fixtures/components/buttons/play-button-simple.tsx'),
      'utf-8',
    );
    result = compile(source);
    root = parseElement(result.html);
  });

  it('transforms to media-play-button element', () => {
    expect(root.tagName.toLowerCase()).toBe('media-play-button');
  });

  it('preserves className as class attribute', () => {
    expect(getClasses(root)).toContain('play-btn');
  });

  it('has no child elements (no icons)', () => {
    expect(root.children.length).toBe(0);
  });

  it('extracts className for CSS generation', () => {
    expect(result.classNames).toContain('play-btn');
  });

  it('component name is extracted correctly', () => {
    expect(result.componentName).toBe('TestFixture');
  });
});
